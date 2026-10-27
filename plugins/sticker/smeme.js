import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { promises as fs, existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import axios from 'axios'
import { applyExif, parseMeta } from '../../lib/stickerwm.js'

const execFilePromise = promisify(execFile)

const ASSETS_DIR = path.join(process.cwd(), 'assets', 'fonts')
const FONT_PATH = path.join(ASSETS_DIR, 'impact.ttf')
const EMOJI_JSON_PATH = path.join(ASSETS_DIR, 'emoji-apple-image.json')

const FONT_URL = 'https://cdn.jsdelivr.net/gh/Napoleon-Fibonacci/assets@main/font/impact.ttf'
const EMOJI_JSON_URL = 'https://media.githubusercontent.com/media/Ditzzx-vibecoder/entahlah/main/emoji-apple.json'

const MAX_TEXT_LENGTH = 350
const MAX_IMAGE_BYTES = 20 * 1024 * 1024

const EMOJI_REGEX = /((?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E)?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E)?)*)/gu

let fontPromise
let emojiMapPromise

const emojiImageCache = new Map()

async function downloadFile(url, destination) {
  if (existsSync(destination)) return true

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 25000,
      maxContentLength: 15 * 1024 * 1024
    })

    const buffer = Buffer.from(response.data)

    if (!buffer.length) return false

    await fs.mkdir(path.dirname(destination), {
      recursive: true
    })

    await fs.writeFile(destination, buffer)
    return true
  } catch {
    return false
  }
}

async function ensureFont() {
  if (!fontPromise) {
    fontPromise = (async () => {
      try {
        await fs.mkdir(ASSETS_DIR, { recursive: true })

        if (!existsSync(FONT_PATH)) {
          const downloaded = await downloadFile(FONT_URL, FONT_PATH)

          if (!downloaded) return 'sans-serif'
        }

        const registered = GlobalFonts.registerFromPath(
          FONT_PATH,
          'Impact'
        )

        return registered === false ? 'sans-serif' : 'Impact'
      } catch (error) {
        console.error('[SMEME] Font:', error?.message || error)
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
        if (!existsSync(EMOJI_JSON_PATH)) {
          const downloaded = await downloadFile(
            EMOJI_JSON_URL,
            EMOJI_JSON_PATH
          )

          if (!downloaded) return {}
        }

        const parsed = JSON.parse(
          await fs.readFile(EMOJI_JSON_PATH, 'utf8')
        )

        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch (error) {
        console.error('[SMEME] Emoji map:', error?.message || error)
        return {}
      }
    })()
  }

  return emojiMapPromise
}

function emojiToUnicode(emoji) {
  return [...emoji]
    .map(char => char.codePointAt(0).toString(16))
    .join('-')
}

async function getEmojiImage(emoji) {
  if (emojiImageCache.has(emoji)) {
    return emojiImageCache.get(emoji)
  }

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

    for (const key of variants) {
      const encoded = map[key]

      if (typeof encoded !== 'string') continue

      try {
        const cleanBase64 = encoded.replace(
          /^data:image\/[^;]+;base64,/i,
          ''
        )

        const buffer = Buffer.from(cleanBase64, 'base64')

        if (!buffer.length) continue

        return await loadImage(buffer)
      } catch {}
    }

    return null
  })().catch(() => null)

  emojiImageCache.set(emoji, promise)

  return promise
}

function isEmojiPart(value) {
  return /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/u.test(value)
}

function measureCustom(ctx, text, fontSize) {
  let total = 0

  for (const part of String(text).split(EMOJI_REGEX)) {
    if (!part) continue

    total += isEmojiPart(part)
      ? fontSize * 1.05
      : ctx.measureText(part).width
  }

  return total
}

async function drawCustomLine(ctx, text, centerX, y, fontSize) {
  const parts = String(text).split(EMOJI_REGEX).filter(Boolean)
  const totalWidth = measureCustom(ctx, text, fontSize)

  let x = centerX - totalWidth / 2

  for (const part of parts) {
    if (isEmojiPart(part)) {
      const size = fontSize * 1.05
      const image = await getEmojiImage(part)

      if (image) {
        ctx.drawImage(
          image,
          x,
          y - size * 0.84,
          size,
          size
        )
      } else {
        ctx.strokeText(part, x, y)
        ctx.fillText(part, x, y)
      }

      x += size
    } else {
      ctx.strokeText(part, x, y)
      ctx.fillText(part, x, y)
      x += ctx.measureText(part).width
    }
  }
}

