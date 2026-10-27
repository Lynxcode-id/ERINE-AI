import axios from 'axios'
import uploadImage from '../../lib/uploadImage.js'

const API_URL = `${global.lynxapis}/api/image/remove-bg`
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
const MAX_IMAGE_BYTES = 30 * 1024 * 1024

function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value
  if (value instanceof ArrayBuffer) return Buffer.from(value)

  if (ArrayBuffer.isView(value)) {
    return Buffer.from(
      value.buffer,
      value.byteOffset,
      value.byteLength
    )
  }

  if (value?.data !== undefined) {
    return toBuffer(value.data)
  }

  throw new Error('Format gambar tidak dikenali.')
}

function isImage(message) {
  if (!message) return false

  const type = String(message.type || '').toLowerCase()
  const mediaType = String(message.mediaType || '').toLowerCase()
  const mime = String(
    message.mime ||
    message.mimetype ||
    message.msg?.mimetype ||
    ''
  ).toLowerCase()

  return mediaType === 'image' ||
    type === 'imagemessage' ||
    mime.startsWith('image/')
}

function isUrl(value) {
  if (typeof value !== 'string') return false

  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

async function downloadImage(message, sock, current = false) {
  let data

  if (current) {
    if (!message?.raw?.message) {
      throw new Error('Data pesan gambar tidak ditemukan.')
    }

    data = await sock.message.downloadBytes(message.raw.message)
  } else {
    if (typeof message?.download !== 'function') {
      throw new Error('Media pada pesan reply tidak bisa diunduh.')
    }

    data = await message.download()
  }

  const buffer = toBuffer(data)

  if (!buffer.length) {
    throw new Error('Gambar kosong atau gagal diunduh.')
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Ukuran gambar melebihi batas 30 MB.')
  }

  return buffer
}

async function resolveImageUrl(m, sock, args) {
  let buffer

  if (m.quoted?.isMedia && isImage(m.quoted)) {
    buffer = await downloadImage(m.quoted, sock)
  } else if (m.isMedia && isImage(m)) {
    buffer = await downloadImage(m, sock, true)
  } else {
    const text = Array.isArray(args)
      ? args.join(' ').trim()
      : String(args || '').trim()

    if (isUrl(text)) return text

    throw new Error(
      'Kirim foto dengan caption .removebg atau reply foto lalu ketik .removebg.'
    )
  }

  const uploaded = await uploadImage(buffer)

  const imageUrl = typeof uploaded === 'string'
    ? uploaded
    : uploaded?.url || uploaded?.result

  if (!isUrl(imageUrl)) {
    throw new Error('Gagal mendapatkan URL dari uploader.')
  }

  return imageUrl
}

export default {
  command: 'removebg',
  alias: ['rmbg'],
  category: 'image',
  tags: ['image'],
  description: 'Menghapus latar belakang foto.',
  help: '(reply foto / kirim foto dengan caption .removebg / URL)',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    try {
      const imageUrl = await resolveImageUrl(m, sock, args)

      const response = await axios.get(API_URL, {
        params: {
          url: imageUrl
        },
        responseType: 'arraybuffer',
        timeout: 90000,
        maxContentLength: MAX_IMAGE_BYTES,
        maxBodyLength: MAX_IMAGE_BYTES,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'image/*'
        }
      })

      const media = Buffer.from(response.data)
      const mime = String(
        response.headers?.['content-type'] || ''
      ).split(';')[0].trim().toLowerCase()

      if (!media.length || media.length > MAX_IMAGE_BYTES) {
        throw new Error('Hasil gambar kosong atau terlalu besar.')
      }

      if (
        mime.includes('application/json') ||
        mime.includes('text/html')
      ) {
        throw new Error('API tidak mengembalikan gambar hasil.')
      }

      if (mime && !mime.startsWith('image/')) {
        throw new Error('Format hasil remove background tidak valid.')
      }

      await m.reply({
        type: 'image',
        media,
        mimetype: mime.startsWith('image/') ? mime : 'image/png',
        caption: [
          '🌷 *Elyra Remove Background*',
          '',
          'Background foto berhasil dihapus.',
          '',
          'with love, elyra !!'
        ].join('\n')
      })
    } catch (error) {
      console.error(
        '[ELYRA REMOVEBG]',
        error?.response?.data ||
        error?.stack ||
        error?.message ||
        error
      )

      await m.reply([
        '🌷 *Elyra Remove Background*',
        '',
        'Gagal memproses foto.',
        `♡ Pesan : ${error?.message || 'Terjadi kesalahan.'}`,
        '',
        'with love, elyra !!'
      ].join('\n'))
    }
  }
}