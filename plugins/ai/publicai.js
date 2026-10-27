import axios from 'axios'

const API_URL = `${global.jagoan}/api/ai/publicai`
const API_KEY = `Bearer ${global.apikey.jagoan}`

export default {
  command: 'publicai',
  category: 'ai',
  tags: ['ai'],
  description: 'Berinteraksi dengan Public AI dari Jagoan Project.',
  help: '<pertanyaan>',
  typing: true,

  async execute(m, { args, usedPrefix, command }) {
    const query = args.join(' ').trim()

    if (!query) {
      return m.reply(
        '🌷 *Elyra*\n' +
        '- Masukkan pertanyaan atau teks untuk AI.\n\n' +
        'Contoh: `' + (usedPrefix || '.') + (command || 'ai') + ' Halo, kamu siapa?`'
      )
    }

    try {
      const { data } = await axios.get(API_URL, {
        params: { q: query },
        headers: {
          'Authorization': API_KEY,
          'User-Agent': 'Elyra-AI/1.0'
        },
        timeout: 30000
      })

      if (!data || !data.status) {
        return m.reply('Maaf, saat ini AI sedang tidak bisa merespon.')
      }

      const answer = data.response || 'Tidak ada respons dari server AI.'
      const caption = `🌷 *Elyra*\n- ${answer}`

      await m.reply(caption)
    } catch (err) {
      console.error('[PUBLIC AI]', err?.message || err)
      await m.reply('Terjadi kesalahan saat memproses pesanmu.')
    }
  }
}