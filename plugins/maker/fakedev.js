import * as appSettings from '../../settings.js'
import sharp from 'sharp'
import uploadImage from '../../lib/uploadImage.js'

const settings =
  appSettings.config ||
  appSettings.settings ||
  appSettings.default ||
  {}

const API_URL = `${global.xrina}/canvas/fakedev`
const MAX_FILE_SIZE = 10 * 1024 * 1024
const AVATAR_SIZE = 1024

function toBuffer(data) {
  if (Buffer.isBuffer(data)) return data

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data)
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(
      data.buffer,
      data.byteOffset,
      data.byteLength
    )
  }

  return Buffer.from(data || [])
}

function isValidUrl(value) {
  try {
    const url = new URL(value)

    return (
      url.protocol === 'https:' ||
      url.protocol === 'http:'
    )
  } catch {
    return false
  }
}

function detectImage(buffer) {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg'
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }

  if (
    buffer.length >= 6 &&
    (
      buffer.toString('ascii', 0, 6) === 'GIF87a' ||
      buffer.toString('ascii', 0, 6) === 'GIF89a'
    )
  ) {
    return 'image/gif'
  }

  return null
}

async function cropAvatar(original) {
  const inputMetadata = await sharp(original, {
    failOn: 'error',
    limitInputPixels: 40000000
  }).metadata()

  if (
    !inputMetadata.width ||
    !inputMetadata.height ||
    !inputMetadata.format
  ) {
    throw new Error('Format atau dimensi foto tidak valid.')
  }

  const avatar = await sharp(original, {
    failOn: 'error',
    limitInputPixels: 40000000
  })
    .rotate()
    .resize(AVATAR_SIZE, AVATAR_SIZE, {
      fit: 'cover',
      position: 'centre'
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true
    })
    .toBuffer()

  const outputMetadata = await sharp(avatar).metadata()

  if (
    outputMetadata.width !== AVATAR_SIZE ||
    outputMetadata.height !== AVATAR_SIZE
  ) {
    throw new Error(
      `Crop gagal: ukuran hasil ${outputMetadata.width}x${outputMetadata.height}.`
    )
  }

  return avatar
}

async function uploadAvatar(buffer) {
  const uploaded = await uploadImage(buffer)

  const url =
    typeof uploaded === 'string'
      ? uploaded
      : uploaded?.url ||
        uploaded?.data?.url ||
        uploaded?.result?.url ||
        uploaded?.cdn_url ||
        uploaded?.data?.cdn_url ||
        ''

  if (!url || !isValidUrl(url)) {
    throw new Error('Gagal mendapatkan URL avatar dari uploader.')
  }

  return url
}

