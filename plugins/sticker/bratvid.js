import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { createRequire } from 'node:module'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  statSync
} from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import crypto from 'node:crypto'

const require = createRequire(import.meta.url)
const webpmuxModule = require('node-webpmux')
const WebP = webpmuxModule.default || webpmuxModule
const execFileAsync = promisify(execFile)

const FONT_URL = 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/ARIALN.ttf'
const EMOJI_JSON_URL = 'https://media.githubusercontent.com/media/Ditzzx-vibecoder/entahlah/main/emoji-apple.json'
const ASSET_DIR = path.join(process.cwd(), 'data', 'brat-assets')
const FONT_PATH = path.join(ASSET_DIR, 'ARIALN.ttf')
const EMOJI_JSON_PATH = path.join(ASSET_DIR, 'emoji-apple.json')

const PACK_NAME = 'ERINE-AI • ELYRA'
const PUBLISHER_NAME = 'BOT BY INF PROJECT'
const WATERMARK = '.'

const CANVAS_SIZE = 1000
const STICKER_SIZE = 512
const MAX_TEXT_LENGTH = 220
const MAX_WORDS = 21
const FRAME_DURATION = 0.4
const HOLD_DURATION = 1.2
const MAX_STICKER_BYTES = 500 * 1024
const MAX_RAW_WEBP_BYTES = MAX_STICKER_BYTES - 4096
const MAX_WORD_PER_LAYER = 1
const MAX_WORD_BEFORE_RESET = [7, 8]

const THEMES = {
  black: { bg: '#000000', text: '#ffffff' },
  white: { bg: '#ffffff', text: '#000000' },
  green: { bg: '#8ace00', text: '#000000' }
}

const EMOJI_REGEX = /(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}\uFE0F?|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2}|\p{Extended_Pictographic}\uFE0F?)/gu

let fontPromise
let emojiMapPromise
const emojiImageCache = new Map()

async function downloadFile(url, destination) {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000) })
  if (!response.ok) throw new Error(`HTTP ${response.status} saat mengambil aset.`)
  const buffer = Buffer.from(await response.arrayBuffer())
  if (!buffer.length) throw new Error('Aset hasil download kosong.')
  mkdirSync(path.dirname(destination), { recursive: true })
  writeFileSync(destination, buffer)
  return buffer
}

async function ensureFont() {
  if (!fontPromise) {
    fontPromise = (async () => {
      mkdirSync(ASSET_DIR, { recursive: true })
      try {
        if (!existsSync(FONT_PATH) || statSync(FONT_PATH).size === 0) {
          await downloadFile(FONT_URL, FONT_PATH)
        }
        const result = GlobalFonts.registerFromPath(FONT_PATH, 'ArialNarrow')
        if (result === false) throw new Error('Font Arial Narrow tidak bisa didaftarkan.')
        return 'ArialNarrow'
      } catch (error) {
        console.warn('[BRATVID] Font custom gagal dimuat; memakai sans-serif:', error?.message || error)
        return 'sans-serif'
      }
    })()
  }
  return fontPromise
}

async function loadEmojiMap() {
  if (!emojiMapPromise) {
    emojiMapPromise = (async () => {
      try {
        if (!existsSync(EMOJI_JSON_PATH) || statSync(EMOJI_JSON_PATH).size === 0) {
          await downloadFile(EMOJI_JSON_URL, EMOJI_JSON_PATH)
        }
        const parsed = JSON.parse(readFileSync(EMOJI_JSON_PATH, 'utf8'))
        if (!parsed || typeof parsed !== 'object') throw new Error('JSON emoji tidak valid.')
        return parsed
      } catch (error) {
        console.warn('[BRATVID] Emoji Apple gagal dimuat; memakai fallback font:', error?.message || error)
        return {}
      }
    })()
  }
  return emojiMapPromise
}

function emojiToUnicode(emoji) {
  return [...emoji]
    .map(char => char.codePointAt(0).toString(16).padStart(4, '0'))
    .join('-')
}

function isEmojiPart(part) {
  EMOJI_REGEX.lastIndex = 0
  const matched = EMOJI_REGEX.test(part)
  EMOJI_REGEX.lastIndex = 0
  return matched
}

async function getEmojiImage(emoji) {
  if (emojiImageCache.has(emoji)) return emojiImageCache.get(emoji)

  const promise = (async () => {
    const map = await loadEmojiMap()
    const base = emojiToUnicode(emoji)
    const plain = base.replace(/-fe0f/gi, '')
    const variants = [
      base,
      plain,
      `${plain}-fe0f`,
      base.toUpperCase(),
      plain.toUpperCase(),
      `${plain.toUpperCase()}-FE0F`
    ]

    let encoded
    for (const variant of variants) {
      if (map[variant]) {
        encoded = map[variant]
        break
      }
    }

    if (typeof encoded !== 'string') return null
    encoded = encoded.replace(/^data:image\/[^;]+;base64,/i, '')
    return loadImage(Buffer.from(encoded, 'base64'))
  })().catch(() => null)

  emojiImageCache.set(emoji, promise)
  return promise
}

