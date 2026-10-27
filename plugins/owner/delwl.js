import { isWhitelistEnabled, listGroups, normalizeGroupJid, removeGroup } from '../../lib/whitelist.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

export default {
  command: 'delwl',
  alias: ['delwhitelist', 'wldel'],
  category: 'owner',
  description: `> Menghapus grup dari whitelist. Kalau whitelist aktif, bot berhenti berfungsi di grup itu.

*Keterangan Format:*
> Tanpa argumen (di dalam grup) = grup saat ini.
> \`<idgc>\` = ID grup, atau \`<nomor>\` urutan dari listwl.

contoh penggunaan:
> \`.delwl\` (ketik di grupnya)
> \`.delwl 2\`
> \`.delwl 120363012345678901@g.us\``,
  help: '[idgc|nomor]',
  onlyOwner: true,

  async execute(m, { args }) {
    const p = `${shown(m)}${m.command}`
    const list = listGroups()
    const arg = args[0]

    let jid
    if (!arg) {
      if (!m.isGroup) {
        return m.reply([
          '🌷 *Delete Whitelist*',
          '',
          'Hapus grup dari whitelist.',
          '',
          `♡ ${p} (ketik di grup tujuan)`,
          `♡ ${p} <idgc>`,
          `♡ ${p} <nomor dari ${shown(m)}listwl>`,
          '',
          FOOTER
        ].join('\n'))
      }
      jid = m.chat
    } else if (/^\d{1,4}$/.test(arg)) {
      jid = list[Number(arg) - 1]?.jid
      if (!jid) return m.reply(`Nomor ${arg} tidak ada di daftar. Cek ${shown(m)}listwl`)
    } else {
      jid = normalizeGroupJid(arg)
      if (!jid) return m.reply('Bukan ID grup yang valid.')
    }

    const name = list.find(g => g.jid === jid)?.name
    if (!removeGroup(jid)) return m.reply('Grup itu tidak ada di whitelist.')

    return m.reply([
      '🌷 *Delete Whitelist*',
      '',
      `🗑️ ${name || jid} dihapus dari whitelist`,
      `   ♡ ${jid}`,
      '',
      `♡ Total whitelist : ${listGroups().length} grup`,
      `♡ Status whitelist : ${isWhitelistEnabled() ? 'aktif ✅ (grup ini tidak bisa memakai bot lagi)' : 'nonaktif ❌'}`,
      '',
      FOOTER
    ].join('\n'))
  }
}
