import * as appSettings from '../../settings.js'

const settings =
  appSettings.config ||
  appSettings.settings ||
  appSettings.default ||
  {}

const API_URL = `${global.xrina}/canvas/fakedana`

function detectImage(buffer) {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg'
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }

  return null
}

export default {
  command: 'fakedana',
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar Fake DANA dengan nominal otomatis.',
  help: '<nominal>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const input = Array.isArray(args)
      ? args.join('').trim()
      : ''

    if (!input || ['help', 'menu', '?'].includes(input.toLowerCase())) {
      return m.reply(
        '🌷 *ELYRA — FAKE DANA*\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Membuat gambar DANA dengan nominal saldo yang kamu tentukan.\n\n' +
        '✦ *Format penggunaan*\n' +
        '.fakedana <nominal>\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        '✦ *Contoh penggunaan*\n' +
        '› .fakedana 50000\n' +
        '› .fakedana 100000\n' +
        '› .fakedana 1500000\n' +
        '› .fakedana 15.000\n' +
        '› .fakedana 1.500.000\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Nominal otomatis diformat dengan titik pemisah ribuan.\n\n' +
        '© ELYRA-AI'
      )
    }

    if (!/^[\d.,]+$/.test(input)) {
      return m.reply(
        '🍂 Nominal tidak valid.\n\n' +
        'Contoh:\n' +
        '.fakedana 50000\n' +
        '.fakedana 15.000'
      )
    }

    const digits = input.replace(/[.,]/g, '')
    const nominalNumber = Number(digits)

    if (
      !digits ||
      !Number.isSafeInteger(nominalNumber) ||
      nominalNumber <= 0
    ) {
      return m.reply('🍂 Nominal harus berupa angka yang lebih besar dari 0.')
    }

    const nominal = new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(nominalNumber)

    try {
      const url = new URL(API_URL)
      url.searchParams.set('nominal', nominal)

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

      const mimetype = detectImage(media)

      if (!mimetype) {
        const result = media.toString('utf8').slice(0, 200)

        throw new Error(
          `API tidak mengembalikan gambar yang valid: ${result}`
        )
      }

      await m.reply({
        type: 'image',
        media,
        mimetype,
        caption: '© ELYRA-AI'
      })
    } catch (error) {
      console.error('[FAKEDANA]', error?.stack || error?.message || error)

      return m.reply(
        settings.pesan?.error ||
        '🍂 Gagal membuat gambar DANA. Coba lagi nanti.'
      )
    }
  }
}