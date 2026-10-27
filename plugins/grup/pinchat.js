import { parseChatDuration } from '../../lib/durasi.js'

export default {
  command: 'pinchat',
  alias: ['pinpesan', 'pinmsg', 'sematkan'],
  category: 'grup',
  description: `> Sematkan (pin) pesan di grup. Reply pesan yang mau disematkan.

*Pilihan durasi:* \`24j\` (24 jam) • \`7h\` (7 hari) • \`30h\` (30 hari)

contoh penggunaan:
> \`.pinchat 24j\` (reply pesan)
> \`.pinchat 7h\`
> \`.pinchat 30h\``,
  help: '<24j|7h|30h> (reply pesan)',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,

  async execute(m, { sock, args }) {
    const d = parseChatDuration(args[0] || '7')
    if (!m.quoted) return m.reply(`❌ Reply pesan yang mau disematkan.\n\nContoh: ${m.prefix}${m.command} 24j`)
    if (!d || !d.secs) return m.reply(`❌ Durasi: 24j / 7h / 30h`)

    const key = { ...m.quoted.key, remoteJid: m.chat }
    const msg = sock.message
    try {
      if (typeof msg.pin === 'function') await msg.pin(m.chat, key, d.secs)
      else await msg.send(m.chat, { type: 'pin', target: key, duration: d.secs })
    } catch (err) {
      console.error('[PINCHAT]', err?.stack || err?.message || err)
      return m.reply(`❌ Gagal menyematkan pesan: ${err?.message || 'unknown'}`)
    }
    return m.reply(`📌 Pesan disematkan selama *${d.label}*.`)
  }
}
