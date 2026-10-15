import axios from 'axios'
import sharp from 'sharp'

const API_URL = 'https://lynxapis.my.id/api/downloader/tiktok-v4'
const API_TIMEOUT = 60000
const MEDIA_TIMEOUT = 120000
const MAX_VIDEO_SIZE = 80 * 1024 * 1024
const MAX_IMAGE_SIZE = 20 * 1024 * 1024
const MAX_PHOTOS = 20

function isTikTokUrl(value) {
  try {
    const url = new URL(value)
    return /^https?:$/.test(url.protocol) && /(^|\.)tiktok\.com$/i.test(url.hostname)
  } catch {
    return false
  }
}

function validHttpUrl(value) {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function getPhotoEntries(data) {
  const sources = [data.photos, data.images, data.slides, data.slide, data.pics, data.image_urls, data.photo_urls]
  const entries = []

  for (const source of sources) {
    if (!source) continue
    const list = Array.isArray(source) ? source : [source]
    for (const item of list) {
      let urls = []
      if (typeof item === 'string') {
        urls = [item]
      } else if (item && typeof item === 'object') {
        urls = [
          item.download_url,
          item.downloadUrl,
          item.url,
          item.src,
          item.preview
        ]
      }

      urls = [...new Set(urls.filter(validHttpUrl))]
      if (urls.length) entries.push(urls)
    }
  }

  const used = new Set()
  const unique = []
  for (const candidates of entries) {
    const key = candidates[0]
    if (used.has(key)) continue
    used.add(key)
    unique.push(candidates)
    if (unique.length >= MAX_PHOTOS) break
  }
  return unique
}

function firstUrl(...values) {
  for (const value of values) {
    if (typeof value === 'string' && validHttpUrl(value)) return value
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = value.download_url || value.downloadUrl || value.url || value.play_url || value.playUrl
      if (typeof nested === 'string' && validHttpUrl(nested)) return nested
    }
  }
  return null
}

function asText(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return value.nickname || value.name || value.username || '-'
  return String(value)
}

function makeCaption(data) {
  const stats = data.stats || data.statistics || {}
  const tagsValue = data.tags ?? data.hashtags ?? []
  const tags = Array.isArray(tagsValue)
    ? tagsValue.map(tag => typeof tag === 'string' ? tag : tag?.name || tag?.hashtag).filter(Boolean).join(', ') || '-'
    : asText(tagsValue)

  return [
    '🌷 *TikTok Downloader*',
    "- Let's download your media without the watermark.",
    '',
    `♡ - Author : ${asText(data.author || data.author_name || data.username)}`,
    `♡ - Judul : ${asText(data.caption || data.title || data.description || data.desc)}`,
    `♡ - Tags : ${tags}`,
    `♡ - Likes : ${stats.likes ?? stats.like_count ?? data.likes ?? '-'}`,
    `♡ - Comments : ${stats.comments ?? stats.comment_count ?? data.comments ?? '-'}`,
    `♡ - Shares : ${stats.shares ?? stats.share_count ?? data.shares ?? '-'}`
  ].join('\n')
}

