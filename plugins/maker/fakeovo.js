import * as appSettings from '../../settings.js'

const settings =
  appSettings.settings ||
  appSettings.config ||
  appSettings.default ||
  {}

export default {
  command: 'fakeovo',
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar Fake OVO berdasarkan nominal saldo.',
  help: '<nominal>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const text = Array.isArray(args) ? args.join(' ').trim() : ''

    if (!text || ['help', 'menu', '?'].includes(text.toLowerCase())) {
      return m.reply(
        '🌷 *ELYRA — FAKE OVO*\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Buat gambar OVO dengan nominal yang kamu tentukan.\n\n' +
        '✦ *Format penggunaan*\n' +
        '.fakeovo <nominal>\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        '✦ *Contoh penggunaan*\n' +
        '› .fakeovo 1000\n' +
        '› .fakeovo 5000\n' +
        '› .fakeovo 10000\n' +
        '› .fakeovo 50000\n' +
        '› .fakeovo 100000\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        '© ELYRA-AI'
      )
    }

    const nominalText = text.replace(/[.,]/g, '')

    if (!/^\d+$/.test(nominalText)) {
      return m.reply(
        '🍂 Nominal harus berupa angka yang valid.\n\n' +
        '*Contoh:*\n' +
        '.fakeovo 1000\n' +
        '.fakeovo 50000'
      )
    }

    const nominal = Number(nominalText)

    if (!Number.isSafeInteger(nominal) || nominal <= 0) {
      return m.reply('🍂 Nominal harus lebih besar dari 0 dan tidak boleh terlalu besar.')
    }

    try {
      const url = new URL(`${global.xrina}/canvas/fakeovo`)
      url.searchParams.set('nominal', String(nominal))

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

      if (
        !contentType.toLowerCase().startsWith('image/') &&
        !isPng &&
        !isJpeg &&
        !isWebp
      ) {
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
        caption: '© ELYRA-AI'
      })
    } catch (error) {
      console.error('[FAKEOVO]', error?.stack || error?.message || error)

      return m.reply(
        settings.pesan?.error ||
        '🍂 Gagal membuat gambar OVO. Coba lagi nanti.'
      )
    }
  }
}