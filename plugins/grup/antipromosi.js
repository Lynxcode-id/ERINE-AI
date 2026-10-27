import { getEffectiveGroupSettings, updateGroupSettings } from '../../lib/groupAndBot.js'
import { getGuardList } from '../../lib/guardLists.js'

const actions = new Set(['delete', 'kick', 'both'])
const modeOf = c => (c.kick && c.delete ? 'both' : c.kick ? 'kick' : c.delete ? 'delete' : 'off')

export default {
  command: 'antipromosi',
  alias: ['antipromo', 'antispampromosi'],
  category: 'grup',
  description: `> Hapus/kick pesan yang mengandung kata promosi. Daftar kata diatur lewat .setkatapromosi / .delkatapromosi / .listkatapromosi.

contoh penggunaan:
> \`.antipromosi on delete\`
> \`.antipromosi on both\`
> \`.antipromosi off\`

*Catatan:* admin grup tidak terkena sanksi.`,
  help: '<on/off> <delete/kick/both>',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m, { args }) {
    const value = args[0]?.toLowerCase()
    const action = args[1]?.toLowerCase()
    const p = m.prefix

    if (!['on', 'off', 'true', 'false'].includes(value) || args.length > 2) {
      const s = getEffectiveGroupSettings(m.chat)
      return m.reply([
        '🌷 *Antipromosi*',
        '',
        `♡ Status : ${modeOf(s.antipromosi)}`,
        `♡ Jumlah kata : ${getGuardList(m.chat, 'antipromosi').length}`,
        '',
        `Format: \`${p}antipromosi <on/off> <delete/kick/both>\``,
        `Tambah kata: ${p}setkatapromosi <kata>`
      ].join('\n'))
    }

    const enabled = value === 'on' || value === 'true'
    if (enabled && !actions.has(action)) return m.reply(`Format salah! \`${p}antipromosi on <delete/kick/both>\``)

    const s = updateGroupSettings(m.chat, {
      antipromosi: {
        kick: enabled && (action === 'kick' || action === 'both'),
        delete: enabled && (action === 'delete' || action === 'both')
      }
    })
    const note = enabled && !getGuardList(m.chat, 'antipromosi').length
      ? `\n⚠️ Daftar kata masih kosong. Isi dulu: ${p}setkatapromosi <kata>` : ''
    return m.reply(`✅ Antipromosi ${enabled ? `diaktifkan (${modeOf(s.antipromosi)})` : 'dinonaktifkan'}.${note}`)
  }
}
