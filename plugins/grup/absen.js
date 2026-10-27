import { getSession, addEntry } from '../../database/dbabsen.js'
import { idsOf } from '../../lib/extraGuards.js'

export default {
  command: 'absen',
  alias: ['hadir', 'present'],
  category: 'grup',
  description: '> Mengisi absen pada sesi absen yang sedang berjalan di grup ini.\n\ncontoh penggunaan:\n> `.absen`',
  help: '',
  onlyGroup: true,

  async execute(m) {
    const sess = getSession(m.chat)
    if (!sess) return m.reply(`Belum ada sesi absen. Admin bisa mulai pakai ${m.prefix}mulaiabsen`)

    const res = addEntry(m.chat, idsOf(m.sender), { jid: m.sender, name: m.pushName })
    if (res === false) return m.reply('✅ Kamu sudah absen.')

    const total = Object.keys(sess.entries).length
    return m.reply(`✅ *Absen tercatat*\n\n♡ ${m.pushName || 'Kamu'} hadir\n♡ Sesi : ${sess.title}\n♡ Total hadir : ${total}\n\nwith love, elyra !!`)
  }
}
