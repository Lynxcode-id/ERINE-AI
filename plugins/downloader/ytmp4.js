import axios from 'axios'

const API_URL = `${global.theresav}/api/download/ytmp4`
const API_KEY = global.apikey.theresav
const MAX_VIDEO_BYTES = 150 * 1024 * 1024

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

const FOOTER = '© ERINE-AI'

const formatNumber = value => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0
    ? number.toLocaleString('id-ID')
    : '-'
}

const formatDuration = seconds => {
  const value = Number(seconds)

  if (!Number.isFinite(value) || value < 0) return '-'

  const minutes = Math.floor(value / 60)
  const remainingSeconds = Math.floor(value % 60)

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

async function react(sock, m, emoji) {
  await sock.sendReact(
    m.chat,
    emoji,
    m.key || m.id
  ).catch(() => {})
}

function validateYouTubeUrl(value) {
  try {
    const url = new URL(value)

    if (!['http:', 'https:'].includes(url.protocol)) {
      return false
    }

    const hostname = url.hostname.toLowerCase()

    return [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'youtu.be',
      'www.youtube-nocookie.com',
      'youtube-nocookie.com'
    ].includes(hostname)
  } catch {
    return false
  }
}

function getResponseError(buffer, contentType) {
  const preview = buffer
    .subarray(0, 1000)
    .toString('utf8')
    .replace(/[^\x20-\x7e\n\r\t]/g, '')
    .trim()

  if (
    /application\/json|text\/html/i.test(contentType) ||
    /^\s*(?:<!doctype html|<html|<head|{"status"\s*:\s*false|{"error"|{"message")/i.test(preview)
  ) {
    return `Server mengembalikan respons error, bukan video. ${preview.slice(0, 180)}`
  }

  return null
}

function isMp4(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return false
  }

  const limit = Math.min(buffer.length - 4, 64)

  for (let offset = 0; offset < limit; offset++) {
    if (buffer.subarray(offset, offset + 4).toString() === 'ftyp') {
      return true
    }
  }

  return false
}

async function getVideoInfo(url) {
  const { data } = await axios.get(API_URL, {
    params: {
      url,
      resolution: '480'
    },
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
      data?.message || 'API downloader gagal memproses video.'
    )
  }

  const result = data.result || data

  if (!result.download_url || typeof result.download_url !== 'string') {
    throw new Error('URL download video tidak ditemukan dari respons API.')
  }

  let downloadUrl

  try {
    downloadUrl = new URL(result.download_url)
  } catch {
    throw new Error('URL video dari API tidak valid.')
  }

  if (!['http:', 'https:'].includes(downloadUrl.protocol)) {
    throw new Error('Protokol URL download tidak didukung.')
  }

  return result
}

async function downloadVideo(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'video/mp4, application/octet-stream, */*',
      'Referer': 'https://www.youtube.com/'
    },
    timeout: 180000,
    maxRedirects: 10,
    maxContentLength: MAX_VIDEO_BYTES,
    maxBodyLength: MAX_VIDEO_BYTES,
    validateStatus: status => status >= 200 && status < 300
  })

  const buffer = Buffer.from(response.data || [])

  const contentType = String(
    response.headers?.['content-type'] || ''
  )
    .split(';')[0]
    .trim()
    .toLowerCase()

  if (buffer.length < 1024) {
    throw new Error('File video kosong atau terlalu kecil.')
  }

  if (buffer.length > MAX_VIDEO_BYTES) {
    throw new Error('Ukuran video melebihi batas 150 MB.')
  }

  const responseError = getResponseError(buffer, contentType)

  if (responseError) {
    throw new Error(responseError)
  }

  if (
    !isMp4(buffer) &&
    contentType !== 'video/mp4'
  ) {
    throw new Error(
      `File yang diunduh bukan MP4 valid. Content-Type: ${contentType || 'tidak diketahui'}.`
    )
  }

  return buffer
}

function getErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status

    if (status === 401 || status === 403) {
      return 'API menolak akses. Periksa API key.'
    }

    if (status === 404) {
      return 'Endpoint atau file video tidak ditemukan.'
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
      return 'Download video timeout. Coba lagi nanti.'
    }

    if (status) {
      return `Permintaan API gagal dengan HTTP ${status}.`
    }

    return 'Tidak dapat terhubung ke server downloader.'
  }

  return error?.message || 'Terjadi kesalahan yang tidak diketahui.'
}

export default {
  command: 'ytmp4',
  category: 'downloader',
  description: 'Mengunduh video YouTube format MP4.',
  help: '<url_youtube>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const url = String(args[0] || '').trim()

    if (!url || !validateYouTubeUrl(url)) {
      return m.reply([
        '୨ৎ *ELYRA YOUTUBE MP4*',
        '',
        'Masukkan URL video YouTube yang valid.',
        '',
        `› Contoh: ${(m.prefix || '.')}${m.command || 'ytmp4'} https://youtu.be/putCWm1pff4`,
        '',
        FOOTER
      ].join('\n'))
    }

    await react(sock, m, '🌱')

    try {
      const info = await getVideoInfo(url)
      const videoBuffer = await downloadVideo(info.download_url)

      const title = info.title || 'YouTube Video'
      const channel = info.channel || '-'
      const duration = formatDuration(info.duration_sec)
      const resolution = info.resolution || '480'
      const views = formatNumber(info.view_count)

      const caption = [
        '୨ৎ *ELYRA YOUTUBE MP4*',
        '',
        `› Judul: ${title}`,
        `› Channel: ${channel}`,
        `› Durasi: ${duration}`,
        `› Resolusi: ${resolution}p`,
        `› Views: ${views}`,
        '',
        FOOTER
      ].join('\n')

      await sock.message.send(
        m.chat,
        {
          type: 'video',
          media: videoBuffer,
          mimetype: 'video/mp4',
          caption
        },
        {
          quote: m.raw
        }
      )

      await react(sock, m, '💐')
    } catch (error) {
      console.error(
        '[ELYRA YTMP4]',
        error?.stack || error?.message || error
      )

      await react(sock, m, '☘️')

      return m.reply([
        '୨ৎ *ELYRA YOUTUBE MP4*',
        '',
        `› Gagal mengunduh video: ${getErrorMessage(error)}`,
        '',
        FOOTER
      ].join('\n'))
    }
  }
}