import {
  WELCOME_FOOTER,
  getWelcome,
  renderWelcome,
  welcomeKeywordLines
} from '../../lib/welcome.js'
import { getCachedGroupMetadata, getGroupMetadata } from '../../db/groupCache.js'

const shown = m => m.prefix || '.'

export default {
  command: 'welcome',
  alias: ['cekwelcome', 'previewwelcome'],
  category: 'grup',
  tags: ['grup'],
  description: `> Melihat welcome grup saat ini, atau mencoba tampilannya langsung.

*Keterangan Format:*
> \`test\` = kirim contoh sambutan ke grup ini (kamu sebagai member barunya).

contoh penggunaan:
> \`.welcome\`
> \`.welcome test\``,
  help: '[test]',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m, { sock, args }) {
    const entry = getWelcome(m.chat)
    const p = shown(m)

    if (!entry) {
      return m.reply([
        '🌷 *Welcome*',
        '',
        'Welcome grup ini belum diatur.',
        '',
        `♡ ${p}setwelcome <teks>`,
        ...welcomeKeywordLines(),
        '',
        WELCOME_FOOTER
      ].join('\n'))
    }

    if (String(args[0] || '').toLowerCase() === 'test') {
      let meta = getCachedGroupMetadata(m.chat)
      if (!meta?.subject) meta = await getGroupMetadata(m.chat, sock).catch(() => meta)

      const { text, mentions } = renderWelcome(entry.text, {
        users: [{ jid: m.sender }],
        subject: meta?.subject,
        description: meta?.description ?? meta?.desc
      })
      return sock.message.send(m.chat, text, mentions.length ? { mentions } : {})
    }

    return m.reply([
      '🌷 *Welcome*',
      '',
      entry.text,
      '',
      `♡ ${p}welcome test — coba tampilannya`,
      `♡ ${p}changewelcome <teks> — ganti`,
      `♡ ${p}delwelcome — hapus`,
      '',
      WELCOME_FOOTER
    ].join('\n'))
  }
}
