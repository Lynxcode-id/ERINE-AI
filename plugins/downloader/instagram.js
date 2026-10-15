import axios from 'axios'

export default {
  command: 'instagram',
  alias: ['ig'],
  category: 'downloader',
  description: `> Mengunduh video atau foto dari Instagram.\n\ncontoh:\n> \`.ig https://www.instagram.com/p/xxxxx/\``,
  help: '<url>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const url = args[0]
    if (!url) return m.reply('Masukkan URL Instagram.\nContoh: `.ig https://www.instagram.com/p/xxxxx/`')
    if (!url.match(/(?:instagram\.com|instagr\.am)/i)) return m.reply('URL tidak valid. Pastikan itu adalah link Instagram.')

    try {
      const { getMedia } = await import(`../../scrape/igdl.js?v=${Date.now()}`)
      const res = await getMedia(url)
      const meta = res.metadata || {}
      
      const author = meta.username || res.author?.username || '-'
      const likes = meta.like_count ?? res.statistics?.likeCount ?? '0'
      const comments = meta.comment_count ?? res.statistics?.commentCount ?? '0'
      const title = meta.title || res.caption || '-'

      const caption = `🌷 *Elyra Instagram Downloader*\n- Let's download your media without the watermark.\n\n♡ - Author : ${author}\n♡ - Likes : ${likes}\n♡ - Comments : ${comments}\n♡ - Judul : ${title}`

      const rawMedias = Array.isArray(res.media) ? res.media : [res.media]
      const medias = rawMedias.map(x => typeof x === 'string' ? x : (x?.url || '')).filter(Boolean)

      if (medias.length === 0) return m.reply('Media tidak ditemukan dari link tersebut.')

      const images = medias.filter(u => !u.match(/\.mp4/i))
      const videos = medias.filter(u => u.match(/\.mp4/i))

      if (images.length === 1) {
        const jpgUrl = `https://wsrv.nl/?url=${encodeURIComponent(images[0])}&output=jpg`
        const { data: imgBuffer } = await axios.get(jpgUrl, { responseType: 'arraybuffer' })
        await m.reply({ 
          type: 'image', 
          media: Buffer.from(imgBuffer), 
          caption 
        })
      } else if (images.length > 1) {
        const albumData = images.map(imgUrl => ({ 
          image: `https://wsrv.nl/?url=${encodeURIComponent(imgUrl)}&output=jpg` 
        }))
        await sock.sendAlbum(m.chat, albumData, { quote: m.raw })
        await m.reply(caption)
      }

      if (videos.length > 0) {
        for (let i = 0; i < videos.length; i++) {
          const { data: vidBuffer } = await axios.get(videos[i], { responseType: 'arraybuffer' })
          const media = Buffer.from(vidBuffer)
          const vidCaption = (images.length === 0 && i === 0) ? caption : ''
          
          await m.reply({ 
            type: 'video', 
            media, 
            mimetype: 'video/mp4', 
            caption: vidCaption 
          })
        }
      }
    } catch (err) {
      console.error('[IG]', err?.message || err)
      await m.reply(`Terjadi kesalahan:\n${err?.message || 'Gagal mengunduh media dari Instagram.'}`)
    }
  }
}