async function drawTextWithEmojis(ctx, text, x, y, fontSize) {
  const parts = text.split(EMOJI_REGEX)
  let currentX = x
  for (const part of parts) {
    if (!part) continue
    if (isEmojiPart(part)) {
      const emojiImage = await getEmojiImage(part)
      if (emojiImage) ctx.drawImage(emojiImage, currentX, y, fontSize, fontSize)
      else ctx.fillText(part, currentX, y)
      currentX += fontSize
    } else {
      ctx.fillText(part, currentX, y)
      currentX += ctx.measureText(part).width
    }
  }
}

function measureTextCustom(ctx, text, fontSize) {
  const parts = text.split(EMOJI_REGEX)
  let width = 0
  for (const part of parts) {
    if (!part) continue
    width += isEmojiPart(part) ? fontSize : ctx.measureText(part).width
  }
  return width
}

function wrapText(ctx, text, maxWidth, fontSize, fontFamily) {
  ctx.font = `${fontSize}px ${fontFamily}`
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (measureTextCustom(ctx, candidate, fontSize) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function fitsAt(ctx, text, fontSize, maxWidth, maxHeight, lineGap, fontFamily) {
  const lines = wrapText(ctx, text, maxWidth, fontSize, fontFamily)
  const words = text.split(/\s+/).filter(Boolean)
  const longestWord = words.length
    ? Math.max(...words.map(word => measureTextCustom(ctx, word, fontSize)))
    : 0
  const totalHeight = lines.length * (fontSize + lineGap) - lineGap
  return longestWord <= maxWidth && totalHeight <= maxHeight
}

function findBestFontSize(ctx, text, maxWidth, maxHeight, lineGap, fontFamily) {
  let low = 10
  let high = 700
  let best = low
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (fitsAt(ctx, text, middle, maxWidth, maxHeight, lineGap, fontFamily)) {
      best = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  return best
}

async function renderCanvas(text, theme, blurAmount) {
  const selectedTheme = THEMES[theme] || THEMES.white
  const fontFamily = await ensureFont()
  const paddingX = 80
  const paddingTop = 62
  const watermarkArea = 100
  const lineGap = 20
  const maxWidth = CANVAS_SIZE - paddingX * 2
  const maxHeight = CANVAS_SIZE - paddingTop - watermarkArea

  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = selectedTheme.bg
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  if (text.trim()) {
    const fontSize = findBestFontSize(ctx, text, maxWidth, maxHeight, lineGap, fontFamily)
    if (!fitsAt(ctx, text, fontSize, maxWidth, maxHeight, lineGap, fontFamily)) {
      throw new Error('Teks terlalu panjang untuk area Brat.')
    }
    const lines = wrapText(ctx, text, maxWidth, fontSize, fontFamily)
    ctx.fillStyle = selectedTheme.text
    ctx.font = `${fontSize}px ${fontFamily}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.save()
    if (blurAmount > 0) ctx.filter = `blur(${blurAmount}px)`

    const totalTextHeight = lines.length * (fontSize + lineGap) - lineGap
    let y = paddingTop + (maxHeight - totalTextHeight) / 2
    for (const line of lines) {
      await drawTextWithEmojis(ctx, line, paddingX, y, fontSize)
      y += fontSize + lineGap
    }
    ctx.restore()
  }

  ctx.save()
  ctx.globalAlpha = 0.72
  ctx.fillStyle = selectedTheme.text
  ctx.font = `26px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(WATERMARK, CANVAS_SIZE / 2, CANVAS_SIZE - 32, CANVAS_SIZE - 48)
  ctx.restore()

  return canvas.encode('png')
}

function buildProgressFrames(text) {
  const tokens = text.split(/\s+/).filter(Boolean)
  const frames = []
  let batchStart = 0
  let batchIndex = 0

  while (batchStart < tokens.length) {
    const resetAt = Math.max(0, Number(MAX_WORD_BEFORE_RESET[batchIndex % MAX_WORD_BEFORE_RESET.length]) || 0)
    const batchEnd = resetAt > 0 ? Math.min(batchStart + resetAt, tokens.length) : tokens.length
    for (let end = batchStart + MAX_WORD_PER_LAYER; end < batchEnd; end += MAX_WORD_PER_LAYER) {
      frames.push(tokens.slice(batchStart, end).join(' '))
    }
    frames.push(tokens.slice(batchStart, batchEnd).join(' '))
    batchStart = batchEnd
    batchIndex++
  }

  return { tokens, frames }
}

function quoteConcatPath(filePath) {
  return filePath.replace(/'/g, "'\\''")
}

async function createMp4(framePaths, outputPath, tempDir) {
  const manifestPath = path.join(tempDir, 'concat.txt')
  const manifestLines = []
  for (let i = 0; i < framePaths.length; i++) {
    manifestLines.push(`file '${quoteConcatPath(framePaths[i])}'`)
    manifestLines.push(`duration ${i === framePaths.length - 1 ? HOLD_DURATION : FRAME_DURATION}`)
  }
  // Required by FFmpeg concat demuxer so the final frame gets its requested duration.
  manifestLines.push(`file '${quoteConcatPath(framePaths[framePaths.length - 1])}'`)
  writeFileSync(manifestPath, manifestLines.join('\n') + '\n')

  // Keep the intermediary crisp. yuv444p avoids 4:2:0 chroma softness on high-contrast text.
  await execFileAsync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', manifestPath,
    '-an',
    '-vf', 'scale=1000:1000:flags=lanczos',
    '-fps_mode', 'vfr',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '8',
    '-pix_fmt', 'yuv444p',
    '-movflags', '+faststart',
    outputPath
  ], { timeout: 120000, maxBuffer: 8 * 1024 * 1024 })

  return manifestPath
}

async function encodeWebpFromMp4(mp4Path, outputPath) {
  const attempts = [
    { fps: 15, quality: 95 },
    { fps: 15, quality: 91 },
    { fps: 12, quality: 94 },
    { fps: 12, quality: 90 },
    { fps: 12, quality: 86 },
    { fps: 10, quality: 90 },
    { fps: 10, quality: 85 },
    { fps: 8, quality: 84 },
    { fps: 8, quality: 80 },
    { fps: 6, quality: 76 }
  ]

  let lastSize = 0
  let lastMode
  for (const { fps, quality } of attempts) {
    const filter = `fps=${fps},scale=${STICKER_SIZE}:${STICKER_SIZE}:flags=lanczos,format=yuva420p,setsar=1`
    await execFileAsync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', mp4Path,
      '-vf', filter,
      '-an',
      '-vcodec', 'libwebp',
      '-loop', '0',
      '-preset', 'text',
      '-compression_level', '6',
      '-lossless', '0',
      '-q:v', String(quality),
      outputPath
    ], { timeout: 120000, maxBuffer: 8 * 1024 * 1024 })

    lastSize = statSync(outputPath).size
    lastMode = { fps, quality }
    console.info(`[BRATVID] Encode ${fps} fps / q${quality}: ${(lastSize / 1024).toFixed(1)} KB`)
    if (lastSize <= MAX_RAW_WEBP_BYTES) return { size: lastSize, ...lastMode }
  }

  throw new Error(
    `Sticker masih ${(lastSize / 1024).toFixed(1)} KB setelah kompresi. ` +
    'Coba teks yang lebih pendek agar kualitas tetap bagus dan ukuran di bawah 500 KB.'
  )
}

function makeStickerExif() {
  const json = {
    'sticker-pack-id': `erine-ai-elyra-${crypto.randomBytes(8).toString('hex')}`,
    'sticker-pack-name': PACK_NAME,
    'sticker-pack-publisher': PUBLISHER_NAME,
    emojis: ['🎨', '✨']
  }
  const header = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ])
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
  const exif = Buffer.concat([header, jsonBuffer])
  exif.writeUIntLE(jsonBuffer.length, 14, 4)
  return exif
}

