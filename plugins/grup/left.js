import {
  WELCOME_FOOTER,
  getLeft,
  renderWelcome,
  welcomeKeywordLines
} from '../../lib/welcome.js'
import { getCachedGroupMetadata, getGroupMetadata } from '../../db/groupCache.js'

const shown = m => m.prefix || '.'

export default {
  command: 'left',
  alias: ['cekleft', 'previewleft'],
  category: 'grup',
  tags: ['grup'],
  description: `> Melihat pesan left grup saat ini, atau mencoba tampilannya langsung.

*Keterangan Format:*
> \`test\` = kirim contoh pesan left ke grup ini (kamu sebagai member yang keluar).

contoh penggunaan:
> \`.left\`
> \`.left test\``,
  help: '[test]',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m, { sock, args }) {
    const entry = getLeft(m.chat)
    const p = shown(m)

    if (!entry) {
      return m.reply([
        '🌷 *Left*',
        '',
        'Pesan left grup ini belum diatur.',
        '',
        `♡ ${p}setleft <teks>`,
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
      '🌷 *Left*',
      '',
      entry.text,
      '',
      `♡ ${p}left test — coba tampilannya`,
      `♡ ${p}changeleft <teks> — ganti`,
      `♡ ${p}delleft — hapus`,
      '',
      WELCOME_FOOTER
    ].join('\n'))
  }
}
