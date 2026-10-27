import axios from 'axios'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { useStarforge, withQuote } from '../../lib/function.js'

const API_URL = 'https://api.sticker.ly'
const USER_AGENT = 'androidapp.stickerly/3.31.0 (M2006C3LG; U; Android 29; in-ID; id;)'

const MAX_PACKS = 10
const MAX_STICKERS = 30
const MAX_DOWNLOAD_SIZE = 15 * 1024 * 1024
const MAX_STICKER_SIZE = 500 * 1024
const SESSION_TTL = 5 * 60 * 1000

const sessions = global.elyraStickerlySessions instanceof Map
  ? global.elyraStickerlySessions
  : new Map()

global.elyraStickerlySessions = sessions

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

function getSessionKey(m) {
  return String(m.chat || '') + ':' + String(m.sender || m.key?.participant || '')
}

function getPackId(pack) {
  return String(pack?.packId || pack?.id || pack?.pack_id || '')
}

function getPackName(pack) {
  return String(pack?.name || pack?.packName || pack?.title || 'Sticker Pack')
}

function getPackAuthor(pack) {
  return String(pack?.authorName || pack?.author || pack?.publisher || 'Unknown')
}

function getPackUrl(pack) {
  const id = getPackId(pack)

  return String(
    pack?.shareUrl ||
    pack?.url ||
    (id ? 'https://sticker.ly/s/' + id : '')
  )
}

function getPackFiles(pack) {
  const candidates = [
    pack?.stickers,
    pack?.resourceFiles,
    pack?.stickerList,
    pack?.files,
    pack?.result?.stickers,
    pack?.result?.resourceFiles
  ]

  return candidates.find(
    value => Array.isArray(value) && value.length > 0
  ) || []
}

function getFileName(file) {
  if (typeof file === 'string') return file

  return String(
    file?.fileName ||
    file?.resourceFile ||
    file?.filename ||
    file?.name ||
    file?.imageUrl ||
    file?.resourceUrl ||
    file?.downloadUrl ||
    file?.url ||
    ''
  )
}

function getResourceUrl(pack, file) {
  const direct = typeof file === 'object' && file !== null
    ? file.imageUrl ||
      file.resourceUrl ||
      file.downloadUrl ||
      file.url
    : ''

  if (typeof direct === 'string' && /^https?:\/\//i.test(direct)) {
    return direct
  }

  const filename = getFileName(file)

  if (!filename) return ''

  if (/^https?:\/\//i.test(filename)) {
    return filename
  }

  const prefix = String(
    file?.resourceUrlPrefix ||
    pack?.resourceUrlPrefix ||
    pack?.prefix ||
    ''
  )

  if (!prefix) return ''

  try {
    return new URL(
      filename.replace(/^\/+/, ''),
      prefix.replace(/\/+$/, '') + '/'
    ).href
  } catch {
    return ''
  }
}

function isWebP(buffer) {
  return Buffer.isBuffer(buffer) &&
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
}

function isAnimatedWebP(buffer) {
  return isWebP(buffer) &&
    buffer.includes(Buffer.from('ANIM')) &&
    buffer.includes(Buffer.from('ANMF'))
}

