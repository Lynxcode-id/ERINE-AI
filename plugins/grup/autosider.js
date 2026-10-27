import * as sider from '../../database/dbsider.js'

export default {
  command: 'autosider',
  alias: ['autoceksider', 'autochecksider'],
  category: 'grup',
  description: `> Autocheck sider otomatis setiap 7 hari. Bot mengirim daftar sider ke grup dan menyimpannya untuk \`.kicksider\`.

contoh penggunaan:
> \`.autosider on\`
> \`.autosider off\``,
  help: '<on/off>',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m, { args }) {
    const v = args[0]?.toLowerCase()
    const g = sider.getGroup(m.chat)
    if (!['on', 'off'].includes(v)) {
      const next = g.auto && g.lastAuto ? new Date(g.lastAuto + sider.AUTO_INTERVAL).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) : '-'
      return m.reply(['🌷 *Autocheck Sider*', '', `♡ Status : ${g.auto ? 'ON' : 'OFF'}`, `♡ Cek berikutnya : ${g.auto ? next : '-'}`, '', `Format: \`${m.prefix}autosider <on/off>\``, '', 'with love, elyra !!'].join('\n'))
    }
    const on = v === 'on'
    if (on === g.auto) return m.reply(`⚠️ Autocheck sider sudah ${on ? 'aktif' : 'nonaktif'}.`)
    sider.setAuto(m.chat, on)
    return m.reply(on
      ? '✅ Autocheck sider diaktifkan. Pengecekan otomatis pertama 7 hari dari sekarang, lalu berulang tiap 7 hari.\n(Mau cek sekarang? pakai .ceksider)'
      : '✅ Autocheck sider dinonaktifkan.')
  }
}
