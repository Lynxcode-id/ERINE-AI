import {
  convertMediaBuffer,
  downloadQuoted,
  formatBytes,
  inspectMedia,
  quotedFileName
} from '../../lib/mediaConvert.js'

const FOOTER = 'with love, elyra !!'
const MAX_DURATION_SECONDS = 10

export default {
  command: 'togif',
  category: 'tools',
  tags: ['tools'],
  description: `> Ubah video menjadi GIF animasi yang diputar langsung di chat.
> Hasil dibuat sebagai MP4 tanpa audio, maksimal 10 detik, agar kompatibel dengan WhatsApp.
>
> .togif (reply video)`,
  help: '(reply video)',
  typing: true,
  wait: true,

  async execute(m, { sock }) {
    const quoted = m.quoted
    if (!quoted) return m.reply(`Reply video terlebih dahulu.\n\nContoh: ${m.prefix}${m.command} (reply video)`)

    let input
    let info
    try {
      input = await downloadQuoted(quoted)
      info = await inspectMedia(input, quoted)
    } catch (err) {
      return m.reply(`Gagal mengambil video: ${err?.message || 'media tidak tersedia.'}`)
    }

    const quotedType = String(quoted.type || '').toLowerCase()
    if (!info.mime.startsWith('video/') && !quotedType.includes('video')) {
      return m.reply('Pesan yang di-reply bukan video. Reply video atau dokumen yang berisi video.')
    }

    try {
      const gifVideo = await convertMediaBuffer(input, {
        inputMime: info.mime,
        inputName: quotedFileName(quoted),
        outputExtension: 'mp4',
        outputArgs: [
          '-t', String(MAX_DURATION_SECONDS),
          '-vf', "fps=15,scale=w='min(480,iw)':h='min(480,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
          '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '29',
          '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-f', 'mp4'
        ]
      })

      const caption = [
        '୨ৎ *ELYRA • GIF*',
        '',
        `› Ukuran asal : ${formatBytes(input.length)}`,
        `› Ukuran hasil: ${formatBytes(gifVideo.length)}`,
        `› Durasi maks : ${MAX_DURATION_SECONDS} detik`,
        '',
        FOOTER
      ].join('\n')

      await sock.message.send(m.chat, {
        type: 'video',
        media: gifVideo,
        mimetype: 'video/mp4',
        gifPlayback: true,
        caption
      }, { quote: m.raw })
    } catch (err) {
      console.error('[TOGIF] conversion/send error:', err?.stack || err?.message || err)
      return m.reply(`Gagal mengubah video menjadi GIF. ${err?.message || 'Coba video lain.'}`)
    }
  }
}