async function getImageFromApi(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'image/*',
      'User-Agent': 'Mozilla/5.0'
    },
    signal: AbortSignal.timeout(120000)
  })

  if (!response.ok) {
    throw new Error(`API merespons HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''
  const buffer = Buffer.from(await response.arrayBuffer())
  const detectedType = detectImage(buffer)

  if (!buffer.length) {
    throw new Error('Gambar hasil API kosong.')
  }

  if (detectedType) {
    return {
      buffer,
      mimetype: detectedType
    }
  }

  let data

  try {
    data = JSON.parse(buffer.toString('utf8'))
  } catch {
    throw new Error(
      `API tidak mengembalikan gambar valid: ${contentType}`
    )
  }

  const imageUrl =
    data?.url ||
    data?.image ||
    data?.result?.url ||
    data?.result?.image ||
    data?.data?.url ||
    data?.data?.image

  if (!imageUrl || !isValidUrl(imageUrl)) {
    throw new Error(
      data?.message ||
      data?.error ||
      'URL gambar hasil API tidak ditemukan.'
    )
  }

  const imageResponse = await fetch(imageUrl, {
    headers: {
      Accept: 'image/*',
      'User-Agent': 'Mozilla/5.0'
    },
    signal: AbortSignal.timeout(120000)
  })

  if (!imageResponse.ok) {
    throw new Error(
      `Gagal mengunduh hasil gambar: HTTP ${imageResponse.status}`
    )
  }

  const imageBuffer = Buffer.from(
    await imageResponse.arrayBuffer()
  )

  const imageType = detectImage(imageBuffer)

  if (!imageType || !imageBuffer.length) {
    throw new Error('URL hasil API tidak mengarah ke gambar valid.')
  }

  return {
    buffer: imageBuffer,
    mimetype: imageType
  }
}

function getHelp(m) {
  const prefix = m.prefix || '.'

  return [
    '🌷 *ELYRA — FAKE DEVELOPER*',
    '━━━━━━━━━━━━━━━━━━',
    'Buat gambar Fake Developer dengan avatar pilihanmu.',
    '',
    '✦ *Cara menggunakan*',
    '1. Reply foto yang ingin digunakan.',
    '2. Masukkan nama developer.',
    '3. Bot akan memotong foto menjadi persegi.',
    '',
    '✦ *Contoh penggunaan*',
    `${prefix}fakedev Lynx decode`,
    `${prefix}fakedev Arman Maulana`,
    `${prefix}fakedev Elyra Developer`,
    '',
    '━━━━━━━━━━━━━━━━━━',
    '› Ukuran foto harus di bawah 10 MB.',
    '› Hasil crop selalu 1024 × 1024.',
    '› Posisi crop mengambil bagian tengah.',
    '› Foto tidak diregangkan.',
    '',
    '© ELYRA-AI'
  ].join('\n')
}

export default {
  command: 'fakedev',
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar Fake Developer dengan avatar.',
  help: '<nama>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const name = Array.isArray(args)
      ? args.join(' ').trim()
      : ''

    if (
      !name ||
      ['help', 'menu', '?'].includes(name.toLowerCase())
    ) {
      return m.reply(getHelp(m))
    }

    if (name.length > 60) {
      return m.reply('🍂 Nama maksimal 60 karakter.')
    }

    const quoted = m.quoted

    if (!quoted) {
      return m.reply(
        '🍂 Reply foto yang ingin digunakan terlebih dahulu.\n\n' +
        '*Contoh:*\n' +
        'Reply foto, lalu ketik:\n' +
        '.fakedev Lynx decode'
      )
    }

    try {
      const declaredSize = Number(
        quoted.fileSize ??
        quoted.size ??
        quoted.msg?.fileLength
      )

      if (
        Number.isFinite(declaredSize) &&
        declaredSize >= MAX_FILE_SIZE
      ) {
        return m.reply(
          '🍂 *Ukuran foto terlalu besar!*\n\n' +
          'Batas ukuran adalah di bawah 10 MB.'
        )
      }

      const downloaded = await quoted.download()
      const original = toBuffer(downloaded)

      if (!original.length) {
        throw new Error('Foto gagal diunduh atau kosong.')
      }

      if (original.length >= MAX_FILE_SIZE) {
        return m.reply(
          '🍂 *Ukuran foto terlalu besar!*\n\n' +
          `Ukuran foto: ${(original.length / (1024 * 1024)).toFixed(2)} MB\n` +
          'Batas ukuran: di bawah 10 MB.\n\n' +
          'Kompres foto terlebih dahulu, lalu coba lagi.'
        )
      }

      const avatarBuffer = await cropAvatar(original)

      const avatarUrl = await uploadAvatar(avatarBuffer)

      const url = new URL(API_URL)

      url.searchParams.set('name', name)
      url.searchParams.set('avatar', avatarUrl)

      const {
        buffer,
        mimetype
      } = await getImageFromApi(url.toString())

      return await m.reply({
        type: 'image',
        media: buffer,
        mimetype,
        caption: '© ELYRA-AI'
      })
    } catch (error) {
      console.error(
        '[FAKEDEV]',
        error?.stack || error?.message || error
      )

      return m.reply(
        settings.pesan?.error ||
        '🍂 Gagal membuat gambar Fake Developer. Coba lagi nanti.'
      )
    }
  }
}