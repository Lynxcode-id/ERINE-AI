import axios from 'axios'
import uploadImage from '../../lib/uploadImage.js'

const API_URL = `${global.jerexd}/api/ai/editimage`
const API_KEY = global.apikey.jerexd

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024

const HEADERS = {
  accept: 'image/*, application/json',
  'content-type': 'application/json',
  'user-agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
}

async function react(sock, m, emoji) {
  await sock.sendReact(
    m.chat,
    emoji,
    m.key || m.id
  ).catch(() => {})
}

function getMessageContent(message) {
  let content = message?.raw?.message || message?.raw || message?.msg || message

  for (let i = 0; i < 5 && content; i++) {
    const wrapped =
      content.ephemeralMessage?.message ||
      content.viewOnceMessage?.message ||
      content.viewOnceMessageV2?.message ||
      content.viewOnceMessageV2Extension?.message

    if (!wrapped) break
    content = wrapped
  }

  return content || {}
}

function getMime(message) {
  const content = getMessageContent(message)

  return String(
    message?.mimetype ||
    message?.msg?.mimetype ||
    content.imageMessage?.mimetype ||
    content.documentMessage?.mimetype ||
    ''
  ).split(';')[0].trim().toLowerCase()
}

function isImageMessage(message) {
  if (!message) return false

  const content = getMessageContent(message)
  const mime = getMime(message)

  return Boolean(
    content.imageMessage ||
    /^image\//i.test(mime) ||
    /image/i.test(String(message.mediaType || ''))
  )
}

async function getImageBuffer(m, sock) {
  if (m.quoted && isImageMessage(m.quoted)) {
    const buffer = await m.quoted.download()

    if (buffer?.length) {
      return Buffer.from(buffer)
    }
  }

  if (isImageMessage(m)) {
    const rawMessage = m.raw?.message || m.raw
    const buffer = await sock.message.downloadBytes(rawMessage)

    if (buffer?.length) {
      return Buffer.from(buffer)
    }
  }

  return null
}

function detectImageMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null
  }

  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg'
  }

  if (
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return 'image/png'
  }

  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }

  const signature = buffer.toString('ascii', 0, 6)

  if (signature === 'GIF87a' || signature === 'GIF89a') {
    return 'image/gif'
  }

  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'image/bmp'
  }

  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12)

    if (['avif', 'avis'].includes(brand)) {
      return 'image/avif'
    }

    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
      return 'image/heic'
    }
  }

  return null
}

function getExtension(mime) {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/avif': 'avif',
    'image/heic': 'heic'
  }

  return extensions[mime] || 'jpg'
}

function getErrorMessage(data) {
  if (!data) return 'API tidak memberikan hasil.'

  if (Buffer.isBuffer(data)) {
    const text = data
      .subarray(0, 3000)
      .toString('utf8')
      .trim()

    try {
      return getErrorMessage(JSON.parse(text))
    } catch {
      return text.slice(0, 250) || 'Respons API tidak valid.'
    }
  }

  if (typeof data === 'string') {
    try {
      return getErrorMessage(JSON.parse(data))
    } catch {
      return data.slice(0, 250)
    }
  }

  return String(
    data.message ||
    data.error ||
    data.msg ||
    data.result?.message ||
    'API gagal memproses gambar.'
  )
}

async function getResultBuffer(response) {
  const raw = Buffer.from(response.data || [])
  const contentType = String(
    response.headers?.['content-type'] || ''
  ).toLowerCase()

  if (!raw.length) {
    throw new Error('API tidak menghasilkan gambar.')
  }

  if (raw.length > MAX_OUTPUT_BYTES) {
    throw new Error('Ukuran hasil gambar terlalu besar.')
  }

  const detectedMime = detectImageMime(raw)

  if (detectedMime) {
    return {
      buffer: raw,
      mime: detectedMime
    }
  }

  const isJson =
    contentType.includes('application/json') ||
    contentType.includes('text/plain') ||
    contentType.includes('text/html')

  if (isJson) {
    let data

    try {
      data = JSON.parse(raw.toString('utf8'))
    } catch {
      throw new Error(getErrorMessage(raw))
    }

    if (data.status === false || data.success === false) {
      throw new Error(getErrorMessage(data))
    }

    const base64 =
      data.image ||
      data.base64 ||
      data.b64_json ||
      data.data?.image ||
      data.data?.base64 ||
      data.result?.base64

    if (typeof base64 === 'string') {
      const cleanBase64 = base64.replace(
        /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
        ''
      )

      const buffer = Buffer.from(cleanBase64, 'base64')
      const mime = detectImageMime(buffer)

      if (mime) {
        return { buffer, mime }
      }
    }

    const imageUrl =
      data.url ||
      data.image_url ||
      data.data?.url ||
      data.data?.image_url ||
      data.result?.url

    if (typeof imageUrl === 'string') {
      const parsedUrl = new URL(imageUrl)

      if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
        throw new Error('URL hasil gambar tidak valid.')
      }

      const imageResponse = await axios.get(parsedUrl.href, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: MAX_OUTPUT_BYTES,
        headers: {
          'user-agent': HEADERS['user-agent']
        }
      })

      const buffer = Buffer.from(imageResponse.data || [])
      const mime = detectImageMime(buffer)

      if (mime && buffer.length <= MAX_OUTPUT_BYTES) {
        return { buffer, mime }
      }

      throw new Error('URL hasil tidak mengandung gambar yang valid.')
    }

    throw new Error(getErrorMessage(data))
  }

  if (contentType.startsWith('image/')) {
    return {
      buffer: raw,
      mime: contentType.split(';')[0].trim()
    }
  }

  throw new Error('Format hasil gambar dari API tidak dikenali.')
}

