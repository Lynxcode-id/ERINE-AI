import axios from 'axios'

const API_URL = `${global.theresav}/api/download/pinterest`
const API_KEY = global.apikey.theresav
const MAX_FILE_SIZE = 100 * 1024 * 1024

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
const FOOTER = '© ERINE-AI'

async function react(sock, m, emoji) {
  await sock.sendReact(
    m.chat,
    emoji,
    m.key || m.id
  ).catch(() => {})
}

function isPinterestUrl(value) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()

    return (
      ['http:', 'https:'].includes(url.protocol) &&
      (
        hostname === 'pin.it' ||
        hostname === 'pinterest.com' ||
        hostname.endsWith('.pinterest.com')
      )
    )
  } catch {
    return false
  }
}

function detectMediaType(type, mime, url) {
  const apiType = String(type || '').toLowerCase()
  const contentType = String(mime || '').toLowerCase()
  const pathname = (() => {
    try {
      return new URL(url).pathname.toLowerCase()
    } catch {
      return ''
    }
  })()

  if (
    apiType.includes('video') ||
    contentType.startsWith('video/') ||
    /\.(mp4|m4v|mov|webm)$/i.test(pathname)
  ) {
    return 'video'
  }

  if (
    apiType.includes('image') ||
    contentType.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(pathname)
  ) {
    return 'image'
  }

  return null
}

function getCaption(data, type) {
  const title = String(data.title || 'Pinterest Media')
    .replace(/[\r\n]+/g, ' ')
    .trim()

  return [
    '୨ৎ *ELYRA PINTEREST*',
    '',
    `› Judul: ${title || 'Pinterest Media'}`,
    `› Jenis: ${type === 'video' ? 'Video' : 'Gambar'}`,
    data.original_url ? `› Sumber: ${data.original_url}` : null,
    '',
    FOOTER
  ].filter(Boolean).join('\n')
}

async function getPinterestData(url) {
  const { data } = await axios.get(API_URL, {
    params: { url },
    headers: {
      'x-apikey': API_KEY,
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    },
    timeout: 60000,
    maxRedirects: 5
  })

  if (data?.status !== true) {
    throw new Error(
      data?.message || 'API gagal mengambil media Pinterest.'
    )
  }

  const result = data.result || data.data || data

  if (
    !result.download_url ||
    typeof result.download_url !== 'string'
  ) {
    throw new Error('URL media tidak ditemukan dari respons API.')
  }

  let downloadUrl

  try {
    downloadUrl = new URL(result.download_url)
  } catch {
    throw new Error('URL media dari API tidak valid.')
  }

  if (!['http:', 'https:'].includes(downloadUrl.protocol)) {
    throw new Error('Protokol URL media tidak didukung.')
  }

  return result
}

async function downloadMedia(url) {
  const { data, headers } = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'image/*, video/*, application/octet-stream, */*'
    },
    timeout: 120000,
    maxRedirects: 10,
    maxContentLength: MAX_FILE_SIZE,
    maxBodyLength: MAX_FILE_SIZE,
    validateStatus: status => status >= 200 && status < 300
  })

  const buffer = Buffer.from(data || [])
  const mime = String(headers?.['content-type'] || '')
    .split(';')[0]
    .trim()
    .toLowerCase()

  if (buffer.length < 100) {
    throw new Error('File media kosong atau tidak valid.')
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('Ukuran media melebihi batas 100 MB.')
  }

  if (
    /text\/html|application\/json/i.test(mime)
  ) {
    throw new Error('Server mengembalikan halaman error, bukan media.')
  }

  return { buffer, mime }
}

function getErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status

    if (status === 401 || status === 403) {
      return 'API menolak akses. Periksa API key.'
    }

    if (status === 404) {
      return 'Media atau endpoint tidak ditemukan.'
    }

    if (status === 429) {
      return 'Terlalu banyak permintaan. Coba lagi nanti.'
    }

    if (status >= 500) {
      return 'Server API sedang bermasalah.'
    }

    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    ) {
      return 'Download timeout. Coba lagi nanti.'
    }

    if (status) {
      return `Permintaan gagal dengan HTTP ${status}.`
    }

    return 'Tidak dapat menghubungi server API.'
  }

  return error?.message || 'Terjadi kesalahan yang tidak diketahui.'
}

export default {
  command: 'pindl',
  alias: ['pinterestdl'],
  category: 'downloader',
  tags: ['downloader'],
  description: 'Mengunduh gambar atau video dari Pinterest.',
  help: '<url_pinterest>',
  typing: true,
  wait: false,

  async execute(m, { sock, args }) {
    const url = args.find(arg => /^https?:\/\//i.test(arg))?.trim()

    if (!url || !isPinterestUrl(url)) {
      return m.reply([
        '୨ৎ *ELYRA PINTEREST*',
        '',
        'Masukkan link Pinterest yang valid.',
        '',
        `› Contoh: ${(m.prefix || '.')}${m.command || 'pin'} https://pin.it/1tlRKpEnp`,
        '',
        FOOTER
      ].join('\n'))
    }

    await react(sock, m, '🌱')

    try {
      const result = await getPinterestData(url)

      const {
        buffer,
        mime
      } = await downloadMedia(result.download_url)

      const type = detectMediaType(
        result.type,
        mime,
        result.download_url
      )

      if (!type) {
        throw new Error('Jenis media tidak dikenali sebagai gambar atau video.')
      }

      if (type === 'video' && !mime.startsWith('video/')) {
        const pathname = new URL(result.download_url).pathname

        if (!/\.(mp4|m4v|mov|webm)$/i.test(pathname)) {
          throw new Error('Format video tidak valid.')
        }
      }

      if (type === 'image' && !mime.startsWith('image/')) {
        const pathname = new URL(result.download_url).pathname

        if (!/\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(pathname)) {
          throw new Error('Format gambar tidak valid.')
        }
      }

      const caption = getCaption(result, type)

      await m.reply({
        type,
        media: buffer,
        mimetype: mime || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
        caption
      })

      await react(sock, m, '💐')
    } catch (error) {
      console.error(
        '[ELYRA PINTEREST]',
        error?.stack || error?.message || error
      )

      await react(sock, m, '☘️')

      return m.reply([
        '୨ৎ *ELYRA PINTEREST*',
        '',
        `› Gagal mengunduh media: ${getErrorMessage(error)}`,
        '',
        FOOTER
      ].join('\n'))
    }
  }
}