async function downloadRaw(url, maxBytes) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: MEDIA_TIMEOUT,
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/*,video/*,audio/*,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://www.tiktok.com/'
    }
  })

  const buffer = Buffer.from(response.data)
  if (!buffer.length) throw new Error('File media kosong.')
  if (buffer.length > maxBytes) throw new Error('Ukuran media melewati batas.')

  const contentType = String(response.headers?.['content-type'] || '').split(';')[0].trim().toLowerCase()
  if (contentType.includes('text/html') || contentType.includes('application/json')) {
    throw new Error(`URL tidak mengembalikan media (content-type: ${contentType}).`)
  }
  return { buffer, contentType }
}

async function downloadJpeg(candidates) {
  let lastError
  for (const url of candidates) {
    try {
      const { buffer } = await downloadRaw(url, MAX_IMAGE_SIZE)
      const jpeg = await sharp(buffer, { failOn: 'none' })
        .rotate()
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer()
      if (!jpeg.length) throw new Error('Konversi gambar menghasilkan file kosong.')
      return jpeg
    } catch (err) {
      lastError = err
      console.error('[TIKTOK PHOTO FIX] Sumber foto gagal:', url, err?.message || err)
    }
  }
  throw lastError || new Error('URL foto tidak tersedia.')
}

export default {
  command: 'tiktok',
  alias: ['tt'],
  category: 'downloader',
  tags: ['downloader'],
  description: '> Mengunduh video atau foto slideshow TikTok.\n\nContoh:\n> .tiktok https://vt.tiktok.com/ZS4y5vc3F/',
  help: '<url>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const url = args.find(isTikTokUrl)
    if (!url) {
      return m.reply(`Masukkan URL TikTok yang valid.\nContoh: ${m.prefix || '.'}tiktok https://vt.tiktok.com/ZS4y5vc3F/`)
    }

    let data
    try {
      const { data: body } = await axios.get(API_URL, {
        params: { url },
        timeout: API_TIMEOUT,
        headers: { Accept: 'application/json' }
      })
      if (!body || typeof body !== 'object') throw new Error('Respons API bukan JSON yang valid.')
      if (body.status === false || body.success === false) {
        return m.reply(body.message || body.msg || 'API gagal mengambil media TikTok.')
      }
      data = body.data ?? body.result ?? body
      if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) data = data.data
      if (!data || typeof data !== 'object') throw new Error('Data media tidak ditemukan.')
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.msg || err.message
      console.error('[TIKTOK PHOTO FIX] API error:', message)
      return m.reply(`Gagal mengambil data TikTok dari API.\nPesan: ${message}`)
    }

    const caption = makeCaption(data)
    const photos = getPhotoEntries(data)
    const audioUrl = firstUrl(data.audio_url, data.music_url, data.music?.playUrl, data.music?.url, data.audio)
    const videoUrl = firstUrl(
      data.video_no_wm,
      data.video_no_watermark,
      data.video_url,
      data.play_url,
      data.play,
      data.download_url,
      data.downloadUrl,
      data.video
    )

    try {
      if (String(data.type || '').toLowerCase() === 'photo' || photos.length > 0) {
        console.log(`[TIKTOK PHOTO FIX] Slideshow terdeteksi: ${photos.length} foto.`)
        if (!photos.length) {
          return m.reply(`TikTok terdeteksi sebagai slideshow, tetapi data.photos kosong. Key API: ${Object.keys(data).join(', ')}`)
        }

        const albumItems = []
        const failures = []

        for (let i = 0; i < photos.length; i++) {
          try {
            const imageBuffer = await downloadJpeg(photos[i])
            albumItems.push({ image: imageBuffer, mimetype: 'image/jpeg' })
          } catch (err) {
            failures.push(`Foto ${i + 1}: ${err?.message || 'gagal'}`)
            console.error(`[TIKTOK PHOTO FIX] Gagal mengunduh foto ${i + 1}:`, err?.stack || err?.message || err)
          }
        }

        if (!albumItems.length) {
          return m.reply(
            `Slideshow terdeteksi (${photos.length} foto), tetapi semua foto gagal diunduh.\n` +
            `${failures[0] || 'Periksa log [TIKTOK PHOTO FIX] di console.'}`
          )
        }

        console.log(`[TIKTOK PHOTO FIX] Mengirim album: ${albumItems.length}/${photos.length} foto.`)
        await sock.sendAlbum(m.chat, albumItems, m.raw ? { quote: m.raw } : {})

        if (audioUrl) {
          try {
            const { buffer } = await downloadRaw(audioUrl, MAX_VIDEO_SIZE)
            await m.reply({ type: 'audio', media: buffer, mimetype: 'audio/mpeg', ptt: false })
          } catch (err) {
            console.error('[TIKTOK PHOTO FIX] Audio gagal dikirim:', err?.message || err)
          }
        }

        await m.reply(caption)

        if (failures.length) {
          await m.reply(`⚠️ Album terkirim ${albumItems.length}/${photos.length} foto.\n${failures.slice(0, 3).join('\n')}`)
        }
        return
      }

      if (videoUrl) {
        const { buffer, contentType } = await downloadRaw(videoUrl, MAX_VIDEO_SIZE)
        const mimetype = contentType.startsWith('video/') ? contentType : 'video/mp4'
        return m.reply({ type: 'video', media: buffer, mimetype, caption })
      }

      return m.reply(
        `Media tidak ditemukan dari respons API.\nTipe: ${asText(data.type)}\nKey: ${Object.keys(data).slice(0, 30).join(', ') || '-'}`
      )
    } catch (err) {
      console.error('[TIKTOK PHOTO FIX] Error kirim media:', err?.stack || err?.message || err)
      return m.reply(`Gagal mengunduh/mengirim TikTok.\nPesan: ${err?.message || 'Unknown error'}`)
    }
  }
}
