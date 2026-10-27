import { create as createSticker } from '@itsliaaa/starseal'
import sharp from 'sharp'
import WebP from 'node-webpmux'
import { useStarforge, withQuote } from '../../lib/function.js'

const PACK_NAME = 'elyra multi device'
const PUBLISHER = 'whatsapp bot fasted by inf project x lynx decode build with zapojs library.. Whatsapp bot 6281362133135'

const MAX_INPUT_SIZE = 25 * 1024 * 1024
const MAX_STATIC_SIZE = 100 * 1024
const MAX_ANIMATED_SIZE = 500 * 1024

const STATIC_SIZES = [512, 480, 448, 416, 384, 352, 320]
const STATIC_QUALITIES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30]
const ANIMATION_PROFILES = [
  { width: 512, height: 512, fps: 12, duration: 5 },
  { width: 480, height: 480, fps: 10, duration: 5 },
  { width: 448, height: 448, fps: 10, duration: 4 },
  { width: 384, height: 384, fps: 8, duration: 4 },
  { width: 320, height: 320, fps: 8, duration: 3 }
]

function asBuffer(value) {
  if (Buffer.isBuffer(value)) return value
  if (value instanceof ArrayBuffer) return Buffer.from(value)

  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  }

  if (value && value.data !== undefined) return asBuffer(value.data)

  throw new Error('Data media bukan Buffer yang valid.')
}

function isWebP(buffer) {
  return Buffer.isBuffer(buffer) &&
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
}

function isAnimatedWebP(buffer) {
  if (!isWebP(buffer)) return false

  return buffer.includes(Buffer.from('ANIM')) &&
    buffer.includes(Buffer.from('ANMF'))
}

function createExif() {
  const metadata = Buffer.from(JSON.stringify({
    'sticker-pack-id': 'elyra-multi-device',
    'sticker-pack-name': PACK_NAME,
    'sticker-pack-publisher': PUBLISHER,
    emojis: ['✨']
  }), 'utf8')

  const header = Buffer.from([
    0x49, 0x49, 0x2a, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00,
    0x41, 0x57, 0x07, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x16, 0x00, 0x00, 0x00
  ])

  header.writeUInt32LE(metadata.length, 14)

  return Buffer.concat([header, metadata])
}

async function initWebP() {
  if (typeof WebP?.Image?.initLib === 'function') {
    await WebP.Image.initLib()
  }
}

async function encodeStatic(raw, quality) {
  await initWebP()

  const image = await WebP.Image.getEmptyImage(true)

  await image.setImageData(raw.data, {
    width: raw.info.width,
    height: raw.info.height,
    quality,
    method: 6,
    lossless: 0,
    exact: true
  })

  image.exif = createExif()

  const result = asBuffer(await image.save(null))

  if (!isWebP(result)) {
    throw new Error('node-webpmux menghasilkan data WebP yang tidak valid.')
  }

  return result
}

async function createStaticSticker(source) {
  const metadata = await sharp(source, {
    failOn: 'error',
    limitInputPixels: 40000000
  }).metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Dimensi foto tidak dapat dibaca.')
  }

  let lastError

  for (const size of STATIC_SIZES) {
    const raw = await sharp(source, {
      failOn: 'error',
      limitInputPixels: 40000000
    })
      .rotate()
      .resize(size, size, {
        fit: 'contain',
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0
        },
        kernel: sharp.kernel.lanczos3
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    for (const quality of STATIC_QUALITIES) {
      try {
        const output = await encodeStatic(raw, quality)

        if (output.length <= MAX_STATIC_SIZE) {
          return output
        }
      } catch (error) {
        lastError = error
        break
      }
    }
  }

  if (lastError) {
    throw new Error(`Encoding foto gagal: ${lastError.message}`)
  }

  throw new Error(
    'Foto tidak dapat dikompres hingga batas 100 KB. Gunakan gambar yang lebih sederhana.'
  )
}

