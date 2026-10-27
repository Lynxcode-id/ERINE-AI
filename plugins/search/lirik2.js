import axios from 'axios'
import { useStarforge } from '../../lib/function.js'
import { ErineFunc } from '../../lib/function2.js'

export default {
  command: 'lirik2',
  category: 'search',
  tags: ['search'],
  description: '> Mencari lirik lagu.\n\ncontoh:\n> .lirik2 rapsodi jkt48',
  help: '<query>',
  typing: true,
  wait: false,

  async execute(m, { sock, args, usedPrefix, command }) {
    const query = args.join(' ').trim()

    if (!query) {
      return m.reply(
        '🌷 *Elyra Lyrics Search*\n' +
        '- Masukkan judul lagu yang ingin dicari.\n\n' +
        '♡ - Contoh: ' + (usedPrefix || '.') + (command || 'lirik2') + ' rapsodi jkt48'
      )
    }

    await sock.sendReact(m.chat, '🌱', m.id).catch(() => {})

    try {
      const apiUrl = `${global.nexray}/search/lyrics?q=` + encodeURIComponent(query)
      const { data } = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 15000
      })

      if (!data || !data.status || !data.result) {
        await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
        return m.reply('❌ Lirik tidak ditemukan untuk pencarian: ' + query)
      }

      const res = data.result
      const title = res.title || 'Tanpa Judul'
      const artist = res.artist || 'Unknown'
      const thumbUrl = res.thumbnail || 'https://raw.githubusercontent.com/Lynxcode-id/picture/main/1792211096537.jpeg'
      const lyrics = res.lyrics?.plain_lyrics || 'Lirik tidak tersedia.'

      let caption = '🌷 *Elyra Lyrics Search*\n\n'
      caption += '♡ - *Judul* : ' + title + '\n'
      caption += '♡ - *Artis* : ' + artist + '\n\n'
      caption += lyrics + '\n\n'
      caption += '© ELYRA-AI'

      await useStarforge(sock)
      const ef = new ErineFunc(sock, m)

      await ef.sendAdText(
        caption.trim(),
        'Lirik: ' + title,
        'Artis: ' + artist,
        thumbUrl,
        { largeThumbnail: true }
      )

      await sock.sendReact(m.chat, '💐', m.id).catch(() => {})
    } catch (err) {
      console.error('[LYRICS SEARCH]', err?.message || err)
      await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
      await m.reply('❌ Terjadi kesalahan saat mencari data ke server.')
    }
  }
}