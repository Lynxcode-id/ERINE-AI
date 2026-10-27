import { isNewsletterJid, listChannels, normalizeChannelJid, removeChannel } from '../../lib/saluran.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

export default {
  command: 'delsaluran',
  alias: ['delch', 'delchannel'],
  category: 'owner',
  description: `> Menghapus saluran dari daftar. Setelah dihapus, bot mengabaikan saluran itu lagi.

*Keterangan Format:*
> \`<idch>\` = ID saluran, atau \`<nomor>\` urutan dari listsaluran.
> Tanpa argumen (dikirim dari dalam saluran) = saluran itu sendiri.

contoh penggunaan:
> \`.delsaluran 120363400612665352\`
> \`.delsaluran 2\``,
  help: '[idch|nomor]',
  onlyOwner: true,

  async execute(m, { args }) {
    const p = `${shown(m)}${m.command}`
    const list = listChannels()
    const arg = args[0]

    let jid
    if (!arg) {
      if (!isNewsletterJid(m.chat)) {
        return m.reply(['🌷 *Delete Saluran*', '', `♡ ${p} <idch>`, `♡ ${p} <nomor dari ${shown(m)}listsaluran>`, '', FOOTER].join('\n'))
      }
      jid = m.chat
    } else if (/^\d{1,4}$/.test(arg)) {
      jid = list[Number(arg) - 1]?.jid
      if (!jid) return m.reply(`Nomor ${arg} tidak ada di daftar. Cek ${shown(m)}listsaluran`)
    } else {
      jid = normalizeChannelJid(arg)
      if (!jid) return m.reply('Bukan ID saluran yang valid.')
    }

    const removed = removeChannel(jid)
    if (!removed) return m.reply('Saluran itu tidak ada di daftar.')

    return m.reply([
      '🌷 *Delete Saluran*',
      '',
      `🗑️ ${removed.name || jid} dihapus`,
      `♡ ID : ${jid}`,
      `♡ Total saluran : ${listChannels().length}`,
      '',
      FOOTER
    ].join('\n'))
  }
}
