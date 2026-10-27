import { mentionTarget } from '../../lib/welcome.js'

export default {
  command: 'listadmingrup',
  alias: ['listadmin', 'adminlist', 'daftaradmin'],
  category: 'grup',
  description: '> Menampilkan daftar admin grup ini (owner grup ditandai 👑).',
  help: '',
  onlyGroup: true,

  async execute(m) {
    const meta = await m.groupMetadata().catch(() => null)
    const admins = (meta?.participants || []).filter(p => p.isAdmin || p.isSuperAdmin)
    if (!admins.length) return m.reply('❌ Gagal mengambil daftar admin grup.')

    admins.sort((a, b) => Number(Boolean(b.isSuperAdmin)) - Number(Boolean(a.isSuperAdmin)))
    const mentions = admins.map(mentionTarget).filter(Boolean)
    const lines = ['🌷 *Admin Grup*', '', `♡ ${meta.subject || m.groupName}`, `♡ Total admin : ${admins.length}`, '']
    admins.forEach((p, i) => lines.push(`${i + 1}. @${String(mentionTarget(p)).split('@')[0]}${p.isSuperAdmin ? ' 👑' : ''}`))
    lines.push('', 'with love, elyra !!')
    return m.reply(lines.join('\n'), { mentions })
  }
}
