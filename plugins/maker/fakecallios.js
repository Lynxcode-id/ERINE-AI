import { settings } from '../../settings.js'
import uploadImage from '../../lib/uploadImage.js'
import { downloadImage, cropSquareCenter, isValidUrl, sniffImage } from '../../lib/squareCrop.js'

const API_URL = `${global.xrina}/canvas/call-ios`
const LINE = '━━━━━━━━━━━━━━━━━━'
const DEFAULT_DURATION = '00:30'

const usage = (m) => {
  const p = `${m.prefix || '.'}${m.command || 'callios'}`
  return [
    '🌷 *ELYRA — FAKE CALL iOS*',
    LINE,
    'Buat gambar panggilan iPhone dengan foto profil, nama, dan durasi.',
    '',
    '✦ *Reply foto*',
    `${p} nama|durasi`,
    '(foto otomatis dipotong 1:1 dari tengah)',
    '',
    '✦ *Pakai URL foto*',
    `${p} URL_FOTO|nama|durasi`,
    '',
    '✦ *Durasi*',
    `› Format mm:ss atau jj:mm:dd, contoh 10:12:51`,
    `› Kosong = ${DEFAULT_DURATION}`,
    '',
    LINE,
    '*Contoh:*',
    `${p} my bubub|10:12:51`,
    `${p} Mama|05:30`,
    `${p} https://files.catbox.moe/quwz2g.jpg|my bubub|10:12:51`,
    LINE,
    '© ELYRA-AI'
  ].join('\n')
}

export default {
  command: 'callios',
  alias: ['fakecallios', 'iphonecall', 'fakeios'],
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar Fake Call iOS dari foto profil, nama, dan durasi. Foto dipotong 1:1 dari tengah.',
  help: '[URL foto|]nama|durasi',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const text = (Array.isArray(args) ? args.join(' ') : '').trim()
    if (!text || ['help', 'menu', '?'].includes(text.toLowerCase())) return m.reply(usage(m))

    const parts = text.split('|').map(s => s.trim())
    const target = m.quoted?.isMedia && /image/i.test(m.quoted.mediaType || '')
      ? m.quoted
      : (m.isMedia && /image/i.test(m.mediaType || '') ? m : null)

    let pp = ''
    if (isValidUrl(parts[0])) pp = parts.shift()
    else if (!target) return m.reply('🍂 Reply foto atau pakai URL foto dulu.\n\nContoh:\n.callios my bubub|10:12:51')

    const nama = parts[0] || ''
    const durasi = parts[1] || DEFAULT_DURATION

    if (!nama) return m.reply('🍂 Nama tidak boleh kosong.')
    if (nama.length > 40) return m.reply('🍂 Nama maksimal 40 karakter.')
    if (parts.length > 2) return m.reply('🍂 Format salah. Contoh: .callios my bubub|10:12:51')
    if (!/^\d{1,2}(:\d{2}){1,2}$/.test(durasi)) {
      return m.reply('🍂 Durasi tidak valid. Pakai format 05:30 atau 10:12:51.')
    }

    try {
      if (!pp) {
        const square = await cropSquareCenter(await downloadImage(target, sock, m))
        const uploaded = await uploadImage(square)
        pp = typeof uploaded === 'string' ? uploaded : uploaded?.url
        if (!pp || !isValidUrl(pp)) throw new Error('Gagal mendapatkan URL foto dari uploader.')
      }

      const url = new URL(API_URL)
      url.searchParams.set('pp', pp)
      url.searchParams.set('nama', nama)
      url.searchParams.set('durasi', durasi)

      const res = await fetch(url, {
        headers: { Accept: 'image/*', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(120000)
      })
      if (!res.ok) throw new Error(`API merespons HTTP ${res.status}`)

      const media = Buffer.from(await res.arrayBuffer())
      if (!media.length) throw new Error('Gambar hasil API kosong.')
      const mimetype = sniffImage(media, res.headers.get('content-type') || '')
      if (!mimetype) throw new Error(`API tidak mengembalikan gambar: ${media.toString('utf8').slice(0, 200)}`)

      return await m.reply({
        type: 'image',
        media,
        mimetype,
        caption: ['🌷 *Fake Call iOS*', '', `› Nama: ${nama}`, `› Durasi: ${durasi}`, '', '© ELYRA-AI'].join('\n')
      })
    } catch (err) {
      console.error('[CALLIOS]', err?.stack || err?.message || err)
      return m.reply(settings.pesan?.error || '🍂 Gagal membuat gambar Fake Call iOS. Coba lagi nanti.')
    }
  }
}