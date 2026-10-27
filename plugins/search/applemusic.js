import axios from 'axios'
import { useStarforge, withQuote } from '../../lib/function.js'

const API_URL = `${global.theresav}/api/search/applemusic`
const API_KEY = global.apikey.theresav
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
const REQUEST_TIMEOUT = 30000
const MAX_RESULTS = 5
const MAX_THUMBNAIL_BYTES = 8 * 1024 * 1024
const FOOTER = 'with love, elyra !!'

const shown = m => m.prefix || '.'

function buildUsage(m) {
  const prefix = shown(m)

  return [
    '🌷 *Elyra Apple Music Search*',
    '',
    '› Cari lagu melalui Apple Music.',
    '',
    `♡ ${prefix}${m.command} <judul lagu>`,
    '',
    'Contoh:',
    `› ${prefix}${m.command} About You`,
    `› ${prefix}${m.command} Bergema Sampai Selamanya`,
    '',
    FOOTER
  ].join('\n')
}

function validUrl(value) {
  if (typeof value !== 'string') return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function extractResults(payload) {
  const candidates = [
    payload?.results,
    payload?.result?.results,
    payload?.data?.results,
    payload?.data?.result?.results,
    payload?.result?.data?.results,
    payload?.data?.result,
    payload?.result
  ]

  return candidates.find(Array.isArray) || []
}

async function fetchCover(url) {
  if (!validUrl(url)) return null

  try {
    const { data, headers } = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: MAX_THUMBNAIL_BYTES,
      maxBodyLength: MAX_THUMBNAIL_BYTES,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/avif,image/webp,image/*,*/*;q=0.8'
      }
    })

    const buffer = Buffer.from(data)
    const contentType = String(
      headers?.['content-type'] || ''
    ).toLowerCase()

    if (
      !buffer.length ||
      buffer.length > MAX_THUMBNAIL_BYTES ||
      (contentType && !contentType.startsWith('image/'))
    ) {
      return null
    }

    return buffer
  } catch (error) {
    console.error(
      '[APPLE MUSIC] Thumbnail gagal diunduh:',
      error?.message || error
    )

    return null
  }
}

async function react(sock, m, emoji) {
  try {
    await sock.sendReact(m.chat, emoji, m.id)
  } catch {}
}

function formatTrack(track, index) {
  return [
    `*${index + 1}. ${track.title || 'Unknown Title'}*`,
    `♡ Artist : ${track.artist || '-'}`,
    `♡ Album : ${track.album || '-'}`,
    `♡ Genre : ${track.genre || '-'}`,
    `♡ Durasi : ${track.duration || '-'}`,
    validUrl(track.apple_music_url)
      ? `♡ Apple Music : ${track.apple_music_url}`
      : '',
    validUrl(track.preview_url)
      ? `♡ Preview : ${track.preview_url}`
      : ''
  ].filter(Boolean).join('\n')
}

export default {
  command: 'applemusic',
  category: 'search',
  tags: ['search'],
  description: 'Mencari lagu melalui Apple Music.',
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
      const { data: payload } = await axios.get(API_URL, {
        params: { query },
        timeout: REQUEST_TIMEOUT,
        maxContentLength: 5 * 1024 * 1024,
        headers: {
          'x-apikey': API_KEY,
          'User-Agent': USER_AGENT,
          Accept: 'application/json'
        }
      })

      const results = extractResults(payload)

      if (
        payload?.status === false ||
        payload?.success === false ||
        !results.length
      ) {
        await react(sock, m, '❌')

        return m.reply([
          '🌷 *Elyra Apple Music Search*',
          '',
          `› Lagu tidak ditemukan untuk "${query}".`,
          `› Pesan : ${payload?.message || payload?.msg || 'Tidak ada hasil yang dikembalikan API.'}`,
          '',
          FOOTER
        ].join('\n'))
      }

      const tracks = results
        .filter(track => track && typeof track === 'object')
        .slice(0, MAX_RESULTS)

      if (!tracks.length) {
        throw new Error('Format data lagu dari API tidak valid.')
      }

      const first = tracks[0]
      const total = payload?.total ??
        payload?.result?.total ??
        payload?.data?.total ??
        results.length

      const listText = tracks
        .map(formatTrack)
        .join('\n\n')

      const text = [
        '🌷 *Elyra Apple Music Search*',
        '',
        `♡ Query : ${query}`,
        `♡ Total hasil : ${total}`,
        '',
        listText,
        '',
        FOOTER
      ].join('\n')

      let cover = await fetchCover(first.cover)

      try {
        await useStarforge(sock)

        if (typeof sock.sendAdText === 'function' && validUrl(first.apple_music_url)) {
          await withQuote(m, quote =>
            sock.sendAdText(m.chat, text, quote, {
              title: `${first.title || 'Apple Music'} — ${first.artist || 'Unknown Artist'}`,
              description: [
                first.album || '',
                first.genre || '',
                first.duration || ''
              ].filter(Boolean).join(' • '),
              thumbnail: cover || first.cover,
              thumbnailUrl: first.apple_music_url,
              largeThumbnail: true,
              width: 600,
              height: 600
            })
          )
        } else {
          await m.reply(text)
        }
      } catch (previewError) {
        console.error(
          '[APPLE MUSIC] Link preview gagal:',
          previewError?.message || previewError
        )

        await m.reply(text)
      }

      await react(sock, m, '💐')
    } catch (error) {
      console.error(
        '[APPLE MUSIC SEARCH]',
        error?.response?.data ||
        error?.stack ||
        error?.message ||
        error
      )

      await react(sock, m, '❌')

      const status = error?.response?.status
      const detail = status
        ? `HTTP ${status}`
        : error?.message || 'Terjadi kesalahan.'

      return m.reply([
        '🌷 *Elyra Apple Music Search*',
        '',
        '› Gagal mencari lagu.',
        `♡ Pesan : ${detail}`,
        '',
        FOOTER
      ].join('\n'))
    }
  }
}