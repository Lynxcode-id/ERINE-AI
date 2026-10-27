import * as db from '../../database/dblinkjudol.js'

const FOOTER = 'with love, elyra !!'

export default {
  command: 'setlinkjudol',
  alias: ['addlinkjudol', 'setjudol'],
  category: 'grup',
  description: `> Menambah domain/kata ke daftar antilink judol & phishing grup ini.

contoh penggunaan:
> \`.setlinkjudol slotgacor88.com\`
> \`.setlinkjudol bit.ly/xyz\``,
  help: '<domain/kata>',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m, { args }) {
    const item = args.join(' ').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')
    if (!item) return m.reply(`Format: ${m.prefix}${m.command} <domain/kata>\nContoh: ${m.prefix}${m.command} slotgacor88.com`)
    if (item.length < 3) return m.reply('⚠️ Terlalu pendek, minimal 3 karakter supaya tidak salah deteksi.')
    if (!db.addItem(m.chat, item)) return m.reply(`⚠️ "${item}" sudah ada di daftar.`)
    return m.reply(`✅ *Link Judol/Phishing*\n\n♡ Ditambah : ${item}\n♡ Total : ${db.getList(m.chat).length}\n\n${FOOTER}`)
  }
}
