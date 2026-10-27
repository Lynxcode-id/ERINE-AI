import { extractTarget } from '../../lib/utils.js'
import { BAN_FOOTER, removeBan } from '../../lib/ban.js'

const shown = m => m.prefix || '.'
const digits = (jid) => String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '')

export default {
  command: 'unban',
  alias: ['unbanuser', 'bukablokir'],
  category: 'owner',
  description: `> Membuka ban user, bot kembali merespon user tersebut.

*Keterangan Format:*
> \`<nomor | @tag | reply>\` = target.

contoh penggunaan:
> \`.unban 6288258041396\`
> \`.unban @tag\``,
  help: '<nomor|@tag|reply>',
  onlyOwner: true,

  async execute(m, { args }) {
    const tokens = args.map(t => (/^\+?0\d{7,}$/.test(t) ? `62${t.replace(/^\+?0/, '')}` : t.replace(/^\+(?=\d)/, '')))
    const target = extractTarget(m, tokens)

    if (!target) {
      const p = `${shown(m)}${m.command}`
      return m.reply([
        '🌷 *Unban User*',
        '',
        'Buka ban user agar bot kembali',
        'merespon user tersebut.',
        '',
        `♡ ${p} 6288258041396`,
        `♡ ${p} @tag`,
        `♡ ${p} (reply pesan)`,
        '',
        BAN_FOOTER
      ].join('\n'))
    }

    const removed = removeBan(target)
    if (!removed) return m.reply(`@${digits(target)} tidak sedang di-ban.`)

    return m.reply(m.chat, [
      '✅ *Ban dibuka*',
      '',
      `♡ User : @${digits(target)}`,
      '♡ Bot kembali merespon user ini.',
      '',
      BAN_FOOTER
    ].join('\n'), { mentions: [target] })
  }
}
