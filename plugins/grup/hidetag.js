import { getMemberJids } from '../../lib/tagUtils.js'

export default {
  command: 'hidetag',
  alias: ['ht', 'h'],
  category: 'grup',
  tags: ['grup'],
  description: `> Kirim pesan ke grup yang menandai semua anggota tanpa menampilkan tag (notifikasi tetap masuk).

*Keterangan Format:*
\`<pesan>\` = teks yang dikirim.
(reply) = reply pesan teks / gambar / video, isinya diteruskan tanpa tag.

contoh penggunaan:
\`.hidetag kumpul sekarang\`
\`.hidetag\` (reply pesan)`,
  help: '<pesan/reply>',
  onlyGroup: true,
  onlyAdmin: true,
  typing: true,

  async execute(m, { sock, args }) {
    const typed = args.join(' ').trim()
    const q = m.quoted
    const { jids } = await getMemberJids(m)
    if (!jids.length) return m.reply('❌ Gagal mengambil daftar anggota grup.')
    if (!typed && !q) {
      return m.reply([
        '🌷 *Hidetag*',
        '',
        `♡ ${m.prefix || '.'}${m.command} <pesan>`,
        `♡ ${m.prefix || '.'}${m.command} (reply pesan)`,
        '',
        'with love, elyra !!'
      ].join('\n'))
    }

    if (q?.isMedia && ['image', 'video'].includes(q.mediaType)) {
      try {
        const media = await q.download()
        return await sock.message.send(m.chat, {
          type: q.mediaType,
          media,
          mimetype: q.mime,
          caption: typed || q.caption || ''
        }, { mentions: jids })
      } catch (err) {
        console.error('[HIDETAG] media gagal:', err?.message || err)
        if (!typed && !q.caption) return m.reply('❌ Gagal mengunduh media yang di-reply.')
      }
    }

    const text = typed || q?.text
    if (!text) return m.reply('❌ Pesan kosong. Tulis teks atau reply pesan teks/gambar/video.')
    return sock.message.send(m.chat, text, { mentions: jids })
  }
}