import { settings } from '../../settings.js'

export default {
  command: 'ffduo',
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar pasangan Free Fire Duo.',
  help: '<nama1>|<nama2>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const text = Array.isArray(args) ? args.join(' ').trim() : ''

    if (!text) {
      return m.reply(
        '🌷 *ELYRA — FAKE FF DUO*\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Masukkan dua nama yang ingin dibuat menjadi gambar FF Duo.\n\n' +
        '› Nama 1: nama pertama\n' +
        '› Nama 2: nama kedua\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        '*Contoh penggunaan:*\n' +
        '.fakeffduo Lynx decode|Dinda Novelina\n\n' +
        '*Contoh lainnya:*\n' +
        '.fakeffduo Lynx|Dinda\n' +
        '.fakeffduo Arman Maulana|Siti Aulia\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Pisahkan kedua nama menggunakan tanda `|`.'
      )
    }

    const parts = text.split('|').map(part => part.trim())

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return m.reply(
        '🍂 *Format tidak valid!*\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Format yang benar:\n' +
        '.fakeffduo nama1|nama2\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Contoh:\n' +
        '.fakeffduo Lynx decode|Dinda Novelina\n' +
        '━━━━━━━━━━━━━━━━━━'
      )
    }

    const [name1, name2] = parts

    try {
      const url = new URL(`${global.xrina}/canvas/fakeffduo`)
      url.searchParams.set('name1', name1)
      url.searchParams.set('name2', name2)

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
        throw new Error(
          `API tidak mengembalikan gambar: ${media.toString('utf8').slice(0, 200)}`
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
      console.error('[FAKEFFDUO]', error?.message || error)

      await m.reply(
        settings.pesan?.error ||
        '🍂 Gagal membuat gambar FF Duo. Silakan coba lagi nanti.'
      )
    }
  }
}