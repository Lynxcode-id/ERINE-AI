import { endSession } from '../../database/dbabsen.js'

export default {
  command: 'akhiriabsen',
  alias: ['stopabsen', 'selesaiabsen', 'hapusabsen'],
  category: 'grup',
  description: '> Mengakhiri sesi absen di grup ini dan menampilkan ringkasan jumlah hadir.',
  help: '',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m) {
    const old = endSession(m.chat)
    if (!old) return m.reply('Tidak ada sesi absen yang berjalan.')
    const names = Object.values(old.entries).sort((a, b) => a.at - b.at).map((e, i) => `${i + 1}. ${e.name || '@' + e.ids[0]}`)
    return m.reply(['✅ *Absen Selesai*', '', `♡ Sesi : ${old.title}`, `♡ Total hadir : ${names.length}`, '', ...names, '', 'with love, elyra !!'].join('\n'))
  }
}