async function attachStickerExif(webpBuffer) {
  const image = new WebP.Image()
  await image.load(webpBuffer)
  if (!image.hasAnim) throw new Error('FFmpeg tidak menghasilkan animated WebP.')
  if (image.width !== STICKER_SIZE || image.height !== STICKER_SIZE) {
    throw new Error(`Ukuran sticker tidak sesuai: ${image.width}x${image.height}.`)
  }
  image.exif = makeStickerExif()
  const sticker = await image.save(null)
  if (!Buffer.isBuffer(sticker) || !sticker.length) throw new Error('node-webpmux gagal memasang metadata.')
  if (sticker.length > MAX_STICKER_BYTES) {
    throw new Error(`Sticker setelah metadata berukuran ${(sticker.length / 1024).toFixed(1)} KB, melebihi batas WhatsApp.`)
  }
  return sticker
}

function parseArgs(args = []) {
  let theme = 'white'
  let blur = 0
  const textParts = []

  for (let i = 0; i < args.length; i++) {
    const token = String(args[i])
    const lower = token.toLowerCase()
    if (lower === '--theme' || lower === '-t') {
      if (args[i + 1] != null) theme = String(args[++i]).toLowerCase()
      continue
    }
    if (lower.startsWith('--theme=')) {
      theme = lower.slice('--theme='.length)
      continue
    }
    if (lower === '--blur' || lower === '-b') {
      if (args[i + 1] != null) blur = Number(args[++i])
      continue
    }
    if (lower.startsWith('--blur=')) {
      blur = Number(lower.slice('--blur='.length))
      continue
    }
    textParts.push(token)
  }

  return { text: textParts.join(' ').trim(), theme, blur }
}

