import axios from 'axios'
import sharp from 'sharp'

const API_URL = `${global.theresav}/api/download/aio`
const API_KEY = global.apikey.theresav
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
const API_TIMEOUT = 60000
const MEDIA_TIMEOUT = 90000
const MAX_MEDIA_ITEMS = 30
const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024
const MAX_TOTAL_BYTES = 180 * 1024 * 1024

function validUrl(value) {
  if (typeof value !== 'string') return false

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function mediaUrl(item) {
  if (typeof item === 'string') return item
  if (!item || typeof item !== 'object') return ''

  return item.url ||
    item.download_url ||
    item.downloadUrl ||
    item.src ||
    item.link ||
    item.video_url ||
    item.videoUrl ||
    item.image_url ||
    item.imageUrl ||
    ''
}

function extension(item, url) {
  const ext = String(item?.ext || '')
    .toLowerCase()
    .replace(/^\./, '')

  if (ext) return ext

  try {
    return new URL(url).pathname.split('.').pop().toLowerCase()
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

  const ext = extension(item, url)

  return [
    'mp4',
    'm4v',
    'mov',
    'webm',
    '3gp',
    'mkv'
  ].includes(ext) ||
    /\bvideo\b/i.test(String(item?.quality || item?.format || ''))
}

function normalizeMedias(result) {
  let raw =
    result?.medias ||
    result?.media ||
    result?.downloads ||
    result?.items

  if (!raw) {
    raw = [
      result?.video_url && {
        url: result.video_url,
        type: 'video',
        ext: 'mp4'
      },
      result?.videoUrl && {
        url: result.videoUrl,
        type: 'video',
        ext: 'mp4'
      },
      result?.image_url && {
        url: result.image_url,
        type: 'image'
      },
      result?.imageUrl && {
        url: result.imageUrl,
        type: 'image'
      },
      result?.download_url && {
        url: result.download_url,
        type: result.type
      },
      result?.downloadUrl && {
        url: result.downloadUrl,
        type: result.type
      },
      result?.url && {
        url: result.url,
        type: result.type,
        ext: result.ext,
        quality: result.quality
      }
    ].filter(Boolean)
  }

  const flattened = []

  const visit = value => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
    } else if (value) {
      flattened.push(value)
    }
  }

  visit(raw)

  const seen = new Set()

  return flattened.flatMap(entry => {
    const item = typeof entry === 'string'
      ? { url: entry }
      : entry

    const url = mediaUrl(item)

    if (
      !item ||
      typeof item !== 'object' ||
      !validUrl(url) ||
      seen.has(url)
    ) {
      return []
    }

    seen.add(url)

    return [{
      ...item,
      url,
      video: isVideo(item, url)
    }]
  })
}

function description(result, inputUrl) {
  const title = String(
    result?.title ||
    result?.description ||
    result?.caption ||
    ''
  ).trim()

  const platform = String(
    result?.platform || 'Unknown'
  ).trim()

  const duration = String(
    result?.duration || '-'
  ).trim()

  const source = validUrl(result?.source)
    ? result.source
    : inputUrl

  return [
    '🌷 *Elyra AIO Downloader*',
    '',
    `♡ - Platform : ${platform}`,
    `♡ - Deskripsi : ${title || '-'}`,
    `♡ - Durasi : ${duration}`,
    `♡ - Source : ${source}`
  ].join('\n')
}

async function downloadMedia(item, sourceUrl) {
  const maxBytes = item.video
    ? MAX_VIDEO_BYTES
    : MAX_IMAGE_BYTES

  const referer = validUrl(sourceUrl)
    ? `${new URL(sourceUrl).origin}/`
    : undefined

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

  let buffer = Buffer.from(response.data)

  if (!buffer.length) {
    throw new Error(`Media kosong: ${item.url}`)
  }

  if (buffer.length > maxBytes) {
    throw new Error('Ukuran media melewati batas unduhan.')
  }

  const contentType = String(
    response.headers?.['content-type'] || ''
  ).split(';')[0].trim().toLowerCase()

  if (
    contentType.includes('text/html') ||
    contentType.includes('application/json')
  ) {
    throw new Error(
      'URL media mengembalikan halaman HTML/JSON, bukan file media.'
    )
  }

  if (item.video) {
    const ext = extension(item, item.url)

    const mimetype = contentType.startsWith('video/')
      ? contentType
      : ext === 'webm'
        ? 'video/webm'
        : ext === 'mov'
          ? 'video/quicktime'
          : 'video/mp4'

    return {
      buffer,
      mimetype,
      video: true
    }
  }

  let metadata

  try {
    metadata = await sharp(buffer, {
      animated: false
    }).metadata()
  } catch {
    throw new Error(
      'File gambar tidak valid atau formatnya tidak didukung.'
    )
  }

  if (!metadata.width || !metadata.height) {
    throw new Error('Dimensi gambar tidak valid.')
  }

  let mimetype = contentType.startsWith('image/')
    ? contentType
    : ''

  if (
    ['webp', 'avif', 'heif', 'tiff'].includes(metadata.format)
  ) {
    buffer = await sharp(buffer, {
      animated: false
    })
      .rotate()
      .jpeg({
        quality: 95,
        chromaSubsampling: '4:4:4'
      })
      .toBuffer()

    mimetype = 'image/jpeg'
  } else if (!mimetype) {
    mimetype = metadata.format === 'png'
      ? 'image/png'
      : 'image/jpeg'
  }

  return {
    buffer,
    mimetype,
    video: false
  }
}

