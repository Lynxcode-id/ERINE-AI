import axios from 'axios'

const API_URL = `${global.snowping}/api/search/lirik`
const FOOTER = 'with love, elyra !!'
const REQUEST_TIMEOUT = 30000
const MAX_LYRICS_LENGTH = 50000

function buildUsage(m) {
  const prefix = m.prefix || '.'

  return [
    '🌷 *Elyra Lyrics*',
    '',
    '› Cari lirik berdasarkan judul lagu atau nama penyanyi.',
    '',
    `✦ ${prefix}${m.command} <judul lagu>`,
    '',
    'Contoh:',
    `› ${prefix}${m.command} Multo`,
    `› ${prefix}${m.command} Multo Cup of Joe`,
    '',
    FOOTER
  ].join('\n')
}

function cleanLyrics(value) {
  return String(value || '')
    .replace(/^\s*\d+\s+Contributors[\s\S]*?Lyrics(?=\s*\[)/i, '')
    .replace(/\r\n?/g, '\n')
    .trim()
}

function validUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

async function react(sock, m, emoji) {
  try {
    if (typeof sock.sendReact === 'function') {
      await sock.sendReact(m.chat, emoji, m.key)
    }
  } catch {}
}

export default {
  command: 'lirik',
  category: 'search',
  tags: ['search'],
  description: 'Mencari lirik lagu berdasarkan judul atau penyanyi.',
  help: '<judul lagu>',
  typing: true,
  wait: false,

  async execute(m, { sock, args }) {
    const query = Array.isArray(args)
      ? args.join(' ').trim()
      : String(args || '').trim()

    if (!query) {
      return m.reply(buildUsage(m))
    }

    await react(sock, m, '🌱')

    try {
      const response = await axios.get(API_URL, {
        params: { q: query },
        timeout: REQUEST_TIMEOUT,
        maxContentLength: 5 * 1024 * 1024,
        headers: {
          Accept: 'application/json'
        }
      })

      const result = response.data?.result

      if (
        response.status !== 200 ||
        !result ||
        !result.lyrics
      ) {
        throw new Error('Lirik tidak ditemukan.')
      }

      const title = String(
        result.full_title || result.title || query
      )

      const artist = String(
        result.artist || 'Tidak diketahui'
      )

      const sourceUrl = validUrl(result.url || '')
        ? result.url
        : ''

      const lyrics = cleanLyrics(result.lyrics)

      if (!lyrics) {
        throw new Error('Lirik lagu kosong.')
      }

      if (lyrics.length > MAX_LYRICS_LENGTH) {
        throw new Error('Lirik terlalu panjang untuk dikirim dalam satu pesan.')
      }

      const message = [
        '🌷 *Elyra Lyrics*',
        `✿ Judul : ${title}`,
        `✿ Artist : ${artist}`,
        sourceUrl ? `✿ Source : ${sourceUrl}` : '',
        '',
        '✦ *Lirik Lagu*',
        '',
        lyrics,
        '',
        sourceUrl ? `♡ Source : ${sourceUrl}` : '',
        FOOTER
      ].filter((line, index, lines) => {
        if (line !== '') return true
        return index > 0 && lines[index - 1] !== ''
      }).join('\n')

      await m.reply(message)
      await react(sock, m, '💐')
    } catch (error) {
      console.error(
        '[ELYRA LIRIK]',
        error?.stack || error?.message || error
      )

      await react(sock, m, '❌')

      return m.reply([
        '🌷 *Elyra Lyrics*',
        '',
        `› Gagal mengambil lirik: ${error?.message || 'Terjadi kesalahan.'}`,
        '',
        FOOTER
      ].join('\n'))
    }
  }
}