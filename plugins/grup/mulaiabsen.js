import { getSession, startSession } from '../../database/dbabsen.js'

export default {
  command: 'mulaiabsen',
  alias: ['startabsen', 'absenmulai'],
  category: 'grup',
  description: `> Memulai sesi absen di grup. Member mengisi lewat \`.absen\`.

contoh penggunaan:
> \`.mulaiabsen\`
> \`.mulaiabsen Rapat Senin\`

Lihat hasil: .listabsen • yang belum: .listgaabsen • akhiri: .akhiriabsen`,
  help: '[judul]',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m, { args }) {
    const p = m.prefix
    if (getSession(m.chat)) {
      return m.reply(`⚠️ Masih ada sesi absen yang berjalan.\nAkhiri dulu pakai ${p}akhiriabsen, atau cek ${p}listabsen`)
    }
    const title = args.join(' ').trim().slice(0, 80) || 'Absen'
    startSession(m.chat, title, m.sender)
    return m.reply([
      '🌷 *Absen Dimulai*',
      '',
      `♡ Judul : ${title}`,
      `♡ Silakan ketik *${p}absen* untuk hadir`,
      '',
      `♡ Daftar hadir : ${p}listabsen`,
      `♡ Belum absen : ${p}listgaabsen`,
      '',
      'with love, elyra !!'
    ].join('\n'))
  }
}