function wrapText(ctx, text, maxWidth, fontSize) {
  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''

  for (const word of words) {
    const candidate = current
      ? `${current} ${word}`
      : word

    if (measureCustom(ctx, candidate, fontSize) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }

  if (current) lines.push(current)

  return lines
}

function getMediaType(media) {
  return [
    media?.type,
    media?.mediaType,
    media?.mimetype,
    media?.mime,
    media?.msg?.mimetype
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function isSupportedMedia(media) {
  const type = getMediaType(media)

  return (
    /image|sticker|webp|png|jpe?g/i.test(type) ||
    media?.type === 'stickerMessage' ||
    media?.type === 'imageMessage'
  )
}

function getRawMediaType(raw) {
  const message = raw?.message || raw

  const content =
    message?.ephemeralMessage?.message ||
    message?.viewOnceMessage?.message ||
    message?.viewOnceMessageV2?.message ||
    message?.viewOnceMessageV2Extension?.message ||
    message

  if (content?.stickerMessage) return 'sticker'
  if (content?.imageMessage) return 'image'

  return ''
}

async function getImageBuffer(m, sock) {
  const quoted = m.quoted

  if (quoted && isSupportedMedia(quoted)) {
    const downloaded = await quoted.download()

    if (!downloaded?.length) {
      throw new Error('Gagal mengunduh gambar atau sticker yang di-reply.')
    }

    return Buffer.from(downloaded)
  }

  const rawMessage = m.raw?.message || m.raw
  const currentType = getMediaType(m)
  const rawType = getRawMediaType(m.raw)

  const supported =
    isSupportedMedia(m) ||
    ['image', 'sticker'].includes(rawType) ||
    /image|sticker|webp|png|jpe?g/i.test(currentType)

  if (m.isMedia && supported) {
    const downloaded = await sock.message.downloadBytes(rawMessage)

    if (!downloaded?.length) {
      throw new Error('Gagal mengunduh gambar atau sticker.')
    }

    return Buffer.from(downloaded)
  }

  return null
}

async function decodeImage(imageBuffer, workDir) {
  const sourcePath = path.join(workDir, 'source-media.bin')
  const outputPath = path.join(workDir, 'decoded.png')

  await fs.writeFile(sourcePath, imageBuffer)

  await execFilePromise('ffmpeg', [
    '-y',
    '-i', sourcePath,
    '-frames:v', '1',
    '-f', 'image2',
    outputPath
  ], {
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024
  })

  const decodedBuffer = await fs.readFile(outputPath)

  if (!decodedBuffer.length) {
    throw new Error('Gagal membaca gambar atau frame sticker.')
  }

  return loadImage(decodedBuffer)
}

async function encodeWebp(pngBuffer, workDir, quality) {
  const inputPath = path.join(workDir, 'input.png')
  const outputPath = path.join(workDir, `output-${quality}.webp`)

  await fs.writeFile(inputPath, pngBuffer)

  await execFilePromise('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-vcodec', 'libwebp',
    '-filter:v',
    'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1',
    '-preset', 'default',
    '-an',
    '-vsync', '0',
    '-q:v', String(quality),
    '-frames:v', '1',
    outputPath
  ], {
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024
  })

  const buffer = await fs.readFile(outputPath)

  if (!buffer.length) {
    throw new Error('FFmpeg gagal menghasilkan sticker WebP.')
  }

  return buffer
}

async function createMemeSticker(imageBuffer, text, fontFamily, workDir) {
  const [topText = '', bottomText = ''] = String(text)
    .split('|')
    .map(value => value.trim())

  const baseImage = await decodeImage(imageBuffer, workDir)

  const width = baseImage.width
  const height = baseImage.height

  if (!width || !height) {
    throw new Error('Gambar atau sticker tidak valid.')
  }

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  ctx.drawImage(baseImage, 0, 0, width, height)

  const padding = width * 0.04
  const maxWidth = width - padding * 2
  const fontSize = Math.max(12, Math.round(height * 0.1))
  const lineHeight = fontSize * 1.15

  ctx.font = `900 ${fontSize}px "${fontFamily}", sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(4, height * 0.008)
  ctx.strokeStyle = '#000000'
  ctx.fillStyle = '#ffffff'

  if (topText) {
    const lines = wrapText(ctx, topText, maxWidth, fontSize)
    const startY = padding + fontSize

    for (let index = 0; index < lines.length; index++) {
      await drawCustomLine(
        ctx,
        lines[index],
        width / 2,
        startY + index * lineHeight,
        fontSize
      )
    }
  }

  if (bottomText) {
    const lines = wrapText(ctx, bottomText, maxWidth, fontSize)
    const startY = height - padding - (lines.length - 1) * lineHeight

    for (let index = 0; index < lines.length; index++) {
      await drawCustomLine(
        ctx,
        lines[index],
        width / 2,
        startY + index * lineHeight,
        fontSize
      )
    }
  }

  const pngBuffer = await canvas.encode('png')
  const meta = parseMeta([])
  const qualities = [70, 55, 40]

  let lastError

  for (const quality of qualities) {
    const webpBuffer = await encodeWebp(
      pngBuffer,
      workDir,
      quality
    )

    try {
      return await applyExif(webpBuffer, {
        packName: meta.packName,
        author: meta.author,
        emojis: ['🎨']
      })
    } catch (error) {
      lastError = error

      if (!/melebihi batas WhatsApp/i.test(error?.message || '')) {
        throw error
      }
    }
  }

  throw lastError || new Error('Gagal membuat sticker meme.')
}

async function react(sock, m, emoji) {
  await sock.sendReact(
    m.chat,
    emoji,
    m.key || m.id
  ).catch(() => {})
}

export default {
  command: 'smeme',
  category: 'sticker',
  tags: ['sticker'],
  description: 'Membuat sticker meme dari foto atau sticker.',
  help: '<teks atas> | <teks bawah>',
  typing: true,
  wait: false,

  async execute(m, { sock, args }) {
    const prefix = m.prefix || '.'
    const command = m.command || 'smeme'
    const text = args.join(' ').trim()

    if (!text) {
      return m.reply([
        '୨ৎ *ELYRA SMEME*',
        '',
        'Buat sticker meme dari foto atau sticker.',
        '',
        `› Reply foto/sticker: ${prefix}${command} teks atas | teks bawah`,
        `› Caption foto: ${prefix}${command} teks atas | teks bawah`,
        '',
        '© ERINE-AI'
      ].join('\n'))
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return m.reply(`Teks maksimal ${MAX_TEXT_LENGTH} karakter.`)
    }

    let imageBuffer

    try {
      imageBuffer = await getImageBuffer(m, sock)
    } catch (error) {
      console.error('[SMEME] Download:', error?.message || error)

      return m.reply(
        'Gagal mengunduh foto atau sticker yang dipilih.'
      )
    }

    if (!imageBuffer?.length) {
      return m.reply([
        '୨ৎ *ELYRA SMEME*',
        '',
        'Reply foto atau sticker yang ingin dijadikan meme.',
        '',
        `› Contoh: ${prefix}${command} teks atas | teks bawah`,
        '',
        '© ERINE-AI'
      ].join('\n'))
    }

    if (imageBuffer.length > MAX_IMAGE_BYTES) {
      return m.reply('Ukuran media terlalu besar. Maksimal 20 MB.')
    }

    await react(sock, m, '🌱')

    const workDir = path.join(
      os.tmpdir(),
      `elyra-smeme-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    )

    try {
      await fs.mkdir(workDir, { recursive: true })

      const fontFamily = await ensureFont()

      const sticker = await createMemeSticker(
        imageBuffer,
        text,
        fontFamily,
        workDir
      )

      await m.reply({
        type: 'sticker',
        media: sticker,
        mimetype: 'image/webp'
      })

      await react(sock, m, '💐')
    } catch (error) {
      console.error('[SMEME]', error?.stack || error?.message || error)

      await react(sock, m, '☘️')

      await m.reply(
        'Gagal membuat sticker meme. Pastikan FFmpeg dan dependensi canvas tersedia.'
      )
    } finally {
      await fs.rm(workDir, {
        recursive: true,
        force: true
      }).catch(() => {})
    }
  }
}