import axios from 'axios'
import uploadImage from '../../lib/uploadImage.js'

export default {
  command: 'removebg',
  alias: ['rmbg'],
  category: 'image',
  description: `> Menghapus latar belakang (background) pada foto.\n\ncontoh:\n> Reply gambar dengan \`.removebg\`\n> \`.removebg https://example.com/foto.jpg\``,
  help: '[url]',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    let imageUrl = null

    try {
      if (m.quoted && m.quoted.isMedia && /image/.test(m.quoted.mediaType)) {
        const u8 = await m.quoted.download()
        const buffer = Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength)
        const uploaded = await uploadImage(buffer)
        imageUrl = typeof uploaded === 'string' ? uploaded : uploaded?.url
      } else if (args[0] && /^https?:\/\//i.test(args[0])) {
        imageUrl = args[0]
      } else {
        return m.reply('Reply foto yang ingin dihapus background-nya atau masukkan URL gambar.\nContoh: `.removebg` (sambil reply foto)')
      }

      if (!imageUrl) {
        return m.reply('Gagal mengunggah gambar ke server.')
      }

      const { data } = await axios.get(`https://lynxapis.my.id/api/image/remove-bg?url=${encodeURIComponent(imageUrl)}`, {
        responseType: 'arraybuffer'
      })

      const media = Buffer.from(data)
      const caption = `🌷 *Elyra Remove Background*\n- Background has been successfully removed.`

      await m.reply({
        type: 'image',
        media,
        caption
      })
    } catch (err) {
      console.error('[REMOVEBG]', err?.message || err)
      await m.reply('Terjadi kesalahan saat menghapus background gambar.')
    }
  }
}