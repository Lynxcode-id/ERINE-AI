import axios from 'axios'

export default {
  command: 'spotifysearch',
  alias: ['spsearch'],
  category: 'search',
  description: '> Mencari lagu di Spotify.\n\ncontoh:\n> .splay about you',
  help: '<query>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const query = args.join(' ').trim()
    if (!query) return m.reply('Masukkan judul lagu yang ingin dicari.\nContoh: .splay about you')

    try {
      const apiUrl = `${global.theresav}/api/search/spotify?query=` + encodeURIComponent(query)
      const { data: res } = await axios.get(apiUrl, {
        headers: { 'x-apikey': global.apikey.theresav }
      })

      const results = res?.result
      if (!res?.status || !Array.isArray(results) || results.length === 0) {
        return m.reply('Lagu tidak ditemukan.')
      }

      const topResults = results.slice(0, 10)
      const listText = topResults.map((item, index) => {
        return '*' + (index + 1) + '. ' + (item.name || '-') + '*\n' +
          '♡ - Artist : ' + (item.artists || '-') + '\n' +
          '♡ - Album : ' + (item.album || '-') + '\n' +
          '♡ - Durasi : ' + (item.duration || '-') + '\n' +
          '♡ - Link : ' + (item.spotifyUrl || '-')
      }).join('\n\n')

      const caption = '🌷 *Elyra Spotify Search*\n- Menampilkan hasil pencarian untuk "' + query + '".\n\n' + listText

      const firstCover = topResults[0]?.cover
      if (firstCover) {
        try {
          const { data: coverBuffer } = await axios.get(firstCover, { responseType: 'arraybuffer' })
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
    } catch (err) {
      console.error('[SPOTIFYSEARCH]', err?.message || err)
      await m.reply('Terjadi kesalahan saat mencari lagu di Spotify.')
    }
  }
}