async function createAnimatedSticker(source) {
  let lastError

  for (const profile of ANIMATION_PROFILES) {
    try {
      const generated = await createSticker(source)
        .packName(PACK_NAME)
        .publisherName(PUBLISHER)
        .emojis(['✨'])
        .options({
          width: profile.width,
          height: profile.height,
          fps: profile.fps,
          trimStart: 0,
          trimEnd: profile.duration,
          flags: 'lanczos',
          format: 'yuva420p'
        })
        .toBuffer()

      const output = asBuffer(generated)

      if (!isWebP(output)) {
        throw new Error('Output konversi bukan WebP yang valid.')
      }

      if (!isAnimatedWebP(output)) {
        throw new Error('Output tidak mengandung frame animasi WebP.')
      }

      if (output.length <= MAX_ANIMATED_SIZE) {
        return output
      }

      lastError = new Error(
        `Hasil ${profile.width}x${profile.height} melebihi 500 KB.`
      )
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(
    `Konversi animasi gagal: ${lastError?.message || 'unknown error'}`
  )
}

async function downloadMedia(quoted, sock) {
  let lastError

  if (typeof quoted?.download === 'function') {
    try {
      const result = await quoted.download()

      if (result !== undefined && result !== null) {
        const buffer = asBuffer(result)

        if (buffer.length > 0) return buffer
      }
    } catch (error) {
      lastError = error
    }
  }

  if (typeof sock?.message?.downloadBytes === 'function') {
    const candidates = [
      quoted?.raw,
      quoted?.msg,
      quoted
    ].filter(Boolean)

    for (const candidate of candidates) {
      try {
        const result = await sock.message.downloadBytes(candidate)

        if (result === undefined || result === null) continue

        const buffer = asBuffer(result)

        if (buffer.length > 0) return buffer
      } catch (error) {
        lastError = error
      }
    }
  }

  throw new Error(
    lastError
      ? `Gagal mengunduh media: ${lastError.message}`
      : 'Media tidak berhasil diunduh. Coba kirim ulang.'
  )
}

async function sendSticker(sock, m, buffer) {
  await useStarforge(sock)

  await withQuote(m, quote =>
    sock.sendSticker(m.chat, buffer, quote, {
      isAiSticker: true,
      name: PACK_NAME,
      publisher: PUBLISHER
    })
  )
}

async function react(sock, m, emoji) {
  try {
    await sock.sendReact(m.chat, emoji, m.key || m.id)
  } catch {}
}

export default {
  command: 'sticker',
  alias: ['s', 'stiker'],
  category: 'sticker',
  tags: ['sticker'],
  description: 'Membuat sticker WebP HD dari foto, video, GIF, atau sticker.',
  help: '(reply foto/video/GIF/sticker)',
  typing: true,
  wait: false,

  async execute(m, { sock }) {
    const quoted = m.quoted

    if (!quoted) {
      return m.reply('Reply foto, video, GIF, atau sticker yang ingin dijadikan sticker.')
    }

    const type = String(
      quoted.type ||
      quoted.mtype ||
      quoted.msg?.mtype ||
      ''
    ).toLowerCase()

    const mime = String(
      quoted.mime ||
      quoted.mimetype ||
      quoted.msg?.mimetype ||
      ''
    ).toLowerCase()

    const isVideo =
      type.includes('video') ||
      mime.startsWith('video/') ||
      mime === 'image/gif'

    const isSticker =
      type.includes('sticker') ||
      mime === 'image/webp'

    const isImage =
      type.includes('image') ||
      mime.startsWith('image/')

    if (!isVideo && !isSticker && !isImage) {
      return m.reply('Media tidak didukung. Reply foto, video, GIF, atau sticker.')
    }

    let stage = 'download'

    await react(sock, m, '🌱')

    try {
      const source = await downloadMedia(quoted, sock)

      if (!source.length) {
        throw new Error('Media kosong.')
      }

      if (source.length > MAX_INPUT_SIZE) {
        throw new Error('Ukuran media maksimal 25 MB.')
      }

      let output

      if (isVideo) {
        stage = 'video-encode'
        output = await createAnimatedSticker(source)
      } else if (isSticker && isAnimatedWebP(source)) {
        stage = 'animated-sticker'

        if (source.length <= MAX_ANIMATED_SIZE) {
          output = source
        } else {
          output = await createAnimatedSticker(source)
        }
      } else {
        stage = 'photo-encode'
        output = await createStaticSticker(source)
      }

      if (!Buffer.isBuffer(output) || !output.length) {
        throw new Error('Hasil encoding kosong.')
      }

      if (!isWebP(output)) {
        throw new Error('Hasil akhir bukan file WebP yang valid.')
      }

      const animated = isAnimatedWebP(output)
      const maxSize = animated ? MAX_ANIMATED_SIZE : MAX_STATIC_SIZE

      if (output.length > maxSize) {
        throw new Error(
          `Ukuran hasil ${(output.length / 1024).toFixed(1)} KB melebihi batas ${Math.round(maxSize / 1024)} KB.`
        )
      }

      stage = 'send-sticker'
      await sendSticker(sock, m, output)

      await react(sock, m, '💐')
    } catch (error) {
      console.error(
        `[ELYRA STICKER:${stage}]`,
        error?.stack || error?.message || error
      )

      await react(sock, m, '☘️')

      await m.reply(
        `Gagal membuat sticker [${stage}]: ${error?.message || 'Kesalahan tidak diketahui.'}`
      )
    }
  }
}