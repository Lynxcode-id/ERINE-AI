import axios from 'axios'

export default {
  command: 'spotify',
  category: 'downloader',
  description: '> Mengunduh lagu dari Spotify menggunakan URL.\n\ncontoh:\n> .spotify https://open.spotify.com/track/3hEfpBHxgieRLz4t3kLNEg',
  help: '<url>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const url = args[0]
    if (!url) return m.reply('Masukkan URL Spotify.\nContoh: .spotify https://open.spotify.com/track/3hEfpBHxgieRLz4t3kLNEg')
    if (!/open\.spotify\.com/i.test(url)) return m.reply('URL tidak valid. Pastikan itu adalah link Spotify.')

    try {
      const apiUrl = `${global.theresav}/api/download/spotify?url=` + encodeURIComponent(url)
      const { data: res } = await axios.get(apiUrl, {
        headers: { 'x-apikey': global.apikey.theresav }
      })

      const track = res?.result
      if (!res?.status || !track || !track.downloadUrl) {
        return m.reply('Gagal mengambil data lagu dari server.')
      }

      const artists = Array.isArray(track.artists) ? track.artists.join(', ') : (track.artists || '-')
      const albumName = track.album?.name || '-'
      const releaseDate = track.release_date || track.album?.release_date || '-'

      const caption = '🌷 *Elyra Spotify Downloader*\n' +
        '- Enjoy listening to your favorite music.\n\n' +
        '♡ - Judul : ' + (track.title || '-') + '\n' +
        '♡ - Artist : ' + artists + '\n' +
        '♡ - Album : ' + albumName + '\n' +
        '♡ - Rilis : ' + releaseDate + '\n' +
        '♡ - Durasi : ' + (track.duration || '-') + '\n' +
        '♡ - Link : ' + (track.spotify_url || '-')

      if (track.cover) {
        try {
          const { data: coverBuffer } = await axios.get(track.cover, { responseType: 'arraybuffer' })
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

      const { data: audioData } = await axios.get(track.downloadUrl, { responseType: 'arraybuffer' })
      await m.reply({
        type: 'audio',
        media: Buffer.from(audioData),
        mimetype: 'audio/mpeg',
        ptt: false
      })
    } catch (err) {
      console.error('[SPOTIFY]', err?.message || err)
      await m.reply('Terjadi kesalahan saat mengunduh lagu dari Spotify.')
    }
  }
}