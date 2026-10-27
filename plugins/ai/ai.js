import axios from 'axios'

export default {
  command: 'ai',
  category: 'ai',
  description: `> Chat dengan asisten AI Unlimited.\n\ncontoh:\n> \`.unlimited Halo, kamu siapa?\``,
  help: '<teks>',
  typing: true,

  async execute(m, { args }) {
    const text = args.join(' ')
    if (!text) return m.reply('Apa yang ingin kamu tanyakan?\nContoh: `.ai Halo, kamu siapa?`')

    try {
      const chatId = m.sender.split('@')[0]
      const { data: res } = await axios.get(`${global.lynxapis}/api/ai/unlimited?prompt=${encodeURIComponent(text)}&chat_id=${chatId}`)
      
      if (!res.status || !res.data || !res.data.response) {
        return m.reply('Maaf, saat ini AI sedang tidak bisa merespon.')
      }

      const caption = `🌷 *Elyra*\n- ${res.data.response}`
      
      await m.reply(caption)
    } catch (err) {
      console.error('[UNLIMITED]', err?.message || err)
      await m.reply('Terjadi kesalahan saat memproses pesanmu.')
    }
  }
}