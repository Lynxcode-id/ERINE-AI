import sharp from 'sharp'
import { settings } from '../../settings.js'
import uploadImage from '../../lib/uploadImage.js'

const API_URL = `${global.xrina}/canvas/fakeml`
const RANKS = ['epic', 'glory', 'gm', 'honor', 'imo', 'legend', 'mawi']
const MAX_BORDER = 16
const MAX_SIDE = 1024

function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value
  if (value instanceof ArrayBuffer) return Buffer.from(value)
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  }
  return Buffer.from(value || [])
}

async function getImageBuffer(target, sock, m) {
  const downloaded = target === m
    ? await sock.message.downloadBytes(m.raw)
    : await target.download()

  const buffer = toBuffer(downloaded)

  if (!buffer.length) {
    throw new Error('Foto avatar kosong atau gagal diunduh.')
  }

  return buffer
}

async function cropSquareCenter(buffer) {
  const { data, info } = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .toBuffer({ resolveWithObject: true })

  const side = Math.min(info.width, info.height)
  const left = Math.floor((info.width - side) / 2)
  const top = Math.floor((info.height - side) / 2)

  let img = sharp(data, { failOn: 'none' })
    .extract({ left, top, width: side, height: side })

  if (side > MAX_SIDE) img = img.resize(MAX_SIDE, MAX_SIDE)

  return info.hasAlpha
    ? img.png().toBuffer()
    : img.jpeg({ quality: 92 }).toBuffer()
}

function isValidUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function getUsage(m) {
  const prefix = m.prefix || '.'
  const command = m.command || 'fakeml'

  return [
    '🌷 *ELYRA — FAKE MOBILE LEGENDS*',
    '━━━━━━━━━━━━━━━━━━',
    'Buat gambar lobby Mobile Legends menggunakan avatar, username, rank, dan border.',
    '',
    '✦ *Format dengan URL avatar*',
    `${prefix}${command} URL_AVATAR|username|rank|border`,
    '',
    '✦ *Format dengan reply foto*',
    `${prefix}${command} username|rank|border`,
    '(foto otomatis dipotong 1:1 dari tengah)',
    '',
    '✦ *Pilihan Rank*',
    '› epic',
    '› glory',
    '› gm',
    '› honor',
    '› imo',
    '› legend',
    '› mawi',
    '',
    '✦ *Pilihan Border*',
    '› Angka 0 sampai 16',
    '',
    '━━━━━━━━━━━━━━━━━━',
    '*Contoh URL avatar:*',
    `${prefix}${command} https://files.catbox.moe/quwz2g.jpg|about you|epic|0`,
    '',
    '*Contoh reply foto:*',
    `${prefix}${command} Lynx decode|glory|5`,
    `${prefix}${command} Dinda Novelina|legend|12`,
    `${prefix}${command} about you|gm|16`,
    '',
    '━━━━━━━━━━━━━━━━━━',
    '© ELYRA-AI'
  ].join('\n')
}