async function fetchAll(items, sourceUrl) {
  const output = []
  let totalBytes = 0

  for (let start = 0; start < items.length; start += 4) {
    const batch = await Promise.all(
      items.slice(start, start + 4).map(item =>
        downloadMedia(item, sourceUrl)
      )
    )

    for (let i = 0; i < batch.length; i++) {
      totalBytes += batch[i].buffer.length

      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new Error('Total media melebihi batas 180 MB.')
      }

      output.push({
        ...batch[i],
        original: items[start + i]
      })
    }
  }

  return output
}

export default {
  command: 'aio',
  category: 'downloader',
  tags: ['downloader'],
  description: 'Mengunduh media dari berbagai platform menggunakan All-in-One Downloader.',
  help: '<url>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const inputUrl = Array.isArray(args)
      ? args.join(' ').trim()
      : String(args || '').trim()

    if (!inputUrl) {
      return m.reply([
        '🌷 *Elyra AIO Downloader*',
        '',
        '› Unduh media dari berbagai platform yang didukung.',
        '',
        `♡ ${(m.prefix || '.')}${m.command} <url>`,
        '',
        `› Contoh: ${(m.prefix || '.')}${m.command} https://www.instagram.com/p/xxxxx/`,
        '',
        'with love, elyra !!'
      ].join('\n'))
    }

    if (!validUrl(inputUrl)) {
      return m.reply(
        'URL tidak valid. Gunakan tautan http:// atau https://.'
      )
    }

    try {
      const { data: payload } = await axios.get(API_URL, {
        params: {
          url: inputUrl
        },
        timeout: API_TIMEOUT,
        maxContentLength: 10 * 1024 * 1024,
        headers: {
          'x-apikey': API_KEY,
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
          'API gagal memproses tautan.'
        )
      }

      let result =
        payload?.result ??
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
        throw new Error(
          payload?.message ||
          payload?.msg ||
          'Data media tidak ditemukan dari API.'
        )
      }

      const medias = normalizeMedias(result)

      if (!medias.length) {
        throw new Error(
          'API tidak mengembalikan tautan media yang valid.'
        )
      }

      if (medias.length > MAX_MEDIA_ITEMS) {
        throw new Error(
          `Maksimal ${MAX_MEDIA_ITEMS} media per permintaan.`
        )
      }

      const sourceUrl = validUrl(result.source)
        ? result.source
        : inputUrl

      const downloaded = await fetchAll(medias, sourceUrl)
      const images = downloaded.filter(item => !item.video)
      const videos = downloaded.filter(item => item.video)

      const quoteOptions = {
        quote: m.raw || m
      }

      if (images.length && !videos.length) {
        if (images.length === 1) {
          await m.reply({
            type: 'image',
            media: images[0].buffer,
            mimetype: images[0].mimetype
          })

          return
        }

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

      if (videos.length && !images.length) {
        const caption = description(result, inputUrl)

        for (let i = 0; i < videos.length; i++) {
          const item = videos[i]

          await m.reply({
            type: 'video',
            media: item.buffer,
            mimetype: item.mimetype,
            ...(i === 0 ? { caption } : {})
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

      await m.reply(description(result, inputUrl))
    } catch (error) {
      console.error(
        '[ELYRA AIO]',
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
        '🌷 *Elyra AIO Downloader*',
        '',
        '› Gagal mengirim media.',
        `♡ - Pesan : ${detail}`,
        '',
        'with love, elyra !!'
      ].join('\n'))
    }
  }
}