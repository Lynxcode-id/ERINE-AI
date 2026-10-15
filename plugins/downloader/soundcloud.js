import axios from 'axios'

async function fetchAudioBuffer(track) {
  let targetUrl = track.cdnUrl || track.downloadUrls?.[0]?.url || track.streamUrl
  if (!targetUrl) throw new Error('URL audio tidak ditemukan.')

  if (targetUrl.includes('api-v2.soundcloud.com')) {
    const { data } = await axios.get(targetUrl)
    if (data?.url) targetUrl = data.url
  }

  if (targetUrl.includes('.m3u8')) {
    const { data: m3u8Text } = await axios.get(targetUrl, { responseType: 'text' })
    const urls = []
    const mapMatch = m3u8Text.match(/#EXT-X-MAP:URI="([^"]+)"/)
    if (mapMatch && mapMatch[1]) urls.push(mapMatch[1])

    const lines = m3u8Text.split('\n').map(l => l.trim())
    for (const line of lines) {
      if (line.startsWith('http://') || line.startsWith('https://')) {
        urls.push(line)
      }
    }

    if (urls.length === 0) throw new Error('Gagal memuat segmen audio dari server.')

    const buffers = await Promise.all(
      urls.map(u => axios.get(u, { responseType: 'arraybuffer' }).then(r => Buffer.from(r.data)))
    )
    return Buffer.concat(buffers)
  }

  const { data } = await axios.get(targetUrl, { responseType: 'arraybuffer' })
  return Buffer.from(data)
}

export default {
  command: 'soundcloud',
  category: 'downloader',
  description: `> Mengunduh lagu dari SoundCloud.\n\ncontoh:\n> \`.soundcloud https://on.soundcloud.com/lApY5rJPhW1pOFMVZQ\``,
  help: '<url>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const url = args[0]
    if (!url) return m.reply('Masukkan URL SoundCloud.\nContoh: `.soundcloud https://on.soundcloud.com/lApY5rJPhW1pOFMVZQ`')
    if (!url.match(/soundcloud\.com/i)) return m.reply('URL tidak valid. Pastikan itu adalah link SoundCloud.')

    try {
      const { data: res } = await axios.get(`https://lynxapis.my.id/api/downloader/soundcloud?url=${encodeURIComponent(url)}`)
      const track = res?.data?.data || res?.data

      if (!res?.status || !track || !track.title) {
        return m.reply('Gagal mengambil data lagu dari SoundCloud.')
      }

      const caption = `🌷 *Elyra SoundCloud Downloader*\n- Enjoy listening to your favorite music.\n\n♡ - Judul : ${track.title || '-'}\n♡ - Artist : ${track.artist || '-'}\n♡ - Genre : ${track.genre || '-'}\n♡ - Durasi : ${track.durationFormatted || '-'}\n♡ - Plays : ${track.playCount ?? '-'}\n♡ - Likes : ${track.likeCount ?? '-'}`

      if (track.thumbnail) {
        try {
          const { data: thumbBuffer } = await axios.get(track.thumbnail, { responseType: 'arraybuffer' })
          await m.reply({
            type: 'image',
            media: Buffer.from(thumbBuffer),
            caption
          })
        } catch {
          await m.reply(caption)
        }
      } else {
        await m.reply(caption)
      }

      const audioBuffer = await fetchAudioBuffer(track)

      await m.reply({
        type: 'audio',
        media: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: false
      })
    } catch (err) {
      console.error('[SOUNDCLOUD]', err?.message || err)
      await m.reply(`Terjadi kesalahan:\n${err?.message || 'Gagal mengunduh lagu dari SoundCloud.'}`)
    }
  }
}