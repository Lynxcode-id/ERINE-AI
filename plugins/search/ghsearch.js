import axios from 'axios'
import { useStarforge, withQuote } from '../../lib/function.js'
import { ErineFunc } from '../../lib/function2.js'

const THUMB_FALLBACK = 'https://raw.githubusercontent.com/Lynxcode-id/picture/main/1792211096537.jpeg'

export default {
  command: 'githubsearch',
  alias: ['ghsearch'],
  category: 'search',
  tags: ['search'],
  description: '> Mencari repositori atau file di GitHub.\n\ncontoh:\n> .githubsearch ERINE-AI',
  help: '<query>',
  typing: true,
  wait: false,

  async execute(m, { sock, args, usedPrefix, command }) {
    const query = args.join(' ').trim()

    if (!query) {
      return m.reply(
        '🌷 *Elyra GitHub Search*\n' +
        '- Masukkan kata kunci pencarian repositori.\n\n' +
        '♡ - Contoh: ' + (usedPrefix || '.') + (command || 'githubsearch') + ' ERINE-AI'
      )
    }

    await sock.sendReact(m.chat, '🌱', m.id).catch(() => {})

    try {
      const apiUrl = `${global.nexray}/search/github?q=` + encodeURIComponent(query)
      const { data } = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 15000
      })

      if (!data || !data.status || !data.result || data.result.length === 0) {
        await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
        return m.reply('❌ Repositori tidak ditemukan untuk pencarian: ' + query)
      }

      const results = data.result
      let caption = '🌷 *Elyra GitHub Search*\n- Hasil pencarian untuk: ' + query + '\n\n'
      let thumbUrl = THUMB_FALLBACK

      const limit = Math.min(results.length, 3)
      for (let i = 0; i < limit; i++) {
        const res = results[i]
        const repoName = res.repository?.name || 'Unknown'
        const authorName = res.author?.name || 'Unknown'
        const fileUrl = res.file?.url || '-'
        const rawUrl = res.file?.raw_url || '-'

        if (i === 0 && res.author?.avatar_url) {
          thumbUrl = res.author.avatar_url
        }

        caption += '♡ - *Repositori* : ' + repoName + '\n'
        caption += '♡ - *Author* : ' + authorName + '\n'
        caption += '♡ - *File URL* : ' + fileUrl + '\n'
        caption += '♡ - *Raw URL* : ' + rawUrl + '\n\n'
      }

      caption += '© ELYRA-AI'

      await useStarforge(sock)
      const ef = new ErineFunc(sock, m)

      await ef.sendAdText(
        caption.trim(),
        'GitHub Search: ' + query,
        'Menampilkan ' + limit + ' hasil teratas',
        thumbUrl,
        { largeThumbnail: true }
      )

      await sock.sendReact(m.chat, '💐', m.id).catch(() => {})
    } catch (err) {
      console.error('[GITHUB SEARCH]', err?.message || err)
      await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
      await m.reply('❌ Terjadi kesalahan saat mencari data ke server.')
    }
  }
}