function getExtension(buffer, contentType = '', url = '') {
  if (isWebP(buffer)) return '.webp'

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return '.png'
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return '.jpg'
  }

  if (
    buffer.length >= 6 &&
    ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))
  ) {
    return '.gif'
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 4, 8) === 'ftyp'
  ) {
    return '.mp4'
  }

  const mime = String(contentType).toLowerCase()

  if (mime.includes('webp')) return '.webp'
  if (mime.includes('png')) return '.png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg'
  if (mime.includes('gif')) return '.gif'
  if (mime.includes('mp4')) return '.mp4'

  const match = String(url).match(
    /\.(webp|png|jpe?g|gif|apng|mp4|m4v)(?:$|[?#])/i
  )

  return match ? '.' + match[1].toLowerCase() : '.bin'
}

async function react(sock, m, emoji) {
  try {
    await sock.sendReact(m.chat, emoji, m.key || m.id)
  } catch {}
}

async function searchStickerLy(keyword) {
  const { data } = await axios.post(
    API_URL + '/v4/stickerPack/smartSearch',
    {
      keyword,
      enabledKeywordSearch: true,
      filter: {
        extendSearchResult: false,
        sortBy: 'RECOMMENDED',
        languages: ['ALL'],
        minStickerCount: 5,
        searchBy: 'ALL',
        stickerType: 'ALL'
      }
    },
    {
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: 25000,
      maxContentLength: 5 * 1024 * 1024
    }
  )

  const results =
    data?.result?.stickerPacks ||
    data?.result?.result?.stickerPacks ||
    data?.stickerPacks ||
    data?.data ||
    []

  if (!Array.isArray(results)) return []

  return results
    .map(raw => ({
      id: getPackId(raw),
      name: getPackName(raw),
      author: getPackAuthor(raw),
      animated: Boolean(raw?.isAnimated),
      resourceUrlPrefix: String(raw?.resourceUrlPrefix || ''),
      files: getPackFiles(raw),
      url: getPackUrl(raw),
      raw
    }))
    .filter(pack => pack.id && pack.url)
}

function findPackDetails(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 5) {
    return null
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPackDetails(item, depth + 1)
      if (found) return found
    }

    return null
  }

  const files = getPackFiles(value)
  const prefix = String(value.resourceUrlPrefix || '')

  if (files.length && prefix) {
    return value
  }

  for (const key of [
    'result',
    'data',
    'response',
    'stickerPack',
    'pack'
  ]) {
    if (value[key] && typeof value[key] === 'object') {
      const found = findPackDetails(value[key], depth + 1)
      if (found) return found
    }
  }

  if (files.length) return value

  return null
}

async function requestPackDetails(pack) {
  const endpoints = [
    API_URL + '/v3.1/stickerPack/' + encodeURIComponent(pack.id.toUpperCase()),
    API_URL + '/v4/stickerPack/' + encodeURIComponent(pack.id)
  ]

  let lastError

  for (const endpoint of endpoints) {
    try {
      const { data } = await axios.get(endpoint, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json'
        },
        timeout: 25000,
        maxContentLength: 5 * 1024 * 1024
      })

      const details = findPackDetails(data)

      if (details) {
        return details
      }

      lastError = new Error(
        'Respons API tidak memiliki daftar file sticker.'
      )
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(
    lastError?.message || 'Gagal mendapatkan detail sticker pack.'
  )
}

async function getPackDetail(pack) {
  const original = pack.raw || pack
  const originalFiles = getPackFiles(original)

  const originalPrefix = String(
    original.resourceUrlPrefix ||
    pack.resourceUrlPrefix ||
    ''
  )

  const hasDirectUrls = originalFiles.length > 0 &&
    originalFiles.every(file =>
      /^https?:\/\//i.test(getResourceUrl({
        ...pack,
        resourceUrlPrefix: originalPrefix
      }, file))
    )

  if (originalFiles.length && (originalPrefix || hasDirectUrls)) {
    return {
      ...original,
      ...pack,
      id: pack.id,
      name: pack.name,
      author: pack.author,
      resourceUrlPrefix: originalPrefix,
      files: originalFiles
    }
  }

  const details = await requestPackDetails(pack)
  const detailFiles = getPackFiles(details)

  const result = {
    ...original,
    ...pack,
    ...details,
    id: getPackId(details) || pack.id,
    name: getPackName(details) || pack.name,
    author: getPackAuthor(details) || pack.author,
    url: getPackUrl(details) || pack.url,
    resourceUrlPrefix: String(
      details.resourceUrlPrefix ||
      originalPrefix ||
      ''
    ),
    files: detailFiles.length ? detailFiles : originalFiles,
    animated: Boolean(details.isAnimated ?? pack.animated)
  }

  if (!getPackFiles(result).length) {
    throw new Error('API Sticker.ly tidak mengembalikan daftar sticker.')
  }

  return result
}

