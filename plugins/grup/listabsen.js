import { getSession } from '../../database/dbabsen.js'

const fmt = (ts) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })

export default {
  command: 'listabsen',
  alias: ['daftarabsen', 'absenlist'],
  category: 'grup',
  description: '> Menampilkan daftar member yang sudah absen di sesi saat ini.',
  help: '',
  onlyGroup: true,

  async execute(m) {
    const sess = getSession(m.chat)
    if (!sess) return m.reply(`Belum ada sesi absen. Admin bisa mulai pakai ${m.prefix}mulaiabsen`)

    const entries = Object.values(sess.entries).sort((a, b) => a.at - b.at)
    const lines = ['🌷 *Daftar Hadir*', '', `♡ Sesi : ${sess.title}`, `♡ Hadir : ${entries.length}`, '']
    if (!entries.length) lines.push('Belum ada yang absen.')
    else entries.forEach((e, i) => lines.push(`${i + 1}. ${e.name || '@' + e.ids[0]} • ${fmt(e.at)}`))
    lines.push('', 'with love, elyra !!')
    return m.reply(lines.join('\n'))
  }
}
