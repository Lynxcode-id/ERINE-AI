import { parseChatDuration } from '../../lib/durasi.js'

export default {
  command: 'ephemeral',
  alias: ['pesansementara', 'disappearing', 'ephem'],
  category: 'grup',
  description: `> Atur pesan sementara (hilang otomatis) di grup.

*Pilihan:* \`24j\` (24 jam) • \`7h\` (7 hari) • \`30h\` (30 hari) • \`off\`

contoh penggunaan:
> \`.ephemeral 24j\`
> \`.ephemeral 7h\`
> \`.ephemeral 30h\`
> \`.ephemeral off\``,
  help: '<24j|7h|30h|off>',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,

  async execute(m, { sock, args }) {
    const d = parseChatDuration(args[0])
    if (!d) return m.reply(`🌷 *Pesan Sementara*\n\n♡ ${m.prefix}${m.command} 24j (24 jam)\n♡ ${m.prefix}${m.command} 7h (7 hari)\n♡ ${m.prefix}${m.command} 30h (30 hari)\n♡ ${m.prefix}${m.command} off`)
    await sock.setChatEphemeral(m.chat, d.secs)
    return m.reply(d.secs ? `✅ Pesan sementara aktif: *${d.label}*.` : '✅ Pesan sementara dimatikan.')
  }
}
