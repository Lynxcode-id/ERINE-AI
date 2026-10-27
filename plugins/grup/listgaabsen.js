import { getSession, hasEntry } from '../../database/dbabsen.js'
import { mentionTarget } from '../../lib/welcome.js'

const MAX = 60
const strip = (j) => (j ? String(j).replace(/:\d+@/, '@') : j)

export default {
  command: 'listgaabsen',
  alias: ['gaabsen', 'belumabsen', 'listbelumabsen'],
  category: 'grup',
  description: '> Menampilkan (dan men-tag) member grup yang belum absen di sesi saat ini. Admin & bot tidak dihitung.',
  help: '',
  onlyGroup: true,

  async execute(m, { sock }) {
    const sess = getSession(m.chat)
    if (!sess) return m.reply(`Belum ada sesi absen. Admin bisa mulai pakai ${m.prefix}mulaiabsen`)

    const meta = await m.groupMetadata().catch(() => null)
    if (!meta?.participants?.length) return m.reply('❌ Gagal mengambil daftar anggota grup.')

    const creds = sock.getCredentials?.()
    const bots = new Set([creds?.meJid, creds?.meLid].filter(Boolean).map(j => String(strip(j)).split('@')[0]))
    const absent = meta.participants.filter(p => {
      if (p.isAdmin || p.isSuperAdmin) return false
      const ids = [p.jid, p.phoneNumber, p.phoneJid].filter(Boolean).map(j => String(strip(j)).split('@')[0])
      if (ids.some(id => bots.has(id))) return false
      return !hasEntry(sess, ids)
    })

    const lines = ['🌷 *Belum Absen*', '', `♡ Sesi : ${sess.title}`, `♡ Belum : ${absent.length} member`, '']
    const shown = absent.slice(0, MAX)
    const mentions = shown.map(mentionTarget).filter(Boolean)
    if (!absent.length) lines.push('Semua member sudah absen 🎉')
    else {
      mentions.forEach((j, i) => lines.push(`${i + 1}. @${String(j).split('@')[0]}`))
      if (absent.length > shown.length) lines.push(`...dan ${absent.length - shown.length} lainnya`)
    }
    lines.push('', 'with love, elyra !!')
    return m.reply(lines.join('\n'), { mentions })
  }
}
