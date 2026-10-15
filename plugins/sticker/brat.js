import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { create as createSticker } from '@itsliaaa/starseal'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const FONT_URL = 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/ARIALN.ttf'
const EMOJI_JSON_URL = 'https://media.githubusercontent.com/media/Ditzzx-vibecoder/entahlah/main/emoji-apple.json'
const ASSET_DIR = path.join(process.cwd(), 'data', 'brat-assets')
const FONT_PATH = path.join(ASSET_DIR, 'ARIALN.ttf')
const EMOJI_JSON_PATH = path.join(ASSET_DIR, 'emoji-apple.json')

const PACK_NAME = 'ERINE-AI • ELYRA'
const PUBLISHER_NAME = 'BOT BY INF PROJECT'
const WATERMARK = '.'
const MAX_TEXT_LENGTH = 350
const CANVAS_SIZE = 1000
const THEMES = {
  black: { bg: '#000000', text: '#ffffff' },
  white: { bg: '#ffffff', text: '#000000' },
  green: { bg: '#8ace00', text: '#000000' }
}

const EMOJI_REGEX = /(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}\uFE0F?|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2}|\p{Extended_Pictographic}\uFE0F?)/gu

let fontPromise
let emojiMapPromise
const emojiImageCache = new Map()

async function downloadFile(url, dest) {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000) })
  if (!response.ok) throw new Error(`Gagal mengambil aset (${response.status}): ${url}`)

  const buffer = Buffer.from(await response.arrayBuffer())
  if (!buffer.length) throw new Error(`Aset kosong: ${url}`)

  mkdirSync(path.dirname(dest), { recursive: true })
  writeFileSync(dest, buffer)
  return buffer
}

async function ensureFont() {
  if (!fontPromise) {
    fontPromise = (async () => {
      mkdirSync(ASSET_DIR, { recursive: true })
      try {
        if (!existsSync(FONT_PATH)) await downloadFile(FONT_URL, FONT_PATH)
        const registered = GlobalFonts.registerFromPath(FONT_PATH, 'ArialNarrow')
        if (registered === false) throw new Error('Font ArialNarrow tidak dapat didaftarkan.')
        return 'ArialNarrow'
      } catch (error) {
        console.warn('[BRAT] Gagal memuat font custom, memakai sans-serif:', error?.message || error)
        return 'sans-serif'
      }
    })()
  }
  return fontPromise
}

function emojiToUnicode(emoji) {
  return [...emoji]
    .map(char => char.codePointAt(0).toString(16).padStart(4, '0'))
    .join('-')
}

async function loadEmojiMap() {
  if (!emojiMapPromise) {
    emojiMapPromise = (async () => {
      try {
        if (!existsSync(EMOJI_JSON_PATH)) {
          await downloadFile(EMOJI_JSON_URL, EMOJI_JSON_PATH)
        }
        const parsed = JSON.parse(readFileSync(EMOJI_JSON_PATH, 'utf8'))
        if (!parsed || typeof parsed !== 'object') throw new Error('Format emoji JSON tidak valid.')
        return parsed
      } catch (error) {
        console.warn('[BRAT] Emoji Apple tidak tersedia; gunakan emoji font fallback:', error?.message || error)
        return {}
      }
    })()
  }
  return emojiMapPromise
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
    if (!encoded || typeof encoded !== 'string') return null

    const cleanBase64 = encoded.replace(/^data:image\/[^;]+;base64,/i, '')
    return loadImage(Buffer.from(cleanBase64, 'base64'))
  })().catch(() => null)

  emojiImageCache.set(emoji, promise)
  return promise
}

