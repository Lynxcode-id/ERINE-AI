import { settings } from '../../settings.js'
import uploadImage from '../../lib/uploadImage.js'
import {
  downloadImage,
  cropSquareCenter,
  isValidUrl,
  sniffImage
} from '../../lib/squareCrop.js'

const API_URL = `${global.xrina}/canvas/fakech`
const LINE = '━━━━━━━━━━━━━━━━━━'

const DEFAULT_FOLLOWERS = '192'
const DEFAULT_TIME = '12:50'

const usage = (m) => {
  const p = `${m.prefix || '.'}${m.command || 'fakech'}`

  return [
    '🌷 *ELYRA — FAKE CH*',
    LINE,
    'Buat gambar Fake CH menggunakan foto, nama, jumlah pengikut, dan jam.',
    '',
    '✦ *Reply foto*',
    `${p} inf project|192|12:50`,
    '(foto otomatis dipotong persegi dari tengah)',
    '',
    '✦ *Pakai URL foto*',
    `${p} URL_FOTO|inf project|192|12:50`,
    '',
    '✦ *Parameter*',
    '› Nama: nama yang ditampilkan',
    '› Pengikut: jumlah pengikut',
    '› Jam: format HH:MM',
    '',
    '✦ *Contoh*',
    `${p} inf project|192|12:50`,
    `${p} https://files.catbox.moe/quwz2g.jpg|inf project|192|12:50`,
    '',
    `› Pengikut default: ${DEFAULT_FOLLOWERS}`,
    `› Jam default: ${DEFAULT_TIME}`,
    LINE,
    '© ELYRA-AI'
  ].join('\n')
}

async function fetchImageBuffer(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'image/*',
      'User-Agent': 'Mozilla/5.0'
    },
    signal: AbortSignal.timeout(60000)
  })

  if (!response.ok) {
    throw new Error(`Gagal mengambil foto. HTTP ${response.status}`)
  }

  const contentLength = Number(
    response.headers.get('content-length') || 0
  )

  if (contentLength > 20 * 1024 * 1024) {
    throw new Error('Ukuran foto terlalu besar. Maksimal 20 MB.')
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  if (!buffer.length) {
    throw new Error('Foto yang diunduh kosong.')
  }

  if (buffer.length > 20 * 1024 * 1024) {
    throw new Error('Ukuran foto terlalu besar. Maksimal 20 MB.')
  }

  const mimetype = sniffImage(
    buffer,
    response.headers.get('content-type') || ''
  )

  if (!mimetype) {
    throw new Error('URL tidak mengembalikan gambar yang valid.')
  }

  return buffer
}

function parseFollowers(value) {
  const input = String(value || '').trim()

  if (!/^\d{1,12}$/.test(input)) {
    throw new Error(
      'Jumlah pengikut harus berupa angka. Contoh: 192.'
    )
  }

  return input
}

function parseTime(value) {
  const input = String(value || '').trim()
  const match = input.match(/^(\d{1,2}):([0-5]\d)$/)

  if (!match) {
    throw new Error(
      'Format jam tidak valid. Gunakan HH:MM, contoh 12:50.'
    )
  }

  const hour = Number(match[1])

  if (hour < 0 || hour > 23) {
    throw new Error('Jam harus berada di antara 00:00–23:59.')
  }

  return `${String(hour).padStart(2, '0')}:${match[2]}`
}

async function prepareProfileImage(pp, target, sock, m) {
  let imageBuffer

  if (pp) {
    imageBuffer = await fetchImageBuffer(pp)
  } else {
    if (!target) {
      throw new Error(
        'Foto tidak ditemukan. Reply foto atau gunakan URL foto.'
      )
    }

    imageBuffer = await downloadImage(target, sock, m)
  }

  if (!imageBuffer || !imageBuffer.length) {
    throw new Error('Gagal mendapatkan data foto.')
  }

  const square = await cropSquareCenter(imageBuffer)

  if (!square || !square.length) {
    throw new Error('Gagal memotong foto menjadi persegi.')
  }

  const uploaded = await uploadImage(square)

  const uploadedUrl = typeof uploaded === 'string'
    ? uploaded
    : uploaded?.url

  if (!uploadedUrl || !isValidUrl(uploadedUrl)) {
    throw new Error('Gagal mendapatkan URL foto dari uploader.')
  }

  return uploadedUrl
}