async function downloadResource(url) {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('URL resource sticker tidak valid.')
  }

  const { data, headers } = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'image/webp,image/png,image/jpeg,image/gif,*/*;q=0.8'
    },
    timeout: 25000,
    maxContentLength: MAX_DOWNLOAD_SIZE,
    maxBodyLength: MAX_DOWNLOAD_SIZE,
    maxRedirects: 5
  })

  const buffer = Buffer.from(data)

  if (!buffer.length) {
    throw new Error('File sticker kosong.')
  }

  if (buffer.length > MAX_DOWNLOAD_SIZE) {
    throw new Error('File sticker melebihi 15 MB.')
  }

  const contentType = String(
    headers['content-type'] || ''
  ).toLowerCase()

  if (
    contentType.includes('text/html') ||
    contentType.includes('application/json')
  ) {
    throw new Error('URL tidak memberikan file media.')
  }

  const extension = getExtension(buffer, contentType, url)

  if (extension === '.bin') {
    throw new Error('Format file sumber tidak dikenali.')
  }

  return { buffer, extension }
}

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, {
      stdio: ['ignore', 'ignore', 'pipe']
    })

    let stderr = ''
    let settled = false

    const timeout = setTimeout(() => {
      if (settled) return

      settled = true
      child.kill('SIGKILL')
      reject(new Error('Konversi FFmpeg melebihi batas waktu.'))
    }, 60000)

    child.stderr.on('data', chunk => {
      stderr += chunk.toString()

      if (stderr.length > 10000) {
        stderr = stderr.slice(-10000)
      }
    })

    child.on('error', error => {
      if (settled) return

      settled = true
      clearTimeout(timeout)

      reject(
        error.code === 'ENOENT'
          ? new Error('FFmpeg tidak tersedia di server.')
          : error
      )
    })

    child.on('close', code => {
      if (settled) return

      settled = true
      clearTimeout(timeout)

      if (code === 0) {
        resolve()
      } else {
        const msg = stderr.trim().slice(-1200) || ('exit ' + code)
        reject(new Error('FFmpeg gagal: ' + msg))
      }
    })
  })
}

async function transcodeSticker(resource) {
  const source = resource.buffer
  const extension = resource.extension

  if (isWebP(source) && source.length <= MAX_STICKER_SIZE) {
    return source
  }

  const animated = isAnimatedWebP(source) ||
    ['.gif', '.apng', '.mp4', '.m4v'].includes(extension)

  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), 'elyra-stickerly-')
  )

  const input = path.join(tempDir, 'source' + extension)
  const output = path.join(tempDir, 'result.webp')

  try {
    await writeFile(input, source)

    const profiles = animated
      ? [
          { size: 512, fps: 12, quality: 70, duration: 3 },
          { size: 480, fps: 10, quality: 60, duration: 3 },
          { size: 384, fps: 8, quality: 50, duration: 3 },
          { size: 320, fps: 8, quality: 40, duration: 3 }
        ]
      : [
          { size: 512, quality: 85 },
          { size: 480, quality: 75 },
          { size: 448, quality: 65 },
          { size: 384, quality: 55 },
          { size: 320, quality: 45 }
        ]

    let lastError

    for (const profile of profiles) {
      const filterParts = []
      if (animated) filterParts.push('fps=' + profile.fps)
      filterParts.push(
        'scale=' + profile.size + ':' + profile.size + ':force_original_aspect_ratio=decrease:flags=lanczos',
        'pad=' + profile.size + ':' + profile.size + ':(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        'format=yuva420p'
      )
      const filter = filterParts.join(',')

      const args = [
        '-hide_banner',
        '-loglevel', 'error',
        '-y',
        '-i', input,
        '-vf', filter
      ]

      if (animated) {
        args.push(
          '-t', String(profile.duration),
          '-loop', '0',
          '-an',
          '-c:v', 'libwebp_anim'
        )
      } else {
        args.push(
          '-frames:v', '1',
          '-an',
          '-c:v', 'libwebp'
        )
      }

      args.push(
        '-quality', String(profile.quality),
        '-compression_level', '6',
        '-preset', 'picture',
        output
      )

      try {
        await runFFmpeg(args)

        const buffer = await readFile(output)

        if (!isWebP(buffer)) {
          throw new Error('Hasil konversi bukan WebP.')
        }

        if (buffer.length <= MAX_STICKER_SIZE) {
          return buffer
        }

        lastError = new Error(
          'Ukuran hasil ' + (buffer.length / 1024).toFixed(1) + ' KB.'
        )
      } catch (error) {
        lastError = error
      }
    }

    throw new Error(
      lastError?.message || 'Gagal mengonversi media ke WebP.'
    )
  } finally {
    await rm(tempDir, {
      recursive: true,
      force: true
    }).catch(() => {})
  }
}

