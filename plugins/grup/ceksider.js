import { runSiderCheck, DEFAULT_DAYS } from '../../lib/siderTools.js'

export default {
  command: 'ceksider',
  alias: ['sider', 'listsider'],
  category: 'grup',
  description: `> Cek sider (member yang diam saja / tidak pernah chat) di grup ini. Admin, bot, dan owner dikecualikan. Hasil disimpan untuk perintah \`.kicksider\`.

*Keterangan Format:*
\`[hari]\` = batas tidak chat (default ${DEFAULT_DAYS} hari).

contoh penggunaan:
> \`.ceksider\`
> \`.ceksider 14\`

Autocheck otomatis tiap 7 hari: \`.autosider on\`.
*Catatan:* aktivitas dihitung sejak bot mulai mencatat chat grup ini.`,
  help: '[hari]',
  onlyGroup: true,
  onlyAdmin: true,
  typing: true,

  async execute(m, { sock, args }) {
    const raw = args[0]
    const days = raw === undefined ? DEFAULT_DAYS : Number(raw)
    if (!Number.isInteger(days) || days < 1 || days > 365) return m.reply(`Format: ${m.prefix}${m.command} [hari 1-365]`)
    await runSiderCheck(sock, m.chat, { days, quote: m.raw })
  }
}
