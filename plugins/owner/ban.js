import { config } from '../../settings.js'
import { extractTarget } from '../../lib/utils.js'
import { BAN_FOOTER, addBan, formatRemaining, formatUntil, parseDuration, resolveIds } from '../../lib/ban.js'

const shown = m => m.prefix || '.'
const digits = (jid) => String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '')
const strip = (jid) => (jid ? String(jid).replace(/:\d+@/, '@') : jid)

const isTargetToken = (t) => /^@?\d{8,}(@\S+)?$/.test(t)

function splitArgs(args) {
  const tokens = args.map(t => (/^\+?0\d{7,}$/.test(t) ? `62${t.replace(/^\+?0/, '')}` : t.replace(/^\+(?=\d)/, '')))
  const targetTokens = []
  const reasonTokens = []
  let duration = null

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (isTargetToken(t)) { targetTokens.push(t); continue }

    if (duration === null && reasonTokens.length === 0) {
      let d = parseDuration(t)
      if (d) { duration = d; continue }

      if (/^\d+([.,]\d+)?$/.test(t) && tokens[i + 1]) {
        d = parseDuration(t + tokens[i + 1])
        if (d) { duration = d; i++; continue }
      }
      if (/^\d{1,7}$/.test(t)) return { error: `Durasi \`${t}\` belum ada satuannya. Contoh: ${t}h (hari), ${t}j (jam), ${t}m (menit).` }
    }
    reasonTokens.push(t)
  }
  return { targetTokens, duration, reason: reasonTokens.join(' ') }
}

function buildUsage(m) {
  const p = `${shown(m)}${m.command}`
  return [
    '🌷 *Ban User*',
    '',
    'User yang di-ban tidak akan digubris bot,',
    'user lain tetap bisa memakai bot seperti biasa.',
    '',
    `♡ ${p} 6288258041396`,
    `♡ ${p} @tag`,
    `♡ ${p} 6288258041396 7h spam`,
    `♡ ${p} (reply pesan) 30h`,
    '',
    'Durasi: 30d / 7h = hari, 5j = jam, 10m = menit,',
    '2w = minggu, 3b = bulan, 1y = tahun, bisa digabung',
    '(1h12j). Tanpa durasi = permanen. Sisanya jadi alasan.',
    '',
    BAN_FOOTER
  ].join('\n')
}

export default {
  command: 'ban',
  alias: ['banuser', 'blokiruser'],
  category: 'owner',
  description: `> Memblokir user dari bot. User yang di-ban diabaikan bot, user lain tetap normal. Bisa berdurasi, tanpa batas maksimal.

*Keterangan Format:*
> \`<nomor | @tag | reply>\` = target.
> \`[durasi]\` = opsional, 30h/7d = hari, 5j = jam, 10m = menit, 2w = minggu, 3b = bulan, 1y = tahun.
> \`[alasan]\` = opsional.

contoh penggunaan:
> \`.ban 6288258041396\`
> \`.ban @tag 7h spam\``,
  help: '<nomor|@tag|reply> [durasi] [alasan]',
  onlyOwner: true,

  async execute(m, { sock, args }) {
    const parsed = splitArgs(args)
    if (parsed.error) return m.reply(parsed.error)

    const target = extractTarget(m, parsed.targetTokens)
    if (!target) return m.reply(buildUsage(m))

    const ids = resolveIds(target)
    const owners = [config.owner, ...(Array.isArray(config.owners) ? config.owners : [])].map(digits).filter(Boolean)
    if (ids.some(id => owners.includes(digits(id)))) return m.reply('Owner tidak bisa di-ban.')

    const creds = sock.getCredentials?.()
    const mine = [creds?.meJid, creds?.meLid].filter(Boolean).map(strip)
    if (ids.some(id => mine.includes(id))) return m.reply('Bot tidak bisa mem-ban dirinya sendiri.')

    const { entry, updated } = addBan(target, {
      durationMs: parsed.duration,
      reason: parsed.reason,
      by: m.sender
    })

    return m.reply(m.chat, [
      updated ? '♻️ *Ban diperbarui*' : '✅ *User di-ban*',
      '',
      `♡ User : @${digits(target)}`,
      `♡ Durasi : ${entry.until ? formatRemaining(entry.until - Date.now()) : 'permanen'}`,
      entry.until ? `♡ Berakhir : ${formatUntil(entry.until)}` : '',
      entry.reason ? `♡ Alasan : ${entry.reason}` : '',
      '',
      'User diberi tahu sekali saja saat mencoba memakai bot.',
      '',
      BAN_FOOTER
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'), { mentions: [target] })
  }
}