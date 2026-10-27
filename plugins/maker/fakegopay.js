import { settings } from '../../settings.js'

export default {
  command: 'fakegopay',
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar saldo GoPay.',
  help: '<saldo>|<koin>|<terpakai>|<bulan>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const text = Array.isArray(args) ? args.join(' ').trim() : ''

    if (!text) {
      return m.reply(
        '🌷 *Elyra Fake GoPay*\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Masukkan parameter sesuai format berikut:\n\n' +
        '› Saldo: jumlah saldo GoPay\n' +
        '› Koin: jumlah koin\n' +
        '› Terpakai: jumlah saldo terpakai\n' +
        '› Bulan: nama bulan atau singkatannya\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        '*Contoh penggunaan:*\n' +
        '.fakegopay 50000|10|5000|oktober\n\n' +
        '*Contoh lainnya:*\n' +
        '.fakegopay 100000|25|15000|nov\n' +
        '.fakegopay 75000|5|10000|agu\n' +
        '.fakegopay 200000|50|25000|desember\n' +
        '.fakegopay 50000|10|5000|10\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Gunakan tanda `|` sebagai pemisah setiap parameter.'
      )
    }

    const parts = text.split('|').map(part => part.trim())

    if (parts.length !== 4 || parts.some(part => !part)) {
      return m.reply(
        '🍂 *Format tidak valid!*\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Format yang benar:\n' +
        '.fakegopay saldo|koin|terpakai|bulan\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Contoh:\n' +
        '.fakegopay 50000|10|5000|okt\n' +
        '━━━━━━━━━━━━━━━━━━'
      )
    }

    const [rawSaldo, rawKoin, rawTerpakai, rawBulan] = parts

    const parseNumber = value => {
      if (!/^[\d.,]+$/.test(value)) return null

      const normalized = value.replace(/[.,]/g, '')

      if (!normalized || !/^\d+$/.test(normalized)) return null

      const number = Number(normalized)
      return Number.isSafeInteger(number) ? number : null
    }

    const saldo = parseNumber(rawSaldo)
    const koin = parseNumber(rawKoin)
    const terpakai = parseNumber(rawTerpakai)

    if (saldo === null || koin === null || terpakai === null) {
      return m.reply(
        '🍂 Saldo, koin, dan terpakai harus berupa angka yang valid.\n\n' +
        'Contoh: .fakegopay 50000|10|5000|oktober'
      )
    }

    const months = {
      januari: 'Januari',
      jan: 'Januari',
      januarii: 'Januari',
      februari: 'Februari',
      feb: 'Februari',
      februarii: 'Februari',
      maret: 'Maret',
      mar: 'Maret',
      april: 'April',
      apr: 'April',
      mei: 'Mei',
      juni: 'Juni',
      jun: 'Juni',
      juli: 'Juli',
      jul: 'Juli',
      agustus: 'Agustus',
      agu: 'Agustus',
      ags: 'Agustus',
      agust: 'Agustus',
      september: 'September',
      sep: 'September',
      sept: 'September',
      oktober: 'Oktober',
      okt: 'Oktober',
      oct: 'Oktober',
      november: 'November',
      nov: 'November',
      desember: 'Desember',
      des: 'Desember',
      dec: 'Desember'
    }

    const monthInput = rawBulan
      .toLowerCase()
      .replace(/\./g, '')
      .trim()

    const numericMonths = {
      '1': 'Januari',
      '2': 'Februari',
      '3': 'Maret',
      '4': 'April',
      '5': 'Mei',
      '6': 'Juni',
      '7': 'Juli',
      '8': 'Agustus',
      '9': 'September',
      '10': 'Oktober',
      '11': 'November',
      '12': 'Desember'
    }

    const bulan = months[monthInput] || numericMonths[monthInput]

    if (!bulan) {
      return m.reply(
        '🍂 Nama bulan tidak valid.\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Gunakan: jan, feb, mar, apr, mei, jun, jul, agu, sep, okt, nov, atau des.\n' +
        'Bisa juga memakai nama bulan lengkap atau angka 1–12.'
      )
    }

    try {
      const url = new URL(`${global.xrina}/canvas/fakegopay`)
      url.searchParams.set('saldo', String(saldo))
      url.searchParams.set('koin', String(koin))
      url.searchParams.set('terpakai', String(terpakai))
      url.searchParams.set('bulan', bulan)

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
        throw new Error('Gambar yang diterima kosong.')
      }

      const isImage =
        contentType.toLowerCase().startsWith('image/') ||
        (
          media.length >= 8 &&
          media[0] === 0x89 &&
          media[1] === 0x50 &&
          media[2] === 0x4e &&
          media[3] === 0x47
        ) ||
        (
          media.length >= 3 &&
          media[0] === 0xff &&
          media[1] === 0xd8 &&
          media[2] === 0xff
        )

      if (!isImage) {
        const result = media.toString('utf8')
        throw new Error(
          `API tidak mengembalikan gambar: ${result.slice(0, 200)}`
        )
      }

      const mimetype = contentType.toLowerCase().startsWith('image/')
        ? contentType.split(';')[0]
        : media[0] === 0x89
          ? 'image/png'
          : 'image/jpeg'

      await m.reply({
        type: 'image',
        media,
        mimetype,
        caption: '© ELYRA-AI'
      })
    } catch (error) {
      console.error('[FAKEGOPAY]', error?.message || error)

      await m.reply(
        settings.pesan?.error ||
        '🍂 Gagal membuat gambar GoPay. Silakan coba lagi nanti.'
      )
    }
  }
}