export default {
  command: 'fakeml',
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar Fake Lobby Mobile Legends dari avatar, username, rank, dan border.',
  help: '[URL avatar|]username|rank|border',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const text = Array.isArray(args) ? args.join(' ').trim() : ''

    if (!text || ['help', 'menu', '?'].includes(text.toLowerCase())) {
      return m.reply(getUsage(m))
    }

    const parts = text.split('|').map(part => part.trim())

    let avatar = ''
    let username = ''
    let rank = 'epic'
    let border = '0'

    const firstIsUrl = isValidUrl(parts[0])
    const target = m.quoted?.isMedia && /image/i.test(m.quoted.mediaType || '')
      ? m.quoted
      : (
          m.isMedia && /image/i.test(m.mediaType || '')
            ? m
            : null
        )

    if (firstIsUrl) {
      if (parts.length < 2 || parts.length > 4) {
        return m.reply(
          '🍂 Format URL avatar tidak valid.\n\n' +
          'Contoh:\n' +
          '.fakeml https://files.catbox.moe/quwz2g.jpg|Lynx decode|epic|0'
        )
      }

      avatar = parts[0]
      username = parts[1]
      rank = parts[2] || 'epic'
      border = parts[3] || '0'
    } else {
      if (!target) {
        return m.reply(
          '🍂 Kirim URL avatar atau reply foto terlebih dahulu.\n\n' +
          'Contoh:\n' +
          '.fakeml https://files.catbox.moe/quwz2g.jpg|Lynx decode|epic|0\n\n' +
          'Atau reply foto:\n' +
          '.fakeml Lynx decode|glory|5'
        )
      }

      if (parts.length < 1 || parts.length > 3) {
        return m.reply(
          '🍂 Format tidak valid.\n\n' +
          'Contoh:\n' +
          '.fakeml Lynx decode|glory|5'
        )
      }

      username = parts[0]
      rank = parts[1] || 'epic'
      border = parts[2] || '0'
    }

    if (!username) {
      return m.reply('🍂 Username tidak boleh kosong.')
    }

    if (username.length > 50) {
      return m.reply('🍂 Username maksimal 50 karakter.')
    }

    rank = rank.toLowerCase()

    if (!RANKS.includes(rank)) {
      return m.reply(
        '🍂 Rank tidak valid.\n\n' +
        `Pilihan rank: ${RANKS.join(', ')}`
      )
    }

    if (!/^\d+$/.test(border)) {
      return m.reply('🍂 Border harus berupa angka dari 0 sampai 16.')
    }

    const borderNumber = Number(border)

    if (borderNumber < 0 || borderNumber > MAX_BORDER) {
      return m.reply('🍂 Pilihan border hanya tersedia dari 0 sampai 16.')
    }

    try {
      if (!avatar) {
        const original = await getImageBuffer(target, sock, m)
        const square = await cropSquareCenter(original)
        const uploaded = await uploadImage(square)

        avatar = typeof uploaded === 'string'
          ? uploaded
          : uploaded?.url

        if (!avatar || !isValidUrl(avatar)) {
          throw new Error('Gagal mendapatkan URL avatar dari uploader.')
        }
      }

      const url = new URL(API_URL)
      url.searchParams.set('avatar', avatar)
      url.searchParams.set('username', username)
      url.searchParams.set('rank', rank)
      url.searchParams.set('border', String(borderNumber))

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'image/*',
          'User-Agent': 'Mozilla/5.0'
        },
        signal: AbortSignal.timeout(120000)
      })

      if (!response.ok) {
        throw new Error(`API merespons HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || ''
      const media = Buffer.from(await response.arrayBuffer())

      if (!media.length) {
        throw new Error('Gambar hasil API kosong.')
      }

      const isPng =
        media.length >= 8 &&
        media[0] === 0x89 &&
        media[1] === 0x50 &&
        media[2] === 0x4e &&
        media[3] === 0x47

      const isJpeg =
        media.length >= 3 &&
        media[0] === 0xff &&
        media[1] === 0xd8 &&
        media[2] === 0xff

      const isWebp =
        media.length >= 12 &&
        media.toString('ascii', 0, 4) === 'RIFF' &&
        media.toString('ascii', 8, 12) === 'WEBP'

      const headerIsImage = isPng || isJpeg || isWebp
      const contentIsImage = contentType.toLowerCase().startsWith('image/')

      if (!headerIsImage && !contentIsImage) {
        throw new Error(
          `API tidak mengembalikan gambar: ${media.toString('utf8').slice(0, 200)}`
        )
      }

      const mimetype = isPng
        ? 'image/png'
        : isWebp
          ? 'image/webp'
          : isJpeg
            ? 'image/jpeg'
            : contentType.split(';')[0]

      return await m.reply({
        type: 'image',
        media,
        mimetype,
        caption: [
          '🌷 *Fake Mobile Legends*',
          '',
          `› Username: ${username}`,
          `› Rank: ${rank}`,
          `› Border: ${borderNumber}`,
          '',
          '© ELYRA-AI'
        ].join('\n')
      })
    } catch (error) {
      console.error('[FAKEML]', error?.stack || error?.message || error)

      return m.reply(
        settings.pesan?.error ||
        '🍂 Gagal membuat gambar Mobile Legends. Coba lagi nanti.'
      )
    }
  }
}