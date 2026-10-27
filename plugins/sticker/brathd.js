import axios from 'axios'
import { create as createSticker } from '@itsliaaa/starseal'
import { applyExif } from '../../lib/stickerwm.js'
import { getStickerWm } from '../../lib/stickerMeta.js'
import sharp from 'sharp'

const API_URL = `${global.faa}/faa/brathd`
const REQUEST_TIMEOUT = 120000
const MAX_TEXT_LENGTH = 350
const MAX_API_IMAGE_BYTES = 25 * 1024 * 1024
const MAX_STICKER_BYTES = 1024 * 1024

function asBuffer(value) {
  if (Buffer.isBuffer(value)) return value

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value)
  }

  if (ArrayBuffer.isView(value)) {
    return Buffer.from(
      value.buffer,
      value.byteOffset,
      value.byteLength
    )
  }

  if (value && value.data !== undefined) {
    return asBuffer(value.data)
  }

  throw new Error('Format gambar tidak dikenali.')
}

function looksLikeJson(buffer, contentType = '') {
  if (/application\/(?:[^;]+\+)?json/i.test(contentType)) {
    return true
  }

  const start = buffer
    .subarray(0, 80)
    .toString('utf8')
    .trimStart()

  return start.startsWith('{') || start.startsWith('[')
}

function isWebp(buffer) {
  return Buffer.isBuffer(buffer) &&
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
}

async function getApiImage(text) {
  const response = await axios.get(API_URL, {
    params: { text },
    responseType: 'arraybuffer',
    timeout: REQUEST_TIMEOUT,
    maxContentLength: MAX_API_IMAGE_BYTES,
    maxBodyLength: MAX_API_IMAGE_BYTES,
    headers: {
      Accept: 'image/*, application/json;q=0.9, */*;q=0.8'
    }
  })

  let image = asBuffer(response.data)
  let contentType = String(
    response.headers?.['content-type'] || ''
  ).toLowerCase()

  if (looksLikeJson(image, contentType)) {
    let payload

    try {
      payload = JSON.parse(image.toString('utf8'))
    } catch {
      throw new Error('Respons API tidak valid.')
    }

    const imageUrl =
      payload?.result ||
      payload?.url ||
      payload?.image

    if (payload?.status === false || !imageUrl) {
      throw new Error(
        payload?.message || 'API tidak menghasilkan gambar.'
      )
    }

    if (
      typeof imageUrl !== 'string' ||
      !/^https?:\/\//i.test(imageUrl)
    ) {
      throw new Error('URL gambar dari API tidak valid.')
    }

    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: REQUEST_TIMEOUT,
      maxContentLength: MAX_API_IMAGE_BYTES,
      maxBodyLength: MAX_API_IMAGE_BYTES,
      headers: {
        Accept: 'image/*'
      }
    })

    image = asBuffer(imageResponse.data)

    contentType = String(
      imageResponse.headers?.['content-type'] || ''
    ).toLowerCase()
  }

  if (
    !image.length ||
    image.length > MAX_API_IMAGE_BYTES
  ) {
    throw new Error('Gambar kosong atau terlalu besar.')
  }

  try {
    await sharp(image, { animated: false }).metadata()
  } catch {
    throw new Error(
      contentType.includes('application/json')
        ? 'API tidak mengembalikan gambar.'
        : 'Data dari API bukan gambar yang valid.'
    )
  }

  return image
}

async function react(sock, m, emoji) {
  try {
    if (typeof sock.sendReact === 'function') {
      await sock.sendReact(m.chat, emoji, m.key)
    }
  } catch (error) {
    console.error(
      '[BRAT HD] Reaction gagal:',
      error?.message || error
    )
  }
}

export default {
  command: 'brathd',
  category: 'sticker',
  tags: ['sticker'],
  description: 'Membuat Brat HD sticker dari teks.',
  help: '<teks>',
  typing: true,
  wait: false,

  async execute(m, { sock, args }) {
    const text = Array.isArray(args)
      ? args.join(' ').trim()
      : String(args || '').trim()

    if (!text) {
      return m.reply([
        '୨ৎ *Elyra Brat HD*',
        '',
        '› Membuat sticker Brat dari teks.',
        '',
        `› Contoh: ${(m.prefix || '.')}${m.command} anjay alok`
      ].join('\n'))
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return m.reply(
        `Teks terlalu panjang. Maksimal ${MAX_TEXT_LENGTH} karakter.`
      )
    }

    await react(sock, m, '🌱')

    try {
      const source = await getApiImage(text)

      const input = await sharp(source, {
        animated: false
      })
        .rotate()
        .png()
        .toBuffer()

      const {
        packName: STICKER_PACK_NAME,
        author: STICKER_PUBLISHER
      } = getStickerWm()

      const META = Object.freeze({
        packName: STICKER_PACK_NAME,
        author: STICKER_PUBLISHER,
        custom: false
      })

      const generatedRaw = await createSticker(input)
        .packName(STICKER_PACK_NAME)
        .publisherName(STICKER_PUBLISHER)
        .emojis(['🌱'])
        .options({
          width: 512,
          height: 512,
          flags: 'lanczos',
          format: 'yuva420p'
        })
        .toBuffer()

      const generated = asBuffer(generatedRaw)

      if (!isWebp(generated)) {
        throw new Error(
          'Gambar gagal dikonversi menjadi sticker WebP.'
        )
      }

      const sticker = await applyExif(generated, META)

      if (!Buffer.isBuffer(sticker) || !sticker.length) {
        throw new Error('Sticker hasil proses kosong.')
      }

      if (sticker.length > MAX_STICKER_BYTES) {
        throw new Error(
          'Ukuran sticker melebihi batas 1 MB.'
        )
      }

      await m.reply({
        type: 'sticker',
        media: sticker,
        mimetype: 'image/webp'
      })

      await react(sock, m, '💐')
    } catch (error) {
      console.error(
        '[BRAT HD] Gagal membuat sticker:',
        error?.stack || error?.message || error
      )

      await react(sock, m, '❌')

      return m.reply(
        `Gagal membuat sticker Brat HD: ${
          error?.message || 'Terjadi kesalahan.'
        }`
      )
    }
  }
}