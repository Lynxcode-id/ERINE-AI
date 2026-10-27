import {
  downloadQuoted,
  formatBytes,
  inspectMedia,
  quotedFileName,
  safeFileName
} from '../../lib/mediaConvert.js'

const FOOTER = 'with love, elyra !!'

export default {
  command: 'tovid',
  alias: ['tovi', 'tovideo'],
  category: 'tools',
  tags: ['tools'],
  description: `> Mengirim ulang video sebagai video WhatsApp dengan data dan resolusi sumber.
> Tidak melakukan re-encode, kompresi, resize, atau pemangkasan.
>
> .tovid (reply video)`,
  help: '(reply video)',
  typing: true,
  wait: true,

  async execute(m, { sock }) {
    const quoted = m.quoted
    if (!quoted) {
      return m.reply(`Reply video terlebih dahulu.\n\nContoh: ${m.prefix}${m.command} (reply video)`)
    }

    let buffer
    let info
    try {
      buffer = await downloadQuoted(quoted)
      info = await inspectMedia(buffer, quoted)
    } catch (err) {
      return m.reply(`Gagal mengambil video: ${err?.message || 'media tidak tersedia.'}`)
    }

    const quotedType = String(quoted.type || '').toLowerCase()
    if (!info.mime.startsWith('video/') && !quotedType.includes('video')) {
      return m.reply('Pesan yang di-reply bukan video. Reply video atau dokumen yang berisi video.')
    }

    const originalName = quotedFileName(quoted)
    const ext = info.ext && info.ext !== 'bin' ? info.ext : 'mp4'
    let fileName = originalName
    if (fileName === 'media' || !/\.[a-z0-9]{2,8}$/i.test(fileName)) {
      fileName = `${fileName === 'media' ? 'video' : fileName}.${ext}`
    }
    fileName = safeFileName(fileName, `video.${ext}`)

    let mimetype = info.mime
    if (!mimetype.startsWith('video/')) {
      mimetype = ext === 'mov' ? 'video/quicktime' : `video/${ext}`
    }

    const caption = [
      '୨ৎ *ELYRA • VIDEO ORIGINAL*',
      '',
      `› Nama file : ${fileName}`,
      `› Ukuran   : ${formatBytes(buffer.length)}`,
      `› Format   : ${ext.toUpperCase()}`,
      '› Proses   : file asli, tanpa encode ulang',
      '',
      FOOTER
    ].join('\n')

    try {
      await sock.message.send(m.chat, {
        type: 'video',
        media: buffer,
        mimetype,
        caption
      }, { quote: m.raw })
    } catch (err) {
      console.error('[TOVID] send error:', err?.stack || err?.message || err)
      return m.reply(
        `Gagal mengirim video (${formatBytes(buffer.length)}). ${err?.message || 'Periksa batas ukuran media dan koneksi bot.'}`
      )
    }
  }
}