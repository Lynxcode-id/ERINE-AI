import { addGroup, isWhitelistEnabled, listGroups, normalizeGroupJid } from '../../lib/whitelist.js'
import { getCachedGroupMetadata, getGroupMetadata } from '../../db/groupCache.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

export default {
  command: 'addwl',
  alias: ['addwhitelist', 'wladd'],
  category: 'owner',
  description: `> Menambahkan grup ke whitelist. Kalau whitelist aktif, bot hanya berfungsi di grup yang sudah ditambahkan.

*Keterangan Format:*
> Tanpa argumen (di dalam grup) = grup saat ini.
> \`<idgc>\` = ID grup (boleh banyak, pisahkan spasi).

contoh penggunaan:
> \`.addwl\` (ketik di grupnya)
> \`.addwl 120363012345678901@g.us\``,
  help: '[idgc]',
  onlyOwner: true,

  async execute(m, { sock, args }) {
    const p = `${shown(m)}${m.command}`

    let targets
    if (args.length) {
      targets = args.map(a => ({ raw: a, jid: normalizeGroupJid(a) }))
    } else if (m.isGroup) {
      targets = [{ raw: m.chat, jid: m.chat }]
    } else {
      return m.reply([
        '🌷 *Add Whitelist*',
        '',
        'Daftarkan grup agar bot bisa dipakai',
        'saat whitelist aktif.',
        '',
        `♡ ${p} (ketik di grup tujuan)`,
        `♡ ${p} <idgc>`,
        '',
        FOOTER
      ].join('\n'))
    }

    const lines = []
    for (const { raw, jid } of targets) {
      if (!jid) {
        lines.push(`❌ ${raw} — bukan ID grup yang valid`)
        continue
      }

      let name = getCachedGroupMetadata(jid)?.subject || ''
      let known = Boolean(name)
      if (!name) {
        const meta = await getGroupMetadata(jid, sock).catch(() => null)
        name = meta?.subject || ''
        known = Boolean(meta)
      }

      const added = addGroup(jid, name)
      lines.push(`${added ? '✅' : 'ℹ️'} ${name || jid} — ${added ? 'ditambahkan' : 'sudah ada di whitelist'}${known ? '' : ' (bot belum terdeteksi di grup ini)'}`)
      if (name) lines.push(`   ♡ ${jid}`)
    }

    return m.reply([
      '🌷 *Add Whitelist*',
      '',
      ...lines,
      '',
      `♡ Total whitelist : ${listGroups().length} grup`,
      `♡ Status whitelist : ${isWhitelistEnabled() ? 'aktif ✅' : `nonaktif ❌ (aktifkan: ${shown(m)}whitelist on)`}`,
      '',
      FOOTER
    ].join('\n'))
  }
}
