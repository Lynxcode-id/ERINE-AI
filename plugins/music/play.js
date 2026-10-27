import yts from 'yt-search'
import axios from 'axios'
import { sendLinkPreview } from '../../lib/function.js'

const shown = m => m.prefix || '.'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
const JEREXD_API = `${global.jerexd}/api/downloader/ytmp3`
const JEREXD_API_KEY = global.apikey.jerexd
const AZBRY_API = `${global.azbry}/api/download/ytmp3`
const THERESAV_API = `${global.theresav}/api/download/ytmp3`
const THERESAV_API_KEY = global.apikey.theresav
const MAX_AUDIO_BYTES = 100 * 1024 * 1024
async function requestJson(url, options = {}) {
  const { data } = await axios.get(url, {
    timeout: 30000,
    maxRedirects: 5,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      ...options.headers
    },
    ...options
  })
  if (!data || typeof data !== 'object') {
    throw new Error('Respons API tidak valid.')
  }
  if (data.status === false) {
    throw new Error(
      data.message ||
      data.msg ||
      'API melaporkan proses gagal.'
    )
  }
  return data
}

function normalizeTrack(data = {}) {
  const result =
    data?.result &&
    typeof data.result === 'object'
      ? data.result
      : data

  const urls = [
    result?.download,
    result?.download_url,
    result?.downloadUrl,
    data?.download,
    data?.download_url,
    data?.downloadUrl
  ].filter(url =>
    typeof url === 'string' &&
    /^https?:\/\//i.test(url)
  )

  return {
    title:
      result?.title ||
      data?.title ||
      '',

    thumbnail:
      result?.thumbnail ||
      data?.thumbnail ||
      '',

    channel:
      result?.channel ||
      data?.channel ||
      '',

    duration:
      result?.duration ??
      data?.duration ??
      data?.duration_sec ??
      null,

    urls: [...new Set(urls)]
  }
}

function formatDuration(value) {
  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    return value
  }

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return '-'
  }

  const seconds = Math.floor(value)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60

  if (hours > 0) {
    return [
      hours,
      String(minutes).padStart(2, '0'),
      String(remaining).padStart(2, '0')
    ].join(':')
  }

  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

async function jerexd(videoUrl) {
  const data = await requestJson(JEREXD_API, {
    params: {
      apikey: JEREXD_API_KEY,
      url: videoUrl
    }
  })

  const track = normalizeTrack(data)

  if (!track.urls.length) {
    throw new Error(
      'Jerexd tidak memberikan URL audio.'
    )
  }

  return track
}

async function azbry(videoUrl) {
  const data = await requestJson(AZBRY_API, {
    params: {
      url: videoUrl
    }
  })

  const track = normalizeTrack(data)

  if (!track.urls.length) {
    throw new Error(
      'Azbry tidak memberikan URL audio.'
    )
  }

  return track
}

async function theresav(videoUrl) {
  const data = await requestJson(THERESAV_API, {
    params: {
      url: videoUrl
    },

    headers: {
      'x-apikey': THERESAV_API_KEY
    }
  })

  const track = normalizeTrack(data)

  if (!track.urls.length) {
    throw new Error(
      'Theresav tidak memberikan URL audio.'
    )
  }

  return track
}

