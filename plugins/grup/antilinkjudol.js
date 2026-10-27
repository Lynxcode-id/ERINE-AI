import * as db from '../../database/dblinkjudol.js'

const FOOTER = 'with love, elyra !!'

export default {
  command: 'antilinkjudol',
  alias: ['antijudol', 'antiphishing', 'antipishing', 'antilinkphishing', 'antilinkpishing'],
  category: 'grup',
  description: `> Anti link judi online (judol) & phishing. Mendeteksi link bawaan (slot/togel/gacor, domain tiruan WhatsApp, hadiah palsu, dll) ditambah daftar buatanmu lewat .setlinkjudol.

*Pilihan sanksi:*
\`delete\` = hapus pesan.
\`kick\` = keluarkan user.
\`both\` = hapus & keluarkan (default).

contoh penggunaan:
> \`.antilinkjudol on\`
> \`.antilinkjudol on kick\`
> \`.antilinkjudol default off\` (matikan deteksi bawaan, hanya daftar sendiri)
> \`.antilinkjudol off\`

*Catatan:* admin grup tidak terkena sanksi. Daftar: .setlinkjudol / .dellinkjudol / .listlinkjudol`,
  help: '<on/off> [delete/kick/both] | default <on/off>',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m, { args }) {
    const a = args.map(x => x.toLowerCase())
    const p = m.prefix
    const cfg = db.getConfig(m.chat)

    if (a[0] === 'default') {
      if (!['on', 'off'].includes(a[1])) return m.reply(`Format: \`${p}antilinkjudol default <on/off>\``)
      db.setDefaults(m.chat, a[1] === 'on')
      return m.reply(`✅ Deteksi bawaan ${a[1] === 'on' ? 'diaktifkan' : 'dinonaktifkan'}.`)
    }

    if (!['on', 'off', 'true', 'false'].includes(a[0]) || a.length > 2) {
      return m.reply([
        '🌷 *Antilink Judol/Phishing*',
        '',
        `♡ Status : ${cfg.mode}`,
        `♡ Deteksi bawaan : ${cfg.defaults ? 'aktif' : 'mati'}`,
        `♡ Daftar sendiri : ${cfg.list.length} item`,
        '',
        `Format: \`${p}antilinkjudol <on/off> [delete/kick/both]\``,
        '',
        FOOTER
      ].join('\n'))
    }

    const on = a[0] === 'on' || a[0] === 'true'
    if (!on) {
      db.setMode(m.chat, 'off')
      return m.reply('✅ Antilink judol/phishing dinonaktifkan.')
    }

    const mode = a[1] || 'both'
    if (!db.MODES.includes(mode)) return m.reply(`Format salah! \`${p}antilinkjudol on <delete/kick/both>\``)
    db.setMode(m.chat, mode)
    const warn = m.isBotAdmin ? '' : '\n⚠️ Bot belum jadi admin, jadikan admin dulu supaya sanksi bisa berjalan.'
    return m.reply(`✅ Antilink judol/phishing diaktifkan (${mode}).${warn}`)
  }
}
