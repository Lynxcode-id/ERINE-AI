import { requestDeleteSession, normalizeNumber, JB_FOOTER } from '../../lib/jadibot.js'

export default {
  command: 'delsesijadibot',
  alias: ['delsesijb', 'hapussesijadibot', 'stopjadibot'],
  category: 'jadibot',
  description: `> Menghapus sesi & data jadibot. User hanya bisa menghapus jadibot miliknya, owner bisa menghapus semua. Diproses lewat *antrian* (jeda acak antar request).

*Keterangan Format:*
\`[nomor]\` = nomor jadibot (kosong = nomor kamu sendiri).

contoh penggunaan:
> \`.delsesijadibot\`
> \`.delsesijadibot 628123456789\``,
  help: '[nomor]',
  onlyPrivate: true,
  noChild: true,
  limit: false,

  async execute(m, { sock, args }) {
    const fromSender = String(m.sender).endsWith('@s.whatsapp.net') ? m.sender : null
    const number = normalizeNumber(args[0] || fromSender)
    if (!number) return m.reply(`Nomor tidak terbaca.\nFormat: ${m.prefix}${m.command} 628xxxxxxxxxx\n\n${JB_FOOTER}`)

    const res = requestDeleteSession({
      number,
      requesterJid: m.sender,
      chat: m.chat,
      sock,
      isOwner: m.isOwner,
      reply: (text) => m.reply(text)
    })

    if (!res.ok) return m.reply(`⚠️ ${res.text}`)
  }
}