async function makeBratSticker({ text, theme, blur }) {
  const { tokens, frames } = buildProgressFrames(text)
  if (!tokens.length) throw new Error('Teks kosong.')
  if (tokens.length > MAX_WORDS) throw new Error(`Maksimal ${MAX_WORDS} kata supaya animasi tidak melewati batas durasi sticker.`)

  const totalDuration = Math.max(0, frames.length - 1) * FRAME_DURATION + HOLD_DURATION
  if (totalDuration > 10) throw new Error('Durasi animasi lebih dari 10 detik. Pendekkan teksnya.')

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'erine-bratvid-hd-'))
  try {
    const framePaths = []
    for (let i = 0; i < frames.length; i++) {
      const png = await renderCanvas(frames[i], theme, blur)
      const framePath = path.join(tempDir, `frame-${String(i + 1).padStart(4, '0')}.png`)
      writeFileSync(framePath, png)
      framePaths.push(framePath)
    }

    const mp4Path = path.join(tempDir, 'brat-intermediate.mp4')
    const webpPath = path.join(tempDir, 'brat-raw.webp')
    await createMp4(framePaths, mp4Path, tempDir)
    const encoded = await encodeWebpFromMp4(mp4Path, webpPath)
    const sticker = await attachStickerExif(readFileSync(webpPath))

    console.info(
      `[BRATVID] Selesai: ${frames.length} tahap, ${(sticker.length / 1024).toFixed(1)} KB, ` +
      `${encoded.fps} fps / q${encoded.quality}.`
    )
    return sticker
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

export default {
  command: 'bratvid',
  alias: ['bratvid'],
  category: 'sticker',
  tags: ['sticker'],
  description: `> Membuat animated Brat sticker HD. Teks muncul bertahap dan hasilnya langsung dikirim sebagai sticker WebP.\n\nContoh:\n> .bratvid Brat vid 🎥\n> .bratvid --theme green Halo bre\n> .bratvid --theme black --blur 2 ERINE-AI`,
  help: '<teks> [--theme white|black|green] [--blur 0-3]',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const input = parseArgs(args)
    if (!input.text) {
      return m.reply(
        `Masukkan teks untuk animated Brat sticker.\n\n` +
        `Contoh: ${m.prefix || '.'}bratvid Brat vid 🎥\n` +
        'Tema: white, black, green\nBlur: 0, 1, 2, 3\n' +
        `Maksimal ${MAX_WORDS} kata.`
      )
    }
    if (input.text.length > MAX_TEXT_LENGTH) return m.reply(`Teks maksimal ${MAX_TEXT_LENGTH} karakter.`)
    if (!Object.hasOwn(THEMES, input.theme)) return m.reply('Tema tidak valid. Pilih white, black, atau green.')
    if (!Number.isInteger(input.blur) || ![0, 1, 2, 3].includes(input.blur)) {
      return m.reply('Blur tidak valid. Pilih angka 0, 1, 2, atau 3.')
    }

    try {
      const sticker = await makeBratSticker(input)
      return await m.reply({ type: 'sticker', media: sticker, mimetype: 'image/webp' })
    } catch (error) {
      console.error('[BRATVID] Error:', error?.stack || error?.message || error)
      const detail = String(error?.message || '')
      if (/spawn ffmpeg|ENOENT/i.test(detail)) {
        return m.reply('FFmpeg tidak ditemukan di server. Pastikan FFmpeg tersedia di PATH.')
      }
      if (/node-webpmux|cannot find module|Cannot find module/i.test(detail)) {
        return m.reply('Dependency belum lengkap. Jalankan: npm install @napi-rs/canvas node-webpmux')
      }
      if (/libwebp|Unknown encoder|not recognized/i.test(detail)) {
        return m.reply('FFmpeg server belum mendukung encoder libwebp. Gunakan build FFmpeg yang memiliki encoder WebP.')
      }
      return m.reply(`Gagal membuat Brat animated sticker.\n${detail.slice(0, 260) || 'Coba lagi nanti.'}`)
    }
  }
}