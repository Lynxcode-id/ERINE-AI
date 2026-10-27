import yts from 'yt-search'
import axios from 'axios'
import { convertMediaBuffer } from '../../lib/mediaConvert.js'
import { sendLinkPreview, sendVN } from '../../lib/function.js'
import {
  isAllowedChannel,
  isNewsletterJid,
  normalizeChannelJid
} from '../../lib/saluran.js'

const FOOTER = 'with love, elyra !!'
const API_URL = `${global.theresav}/api/download/ytmp3`
const API_KEY = global.apikey.theresav
const MAX_SECONDS = 15 * 60
const MAX_VN_BYTES = 16 * 1024 * 1024
const MAX_AUDIO_BYTES = 100 * 1024 * 1024

const shown = m => m.prefix || '.'
const num = value => (
  value ? Number(value).toLocaleString('id-ID') : '-'
)

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, audio/mpeg, audio/*, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Connection': 'keep-alive'
}

function readMpegFrameLength(buffer, offset) {
  if (offset + 4 > buffer.length) return 0

  const b0 = buffer[offset]
  const b1 = buffer[offset + 1]
  const b2 = buffer[offset + 2]

  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) return 0

  const version = (b1 >> 3) & 0x03
  const layer = (b1 >> 1) & 0x03
  const bitrateIndex = (b2 >> 4) & 0x0f
  const sampleIndex = (b2 >> 2) & 0x03
  const padding = (b2 >> 1) & 0x01

  if (version === 1 || layer === 0) return 0
  if (bitrateIndex === 0 || bitrateIndex === 15) return 0
  if (sampleIndex === 3) return 0

  const mpeg1Bitrates = {
    3: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
    2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
    1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
  }

  const mpeg2Bitrates = {
    3: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    1: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
  }

  const sampleRates = [44100, 48000, 32000]
  let sampleRate = sampleRates[sampleIndex]

  if (version === 2) sampleRate /= 2
  if (version === 0) sampleRate /= 4

  const tables = version === 3 ? mpeg1Bitrates : mpeg2Bitrates
  const bitrate = tables[layer]?.[bitrateIndex] * 1000

  if (!bitrate || !sampleRate) return 0

  if (layer === 3) {
    return Math.floor(12 * bitrate / sampleRate + padding) * 4
  }

  if (layer === 1 && version !== 3) {
    return Math.floor(72 * bitrate / sampleRate) + padding
  }

  return Math.floor(144 * bitrate / sampleRate) + padding
}

function isValidMp3(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1024) {
    return false
  }

  const searchLimit = Math.min(buffer.length - 4, 1024 * 1024)

  for (let offset = 0; offset < searchLimit; offset++) {
    const frameLength = readMpegFrameLength(buffer, offset)

    if (!frameLength) continue

    const nextOffset = offset + frameLength

    if (nextOffset + 4 > buffer.length) continue

    if (readMpegFrameLength(buffer, nextOffset)) {
      return true
    }
  }

  return false
}

function getPayloadPreview(buffer) {
  return Buffer.from(buffer)
    .subarray(0, 500)
    .toString('utf8')
    .replace(/[^\x20-\x7e\n\r\t]/g, '')
    .trim()
    .slice(0, 180)
}

function isErrorPayload(buffer, contentType = '') {
  const preview = getPayloadPreview(buffer)
  const text = preview.trimStart().toLowerCase()

  if (/text\/html|application\/json/i.test(contentType)) {
    return true
  }

  return (
    text.startsWith('<!doctype html') ||
    text.startsWith('<html') ||
    text.startsWith('{"status":false') ||
    text.startsWith('{"error"') ||
    text.startsWith('{"message"') ||
    text.startsWith('{"success":false') ||
    text.startsWith('access denied') ||
    text.startsWith('forbidden') ||
    text.startsWith('too many requests')
  )
}

function detectAudioMime(buffer, contentType = '') {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    throw new Error('File audio kosong atau tidak lengkap.')
  }

  if (isErrorPayload(buffer, contentType)) {
    const details = getPayloadPreview(buffer)

    throw new Error(
      `Server mengembalikan respons error, bukan audio. ${details || 'Respons tidak valid.'}`
    )
  }

  if (isValidMp3(buffer)) {
    return 'audio/mpeg'
  }

  if (buffer.subarray(0, 4).toString() === 'OggS') {
    return 'audio/ogg'
  }

  if (buffer.subarray(0, 4).toString() === 'fLaC') {
    return 'audio/flac'
  }

  if (
    buffer.subarray(0, 4).toString() === 'RIFF' &&
    buffer.subarray(8, 12).toString() === 'WAVE'
  ) {
    return 'audio/wav'
  }

  if (buffer.subarray(4, 8).toString() === 'ftyp') {
    return 'audio/mp4'
  }

  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return 'audio/webm'
  }

  throw new Error(
    `File yang diunduh bukan audio valid. Content-Type: ${contentType || 'tidak diketahui'}.`
  )
}

async function getTrack(videoUrl) {
  const { data } = await axios.get(API_URL, {
    params: {
      url: videoUrl
    },
    headers: {
      ...HEADERS,
      'x-apikey': API_KEY
    },
    timeout: 90000,
    maxRedirects: 5
  })

  if (data?.status !== true) {
    throw new Error(
      data?.message || 'API TheresaV gagal memproses video.'
    )
  }

  if (!data?.download_url || typeof data.download_url !== 'string') {
    throw new Error('API tidak mengembalikan download_url.')
  }

  let downloadUrl

  try {
    downloadUrl = new URL(data.download_url)
  } catch {
    throw new Error('URL audio dari API tidak valid.')
  }

  if (!['http:', 'https:'].includes(downloadUrl.protocol)) {
    throw new Error('Protokol URL audio tidak didukung.')
  }

  return data
}

async function downloadAudio(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 180000,
    maxRedirects: 10,
    maxContentLength: MAX_AUDIO_BYTES,
    maxBodyLength: MAX_AUDIO_BYTES,
    headers: {
      ...HEADERS,
      'Accept': 'audio/mpeg, audio/*, application/octet-stream, */*'
    },
    validateStatus: status => status >= 200 && status < 300
  })

  const audio = Buffer.from(response.data || [])
  const contentType = String(
    response.headers?.['content-type'] || ''
  ).split(';')[0].trim().toLowerCase()

  if (audio.length < 1024) {
    throw new Error('File audio kosong atau terlalu kecil.')
  }

  if (audio.length > MAX_AUDIO_BYTES) {
    throw new Error('Ukuran audio melebihi batas 100 MB.')
  }

  const inputMime = detectAudioMime(audio, contentType)

  return {
    audio,
    inputMime
  }
}

