import yts from 'yt-search'
import axios from 'axios'

const MAX_VIDEOS = 5
const CAPTION_LIMIT = 1000
const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

function formatNumber(num) {
  if (!num) return '0'
  const suffixes = ['', 'k', 'M', 'B', 'T']
  const numString = Math.abs(num).toString()
  const numDigits = numString.length

  if (numDigits <= 3) return numString

  const suffixIndex = Math.floor((numDigits - 1) / 3)
  let formatted = (num / Math.pow(1000, suffixIndex)).toFixed(1)
  if (formatted.endsWith('.0')) formatted = formatted.slice(0, -2)

  return formatted + suffixes[suffixIndex]
}

function buildUsage(m) {
  return [
    '🌷 *YouTube Search*',
    '',
    'Cari video YouTube',
    'langsung dari WhatsApp.',
    '',
    `♡ ${shown(m)}${m.command} <pencarian>`,
    '',
    FOOTER
  ].join('\n')
}

function buildHeader(query) {
  return [
    '🌷 *YouTube Search*',
    '',
    `Hasil pencarian untuk *${query}*`
  ].join('\n')
}

function buildList(m, videos) {
  const items = videos.map((v, i) => [
    `*${i + 1}. ${v.title}*`,
    `♡ Channel : ${v.author?.name || '-'}`,
    `♡ Durasi : ${v.timestamp || '-'}`,
    `♡ Views : ${formatNumber(v.views)}`,
    `♡ Upload : ${v.ago || '-'}`,
    `♡ Link : ${v.url}`
  ].join('\n'))

  return [
    ...items.join('\n\n').split('\n'),
    '',
    `♡ ${shown(m)}ytmp3 <url> untuk download mp3`,
    '',
    FOOTER
  ].join('\n')
}

export default {
  command: 'yts',
  alias: ['ytsearch', 'youtubesearch'],
  category: 'search',
  tags: ['search'],
  description: `> Mencari video YouTube.

*Keterangan Format:*
> \`<pencarian>\` = kata kunci pencarian.

contoh penggunaan:
> \`.yts everything u are hindia\``,
  help: '<pencarian>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const query = args.join(' ').trim()
    if (!query) return m.reply(buildUsage(m))

    await sock.sendReact(m.chat, '⏳', m.id).catch(() => {})

    let videos
    try {
      const result = await yts(query)
      videos = (result?.videos || []).slice(0, MAX_VIDEOS)
    } catch (err) {
      console.error('[YTS] pencarian gagal:', err?.message || err)
      await sock.sendReact(m.chat, '❌', m.id).catch(() => {})
      return m.reply('❌ Terjadi kesalahan saat mencari di YouTube.')
    }

    if (!videos.length) {
      await sock.sendReact(m.chat, '❌', m.id).catch(() => {})
      return m.reply('❌ Hasil tidak ditemukan.')
    }

    const header = buildHeader(query)
    const list = buildList(m, videos)
    const full = `${header}\n\n${list}`

    try {
      let thumb = null
      try {
        const res = await axios.get(videos[0].thumbnail || videos[0].image, {
          responseType: 'arraybuffer',
          timeout: 20000
        })
        thumb = Buffer.from(res.data)
      } catch (err) {
        console.error('[YTS] gagal ambil thumbnail:', err?.message || err)
      }

      if (thumb?.length) {
        if (full.length <= CAPTION_LIMIT) {
          await m.reply({ type: 'image', media: thumb, caption: full })
        } else {
          await m.reply({ type: 'image', media: thumb, caption: header })
          await m.reply(list)
        }
      } else {
        await m.reply(full)
      }

      await sock.sendReact(m.chat, '✅', m.id).catch(() => {})
    } catch (err) {
      console.error('[YTS] gagal mengirim hasil:', err?.stack || err?.message || err)
      await sock.sendReact(m.chat, '❌', m.id).catch(() => {})
      return m.reply('❌ Terjadi kesalahan saat mengirim hasil pencarian.')
    }
  }
}