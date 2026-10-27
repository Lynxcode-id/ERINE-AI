export default {
  command: 'ping',
  category: 'bot',
  description: '> Menampilkan latency (waktu respon) bot dalam satuan milidetik.\n\ncontoh:\n> .ping',
  typing: true,

  async execute(m, { sock }) {
    await sock.sendReact(m.chat, '🌱', m.id).catch(() => {})

    const start = Date.now()

    try {
      const initCaption = '🌷 *Elyra Ping*\n- Menghitung waktu respon... ⏳'
      const msg = await m.reply(initCaption)

      const latency = Date.now() - start
      const finalCaption = '🌷 *Elyra Ping*\n- Pong! Bot merespon dengan baik.\n\n♡ - Latency : ' + latency + 'ms'

      await sock.message.send(m.chat, finalCaption, { editKey: { id: msg.id } })

      await sock.sendReact(m.chat, '💐', m.id).catch(() => {})
    } catch (err) {
      console.error('[PING]', err?.message || err)
      await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
      await m.reply('❌ Terjadi kesalahan saat menghitung ping.')
    }
  }
}