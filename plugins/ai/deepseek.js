import axios from 'axios'

export default {
  command: 'deepseek',
  category: 'ai',
  tags: ['ai'],
  description: '> Chat dengan DeepSeek V2 AI.\n\ncontoh:\n> .deepseek Halo, siapa kamu?',
  help: '<teks>',
  typing: true,
  wait: false,

  async execute(m, { sock, args, usedPrefix, command }) {
    const text = args.join(' ').trim()

    if (!text) {
      return m.reply(
        '🌷 *Elyra DeepSeek AI*\n' +
        '- Apa yang ingin kamu tanyakan?\n\n' +
        '♡ - Contoh: ' + (usedPrefix || '.') + command + ' Halo, siapa kamu?'
      )
    }

    await sock.sendReact(m.chat, '🌱', m.id).catch(() => {})

    try {
      const apiUrl = `${global.cmnty}/ai/deepseek-v2?text=` + encodeURIComponent(text) + `&apikey=${global.apikey.cmnty}`
      const { data } = await axios.get(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 60000
      })

      if (!data || !data.status || !data.result) {
        await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
        return m.reply('❌ Maaf, AI tidak memberikan respons yang valid.')
      }

      await m.reply(data.result)
      await sock.sendReact(m.chat, '💐', m.id).catch(() => {})
    } catch (err) {
      console.error('[DEEPSEEK AI]', err?.message || err)
      await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
      await m.reply('❌ Terjadi kesalahan saat menghubungi server AI.')
    }
  }
}