import { getMemberJids, mentionText, TAG_FOOTER } from '../../lib/tagUtils.js'

export default {
  command: 'tagall',
  category: 'grup',
  tags: ['grup'],
  description: `> Mention semua anggota grup lengkap dengan pesan.

*Keterangan Format:*
\`<pesan>\` = pesan yang ditampilkan bersama tag.
(reply) = reply pesan untuk dijadikan isi pesan.

contoh penggunaan:
\`.tagall rapat jam 8\`
\`.tagall\` (reply pesan)`,
  help: '<pesan/reply>',
  onlyGroup: true,
  onlyAdmin: true,
  typing: true,

  async execute(m, { sock, args }) {
    const note = args.join(' ').trim() || m.quoted?.text || ''
    const { jids, subject } = await getMemberJids(m)
    if (!jids.length) return m.reply('❌ Gagal mengambil daftar anggota grup.')

    const lines = [
      '🌷 *Tag All*',
      '',
      `♡ Grup : ${subject}`,
      `♡ Total : ${jids.length} anggota`,
      `♡ Pesan : ${note || '-'}`,
      '',
      ...jids.map(j => `♡ ${mentionText(j)}`),
      '',
      TAG_FOOTER
    ]

    return sock.message.send(m.chat, lines.join('\n'), {
      quote: m.raw,
      mentions: jids
    })
  }
}