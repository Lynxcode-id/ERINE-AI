import { getEffectiveGroupSettings, updateGroupSettings } from '../../lib/groupAndBot.js'

const actions = new Set(['delete', 'kick', 'both'])
const TYPES = {
  gc: { key: 'antilink', name: 'Link Grup' },
  ch: { key: 'antilinkch', name: 'Link Channel' },
  custom: { key: 'antilinkcustom', name: 'Link Custom' }
}

const modeOf = c => (c.kick && c.delete ? 'both' : c.kick ? 'kick' : c.delete ? 'delete' : 'off')

export default {
  command: 'antilink',
  alias: ['antilinkgc', 'antilinkgrup', 'antilinkall', 'antilinkch'],
  category: 'grup',
  description: `> Anti-link grup. Pilih jenis link: gc (link grup), ch (link channel), custom (daftar link buatanmu lewat .setlink).

*Keterangan Format:*
\`gc | ch | custom\` = jenis (kosong = gc).
\`on\` / \`off\` = hidupkan / matikan.

*Pilihan sanksi:*
\`delete\` = hapus pesan.
\`kick\` = keluarkan user.
\`both\` = hapus & keluarkan.

contoh penggunaan:
\`.antilink on kick\`
\`.antilink gc on delete\`
\`.antilink ch on both\`
\`.antilink custom on delete\`
\`.antilink ch off\`

*Catatan:*
> admin grup tidak terkena sanksi.
> fitur ini hanya bisa digunakan oleh owner.`,
  help: '[gc|ch|custom] <on/off> <delete/kick/both>',
  onlyOwner: true,
  onlyGroup: true,

  async execute(m, { args }) {
    const a = args.map(x => x.toLowerCase())
    const type = TYPES[a[0]] ? a.shift() : (m.command === 'antilinkch' ? 'ch' : 'gc')
    const value = a[0]
    const action = a[1]
    const { key, name } = TYPES[type]
    const p = m.prefix

    if (!['true', 'false', 'on', 'off'].includes(value) || a.length > 2) {
      const s = getEffectiveGroupSettings(m.chat)
      return m.reply([
        '🌷 *Antilink*',
        '',
        `♡ GC : ${modeOf(s.antilink)}`,
        `♡ CH : ${modeOf(s.antilinkch)}`,
        `♡ Custom : ${modeOf(s.antilinkcustom)}`,
        '',
        `Format: \`${p}antilink <gc|ch|custom> <on/off> <delete/kick/both>\``,
        `Contoh: ${p}antilink ch on delete`
      ].join('\n'))
    }

    const enabled = value === 'true' || value === 'on'
    if (enabled && !actions.has(action)) return m.reply(`Format salah! Gunakan: \`${p}antilink ${type} on <delete/kick/both>\``)
    if (!enabled && action) return m.reply(`Saat mematikan cukup: ${p}antilink ${type} off`)

    const s = updateGroupSettings(m.chat, {
      [key]: {
        kick: enabled && (action === 'kick' || action === 'both'),
        delete: enabled && (action === 'delete' || action === 'both')
      }
    })
    return m.reply(`✅ Antilink ${name} ${enabled ? `diaktifkan (${modeOf(s[key])})` : 'dinonaktifkan'} untuk grup ini.`)
  }
}
