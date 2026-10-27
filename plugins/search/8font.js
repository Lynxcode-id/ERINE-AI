import axios from 'axios'
import { useStarforge } from '../../lib/function.js'

export default {
  command: '8font',
  category: 'search',
  tags: ['search'],
  description: '> Mencari font di 8font.\n\ncontoh:\n> .8font cartoon|1',
  help: '<query>|<page>',
  typing: true,
  wait: false,

  async execute(m, { sock, args, usedPrefix, command }) {
    const text = args.join(' ').trim()

    if (!text) {
      return m.reply(
        '🌷 *Elyra 8Font Search*\n' +
        '- Masukkan kata kunci pencarian dan halaman (opsional).\n\n' +
        '♡ - Contoh: ' + (usedPrefix || '.') + command + ' cartoon|1'
      )
    }

    await sock.sendReact(m.chat, '🌱', m.id).catch(() => {})

    const splitText = text.split('|')
    const query = splitText[0].trim()
    const page = splitText[1] ? splitText[1].trim() : '1'

    try {
      const apiUrl = `${global.nexray}/search/8font?q=` + encodeURIComponent(query) + '&page=' + encodeURIComponent(page)
      const { data } = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 15000
      })

      if (!data || !data.status || !data.result || data.result.length === 0) {
        await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
        return m.reply('❌ Font tidak ditemukan untuk pencarian: ' + query + ' (Halaman: ' + page + ')')
      }

      const results = data.result
      const medias = []
      const limit = Math.min(results.length, 5)
      let infoText = '🌷 *Elyra 8Font Search*\n\n'

      for (let i = 0; i < limit; i++) {
        const res = results[i]
        const title = res.title || 'Tanpa Judul'
        const categories = res.categories && res.categories.length > 0 ? res.categories.join(', ') : '-'
        const dateStr = res.date || '-'
        
        infoText += '♡ - *Judul* : ' + title + '\n'
        infoText += '♡ - *Kategori* : ' + categories + '\n'
        infoText += '♡ - *Tanggal* : ' + dateStr + '\n'
        infoText += '♡ - *Halaman* : ' + page + '\n\n'

        try {
          const { data: imgData } = await axios.get(res.image_url, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
            },
            timeout: 10000
          })
          
          medias.push({ image: Buffer.from(imgData) })
        } catch (e) {
          console.error('[8FONT] Gagal download thumbnail:', e?.message)
          medias.push({ image: { url: res.image_url } })
        }
      }
      
      infoText += '© ELYRA-AI'

      if (medias.length === 0) {
        await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
        return m.reply('❌ Gagal memuat gambar preview dari server.')
      }

      await useStarforge(sock)
      
      await sock.sendAlbum(m.chat, medias, { quote: m.raw || m })
      await m.reply(infoText)

      await sock.sendReact(m.chat, '💐', m.id).catch(() => {})
    } catch (err) {
      console.error('[8FONT SEARCH]', err?.message || err)
      await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
      await m.reply('❌ Terjadi kesalahan saat memproses data ke WhatsApp.')
    }
  }
}