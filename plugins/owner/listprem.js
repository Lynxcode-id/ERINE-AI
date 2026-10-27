import { listTiers, TIER_LABEL, TIER_FOOTER } from '../../lib/tier.js'
import { formatRemaining } from '../../lib/ban.js'

export default {
  command: 'listprem',
  alias: ['listpremium', 'listvip', 'listtier'],
  category: 'owner',
  description: '> Daftar user premium & VIP yang masih aktif.',
  onlyOwner: true,
  async execute(m) {
    const rows = listTiers()
    if (!rows.length) return m.reply('Belum ada user premium/VIP.')
    const lines = rows.map((r, i) =>
      `${i + 1}. @${r.jid.split('@')[0]} — ${TIER_LABEL[r.tier]} • ${r.until ? formatRemaining(r.until - Date.now()) : 'permanen'}`)
    return m.reply(['🌷 *Daftar Tier*', '', ...lines, '', TIER_FOOTER].join('\n'),
      { mentions: rows.map(r => r.jid) })
  }
}
