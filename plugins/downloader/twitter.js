import axios from 'axios'

const API_URL = `${global.snowping}/api/downloader/twitter`
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'

const API_TIMEOUT = 60000
const MEDIA_TIMEOUT = 120000
const MAX_MEDIA_ITEMS = 30
const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024
const MAX_TOTAL_BYTES = 180 * 1024 * 1024
const FOOTER = 'with love, elyra !!'

function validUrl(value) {
  if (typeof value !== 'string') return false

  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

function isTwitterUrl(value) {
  if (!validUrl(value)) return false

  try {
    const host = new URL(value).hostname.toLowerCase()
    return [
      'twitter.com',
      'www.twitter.com',
      'mobile.twitter.com',
      'x.com',
      'www.x.com',
      't.co'
    ].includes(host)
  } catch {
    return false
  }
}

function getMediaUrl(item) {
  if (typeof item === 'string') return item
  if (!item || typeof item !== 'object') return ''

  const direct = item.url ||
    item.download_url ||
    item.downloadUrl ||
    item.media_url ||
    item.media_url_https ||
    item.src ||
    item.link

  if (direct) return direct

  if (Array.isArray(item.variants)) {
    const variants = item.variants
      .filter(variant => validUrl(variant?.url))
      .filter(variant => {
        const type = String(
          variant.content_type || variant.type || ''
        ).toLowerCase()

        return type.includes('mp4') || type.includes('video')
      })
      .sort((a, b) => Number(b.bitrate || 0) - Number(a.bitrate || 0))

    return variants[0]?.url || ''
  }

  return ''
}

function getExtension(item, url) {
  const ext = String(item?.ext || '')
    .toLowerCase()
    .replace(/^\./, '')

  if (ext) return ext

  try {
    const parsed = new URL(url)
    const format = parsed.searchParams.get('format')

    if (format) return format.toLowerCase()

    return parsed.pathname.split('.').pop().toLowerCase()
  } catch {
    return ''
  }
}

function isVideo(item, url) {
  const type = String(
    item?.type ||
    item?.mime ||
    item?.mimetype ||
    item?.mimeType ||
    ''
  ).toLowerCase()

  if (type.startsWith('video/') || type.includes('video')) {
    return true
  }

  if (
    type.startsWith('image/') ||
    type.includes('image') ||
    type.includes('photo')
  ) {
    return false
  }

  const ext = getExtension(item, url)

  return [
    'mp4',
    'm4v',
    'mov',
    'webm',
    '3gp',
    'mkv'
  ].includes(ext)
}

function normalizeMedias(result) {
  const raw = result?.media ||
    result?.medias ||
    result?.downloads ||
    result?.items ||
    []

  const entries = []
  const flatten = value => {
    if (Array.isArray(value)) {
      for (const entry of value) flatten(entry)
    } else if (value) {
      entries.push(value)
    }
  }

  flatten(raw)

  const seen = new Set()
  const medias = []

  for (const entry of entries) {
    const item = typeof entry === 'string'
      ? { url: entry }
      : entry

    const url = getMediaUrl(item)

    if (!validUrl(url) || seen.has(url)) continue

    seen.add(url)

    medias.push({
      ...item,
      url,
      video: isVideo(item, url)
    })
  }

  return medias
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('id-ID')
}

function buildDescription(result, inputUrl) {
  const author = result?.author || {}
  const stats = result?.stats || {}

  const username = author.username
    ? `@${author.username}`
    : author.name || '-'

  return [
    '🌷 *Elyra Twitter Downloader*',
    '',
    `♡ Author : ${username}`,
    `♡ Nama : ${author.name || '-'}`,
    `♡ Likes : ${formatNumber(stats.likes)}`,
    `♡ Reposts : ${formatNumber(stats.retweets)}`,
    `♡ Replies : ${formatNumber(stats.replies)}`,
    `♡ Views : ${formatNumber(stats.views)}`,
    '',
    `♡ Deskripsi : ${result?.caption || '-'}`,
    '',
    `♡ Source : ${result?.source || inputUrl}`,
    '',
    FOOTER
  ].join('\n')
}

async function downloadMedia(item, sourceUrl) {
  const maxBytes = item.video
    ? MAX_VIDEO_BYTES
    : MAX_IMAGE_BYTES

  let referer

  try {
    referer = `${new URL(sourceUrl).origin}/`
  } catch {}

  const response = await axios.get(item.url, {
    responseType: 'arraybuffer',
    timeout: MEDIA_TIMEOUT,
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
    maxRedirects: 5,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: item.video
        ? 'video/*, application/octet-stream;q=0.9, */*;q=0.8'
        : 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      ...(referer ? { Referer: referer } : {})
    }
  })

  const buffer = Buffer.from(response.data)

  if (!buffer.length) {
    throw new Error('Server mengembalikan media kosong.')
  }

  if (buffer.length > maxBytes) {
    throw new Error('Ukuran media melebihi batas unduhan.')
  }

  const contentType = String(
    response.headers?.['content-type'] || ''
  ).split(';')[0].trim().toLowerCase()

  if (
    contentType.includes('text/html') ||
    contentType.includes('application/json')
  ) {
    throw new Error('URL tidak mengembalikan file media.')
  }

  const ext = getExtension(item, item.url)

  let mimetype

  if (item.video) {
    mimetype = contentType.startsWith('video/')
      ? contentType
      : ext === 'webm'
        ? 'video/webm'
        : ext === 'mov'
          ? 'video/quicktime'
          : 'video/mp4'
  } else {
    const imageTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      avif: 'image/avif'
    }

    mimetype = contentType.startsWith('image/')
      ? contentType
      : imageTypes[ext] || 'image/jpeg'
  }

  return {
    buffer,
    mimetype,
    video: item.video
  }
}

