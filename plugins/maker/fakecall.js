import { config } from '../../settings.js'
import uploadImage from '../../lib/uploadImage.js'

const API_URL = `${global.xrina}/canvas/call-andro`

function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value)
  }

  if (ArrayBuffer.isView(value)) {
    return Buffer.from(
      value.buffer,
      value.byteOffset,
      value.byteLength
    )
  }

  return Buffer.from(value || [])
}

function isValidUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function parseDuration(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,3}):([0-5]\d):([0-5]\d)$/)

  if (!match) {
    throw new Error(
      'Format durasi salah. Gunakan HH:MM:SS, contoh 01:01:01.'
    )
  }

  return `${match[1].padStart(2, '0')}:${match[2]}:${match[3]}`
}

async function getImageBuffer(target, sock, m) {
  const downloaded = target === m
    ? await sock.message.downloadBytes(m.raw)
    : await target.download()

  const buffer = toBuffer(downloaded)

  if (!buffer.length) {
    throw new Error('Foto kosong atau gagal diunduh.')
  }

  return buffer
}

async function getImageResponse(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'image/*',
      'User-Agent': 'Mozilla/5.0'
    },
    signal: AbortSignal.timeout(120000)
  })

  const contentType = String(
    response.headers.get('content-type') || ''
  ).split(';')[0].trim().toLowerCase()

  const buffer = Buffer.from(await response.arrayBuffer())

  if (!response.ok) {
    let message = buffer.toString('utf8').slice(0, 250)

    try {
      const json = JSON.parse(message)
      message = json.message || json.error || message
    } catch {}

    throw new Error(
      `API merespons HTTP ${response.status}. ${message}`
    )
  }

  if (!buffer.length) {
    throw new Error('API mengembalikan gambar kosong.')
  }

  const isPng = buffer.subarray(0, 8).equals(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  )

  const isJpeg =
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff

  const isWebp =
    buffer.subarray(0, 4).toString() === 'RIFF' &&
    buffer.subarray(8, 12).toString() === 'WEBP'

  const isGif = buffer.subarray(0, 6).toString().startsWith('GIF8')

  let mimetype = isPng
    ? 'image/png'
    : isJpeg
      ? 'image/jpeg'
      : isWebp
        ? 'image/webp'
        : isGif
          ? 'image/gif'
          : contentType

  if (!mimetype.startsWith('image/')) {
    let message = buffer.toString('utf8').slice(0, 250)

    try {
      const json = JSON.parse(message)
      message = json.message || json.error || message
    } catch {}

    throw new Error(
      `API tidak mengembalikan gambar yang valid. ${message}`
    )
  }

  return { buffer, mimetype }
}

function getUsage(m) {
  const prefix = m.prefix || '.'
  const command = m.command || 'callandro'

  return [
    '🌷 *ELYRA — CALL ANDROID*',
    '━━━━━━━━━━━━━━━━━━',
    'Membuat gambar panggilan Android dari foto pilihanmu.',
    '',
    '✦ *Reply foto*',
    `› ${prefix}${command} my bubub saya|01:01:01`,
    '',
    '✦ *Menggunakan URL foto*',
    `› ${prefix}${command} https://files.catbox.moe/quwz2g.jpg|my bubub saya|01:01:01`,
    '',
    '✦ *Format durasi*',
    '› HH:MM:SS',
    '',
    '━━━━━━━━━━━━━━━━━━',
    '© ELYRA-AI'
  ].join('\n')
}

export default {
  command: 'callandro',
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar panggilan Android menggunakan foto, nama, dan durasi.',
  help: '[URL foto|]nama|durasi',
  typing: true,
  wait: true,

  async execute(m, { sock, args = [] }) {
    const input = Array.isArray(args)
      ? args.join(' ').trim()
      : String(args || '').trim()

    if (!input || ['help', 'menu', '?'].includes(input.toLowerCase())) {
      return m.reply(getUsage(m))
    }

    try {
      const parts = input
        .split('|')
        .map(part => part.trim())

      let pp = ''
      let nama = ''
      let durasi = ''

      if (parts.length === 3 && isValidUrl(parts[0])) {
        pp = parts[0]
        nama = parts[1]
        durasi = parts[2]
      } else if (parts.length === 2) {
        nama = parts[0]
        durasi = parts[1]
      } else {
        throw new Error(
          'Format salah. Gunakan nama|durasi atau URL_foto|nama|durasi.'
        )
      }

      if (!nama) {
        throw new Error('Nama panggilan tidak boleh kosong.')
      }

      if (nama.length > 80) {
        throw new Error('Nama panggilan maksimal 80 karakter.')
      }

      durasi = parseDuration(durasi)

      if (!pp) {
        const target = m.quoted?.isMedia &&
          /image/i.test(m.quoted.mediaType || m.quoted.mime || '')
          ? m.quoted
          : m.isMedia &&
            /image/i.test(m.mediaType || '')
            ? m
            : null

        if (!target) {
          throw new Error(
            'Foto tidak ditemukan. Reply foto atau kirim foto dengan caption perintah.'
          )
        }

        const buffer = await getImageBuffer(target, sock, m)
        const uploaded = await uploadImage(buffer)

        pp = typeof uploaded === 'string'
          ? uploaded
          : uploaded?.url

        if (!pp || !isValidUrl(pp)) {
          throw new Error('Gagal mendapatkan URL foto dari uploader.')
        }
      }

      const url = new URL(API_URL)
      url.searchParams.set('pp', pp)
      url.searchParams.set('nama', nama)
      url.searchParams.set('durasi', durasi)

      const { buffer, mimetype } = await getImageResponse(
        url.toString()
      )

      await m.reply({
        type: 'image',
        media: buffer,
        mimetype,
        caption: [
          '🌷 *ELYRA — CALL ANDROID*',
          '━━━━━━━━━━━━━━━━━━',
          `› Nama: ${nama}`,
          `› Durasi: ${durasi}`,
          '› Status: Berhasil dibuat',
          '━━━━━━━━━━━━━━━━━━',
          '© ELYRA-AI'
        ].join('\n')
      })
    } catch (error) {
      console.error(
        '[CALLANDRO]',
        error?.stack || error?.message || error
      )

      return m.reply(
        `${config.pesan?.error || '🍂 Terjadi kesalahan, coba lagi nanti.'}\n\n` +
        `› Detail: ${String(
          error?.message || 'Gagal membuat gambar.'
        ).slice(0, 400)}`
      )
    }
  }
}