async function generateFakeCH(pp, nama, pengikut, jam) {
  const url = new URL(API_URL)

  url.searchParams.set('pp', pp)
  url.searchParams.set('nama', nama)
  url.searchParams.set('pengikut', pengikut)
  url.searchParams.set('jam', jam)

  const response = await fetch(url, {
    headers: {
      Accept: 'image/*',
      'User-Agent': 'Mozilla/5.0'
    },
    signal: AbortSignal.timeout(120000)
  })

  if (!response.ok) {
    throw new Error(`API merespons HTTP ${response.status}.`)
  }

  const media = Buffer.from(await response.arrayBuffer())

  if (!media.length) {
    throw new Error('Gambar hasil API kosong.')
  }

  const mimetype = sniffImage(
    media,
    response.headers.get('content-type') || ''
  )

  if (!mimetype) {
    const message = media.toString('utf8').slice(0, 200)

    throw new Error(
      `API tidak mengembalikan gambar yang valid. ${message}`
    )
  }

  return { media, mimetype }
}

export default {
  command: 'fakech',
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar Fake CH dengan foto, nama, pengikut, dan jam.',
  help: '[URL foto|]nama|pengikut|jam',
  typing: true,
  wait: true,

  async execute(m, { sock, args = [] }) {
    const text = (
      Array.isArray(args) ? args.join(' ') : String(args || '')
    ).trim()

    if (!text || ['help', 'menu', '?'].includes(text.toLowerCase())) {
      return m.reply(usage(m))
    }

    try {
      const parts = text.split('|').map(s => s.trim())

      let pp = ''

      if (isValidUrl(parts[0])) {
        pp = parts.shift()
      }

      if (parts.length < 1 || parts.length > 3) {
        throw new Error(
          'Format salah. Gunakan nama|pengikut|jam atau URL_FOTO|nama|pengikut|jam.'
        )
      }

      const nama = parts[0] || ''
      const pengikut = parseFollowers(
        parts[1] || DEFAULT_FOLLOWERS
      )
      const jam = parseTime(
        parts[2] || DEFAULT_TIME
      )

      if (!nama) {
        throw new Error('Nama tidak boleh kosong.')
      }

      if (nama.length > 40) {
        throw new Error('Nama maksimal 40 karakter.')
      }

      const target = m.quoted?.isMedia &&
        /image/i.test(
          m.quoted.mediaType ||
          m.quoted.mime ||
          ''
        )
        ? m.quoted
        : (
          m.isMedia &&
          /image/i.test(
            m.mediaType ||
            m.mime ||
            ''
          )
            ? m
            : null
        )

      if (!pp && !target) {
        throw new Error(
          'Reply foto atau gunakan URL foto terlebih dahulu.'
        )
      }

      pp = await prepareProfileImage(pp, target, sock, m)

      const { media, mimetype } = await generateFakeCH(
        pp,
        nama,
        pengikut,
        jam
      )

      return await m.reply({
        type: 'image',
        media,
        mimetype,
        caption: [
          '🌷 *ELYRA — FAKE CH*',
          LINE,
          `› Nama: ${nama}`,
          `› Pengikut: ${pengikut}`,
          `› Jam: ${jam}`,
          '',
          '› Status: Berhasil dibuat',
          LINE,
          '© ELYRA-AI'
        ].join('\n')
      })
    } catch (err) {
      console.error(
        '[FAKECH]',
        err?.stack || err?.message || err
      )

      return m.reply(
        settings.pesan?.error ||
        '🍂 Gagal membuat gambar Fake CH. Coba lagi nanti.'
      )
    }
  }
}