function isEmojiPart(part) {
  EMOJI_REGEX.lastIndex = 0
  const result = EMOJI_REGEX.test(part)
  EMOJI_REGEX.lastIndex = 0
  return result
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

async function drawAppleEmoji(ctx, emoji, x, y, size) {
  const image = await getEmojiImage(emoji)
  if (image) ctx.drawImage(image, x, y, size, size)
  else ctx.fillText(emoji, x, y)
}

async function drawTextWithEmojis(ctx, text, x, y, fontSize) {
  const parts = text.split(EMOJI_REGEX)
  let currentX = x

  for (const part of parts) {
    if (!part) continue

    if (isEmojiPart(part)) {
      await drawAppleEmoji(ctx, part, currentX, y, fontSize)
      currentX += fontSize
    } else {
      ctx.fillText(part, currentX, y)
      currentX += ctx.measureText(part).width
    }
  }
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

function parseBratArgs(args = []) {
  let theme = 'white'
  let blur = 0
  const textParts = []

  for (let i = 0; i < args.length; i++) {
    const token = String(args[i])
    const lower = token.toLowerCase()

    if (lower === '--theme' || lower === '-t') {
      if (args[i + 1]) theme = String(args[++i]).toLowerCase()
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

async function generateBratPng({ text, theme = 'white', blur = 0 }) {
  const selectedTheme = THEMES[theme] || THEMES.white
  const blurAmount = [0, 1, 2, 3].includes(blur) ? blur : 0
  const fontFamily = await ensureFont()

  const paddingX = 80
  const paddingTop = 65
  const watermarkArea = 80
  const lineGap = 20
  const maxWidth = CANVAS_SIZE - paddingX * 2
  const maxHeight = CANVAS_SIZE - paddingTop - watermarkArea - 50

  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE)
  const ctx = canvas.getContext('2d')
  const fontSize = findBestFontSize(ctx, text, maxWidth, maxHeight, lineGap, fontFamily)
  const lines = wrapText(ctx, text, maxWidth, fontSize, fontFamily)

  if (!fitsAt(ctx, text, fontSize, maxWidth, maxHeight, lineGap, fontFamily)) {
    throw new Error('Teks terlalu panjang untuk dibuat menjadi Brat sticker.')
  }

  ctx.fillStyle = selectedTheme.bg
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
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
  
  const watermarkSize = 18
  ctx.save()
  ctx.globalAlpha = 0.62
  ctx.fillStyle = selectedTheme.text
  ctx.font = `${watermarkSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(WATERMARK, CANVAS_SIZE / 2, CANVAS_SIZE - 28, CANVAS_SIZE - 50)
  ctx.restore()

  return canvas.encode('png')
}

export default {
  command: 'brat',
  alias: ['bratsticker'],
  category: 'sticker',
  tags: ['sticker'],
  description: `> Membuat teks Brat dan langsung mengirim hasilnya sebagai sticker.\n\nContoh:\n> .brat Brat Canvas 🎨\n> .brat --theme green --blur 1 Hallo dunia`,
  help: '<teks> [--theme white|black|green] [--blur 0-3]',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const input = parseBratArgs(args)

    if (!input.text) {
      return m.reply(
        'Masukkan teks yang ingin dibuat menjadi sticker.\n\n' +
        `Contoh: ${m.prefix || '.'}brat Brat Canvas 🎨\n` +
        `Theme: white, black, green\n` +
        `Blur: 0, 1, 2, 3\n\n` +
        `Opsi: ${m.prefix || '.'}brat --theme green --blur 1 Hallo dunia`
      )
    }

    if (input.text.length > MAX_TEXT_LENGTH) {
      return m.reply(`Teks maksimal ${MAX_TEXT_LENGTH} karakter.`)
    }

    if (!Object.hasOwn(THEMES, input.theme)) {
      return m.reply('Theme tidak valid. Pilih: white, black, atau green.')
    }

    if (!Number.isFinite(input.blur) || ![0, 1, 2, 3].includes(input.blur)) {
      return m.reply('Blur tidak valid. Pilih angka 0, 1, 2, atau 3.')
    }

    try {
      const png = await generateBratPng(input)
      const sticker = await createSticker(png)
        .packName(PACK_NAME)
        .publisherName(PUBLISHER_NAME)
        .emojis(['🎨', '✨'])
        .options({
          width: 512,
          height: 512,
          flags: 'bilinear',
          format: 'yuva420p'
        })
        .toBuffer()

      if (!Buffer.isBuffer(sticker) || !sticker.length) {
        throw new Error('Starseal tidak menghasilkan sticker WebP.')
      }

      return await m.reply({
        type: 'sticker',
        media: sticker,
        mimetype: 'image/webp'
      })
    } catch (error) {
      console.error('[BRAT STICKER] Error:', error?.stack || error?.message || error)
      return m.reply(
        'Gagal membuat sticker Brat. Pastikan @napi-rs/canvas dan FFmpeg sudah terpasang, lalu coba lagi.'
      )
    }
  }
}
