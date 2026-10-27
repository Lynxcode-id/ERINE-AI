import * as appSettings from '../../settings.js'
import uploadImage from '../../lib/uploadImage.js'

const settings =
  appSettings.settings ||
  appSettings.config ||
  appSettings.default ||
  {}

const API_URL = `${global.xrina}/canvas/igqc`

function isValidUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function getWitaTime() {
  const now = new Date()

  const day = new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    timeZone: 'Asia/Makassar'
  })
    .format(now)
    .toUpperCase()
    .replace(/\./g, '')

  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Makassar'
  }).format(now)

  return `${day} ${time}`
}

function normalizeTime(value) {
  if (!value) return getWitaTime()

  const input = value.trim().toUpperCase()

  if (/^\d{1,2}:\d{2}$/.test(input)) {
    const [hour, minute] = input.split(':').map(Number)

    if (hour > 23 || minute > 59) return null

    const day = getWitaTime().split(' ')[0]
    return `${day} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  const match = input.match(/^([A-ZÀ-Ý]{2,10})\s+(\d{1,2}):(\d{2})$/)

  if (!match) return null

  const [, day, hourText, minuteText] = match
  const hour = Number(hourText)
  const minute = Number(minuteText)

  if (hour > 23 || minute > 59) return null

  return `${day} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

async function downloadImage(target, sock, m) {
  let result

  if (target === m) {
    result = await sock.message.downloadBytes(m.raw?.message || m.raw)
  } else {
    result = await target.download()
  }

  const buffer = Buffer.isBuffer(result)
    ? result
    : Buffer.from(result || [])

  if (!buffer.length) {
    throw new Error('Foto gagal diunduh atau kosong.')
  }

  return buffer
}

async function getImageResponse(url) {
  let response = await fetch(url, {
    headers: {
      Accept: 'image/*',
      'User-Agent': 'Mozilla/5.0'
    },
    signal: AbortSignal.timeout(120000)
  })

  if (!response.ok) {
    throw new Error(`API merespons HTTP ${response.status}`)
  }

  let contentType = response.headers.get('content-type') || ''
  let media = Buffer.from(await response.arrayBuffer())

  if (contentType.toLowerCase().startsWith('image/')) {
    return {
      media,
      mimetype: contentType.split(';')[0]
    }
  }

  let data

  try {
    data = JSON.parse(media.toString('utf8'))
  } catch {
    throw new Error('API tidak mengembalikan gambar yang valid.')
  }

  const imageUrl =
    data?.url ||
    data?.image ||
    data?.result?.url ||
    data?.result?.image ||
    data?.data?.url ||
    data?.data?.image

  if (!imageUrl || !isValidUrl(imageUrl)) {
    throw new Error(data?.message || data?.error || 'URL hasil gambar tidak ditemukan.')
  }

  response = await fetch(imageUrl, {
    headers: {
      Accept: 'image/*',
      'User-Agent': 'Mozilla/5.0'
    },
    signal: AbortSignal.timeout(120000)
  })

  if (!response.ok) {
    throw new Error(`Gagal mengambil gambar hasil: HTTP ${response.status}`)
  }

  contentType = response.headers.get('content-type') || ''

  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error('URL hasil tidak mengarah ke gambar.')
  }

  media = Buffer.from(await response.arrayBuffer())

  return {
    media,
    mimetype: contentType.split(';')[0]
  }
}

function getHelp(m) {
  const prefix = m.prefix || '.'

  return [
    '🌷 *ELYRA — INSTAGRAM FAKE QC*',
    '━━━━━━━━━━━━━━━━━━',
    'Membuat gambar Instagram QC dari teks dan foto.',
    '',
    '✦ *Format penggunaan*',
    `${prefix}igqc teks|url_foto|waktu`,
    '',
    '✦ *Contoh dengan URL foto*',
    `${prefix}igqc ini mbgku kah 🩷|https://files.catbox.moe/quwz2g.jpg|SEN 12:34`,
    '',
    '✦ *Contoh waktu otomatis*',
    `${prefix}igqc halo semuanya|https://files.catbox.moe/quwz2g.jpg`,
    '',
    '✦ *Contoh reply foto*',
    'Reply foto kemudian ketik:',
    `${prefix}igqc ini mbgku kah 🩷|SEN 12:34`,
    '',
    'Atau gunakan waktu otomatis:',
    `${prefix}igqc ini mbgku kah 🩷`,
    '',
    '━━━━━━━━━━━━━━━━━━',
    'Waktu otomatis menggunakan zona Asia/Makassar (WITA).',
    '© ELYRA-AI'
  ].join('\n')
}

export default {
  command: 'igqc',
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar Instagram QC dari teks dan foto.',
  help: '<teks>|<url foto>|<waktu>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const input = Array.isArray(args) ? args.join(' ').trim() : ''

    if (!input || ['help', 'menu', '?'].includes(input.toLowerCase())) {
      return m.reply(getHelp(m))
    }

    const parts = input.split('|').map(part => part.trim())
    const text = parts[0]

    if (!text) {
      return m.reply('🍂 Teks Instagram QC tidak boleh kosong.')
    }

    if (text.length > 1000) {
      return m.reply('🍂 Teks terlalu panjang. Maksimal 1000 karakter.')
    }

    let imageUrl = ''
    let timeInput = ''

    if (parts.length >= 3) {
      imageUrl = parts[1]
      timeInput = parts.slice(2).join('|').trim()
    } else if (parts.length === 2) {
      if (isValidUrl(parts[1])) {
        imageUrl = parts[1]
      } else {
        timeInput = parts[1]
      }
    }

    if (imageUrl && !isValidUrl(imageUrl)) {
      return m.reply(
        '🍂 URL foto tidak valid.\n\n' +
        'Contoh:\n' +
        '.igqc ini mbgku kah 🩷|https://files.catbox.moe/quwz2g.jpg|SEN 12:34'
      )
    }

    const time = normalizeTime(timeInput)

    if (!time) {
      return m.reply(
        '🍂 Format waktu tidak valid.\n\n' +
        'Gunakan format seperti SEN 12:34 atau cukup 12:34.'
      )
    }

    const quoted = m.quoted
    const quotedIsImage = Boolean(
      quoted &&
      (
        quoted.mediaType === 'image' ||
        quoted.mimetype?.startsWith('image/') ||
        quoted.isMedia && /image/i.test(quoted.mediaType || '')
      )
    )

    const currentIsImage = Boolean(
      m.isMedia &&
      (
        m.mediaType === 'image' ||
        m.mimetype?.startsWith('image/') ||
        /image/i.test(m.mediaType || '')
      )
    )

    const imageTarget = quotedIsImage
      ? quoted
      : currentIsImage
        ? m
        : null

    try {
      if (!imageUrl && !imageTarget) {
        return m.reply(
          '🍂 Foto belum diberikan.\n\n' +
          'Kirim URL foto atau reply foto dengan perintah .igqc.'
        )
      }

      if (!imageUrl && imageTarget) {
        const buffer = await downloadImage(imageTarget, sock, m)
        const uploaded = await uploadImage(buffer)

        imageUrl = typeof uploaded === 'string'
          ? uploaded
          : uploaded?.url ||
            uploaded?.data?.url ||
            uploaded?.result?.url ||
            ''

        if (!isValidUrl(imageUrl)) {
          throw new Error('Gagal mendapatkan URL foto dari uploader.')
        }
      }

      const url = new URL(API_URL)
      url.searchParams.set('text', text)
      url.searchParams.set('url', imageUrl)
      url.searchParams.set('time', time)

      const { media, mimetype } = await getImageResponse(url.toString())

      if (!media.length) {
        throw new Error('Gambar hasil API kosong.')
      }

      return await m.reply({
        type: 'image',
        media,
        mimetype,
        caption: '© ELYRA-AI'
      })
    } catch (error) {
      console.error('[IGQC]', error?.stack || error?.message || error)

      return m.reply(
        settings.pesan?.error ||
        '🍂 Gagal membuat gambar Instagram QC. Coba lagi nanti.'
      )
    }
  }
}