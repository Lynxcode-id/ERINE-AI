import axios from 'axios'

export default {
  command: 'splay',
  category: 'music',
  tags: ['music'],
  description: `> Mencari dan memutar lagu dari Spotify.\n\ncontoh:\n> \`.splay terpenjara sepi\``,
  help: '<judul lagu>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const query = args.join(' ').trim()
    if (!query) return m.reply('Masukkan judul lagu yang ingin dicari.\nContoh: `.splay terpenjara sepi`')

    try {
      const { data: res } = await axios.get(`https://lynxapis.my.id/api/music/spotify-play?query=${encodeURIComponent(query)}`)
      const track = res?.data

      if (!res?.status || !track || !track.download_url) {
        return m.reply('Lagu tidak ditemukan atau gagal mengambil data dari server.')
      }

      const caption = `🌷 *Elyra Spotify Play*\n- Enjoy listening to your favorite music.\n\n♡ - Judul : ${track.title || '-'}\n♡ - Artist : ${track.artist || '-'}\n♡ - Album : ${track.album || '-'}\n♡ - Rilis : ${track.release_date || '-'}\n♡ - Durasi : ${track.duration_formatted || '-'}\n♡ - Link : ${track.spotify_link || '-'}`

      if (track.cover_url) {
        try {
          const { data: coverBuffer } = await axios.get(track.cover_url, { responseType: 'arraybuffer' })
          await m.reply({
            type: 'image',
            media: Buffer.from(coverBuffer),
            caption
          })
        } catch {
          await m.reply(caption)
        }
      } else {
        await m.reply(caption)
      }

      const { data: audioData } = await axios.get(track.download_url, { responseType: 'arraybuffer' })
      const audioBuffer = Buffer.from(audioData)

      await m.reply({
        type: 'audio',
        media: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: false
      })
    } catch (err) {
      console.error('[SPLAY]', err?.message || err)
      await m.reply('Terjadi kesalahan saat mengunduh lagu dari Spotify.')
    }
  }
}