import { listJadibotStatus, queueInfo, MAX_JADIBOT, JB_FOOTER } from '../../lib/jadibot.js'
import { formatDuration } from '../../lib/utils.js'

const ICON = { online: '🟢', connecting: '🟡', reconnecting: '🟡', offline: '⚫', failed: '🔴' }
const mask = (n) => (n.length > 7 ? `${n.slice(0, 4)}••••${n.slice(-3)}` : n)

export default {
  command: 'listjadibot',
  alias: ['jadibotlist', 'daftarjadibot'],
  category: 'jadibot',
  description: '> Menampilkan daftar jadibot beserta status koneksi dan kondisi antrian request.\n> Nomor disamarkan kecuali untuk owner.',
  help: '',
  noChild: true,
  limit: false,

  async execute(m) {
    const rows = listJadibotStatus()
    const q = queueInfo()
    const lines = ['🌷 *Daftar Jadibot*', '', `♡ Terdaftar : ${rows.length}/${MAX_JADIBOT}`, `♡ Online : ${rows.filter(r => r.status === 'online').length}`]
    lines.push(`♡ Antrian : ${q.busy ? `1 diproses${q.waiting ? ` + ${q.waiting} menunggu` : ''}` : 'kosong'}`, '')

    if (!rows.length) lines.push('Belum ada jadibot.')
    rows.forEach((r, i) => {
      const num = m.isOwner ? r.number : mask(r.number)
      const up = r.since ? ` • ${formatDuration(Date.now() - r.since)}` : ''
      lines.push(`${i + 1}. ${ICON[r.status] || '⚫'} ${num} (${r.status}${up})`)
    })

    lines.push('', `Mau jadi bot? ketik ${m.prefix}jadibot`, JB_FOOTER)
    return m.reply(lines.join('\n'))
  }
}
