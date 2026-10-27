import * as db from '../../database/dblinkjudol.js'

const FOOTER = 'with love, elyra !!'

export default {
  command: 'dellinkjudol',
  alias: ['hapuslinkjudol', 'deljudol'],
  category: 'grup',
  description: `> Menghapus item dari daftar antilink judol & phishing. Bisa pakai isi item, nomor urut, atau \`all\` untuk hapus semua.

contoh penggunaan:
> \`.dellinkjudol slotgacor88.com\`
> \`.dellinkjudol 2\`
> \`.dellinkjudol all\``,
  help: '<item|nomor|all>',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m, { args }) {
    const q = args.join(' ').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')
    if (!q) return m.reply(`Format: ${m.prefix}${m.command} <item|nomor|all>`)
    const res = db.removeItem(m.chat, q)
    if (!res) return m.reply('⚠️ Tidak ditemukan di daftar.')
    if (res.removed === 'all') return m.reply(`✅ Semua daftar dihapus (${res.count} item).`)
    return m.reply(`✅ *Link Judol/Phishing*\n\n♡ Dihapus : ${res.removed}\n♡ Sisa : ${res.count}\n\n${FOOTER}`)
  }
}