export default {
  command: 'editimg',
  aliases: ['edit'],
  category: 'image',
  tags: ['image'],
  description: 'Mengedit gambar menggunakan AI',
  help: 'Reply gambar dengan .editimg <prompt>',
  typing: true,
  wait: false,

  async execute(m, { sock, args }) {
    const inputArgs = Array.isArray(args) ? [...args] : []
    const urls = inputArgs.filter(arg =>
      /^https?:\/\/\S+$/i.test(arg)
    )

    const inputUrl = urls[0] || null
    const prompt = inputArgs
      .filter(arg => arg !== inputUrl)
      .join(' ')
      .trim()

    if (!prompt) {
      return m.reply([
        '୨ৎ *ELYRA IMAGE EDITOR*',
        '',
        'Masukkan instruksi untuk mengedit gambar.',
        '',
        '› Reply gambar:',
        '.editimg ubah rambutnya menjadi blonde',
        '',
        '› Menggunakan URL:',
        '.editimg https://fotonya.png ubah rambutnya menjadi blonde',
        '',
        '© ELYRA-AI'
      ].join('\n'))
    }

    if (prompt.length > 4000) {
      return m.reply('Prompt terlalu panjang. Maksimal 4000 karakter.')
    }

    await react(sock, m, '🌱')

    try {
      let imageUrl = inputUrl

      if (!imageUrl) {
        let imageBuffer

        try {
          imageBuffer = await getImageBuffer(m, sock)
        } catch (error) {
          console.error(
            '[ELYRA EDITIMG DOWNLOAD]',
            error?.message || error
          )

          throw new Error('Gagal mengunduh gambar dari WhatsApp.')
        }

        if (!imageBuffer?.length) {
          throw new Error(
            'Kirim gambar dengan caption .editimg atau reply gambar tersebut.'
          )
        }

        if (imageBuffer.length > MAX_IMAGE_BYTES) {
          throw new Error('Ukuran gambar maksimal 20 MB.')
        }

        const mime = detectImageMime(imageBuffer)

        if (!mime) {
          throw new Error(
            'Format gambar tidak dikenali. Coba gunakan JPG, PNG, atau WebP.'
          )
        }

        const uploaded = await uploadImage(imageBuffer)

        imageUrl = typeof uploaded === 'string'
          ? uploaded
          : uploaded?.url ||
            uploaded?.data?.url ||
            uploaded?.result?.url

        if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
          throw new Error('Gagal mengunggah gambar ke hosting.')
        }
      }

      const response = await axios.post(
        API_URL,
        {
          prompt,
          url: imageUrl,
          output_type: 'image'
        },
        {
          params: {
            apikey: API_KEY
          },
          headers: HEADERS,
          responseType: 'arraybuffer',
          timeout: 200000,
          maxBodyLength: MAX_IMAGE_BYTES + 1024 * 1024,
          maxContentLength: MAX_OUTPUT_BYTES,
          validateStatus: status => status >= 200 && status < 300
        }
      )

      const result = await getResultBuffer(response)

      await m.reply({
        type: 'image',
        media: result.buffer,
        mimetype: result.mime,
        caption: [
          '୨ৎ *ELYRA IMAGE EDITOR*',
          '',
          '› Status: Berhasil',
          `› Prompt: ${prompt}`,
          '› Engine: elyra ai engine',
          '',
          '© ELYRA-AI'
        ].join('\n')
      })

      await react(sock, m, '💐')
    } catch (error) {
      console.error(
        '[ELYRA EDITIMG]',
        error?.response?.status || '',
        error?.stack || error?.message || error
      )

      await react(sock, m, '☘️')

      return m.reply([
        '୨ৎ *ELYRA IMAGE EDITOR*',
        '',
        `› ${error?.response?.status === 403
          ? 'API Key tidak valid atau akses API ditolak.'
          : error?.response?.status === 429
            ? 'Batas request API tercapai. Coba lagi nanti.'
            : error?.message || 'Gagal mengedit gambar.'}`,
        '',
        '© ELYRA-AI'
      ].join('\n'))
    }
  }
}