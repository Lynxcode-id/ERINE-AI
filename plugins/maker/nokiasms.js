import { settings } from '../../settings.js'

export default {
  command: 'nokiasms',
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar pesan bergaya HP Nokia.',
  help: '<pesan>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const message = Array.isArray(args) ? args.join(' ').trim() : ''

    if (!message) {
      return m.reply(
        `Masukkan pesan yang ingin dibuat menjadi gambar Nokia.\n\n` +
        `Contoh:\n.nokia anjing lu semua 😂`
      )
    }

    try {
      const now = new Date()

      const dateParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Makassar',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      }).formatToParts(now)

      const timeParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(now)

      const getPart = (parts, type) =>
        parts.find(part => part.type === type)?.value || ''

      const date =
        `${getPart(dateParts, 'day')}/` +
        `${getPart(dateParts, 'month')}/` +
        `${getPart(dateParts, 'year')}`

      const time =
        `${getPart(timeParts, 'hour')}:` +
        `${getPart(timeParts, 'minute')}`

      const sender = settings.ownerName || 'Lynx decide'

      const url = new URL(`${global.xrina}/canvas/nokia`)
      url.searchParams.set('message', message)
      url.searchParams.set('sender', sender)
      url.searchParams.set('date', date)
      url.searchParams.set('time', time)

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

      if (!contentType.toLowerCase().startsWith('image/')) {
        const result = await response.text().catch(() => '')
        throw new Error(
          `API tidak mengembalikan gambar: ${result.slice(0, 200) || contentType}`
        )
      }

      const media = Buffer.from(await response.arrayBuffer())

      if (!media.length) {
        throw new Error('Gambar yang diterima kosong.')
      }

      await m.reply({
        type: 'image',
        media,
        mimetype: contentType.split(';')[0],
        caption: '© ELYRA-AI'
      })
    } catch (err) {
      console.error('[NOKIA]', err?.message || err)

      await m.reply(
        settings.pesan?.error ||
        '🍂 Gagal membuat gambar Nokia. Coba lagi nanti.'
      )
    }
  }
}