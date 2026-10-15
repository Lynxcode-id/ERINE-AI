import axios from 'axios'

export default {
  command: 'feelbetter',
  category: 'ai',
  description: `> Teman curhat AI yang siap mendengarkan keluh kesahmu.\n\ncontoh:\n> \`.feelbetter hari ini aku capek banget sama kerjaan...\``,
  help: '<teks>',
  typing: true,

  async execute(m, { args }) {
    const text = args.join(' ')
    if (!text) return m.reply('Ada yang mau diceritain?\nContoh: `.feelbetter hari ini aku capek banget...`')

    try {
      const { data: res } = await axios.get(`https://lynxapis.my.id/api/ai/feelbetter?prompt=${encodeURIComponent(text)}`)
      
      if (!res.status || !res.data || !res.data.response) {
        return m.reply('Maaf, saat ini AI sedang tidak bisa merespon.')
      }

      const caption = `🌷 *Elyra*\n- ${res.data.response}`
      
      await m.reply(caption)
    } catch (err) {
      console.error('[FEELBETTER]', err?.message || err)
      await m.reply('Terjadi kesalahan saat memproses pesanmu.')
    }
  }
}