async function downloadAudio(url) {
  if (
    typeof url !== 'string' ||
    !/^https?:\/\//i.test(url)
  ) {
    throw new Error('URL download tidak valid.')
  }

  const response = await axios.get(url, {
    responseType: 'arraybuffer',

    timeout: 60000,

    maxContentLength: MAX_AUDIO_BYTES,
    maxBodyLength: MAX_AUDIO_BYTES,

    maxRedirects: 5,

    validateStatus: status =>
      status >= 200 && status < 300,

    headers: {
      'User-Agent': USER_AGENT,

      Accept:
        'audio/mpeg,audio/*;q=0.9,' +
        'application/octet-stream;q=0.8,*/*;q=0.5',

      'Accept-Language':
        'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',

      Connection: 'keep-alive'
    }
  })

  const buffer = Buffer.isBuffer(response.data)
    ? response.data
    : Buffer.from(response.data)

  if (!buffer.length) {
    throw new Error(
      'Server mengembalikan file kosong.'
    )
  }

  if (buffer.length > MAX_AUDIO_BYTES) {
    throw new Error(
      'Ukuran audio melebihi batas 100 MB.'
    )
  }

  const contentType = String(
    response.headers?.['content-type'] || ''
  )
    .split(';')[0]
    .trim()
    .toLowerCase()

  const sample = buffer
    .subarray(0, 1024)
    .toString('utf8')
    .replace(/\0/g, '')
    .trimStart()

  const looksLikeHtml =
    /^<!doctype\s+html/i.test(sample) ||
    /^<html[\s>]/i.test(sample)

  const looksLikeJson =
    /^[{[]/.test(sample)

  const looksLikeTextError =
    /^(?:access denied|request blocked|forbidden|bad gateway|error\s+\d{3})\b/i
      .test(sample)

  const isTextResponse =
    contentType.includes('text/html') ||
    contentType.includes('application/json') ||
    contentType.includes('text/plain') ||
    contentType.includes('application/xml')

  if (
    looksLikeHtml ||
    looksLikeJson ||
    looksLikeTextError ||
    isTextResponse
  ) {
    throw new Error(
      'Server tidak mengembalikan file audio. ' +
      `Content-Type: ${contentType || 'unknown'}.`
    )
  }

  if (buffer.length < 1024) {
    throw new Error(
      `File audio terlalu kecil: ${buffer.length} byte.`
    )
  }

  return buffer
}

function errorMessage(error) {
  const status = error?.response?.status

  if (status) {
    return `HTTP ${status}: ${error.message || 'Request gagal.'}`
  }

  return error?.message ||
    String(error || 'Unknown error')
}

function createMessenger(m, sock) {
  const options = m.raw
    ? { quote: m.raw }
    : {}

  const sendText = text =>
    sock.message.send(
      m.chat,
      {
        type: 'text',
        text
      },
      options
    )

  const sendAudio = media =>
    sock.message.send(
      m.chat,
      {
        type: 'audio',
        media,
        mimetype: 'audio/mpeg',
        ptt: false
      },
      options
    )

  const react = emoji =>
    sock.sendReact(
      m.chat,
      emoji,
      m.id
    ).catch(() => {})

  return {
    sendText,
    sendAudio,
    react
  }
}

export default {
  command: 'play',
  category: 'music',
  description:
    '> Mencari dan memutar audio dari YouTube.\n\n' +
    'Contoh:\n' +
    '> `.play karena kamu`',
  help: '<pencarian>',
  typing: true,
  wait: true,

  async execute(m, { sock, args = [] }) {
    const query = args.join(' ').trim()

    const {
      sendText,
      sendAudio,
      react
    } = createMessenger(m, sock)
    if (!query) {
      return sendText(
        '🌷 *YouTube Play*\n\n' +
        'Cari dan putar lagu dari YouTube.\n\n' +
        `♡ ${shown(m)}${m.command} <pencarian>\n\n` +
        'with love, elyra !!'
      )
    }

    await react('⏳')

    let video

    try {
      const result = await yts(query)

      video = result?.videos?.[0]

      if (!video?.url) {
        await react('❌')

        return sendText(
          '❌ Lagu tidak ditemukan di YouTube.'
        )
      }
    } catch (error) {
      console.error(
        '[PLAY] Pencarian YouTube gagal:',
        error?.stack || error
      )

      await react('❌')

      return sendText(
        '❌ Terjadi kesalahan saat mencari lagu.\n\n' +
        `› Detail: ${errorMessage(error)}`
      )
    }

    const downloaders = [
      {
        name: 'Jerexd',
        execute: () => jerexd(video.url)
      },
      {
        name: 'Azbry',
        execute: () => azbry(video.url)
      },
      {
        name: 'Theresav',
        execute: () => theresav(video.url)
      }
    ]
    const attemptedUrls = new Set()
    const errors = []
    let track = {
      title: video.title || '',
      thumbnail: video.thumbnail || video.image || '',
      channel: video.author?.name || '',
      duration: video.seconds || null,
      urls: []
    }
    let audioBuffer = null
    for (const downloader of downloaders) {
      if (audioBuffer) break

      console.log(
        `[PLAY] Menghubungi API ${downloader.name}...`
      )

      let result

      try {
        result = await downloader.execute()
        track = {
          ...track,

          title:
            result.title ||
            track.title,

          thumbnail:
            result.thumbnail ||
            track.thumbnail,

          channel:
            result.channel &&
            result.channel !== 'Unknown'
              ? result.channel
              : track.channel,

          duration:
            result.duration ??
            track.duration,

          urls: result.urls
        }
      } catch (error) {
        const detail = errorMessage(error)

        errors.push(
          `${downloader.name}: ${detail}`
        )

        console.error(
          `[PLAY] API ${downloader.name} gagal:`,
          detail
        )

        continue
      }
      
      for (const url of result.urls) {
        if (audioBuffer) break

        if (attemptedUrls.has(url)) {
          continue
        }

        attemptedUrls.add(url)

        try {
          const host = new URL(url).hostname

          console.log(
            `[PLAY] Mengunduh audio melalui ${downloader.name}: ${host}`
          )

          audioBuffer = await downloadAudio(url)

          console.log(
            `[PLAY] Download berhasil melalui ${downloader.name}. ` +
            `Ukuran: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`
          )
        } catch (error) {
          const detail = errorMessage(error)

          errors.push(
            `${downloader.name} download: ${detail}`
          )

          console.error(
            `[PLAY] Download ${downloader.name} gagal:`,
            detail
          )
        }
      }
    }

    if (!audioBuffer) {
      await react('❌')

      console.error(
        '[PLAY] Semua downloader gagal:',
        errors
      )

      const details = errors.length
        ? errors.slice(-3).join('\n')
        : 'Tidak ada URL audio yang berhasil diunduh.'

      return sendText(
        '❌ *Gagal Mengunduh Audio*\n\n' +
        'Semua server downloader gagal memproses lagu.\n\n' +
        `› Detail:\n${details.slice(0, 900)}`
      )
    }

    const title =
      track.title ||
      video.title ||
      'YouTube Music'

    const channel =
      track.channel ||
      video.author?.name ||
      '-'

    const duration =
      formatDuration(
        track.duration ||
        video.timestamp ||
        video.seconds ||
        0
      )

    const thumbnail =
      track.thumbnail ||
      video.thumbnail ||
      video.image

    const caption =
      '🌷 *Elyra YouTube Play*\n\n' +
      `♡ - *Judul* : ${title}\n` +
      `♡ - *Channel* : ${channel}\n` +
      `♡ - *Durasi* : ${duration}\n` +
      '♡ - *Views* : ' +
      (
        video.views
          ? video.views.toLocaleString('id-ID')
          : '-'
      ) +
      '\n\n' +
      '© ERINE-AI'
    try {
      await sendLinkPreview(sock, m, {
        text: caption,
        title,
        description:
          `Channel: ${channel} | Durasi: ${duration}`,
        thumbnail,
        url: video.url,
        largeThumbnail: true
      })
    } catch (error) {
      console.error(
        '[PLAY] Link preview gagal:',
        error?.stack || error
      )
      try {
        await sendText(
          `${caption}\n\n${video.url}`
        )
      } catch (fallbackError) {
        console.error(
          '[PLAY] Fallback preview gagal:',
          fallbackError?.stack || fallbackError
        )
      }
    }

    try {
      await sendAudio(audioBuffer)

      await react('✅')
    } catch (error) {
      console.error(
        '[PLAY] Gagal mengirim audio:',
        error?.stack || error
      )

      await react('❌')

      try {
        await sendText(
          '❌ Audio berhasil diunduh, tetapi gagal dikirim ke WhatsApp.\n\n' +
          `› Detail: ${errorMessage(error)}`
        )
      } catch (sendError) {
        console.error(
          '[PLAY] Gagal mengirim laporan:',
          sendError?.stack || sendError
        )
      }
    }
  }
}