async function downloadPack(pack) {
  const detail = await getPackDetail(pack)
  const files = getPackFiles(detail).slice(0, MAX_STICKERS)

  if (!files.length) {
    throw new Error('Sticker pack tidak memiliki file media.')
  }

  const buffers = []
  let failed = 0
  let lastError = ''

  for (const file of files) {
    const url = getResourceUrl(detail, file)

    if (!url) {
      failed++
      lastError = 'URL file tidak ditemukan: ' + (getFileName(file) || 'unknown')
      continue
    }

    try {
      const resource = await downloadResource(url)
      const sticker = await transcodeSticker(resource)

      if (!isWebP(sticker)) {
        throw new Error('Hasil konversi bukan WebP yang valid.')
      }

      buffers.push(sticker)
    } catch (error) {
      failed++
      lastError = error?.message || 'Gagal memproses media.'

      console.error(
        '[ELYRA STICKERLY FILE]',
        url,
        lastError
      )
    }

    await delay(150)
  }

  return {
    pack: detail,
    buffers,
    failed,
    total: files.length,
    lastError
  }
}

function renderResults(packs, prefix, command) {
  const lines = [
    '୨ৎ  ELYRA STICKER.LY',
    '',
    'Hasil pencarian:',
    ''
  ]

  packs.forEach((pack, index) => {
    lines.push(
      '✦ ' + (index + 1) + '. ' + pack.name,
      '› Author: ' + pack.author,
      '› Sticker: ' + pack.files.length,
      '› URL: ' + pack.url,
      ''
    )
  })

  lines.push(
    'Balas pesan hasil pencarian dengan nomor saja.',
    'Contoh: 1',
    'Perintah alternatif: ' + prefix + command + ' 1',
    '',
    'Sesi berlaku 5 menit.',
    '',
    '© ELYRA-AI'
  )

  return lines.join('\n')
}

async function sendStickerPack(sock, m, buffers, pack) {
  await useStarforge(sock)

  const sources = (Array.isArray(buffers) ? buffers : [])
    .filter(buffer => Buffer.isBuffer(buffer) && buffer.length > 0)
    .map(buffer => Buffer.from(buffer))

  if (!sources.length) {
    throw new Error('Tidak ada sticker yang siap dikirim.')
  }

  const packMeta = {
    name: pack.name || 'Elyra Sticker Pack',
    publisher: pack.author || 'Elyra AI',
    description: 'Sticker pack ' + (pack.name || 'Elyra AI')
  }

  if (typeof sock.sf?.sendStickerPack === 'function') {
    await withQuote(m, quote =>
      sock.sf.sendStickerPack(m.chat, sources, quote, packMeta)
    )
    return sources.length
  }

  if (typeof sock.sendStickerPack === 'function') {
    await sock.sendStickerPack(m.chat, sources, {
      ...packMeta,
      packname: packMeta.name,
      author: packMeta.publisher,
      quote: m.raw || m,
      quoted: m.raw || m
    })
    return sources.length
  }

  throw new Error(
    'Fungsi sendStickerPack tidak tersedia. Periksa inisialisasi Starforge pada lib/function.js.'
  )
}

