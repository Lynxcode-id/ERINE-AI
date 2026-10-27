import axios from 'axios'
import { useStarforge } from '../../lib/function.js'

export default {
  command: 'tiktokphoto',
  alias: ['ttimg'],
  category: 'search',
  tags: ['search'],
  description: '> Mencari foto di TikTok.\n\ncontoh:\n> .ttimg erine jkt48',
  help: '<query>',
  typing: true,
  wait: false,

  async execute(m, { sock, args, usedPrefix, command }) {
    const query = args.join(' ').trim()

    if (!query) {
      return m.reply(
        '🌷 *Elyra TikTok Photo Search*\n' +
        '- Masukkan kata kunci pencarian.\n\n' +
        '♡ - Contoh: ' + (usedPrefix || '.') + (command || 'ttimg') + ' erine jkt48'
      )
    }

    await sock.sendReact(m.chat, '🌱', m.id).catch(() => {})

    try {
      const apiUrl = `${global.nexray}/search/tiktokphoto?q=` + encodeURIComponent(query)
      const { data } = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 15000
      })

      if (!data || !data.status || !data.result || data.result.length === 0) {
        await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
        return m.reply('❌ Foto tidak ditemukan untuk pencarian: ' + query)
      }

      const results = data.result
      const medias = []
      const limit = Math.min(results.length, 5)

      for (let i = 0; i < limit; i++) {
        const res = results[i]
        const imgUrl = (res.images && res.images.length > 0) ? res.images[0] : res.cover

        try {
          const { data: imgData } = await axios.get(imgUrl, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
            },
            timeout: 10000
          })
          
          medias.push({ image: Buffer.from(imgData) })
        } catch (e) {
          console.error('[TIKTOKPHOTO] Gagal download image:', e?.message)
          medias.push({ image: { url: imgUrl } })
        }
      }

      if (medias.length === 0) {
        await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
        return m.reply('❌ Gagal memuat gambar dari server.')
      }

      await useStarforge(sock)
      
      await sock.sendAlbum(m.chat, medias, { quote: m.raw || m })

      await sock.sendReact(m.chat, '💐', m.id).catch(() => {})
    } catch (err) {
      console.error('[TIKTOK PHOTO]', err?.message || err)
      await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
      await m.reply('❌ Terjadi kesalahan saat memproses data ke WhatsApp.')
    }
  }
}