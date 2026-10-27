import axios from 'axios'

const SITE_ORIGIN = 'https://spotmp3.net'
const API_BASE = `${SITE_ORIGIN}/api/v1`

const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'

const REQUEST_TIMEOUT = 20000
const JOB_TIMEOUT = 180000
const POLL_INTERVAL = 2500
const MAX_AUDIO_BYTES = 100 * 1024 * 1024

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))
class SpotMP3Api {
  constructor() {
    this.origin = SITE_ORIGIN
    this.baseUrl = API_BASE

    this.http = axios.create({
      timeout: REQUEST_TIMEOUT,
      maxRedirects: 5,

      validateStatus: status =>
        status >= 200 && status < 300,

      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: `${this.origin}/`,
        Origin: this.origin
      }
    })
  }

  resolveUrl(endpoint) {
    if (
      typeof endpoint !== 'string' ||
      !endpoint.trim()
    ) {
      throw new Error('Endpoint SpotMP3 tidak valid.')
    }

    if (/^https?:\/\//i.test(endpoint)) {
      return endpoint
    }

    if (endpoint.startsWith('/api/')) {
      return new URL(
        endpoint,
        this.origin
      ).toString()
    }

    const suffix = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`

    return `${this.baseUrl}${suffix}`
  }

  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      data,
      headers = {},
      timeout = REQUEST_TIMEOUT
    } = options

    const url = this.resolveUrl(endpoint)

    const response = await this.http.request({
      url,
      method,
      data,
      timeout,
      headers
    })

    const result = response.data

    if (
      result &&
      typeof result === 'object' &&
      result.error
    ) {
      throw new Error(
        result.error.message ||
        `Request SpotMP3 gagal: HTTP ${response.status}`
      )
    }

    return result
  }

  async search(query) {
    return this.request(
      `/search?q=${encodeURIComponent(query)}&limit=1&offset=0`
    )
  }

  async createJob(trackUrls, title) {
    return this.request('/jobs', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      data: {
        track_urls: trackUrls,
        title,
        lyrics: false
      }
    })
  }

  async getJob(jobUrl, timeout = REQUEST_TIMEOUT) {
    return this.request(jobUrl, {
      timeout
    })
  }
}

function unwrapData(data) {
  if (
    data?.job &&
    typeof data.job === 'object'
  ) {
    return data.job
  }

  if (
    data?.result &&
    typeof data.result === 'object'
  ) {
    return data.result
  }

  if (
    data?.data &&
    typeof data.data === 'object'
  ) {
    return data.data
  }

  return data || {}
}

function getJobStatus(data) {
  const job = unwrapData(data)

  const status =
    job?.status ??
    job?.state ??
    data?.job_status ??
    data?.state ??
    (
      typeof data?.status === 'string'
        ? data.status
        : ''
    )

  return String(status).toLowerCase()
}

function getJobTracks(data) {
  const job = unwrapData(data)

  const candidates = [
    job?.tracks,
    job?.result?.tracks,
    data?.tracks,
    data?.result?.tracks,
    data?.data?.tracks
  ]

  return candidates.find(
    Array.isArray
  ) || []
}

function getDownloadUrl(track) {
  const value =
    track?.download_url ||
    track?.downloadUrl ||
    track?.download ||
    track?.audio_url ||
    track?.audioUrl

  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return null
  }

  try {
    return new URL(
      value,
      SITE_ORIGIN
    ).toString()
  } catch {
    return null
  }
}

function getErrorMessage(error) {
  const status = error?.response?.status
  const responseData = error?.response?.data

  if (
    responseData &&
    typeof responseData === 'object'
  ) {
    const message =
      responseData?.error?.message ||
      responseData?.message

    if (message) {
      return status
        ? `HTTP ${status}: ${message}`
        : message
    }
  }

  if (status) {
    return `HTTP ${status}: ${error?.message || 'Request gagal.'}`
  }

  return error?.message ||
    String(error || 'Terjadi kesalahan.')
}


async function waitForJob(api, jobUrl) {
  const startTime = Date.now()
  const deadline = startTime + JOB_TIMEOUT

  const terminalStatuses = new Set([
    'completed',
    'partial',
    'failed',
    'cancelled',
    'canceled',
    'error',
    'success',
    'succeeded'
  ])
  let lastStatus = ''
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now()
    let response
    try {
      response = await api.getJob(
        jobUrl,
        Math.max(
          1000,
          Math.min(REQUEST_TIMEOUT, remaining)
        )
      )
    } catch (error) {
      console.warn(
        '[SPOTIFY PLAY] Polling job gagal:',
        getErrorMessage(error)
      )
      if (Date.now() >= deadline) {
        break
      }
      await sleep(
        Math.min(POLL_INTERVAL, deadline - Date.now())
      )
      continue
    }
    const data = unwrapData(response)
    const status = getJobStatus(response)
    if (status && status !== lastStatus) {
      console.log(
        `[SPOTIFY PLAY] Job status: ${status}`
      )
      lastStatus = status
    }
    if (terminalStatuses.has(status)) {
      return {
        ...data,
        status,
        tracks: getJobTracks(response)
      }
    }
    if (data?.completed === true) {
      return {
        ...data,
        status: 'completed',
        tracks: getJobTracks(response)
      }
    }
    const delay = Math.min(
      POLL_INTERVAL,
      deadline - Date.now()
    )
    if (delay > 0) {
      await sleep(delay)
    }
  }
  throw new Error(
    `Timeout menunggu job SpotMP3 setelah ${Math.round(JOB_TIMEOUT / 1000)} detik.`
  )
}

async function downloadBuffer(url, type = 'audio') {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',

    timeout: 60000,
    maxRedirects: 5,

    maxContentLength: MAX_AUDIO_BYTES,
    maxBodyLength: MAX_AUDIO_BYTES,

    headers: {
      'User-Agent': USER_AGENT,
      Accept: '*/*'
    }
  })
  const buffer = Buffer.from(response.data)
  if (!buffer.length) {
    throw new Error(
      `Server mengembalikan file ${type} kosong.`
    )
  }
  if (
    type === 'audio' &&
    buffer.length > MAX_AUDIO_BYTES
  ) {
    throw new Error(
      'Ukuran audio melebihi batas 100 MB.'
    )
  }
  const contentType = String(
    response.headers?.['content-type'] || ''
  ).toLowerCase()
  if (
    contentType.includes('text/html') ||
    contentType.includes('application/json')
  ) {
    throw new Error(
      `Server tidak mengembalikan file ${type}. Content-Type: ${contentType}`
    )
  }
  if (
    type === 'audio' &&
    buffer.length < 1024
  ) {
    throw new Error(
      'File audio terlalu kecil atau tidak valid.'
    )
  }
  return {
    buffer,
    mimetype:
      contentType.split(';')[0].trim() ||
      (
        type === 'audio'
          ? 'audio/mpeg'
          : 'image/jpeg'
      )
  }
}

export default {
  command: 'spotifyplay2',
  alias: ['splay2'],
  category: 'music',
  tags: ['music'],
  description:
    '> Memutar dan mengunduh musik dari Spotify menggunakan SpotMP3.\n\n' +
    'Contoh:\n' +
    '> `.spotifyplay2 shape of you`',
  help: '<judul lagu>',
  typing: true,
  wait: true,
  async execute(m, { sock, args }) {
    const query = args.join(' ').trim()
    const sendText = text =>
      sock.message.send(
        m.chat,
        text,
        {}
      )
    const react = emoji =>
      sock.sendReact(
        m.chat,
        emoji,
        m.id
      ).catch(() => {})
    if (!query) {
      return sendText(
        '🌷 *Elyra Spotify Downloader*\n\n' +
        'Masukkan judul lagu yang ingin diputar atau diunduh.\n\n' +
        `♡ Contoh: ${(m.prefix || '.')}${m.command || 'spotifyplay2'} shape of you\n\n` +
        '© ERINE-AI'
      )
    }
    await react('🌱')
    const api = new SpotMP3Api()
    try {
      const searchRes = await api.search(query)
      const sections = Array.isArray(
        searchRes?.sections
      )
        ? searchRes.sections
        : []
      const trackSection = sections.find(
        section =>
          section.type === 'track' ||
          section.type === 'tracks'
      )
      let items = Array.isArray(trackSection?.items)
        ? trackSection.items
        : []
      if (
        !items.length &&
        Array.isArray(searchRes?.items)
      ) {
        items = searchRes.items.filter(
          item =>
            item?.type === 'track' ||
            item?.track?.id
        )
      }
      if (!items.length) {
        await react('☘️')
        return sendText(
          `❌ Lagu tidak ditemukan untuk pencarian: ${query}`
        )
      }
      const rawTrack = items[0]
      const track = rawTrack.track ||
        rawTrack.data ||
        rawTrack
      const trackId = track.id
      const title =
        track.title ||
        track.name ||
        'Unknown Title'
      const artist =
        track.subtitle ||
        track.artist ||
        (
          Array.isArray(track.artists)
            ? track.artists
                .map(item => item.name || item)
                .join(', ')
            : 'Unknown Artist'
        )
      const album =
        track.album?.name ||
        track.album ||
        '-'
      const coverUrl =
        track.cover ||
        track.image ||
        track.thumbnail ||
        track.album?.cover ||
        ''
      const spotifyUrl =
        track.url ||
        (
          trackId
            ? `https://open.spotify.com/track/${trackId}`
            : ''
        )
      if (!spotifyUrl) {
        throw new Error(
          'Link Spotify tidak ditemukan pada hasil pencarian.'
        )
      }
      await sendText(
        '⏳ *Elyra Spotify Downloader*\n\n' +
        `♡ Judul: ${title}\n` +
        `♡ Artis: ${artist}\n\n` +
        'Sedang memproses audio. Mohon tunggu...'
      )
      const jobCreated = await api.createJob(
        [spotifyUrl],
        title
      )
      const created = unwrapData(jobCreated)
      const jobId =
        created.job_id ||
        created.jobId ||
        created.id ||
        jobCreated.job_id ||
        jobCreated.jobId ||
        jobCreated.id
      let jobUrl =
        created.job_url ||
        created.jobUrl ||
        jobCreated.job_url ||
        jobCreated.jobUrl
      if (!jobUrl && jobId) {
        jobUrl = `/api/v1/jobs/${jobId}`
      }
      if (
        typeof jobUrl !== 'string' ||
        !jobUrl.trim()
      ) {
        throw new Error(
          'Server tidak memberikan job_url atau job_id.'
        )
      }
      const jobData = await waitForJob(
        api,
        jobUrl
      )
      console.log(
        '[SPOTIFY PLAY] Job selesai:',
        jobData.status
      )
      if (
        jobData.status === 'failed' ||
        jobData.status === 'cancelled' ||
        jobData.status === 'canceled' ||
        jobData.status === 'error'
      ) {
        throw new Error(
          jobData.error?.message ||
          jobData.message ||
          'Proses audio gagal pada server SpotMP3.'
        )
      }
      const tracks = Array.isArray(jobData.tracks)
        ? jobData.tracks
        : []

      const finishedTrack =
        tracks.find(item =>
          item.id === trackId &&
          getDownloadUrl(item)
        ) ||
        tracks.find(item =>
          getDownloadUrl(item)
        )
      if (!finishedTrack) {
        throw new Error(
          'URL unduhan audio tidak ditemukan pada hasil job.'
        )
      }
      const mp3Url = getDownloadUrl(
        finishedTrack
      )
      const audioResult = await downloadBuffer(
        mp3Url,
        'audio'
      )
      let coverResult = null
      if (coverUrl) {
        try {
          coverResult = await downloadBuffer(
            coverUrl,
            'image'
          )
        } catch (error) {
          console.warn(
            '[SPOTIFY PLAY] Download cover gagal:',
            getErrorMessage(error)
          )
        }
      }
      let caption =
        '🌷 *Elyra Spotify Downloader*\n\n'
      caption += `♡ - *Judul* : ${title}\n`
      caption += `♡ - *Artis* : ${artist}\n`
      caption += `♡ - *Album* : ${album}\n`
      caption += `♡ - *Link* : ${spotifyUrl}\n\n`
      caption += '© ERINE-AI'
      let captionSent = false
      if (coverResult?.buffer) {
        try {
          await sock.message.send(
            m.chat,
            {
              type: 'image',
              media: coverResult.buffer,
              mimetype: coverResult.mimetype,
              caption
            },
            {}
          )
          captionSent = true
        } catch (error) {
          console.error(
            '[SPOTIFY PLAY] Gagal mengirim cover:',
            error?.stack || error
          )
        }
      }
      if (!captionSent) {
        await sendText(caption)
      }
      await sock.message.send(
        m.chat,
        {
          type: 'audio',
          media: audioResult.buffer,
          mimetype: 'audio/mpeg',
          ptt: false
        },
        {}
      )
      await react('💐')
    } catch (error) {
      console.error(
        '[SPOTIFY PLAY] Error:',
        error?.stack || error
      )
      await react('☘️')
      try {
        await sendText(
          '❌ *Spotify Downloader Gagal*\n\n' +
          `› Detail: ${getErrorMessage(error).slice(0, 500)}`
        )
      } catch (sendError) {
        console.error(
          '[SPOTIFY PLAY] Gagal mengirim pesan error:',
          sendError?.stack || sendError
        )
      }
    }
  }
}