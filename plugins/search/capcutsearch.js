import axios from 'axios'
import { useStarforge } from '../../lib/function.js'
import { ErineFunc } from '../../lib/function2.js'

const THUMB_URL = 'https://raw.githubusercontent.com/Lynxcode-id/picture/main/1792211096537.jpeg'

export default {
  command: 'capcutsearch',
  category: 'search',
  tags: ['search'],
  description: '> Mencari video atau template di CapCut.\n\ncontoh:\n> .capcutsearch cinematic',
  help: '<query>',
  typing: true,
  wait: false,

  async execute(m, { sock, args, usedPrefix, command }) {
    const query = args.join(' ').trim()

    if (!query) {
      return m.reply(
        '🌷 *Elyra CapCut Search*\n' +
        '- Masukkan kata kunci pencarian.\n\n' +
        '♡ - Contoh: ' + (usedPrefix || '.') + (command || 'capcutsearch') + ' cinematic'
      )
    }

    await sock.sendReact(m.chat, '🌱', m.id).catch(() => {})

    try {
      const apiUrl = `${global.nexray}/search/capcut?q=` + encodeURIComponent(query)
      const { data } = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 15000
      })

      if (!data || !data.status || !data.result || data.result.length === 0) {
        await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
        return m.reply('❌ Video atau template tidak ditemukan untuk pencarian: ' + query)
      }

      const results = data.result
      let caption = '🌷 *Elyra CapCut Search*\n- Hasil pencarian untuk: ' + query + '\n\n'

      const limit = Math.min(results.length, 3)
      for (let i = 0; i < limit; i++) {
        const res = results[i]
        const title = res.title ? res.title.trim().replace(/\n/g, ' ') : 'Tanpa Judul'
        const author = res.author?.name || 'Unknown'
        const plays = res.stats?.play || '0'
        const likes = res.stats?.likes || '0'
        const videoUrl = res.data || ''

        caption += '♡ - *Judul* : ' + title + '\n'
        caption += '♡ - *Author* : ' + author + '\n'
        caption += '♡ - *Plays* : ' + plays + ' | *Likes* : ' + likes + '\n'
        caption += '♡ - *Link Video* : ' + videoUrl + '\n\n'
      }

      caption += '© ELYRA-AI'

      await useStarforge(sock)
      const ef = new ErineFunc(sock, m)

      await ef.sendAdText(
        caption.trim(),
        'Pencarian CapCut: ' + query,
        'Menampilkan ' + limit + ' hasil teratas',
        THUMB_URL,
        { largeThumbnail: true }
      )

      await sock.sendReact(m.chat, '💐', m.id).catch(() => {})
    } catch (err) {
      console.error('[CAPCUT SEARCH]', err?.message || err)
      await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
      await m.reply('❌ Terjadi kesalahan saat mencari data ke server.')
    }
  }
}