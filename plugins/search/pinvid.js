import axios from 'axios'
import { useStarforge } from '../../lib/function.js'

export default {
  command: 'pinterestvideo',
  alias: ['pinvid'],
  category: 'search',
  tags: ['search'],
  description: '> Mencari video di Pinterest.\n\ncontoh:\n> .pinterestvideo overlay',
  help: '<query>',
  typing: true,
  wait: false,

  async execute(m, { sock, args, usedPrefix, command }) {
    const query = args.join(' ').trim()

    if (!query) {
      return m.reply(
        '🌷 *Elyra Pinterest Video*\n' +
        '- Masukkan kata kunci pencarian.\n\n' +
        '♡ - Contoh: ' + (usedPrefix || '.') + (command || 'pinterestvideo') + ' overlay'
      )
    }

    await sock.sendReact(m.chat, '🌱', m.id).catch(() => {})

    try {
      const apiUrl = `${global.nexray}/search/pinterestvideo?q=` + encodeURIComponent(query)
      const { data } = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 15000
      })

      if (!data || !data.status || !data.result || data.result.length === 0) {
        await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
        return m.reply('❌ Video tidak ditemukan untuk pencarian: ' + query)
      }

      const results = data.result
      const medias = []
      const limit = Math.min(results.length, 5)

      for (let i = 0; i < limit; i++) {
        const res = results[i]
        medias.push({ image: res.thumbnail })
      }

      await useStarforge(sock)

      await sock.sendAlbum(m.chat, medias, { quote: m.raw || m })

      await sock.sendReact(m.chat, '💐', m.id).catch(() => {})
    } catch (err) {
      console.error('[PINTEREST VIDEO]', err?.message || err)
      await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
      await m.reply('❌ Terjadi kesalahan: ' + (err?.message || 'Gagal memproses album ke WhatsApp.'))
    }
  }
}