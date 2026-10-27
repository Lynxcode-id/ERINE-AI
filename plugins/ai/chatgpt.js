import axios from 'axios'

export default {
  command: 'chatgpt',
  category: 'ai',
  description: '> Bertanya kepada asisten AI ChatGPT.\n\ncontoh:\n> .chatgpt halo',
  help: '<teks>',
  typing: true,

  async execute(m, { args }) {
    const text = args.join(' ').trim()
    if (!text) return m.reply('Masukkan pertanyaan atau pesan.\nContoh: .chatgpt halo')

    try {
      const apiUrl = `${global.theresav}/api/ai/chatgpt?prompt=` + encodeURIComponent(text)
      const { data: res } = await axios.get(apiUrl, {
        headers: {
          'x-apikey': global.apikey.theresav
        }
      })

      if (!res?.status || !res?.result) {
        return m.reply('Maaf, saat ini AI sedang tidak bisa merespon.')
      }

      const caption = '🌷 *Elyra*\n- ' + res.result

      await m.reply(caption)
    } catch (err) {
      console.error('[CHATGPT]', err?.message || err)
      await m.reply('Terjadi kesalahan saat memproses pesanmu.')
    }
  }
}