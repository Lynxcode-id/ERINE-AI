import axios from 'axios'

const API_URL = 'https://lynxapis.my.id/api/downloader/ytmp3-v2'
const DEFAULT_BITRATE = '128k'
const MAX_FILE_BYTES = 80 * 1024 * 1024
const YT_REGEX = /^(https?:\/\/)?((www|m|music)\.)?(youtube\.com|youtu\.be)\/\S+/i

function formatDuration(sec) {
  const s = Number(sec) || 0
  const h = Math.floor(s / 3600)
  const mnt = Math.floor((s % 3600) / 60)
  const d = s % 60
  const pad = n => String(n).padStart(2, '0')
  return h ? `${h}:${pad(mnt)}:${pad(d)}` : `${mnt}:${pad(d)}`
}

function formatSize(bytes) {
  const b = Number(bytes) || 0
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`
  return `${(b / 1024).toFixed(1)} KB`
}

export default {
  command: 'ytmp3',
  category: 'downloader',
  tags: ['downloader'],
  description: `> Download audio YouTube dalam format MP3.

*Keterangan Format:*
> \`<url>\` = link video YouTube.
> \`[bitrate]\` = opsional, default 128k.

contoh penggunaan:
> \`.ytmp3 https://youtu.be/tGv7CUutzqU\`
> \`.ytmp3 https://youtu.be/tGv7CUutzqU 192k\``,
  help: '<url> [bitrate]',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const url = args.find(a => YT_REGEX.test(a))
    const bitrate = args.find(a => /^\d{2,3}k$/i.test(a))?.toLowerCase() || DEFAULT_BITRATE

    if (!url) {
      return m.reply(`Masukkan link YouTube!\nContoh: ${m.prefix}${m.command} https://youtu.be/tGv7CUutzqU`)
    }

    let data
    try {
      const res = await axios.get(API_URL, {
        params: { url, bitrate },
        timeout: 120000
      })
      if (!res.data?.status || !res.data?.data?.download_url) {
        return m.reply(res.data?.message || 'Gagal mengonversi video ke MP3.')
      }
      data = res.data.data
    } catch (err) {
      const msg = err.response?.data?.message || err.message
      console.error('[YTMP3] API error:', msg)
      return m.reply(`Gagal mengambil data: ${msg}`)
    }

    if (data.filesize_bytes > MAX_FILE_BYTES) {
      return m.reply(`File terlalu besar (${formatSize(data.filesize_bytes)}). Maksimal ${formatSize(MAX_FILE_BYTES)}.`)
    }

    const caption = [
      `*${data.title}*`,
      '',
      `› Channel : ${data.channel}`,
      `› Durasi  : ${formatDuration(data.duration_sec)}`,
      `› Kualitas: ${data.quality || bitrate}`,
      `› Ukuran  : ${formatSize(data.filesize_bytes)}`,
      `› Views   : ${Number(data.stats?.views || 0).toLocaleString('id-ID')}`
    ].join('\n')

    try {
      const thumb = await axios.get(data.thumbnail, { responseType: 'arraybuffer', timeout: 30000 })
      await m.reply({ type: 'image', media: Buffer.from(thumb.data), caption })
    } catch {
      await m.reply(caption)
    }

    try {
      const audio = await axios.get(data.download_url, {
        responseType: 'arraybuffer',
        timeout: 180000,
        maxContentLength: MAX_FILE_BYTES
      })
      const buffer = Buffer.from(audio.data)
      if (buffer.length < 1024) throw new Error('File audio kosong.')

      await m.reply({
        type: 'audio',
        media: buffer,
        mimetype: 'audio/mpeg',
        ptt: false
      })
    } catch (err) {
      console.error('[YTMP3] gagal kirim audio:', err?.stack || err?.message || err)
      return m.reply(`Gagal mengunduh/mengirim audio: ${err.message}`)
    }
  }
}