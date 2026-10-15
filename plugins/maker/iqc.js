import axios from 'axios'
import uploadImage from '../../lib/uploadImage.js'

export default {
  command: 'iqc',
  category: 'maker',
  tags: ['maker'],
  description: `> Membuat gambar quote chat ala iPhone.\n\ncontoh:\n> \`.iqc2 halo cihuyy\`\n> Reply gambar dengan \`.iqc2 halo cihuyy\``,
  help: '<teks>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const text = args.join(' ').trim()
    const target = m.quoted && m.quoted.isMedia ? m.quoted : (m.isMedia ? m : null)
    const isImage = target && /image/.test(target.mediaType || '')

    if (!text && !isImage) {
      return m.reply('Kirim/reply gambar atau masukkan teks.\nContoh: `.iqc2 halo cihuyy`')
    }

    try {
      let imageUrl = undefined

      if (isImage) {
        const u8 = await target.download()
        const buffer = Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength)
        const uploaded = await uploadImage(buffer)
        imageUrl = typeof uploaded === 'string' ? uploaded : uploaded?.url
      }

      const payload = {
        sender: 'other',
        message: text || ' ',
        imageUrl,
        timestamp: '21.02',
        time: '21.02',
        status: {
          carrierName: 'INDOSAT',
          batteryPercentage: 88,
          signalStrength: 4,
          wifi: true
        },
        backgroundUrl: '',
        readStatus: true,
        emojiStyle: 'apple'
      }

      const res = await axios.post(
        'https://brat.siputzx.my.id/v2/iphone-quoted',
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          responseType: 'arraybuffer'
        }
      )

      const media = Buffer.from(res.data)
      const caption = `🌷 *Elyra iPhone Quoted*\n- Your iPhone quoted chat is ready.`

      await m.reply({
        type: 'image',
        media,
        caption
      })
    } catch (err) {
      console.error('[IQC2]', err?.message || err)
      await m.reply('Terjadi kesalahan saat memproses gambar.')
    }
  }
}