import axios from 'axios'
import { imgUpscaler } from '../../scrape/upscale.js'

export default {
  command: 'hd',
  category: 'image',
  description: `> Meningkatkan kualitas foto menjadi HD.\n\ncontoh:\n> Reply gambar dengan \`.upscale\`\n> \`.upscale https://example.com/image.jpg\``,
  help: '[url]',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    let input = null

    if (m.quoted && m.quoted.isMedia && /image/.test(m.quoted.mediaType)) {
      const u8 = await m.quoted.download()
      input = Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength)
    } else if (args[0] && /^https?:\/\//i.test(args[0])) {
      input = args[0]
    } else {
      return m.reply('Reply foto yang ingin di-upscale atau masukkan URL gambar.\nContoh: `.upscale https://example.com/foto.jpg`')
    }

    try {
      const resultUrl = await imgUpscaler(input)
      
      const { data: resBuffer } = await axios.get(resultUrl, { responseType: 'arraybuffer' })
      const media = Buffer.from(resBuffer)

      const caption = `🌷 *Elyra Photo Enhancer*\n- Your photo has been successfully enhanced.`

      await m.reply({
        type: 'image',
        media,
        caption
      })
    } catch (err) {
      console.error('[UPSCALE]', err?.message || err)
      await m.reply(`Terjadi kesalahan:\n${err?.response?.data ? JSON.stringify(err.response.data, null, 2) : (err?.message || 'Gagal memproses gambar.')}`)
    }
  }
}