async function react(sock, m, emoji) {
  if (isNewsletterJid(m.chat)) return

  await sock.sendReact(
    m.chat,
    emoji,
    m.key || m.id
  ).catch(() => {})
}

function getErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status

    if (status === 401 || status === 403) {
      return 'API menolak akses. Periksa API key TheresaV.'
    }

    if (status === 404) {
      return 'Endpoint atau file audio tidak ditemukan.'
    }

    if (status === 429) {
      return 'API sedang membatasi permintaan. Coba lagi nanti.'
    }

    if (status >= 500) {
      return 'Server API sedang bermasalah. Coba lagi nanti.'
    }

    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    ) {
      return 'Permintaan timeout. Coba lagi beberapa saat.'
    }

    if (status) {
      return `Permintaan API gagal dengan HTTP ${status}.`
    }

    return 'Tidak dapat mengakses server API. Periksa koneksi bot.'
  }

  return error?.message || 'Terjadi kesalahan yang tidak diketahui.'
}

export default {
  command: 'playch',
  alias: ['playsaluran', 'playchannel'],
  category: 'music',

  description: `> Memutar lagu YouTube sebagai link preview dan voice note, termasuk di saluran.

*Keterangan Format:*
> <judul> = judul atau kata kunci lagu.
> | <idch> = opsional, khusus owner, untuk mengirim ke saluran tujuan yang sudah ditambahkan.

Contoh penggunaan:
> .playch about you the 1975
> .playch about you the 1975 | 120363400612665352`,

  help: '<judul> [| idch]',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const raw = args.join(' ').trim()
    const [queryPart, targetPart] = raw
      .split('|')
      .map(value => value.trim())

    if (!queryPart) {
      return m.reply([
        '🌷 *Elyra Play Channel*',
        '',
        'Putar lagu YouTube sebagai link preview',
        'dan voice note, termasuk di saluran.',
        '',
        `♡ ${shown(m)}${m.command} <judul>`,
        `♡ ${shown(m)}${m.command} <judul> | <idch>`,
        '',
        FOOTER
      ].join('\n'))
    }

    let chat = m.chat

    if (targetPart) {
      if (!m.isOwner) {
        return m.reply('Kirim ke saluran lain hanya untuk owner.')
      }

      const jid = normalizeChannelJid(targetPart)

      if (!jid || !isAllowedChannel(jid)) {
        return m.reply(
          `Saluran tujuan belum ditambahkan. Pakai ${shown(m)}addsaluran dulu.`
        )
      }

      chat = jid
    }

    await react(sock, m, '🌱')

    try {
      const search = await yts(queryPart)
      const video = search?.videos?.[0]

      if (!video) {
        await react(sock, m, '☘️')
        return m.reply('Lagu tidak ditemukan di YouTube.')
      }

      if (Number(video.seconds) > MAX_SECONDS) {
        await react(sock, m, '☘️')

        return m.reply(
          `Durasi lagu terlalu panjang (${video.timestamp || '-'}). Maksimal ${MAX_SECONDS / 60} menit.`
        )
      }

      const track = await getTrack(video.url)
      const duration = Number(track.duration_sec || video.seconds || 0)

      if (duration > MAX_SECONDS) {
        await react(sock, m, '☘️')

        return m.reply(
          `Durasi lagu terlalu panjang. Maksimal ${MAX_SECONDS / 60} menit.`
        )
      }

      const title = track.title || video.title || '-'
      const channelName = track.channel || video.author?.name || '-'
      const timestamp = video.timestamp || track.duration || '-'
      const thumbnail = track.thumbnail || video.thumbnail || video.image || null
      const views = track.view_count ?? video.views

      const { audio, inputMime } = await downloadAudio(
        track.download_url
      )

      const vn = await convertMediaBuffer(audio, {
        inputMime,
        outputExtension: 'ogg',
        outputArgs: [
          '-vn',
          '-map_metadata', '-1',
          '-c:a', 'libopus',
          '-b:a', '48k',
          '-ar', '48000',
          '-ac', '1'
        ]
      })

      if (!Buffer.isBuffer(vn) || vn.length < 1024) {
        throw new Error(
          'Konversi voice note gagal atau menghasilkan file kosong.'
        )
      }

      if (vn.length > MAX_VN_BYTES) {
        throw new Error('Hasil voice note melebihi batas ukuran.')
      }

      await sendLinkPreview(sock, m, {
        chat,
        url: video.url,
        title,
        description: `${channelName} • ${timestamp}`,
        thumbnail,
        text: [
          '🌷 *Elyra Play Channel*',
          '- Enjoy listening to your favorite music.',
          '',
          `♡ - Judul : ${title}`,
          `♡ - Channel : ${channelName}`,
          `♡ - Durasi : ${timestamp}`,
          `♡ - Views : ${num(views)}`,
          `♡ - Link : ${video.url}`,
          '',
          FOOTER
        ].join('\n')
      })

      await sendVN(sock, m, vn, { chat })

      await react(sock, m, '💐')
    } catch (error) {
      console.error(
        '[PLAYCH]',
        error?.response?.status || '',
        error?.stack || error?.message || error
      )

      await react(sock, m, '☘️')

      return m.reply(
        `❌ Gagal memutar lagu: ${getErrorMessage(error)}`
      )
    }
  }
}