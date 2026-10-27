import { config } from '../../settings.js'

export default {
  command: 'windowsquote',
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar Windows Quote dari teks.',
  help: '<teks>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const text = Array.isArray(args) ? args.join(' ').trim() : ''

    if (!text) {
      return m.reply(
        `Masukkan teks yang ingin dibuat menjadi gambar Windows Quote.\n\n` +
        `Contoh:\n` +
        `${m.prefix}${m.command} just friend kok manggil sayang`
      )
    }

    try {
      const url = new URL(`${global.xrina}/canvas/windows`)
      url.searchParams.set('text', text)

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

      return await m.reply({
        type: 'image',
        media,
        mimetype: contentType.split(';')[0],
        caption: '© ELYRA-AI'
      })
    } catch (err) {
      console.error('[WINDOWSQUOTE]', err?.message || err)

      return m.reply(
        config.pesan?.error || '🍂 Gagal membuat gambar Windows Quote. Coba lagi nanti.'
      )
    }
  }
}