async function downloadAll(medias, sourceUrl) {
  const downloaded = []
  let totalBytes = 0

  for (const item of medias) {
    const media = await downloadMedia(item, sourceUrl)

    totalBytes += media.buffer.length

    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error('Total ukuran media melebihi batas 180 MB.')
    }

    downloaded.push(media)
  }

  return downloaded
}

export default {
  command: 'twitter',
  alias: ['x', 'xdl'],
  category: 'downloader',
  tags: ['downloader'],
  description: 'Mengunduh foto dan video dari Twitter atau X.',
  help: '<url>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const inputUrl = Array.isArray(args)
      ? args.join(' ').trim()
      : String(args || '').trim()

    if (!inputUrl) {
      return m.reply([
        '🌷 *Elyra Twitter Downloader*',
        '',
        '› Unduh foto dan video dari Twitter / X.',
        '',
        `♡ ${(m.prefix || '.')}${m.command} <url>`,
        '',
        `› Contoh: ${(m.prefix || '.')}${m.command} https://x.com/username/status/123456789`,
        '',
        FOOTER
      ].join('\n'))
    }

    if (!isTwitterUrl(inputUrl)) {
      return m.reply('Masukkan tautan postingan Twitter atau X yang valid.')
    }

    try {
      const { data: payload } = await axios.get(API_URL, {
        params: {
          url: inputUrl
        },
        timeout: API_TIMEOUT,
        maxContentLength: 10 * 1024 * 1024,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json'
        }
      })

      if (
        payload?.status === false ||
        payload?.success === false ||
        (
          typeof payload?.status === 'number' &&
          payload.status >= 400
        )
      ) {
        throw new Error(
          payload?.message ||
          payload?.msg ||
          'API gagal mengambil postingan.'
        )
      }

      let result = payload?.result ??
        payload?.data?.result ??
        payload?.data

      if (
        result?.result &&
        typeof result.result === 'object' &&
        !Array.isArray(result.result)
      ) {
        result = result.result
      }

      if (!result || typeof result !== 'object') {
        throw new Error('Data postingan tidak ditemukan.')
      }

      const medias = normalizeMedias(result)

      if (!medias.length) {
        throw new Error('Foto atau video tidak ditemukan.')
      }

      if (medias.length > MAX_MEDIA_ITEMS) {
        throw new Error(`Maksimal ${MAX_MEDIA_ITEMS} media per postingan.`)
      }

      const sourceUrl = validUrl(result.source)
        ? result.source
        : inputUrl

      const downloaded = await downloadAll(medias, sourceUrl)

      const images = downloaded.filter(item => !item.video)
      const videos = downloaded.filter(item => item.video)
      const quoteOptions = m.raw ? { quote: m.raw } : {}

      if (images.length && !videos.length) {
        const albumItems = images.map(item => ({
          image: item.buffer,
          mimetype: item.mimetype
        }))

        await sock.sendAlbum(
          m.chat,
          albumItems,
          quoteOptions
        )

        return
      }

      const description = buildDescription(result, inputUrl)

      if (videos.length && !images.length) {
        for (let index = 0; index < videos.length; index++) {
          const item = videos[index]

          await m.reply({
            type: 'video',
            media: item.buffer,
            mimetype: item.mimetype,
            ...(index === 0 ? { caption: description } : {})
          })
        }

        return
      }

      const albumItems = downloaded.map(item =>
        item.video
          ? {
              video: item.buffer,
              mimetype: item.mimetype
            }
          : {
              image: item.buffer,
              mimetype: item.mimetype
            }
      )

      await sock.sendAlbum(
        m.chat,
        albumItems,
        quoteOptions
      )

      await m.reply(description)
    } catch (error) {
      console.error(
        '[ELYRA TWITTER]',
        error?.response?.data ||
        error?.stack ||
        error?.message ||
        error
      )

      const status = error?.response?.status
      const detail = status
        ? `HTTP ${status}`
        : error?.message || 'Terjadi kesalahan.'

      return m.reply([
        '🌷 *Elyra Twitter Downloader*',
        '',
        '› Gagal mengunduh media.',
        `♡ Pesan : ${detail}`,
        '',
        FOOTER
      ].join('\n'))
    }
  }
}