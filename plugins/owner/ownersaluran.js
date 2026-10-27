import { isNewsletterJid, listChannels, normalizeChannelJid, setChannelOwner } from '../../lib/saluran.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

export default {
  command: 'ownersaluran',
  alias: ['ownerch', 'setownerch'],
  category: 'owner',
  description: `> Menjadikan saluran sebagai owner: semua pesan dari saluran itu dianggap dari owner (bisa memakai fitur owner). Saluran harus sudah di-add.

*Keterangan Format:*
> \`<idch|nomor>\` = ID saluran atau nomor urut dari listsaluran.
> \`off\` = cabut status owner.

contoh penggunaan:
> \`.ownersaluran 120363400612665352\`
> \`.ownersaluran 1 off\``,
  help: '<idch|nomor> [off]',
  onlyOwner: true,

  async execute(m, { args }) {
    const p = `${shown(m)}${m.command}`
    const list = listChannels()
    const off = args.some(a => a.toLowerCase() === 'off')
    const arg = args.find(a => a.toLowerCase() !== 'off')

    let jid
    if (!arg) {
      if (!isNewsletterJid(m.chat)) {
        return m.reply(['🌷 *Owner Saluran*', '', `♡ ${p} <idch|nomor>`, `♡ ${p} <idch|nomor> off`, '', FOOTER].join('\n'))
      }
      jid = m.chat
    } else if (/^\d{1,4}$/.test(arg)) {
      jid = list[Number(arg) - 1]?.jid
      if (!jid) return m.reply(`Nomor ${arg} tidak ada di daftar. Cek ${shown(m)}listsaluran`)
    } else {
      jid = normalizeChannelJid(arg)
      if (!jid) return m.reply('Bukan ID saluran yang valid.')
    }

    if (!setChannelOwner(jid, !off)) {
      return m.reply(`Saluran itu belum di-add. Pakai ${shown(m)}addsaluran ${jid.split('@')[0]} dulu.`)
    }

    return m.reply([
      '🌷 *Owner Saluran*',
      '',
      `♡ ID : ${jid}`,
      `♡ Mode : ${off ? 'biasa' : 'owner 👑'}`,
      '',
      FOOTER
    ].join('\n'))
  }
}
