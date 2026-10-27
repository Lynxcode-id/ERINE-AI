import axios from 'axios'

export default {
  command: 'mediafiresearch',
  alias: ['mfsearch'],
  category: 'search',
  tags: ['search'],
  description: '> Mencari file di Mediafire.\n\ncontoh:\n> .mediafiresearch script bot wa',
  help: '<query>',
  typing: true,
  wait: false,

  async execute(m, { sock, args, usedPrefix, command }) {
    const query = args.join(' ').trim()

    if (!query) {
      return m.reply(
        '🌷 *Elyra Mediafire Search*\n' +
        '- Masukkan kata kunci pencarian.\n\n' +
        '♡ - Contoh: ' + (usedPrefix || '.') + command + ' script bot wa'
      )
    }

    await sock.sendReact(m.chat, '🌱', m.id).catch(() => {})

    try {
      const apiUrl = `${global.theresav}/api/search/mediafire?query=` + encodeURIComponent(query)
      const { data } = await axios.get(apiUrl, {
        headers: {
          'x-apikey': global.apikey.theresav,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 15000
      })

      if (!data || !data.status || !data.result || data.result.length === 0) {
        await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
        return m.reply('❌ File tidak ditemukan untuk pencarian: ' + query)
      }

      const results = data.result
      const limit = Math.min(results.length, 5)
      
      let caption = '🌷 *Elyra Mediafire Search*\n\n'
      caption += '♡ - *Query* : ' + query + '\n'
      caption += '♡ - *Total Hasil* : ' + (data.total_result || results.length) + '\n\n'

      for (let i = 0; i < limit; i++) {
        const res = results[i]
        const title = res.title || 'Tanpa Judul'
        const size = res.size || '-'
        const url = res.url || '-'

        caption += '♡ - *Judul* : ' + title + '\n'
        caption += '♡ - *Ukuran* : ' + size + '\n'
        caption += '♡ - *Link* : ' + url + '\n\n'
      }

      caption += '© ELYRA-AI'

      await m.reply(caption)
      await sock.sendReact(m.chat, '💐', m.id).catch(() => {})
    } catch (err) {
      console.error('[MEDIAFIRE SEARCH]', err?.message || err)
      await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
      await m.reply('❌ Terjadi kesalahan saat mencari data ke server.')
    }
  }
}