async function choosePack(m, { sock, number }) {
  const sessionKey = getSessionKey(m)
  const session = sessions.get(sessionKey)

  if (!session || Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(sessionKey)

    return m.reply(
      'Sesi Sticker.ly sudah berakhir. Cari ulang menggunakan .stickerly <nama pack>.'
    )
  }

  const pack = session.packs[number - 1]

  if (!pack) {
    return m.reply('Nomor pilihan tidak valid.')
  }

  sessions.delete(sessionKey)

  await react(sock, m, '🌱')

  try {
    await m.reply(
      [
        '୨ৎ  ELYRA STICKER.LY',
        '',
        '› Pack: ' + pack.name,
        '› Author: ' + pack.author,
        '› Maksimal: ' + MAX_STICKERS + ' sticker',
        '',
        'Sedang mengunduh dan menyusun sticker pack...'
      ].join('\n')
    )

    const result = await downloadPack(pack)

    if (!result.buffers.length) {
      throw new Error(
        'Tidak ada sticker yang berhasil diproses. ' + result.lastError
      )
    }

    const sent = await sendStickerPack(
      sock,
      m,
      result.buffers,
      {
        ...pack,
        name: getPackName(result.pack) || pack.name,
        author: getPackAuthor(result.pack) || pack.author
      }
    )

    await react(sock, m, '💐')

    await m.reply(
      [
        '୨ৎ  ELYRA STICKER.LY',
        '',
        '› Pack: ' + pack.name,
        '› Sticker dalam paket: ' + sent,
        '› File gagal: ' + result.failed,
        '› URL: ' + pack.url,
        '',
        '© ELYRA-AI'
      ].join('\n')
    )
  } catch (error) {
    console.error(
      '[ELYRA STICKERLY]',
      error?.stack || error?.message || error
    )

    await react(sock, m, '☘️')

    await m.reply(
      'Gagal mengirim sticker pack: ' + (error?.message || 'Kesalahan tidak diketahui.')
    )
  }
}

export default {
  command: 'stickerly',
  category: 'sticker',
  tags: ['sticker', 'search'],
  description: 'Cari dan kirim sticker pack dari Sticker.ly.',
  help: 'stickerly <query|nomor>',
  typing: true,
  wait: false,

  async execute(m, { sock, args, usedPrefix, command }) {
    const query = Array.isArray(args)
      ? args.map(String).join(' ').trim()
      : String(args || '').trim()

    if (/^\d{1,2}$/.test(query)) {
      return choosePack(m, {
        sock,
        number: Number(query)
      })
    }

    if (!query) {
      return m.reply(
        [
          '୨ৎ  ELYRA STICKER.LY',
          '',
          'Masukkan nama sticker pack yang ingin dicari.',
          '',
          '› Contoh: ' + (usedPrefix || '.') + (command || 'stickerly') + ' jkt48',
          '',
          '© ELYRA-AI'
        ].join('\n')
      )
    }

    await react(sock, m, '🌱')

    try {
      const packs = await searchStickerLy(query)

      if (!packs.length) {
        await react(sock, m, '☘️')

        return m.reply(
          [
            '୨ৎ  ELYRA STICKER.LY',
            '',
            'Sticker pack tidak ditemukan.',
            '',
            '© ELYRA-AI'
          ].join('\n')
        )
      }

      const selected = packs.slice(0, MAX_PACKS)

      sessions.set(getSessionKey(m), {
        packs: selected,
        createdAt: Date.now()
      })

      await react(sock, m, '💐')

      return m.reply(
        renderResults(
          selected,
          usedPrefix || '.',
          command || 'stickerly'
        )
      )
    } catch (error) {
      console.error(
        '[ELYRA STICKERLY SEARCH]',
        error?.stack || error?.message || error
      )

      await react(sock, m, '☘️')

      return m.reply(
        'Gagal mencari Sticker.ly: ' + (error?.response?.data?.message || error?.message || 'Server tidak merespons.')
      )
    }
  },

  async before(m, { sock }) {
    const sessionKey = getSessionKey(m)
    const session = sessions.get(sessionKey)

    if (!session || m.fromMe) return false

    if (Date.now() - session.createdAt > SESSION_TTL) {
      sessions.delete(sessionKey)
      return false
    }

    const text = String(
      m.text ||
      m.body ||
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      ''
    ).trim()

    if (!/^(?:10|[1-9])$/.test(text)) {
      return false
    }

    await choosePack(m, {
      sock,
      number: Number(text)
    })

    return true
  }
}