import axios from 'axios'
import { JHMediaFire } from '../../scrape/MEDIAFIRE.js'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'

const MAX_FILE_SIZE = 100 * 1024 * 1024
const REQUEST_TIMEOUT = 120000
const FOOTER = 'with love, elyra !!'

function validUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function safeFileName(name) {
  return String(name || 'mediafire_file')
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f<>:"|?*]/g, '_')
    .trim()
    .slice(0, 180) || 'mediafire_file'
}

function getMimeType(headers, fileName) {
  const type = String(headers?.['content-type'] || '')
    .split(';')[0]
    .trim()
    .toLowerCase()

  if (
    type &&
    type !== 'application/octet-stream' &&
    !type.includes('text/html') &&
    !type.includes('application/json')
  ) {
    return type
  }

  const extension = fileName.split('.').pop()?.toLowerCase()

  const mimeTypes = {
    apk: 'application/vnd.android.package-archive',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    pdf: 'application/pdf',
    txt: 'text/plain',
    js: 'text/javascript',
    mjs: 'text/javascript',
    json: 'application/json',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
  }

  return mimeTypes[extension] || 'application/octet-stream'
}

async function react(sock, m, emoji) {
  try {
    if (typeof sock.sendReact === 'function') {
      await sock.sendReact(m.chat, emoji, m.key || m.id)
    }
  } catch {}
}

export default {
  command: 'mediafire',
  category: 'downloader',
  tags: ['downloader'],
  description: 'Mengunduh file dari MediaFire.',
  help: '<link MediaFire>',
  typing: true,
  wait: false,

  async execute(m, { sock, args }) {
    const url = Array.isArray(args)
      ? args.join(' ').trim()
      : String(args || '').trim()

    if (!url) {
      return m.reply([
        '🌷 *Elyra MediaFire Downloader*',
        '',
        '› Unduh file dari MediaFire.',
        '',
        `♡ Contoh : ${(m.prefix || '.')}${m.command} https://www.mediafire.com/file/xxxxx/`,
        '',
        FOOTER
      ].join('\n'))
    }

    await react(sock, m, '🌱')

    try {
      const result = await JHMediaFire(url)

      if (!result?.status || !result?.data?.download_url) {
        throw new Error(
          typeof result?.error === 'string'
            ? result.error
            : 'Gagal memperoleh direct download URL.'
        )
      }

      const { download_url: downloadUrl } = result.data

      if (!validUrl(downloadUrl)) {
        throw new Error('Direct download URL tidak valid.')
      }

      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: REQUEST_TIMEOUT,
        maxContentLength: MAX_FILE_SIZE,
        maxBodyLength: MAX_FILE_SIZE,
        maxRedirects: 5,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: '*/*',
          Referer: 'https://www.mediafire.com/'
        }
      })

      const buffer = Buffer.from(response.data)

      if (!buffer.length) {
        throw new Error('File yang diterima kosong.')
      }

      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error('Ukuran file melebihi batas 100 MB.')
      }

      const contentType = String(
        response.headers?.['content-type'] || ''
      ).toLowerCase()

      if (
        contentType.includes('text/html') ||
        contentType.includes('application/json')
      ) {
        throw new Error('Server tidak memberikan file unduhan yang valid.')
      }

      const fileName = safeFileName(result.data.file_name)
      const mimetype = getMimeType(response.headers, fileName)

      await sock.message.send(m.chat, {
        type: 'document',
        media: buffer,
        mimetype,
        fileName,
        caption: [
          '🌷 *Elyra MediaFire Downloader*',
          '',
          `♡ Nama file : ${fileName}`,
          `♡ Ukuran : ${formatBytes(buffer.length)}`,
          '',
          FOOTER
        ].join('\n')
      }, { quote: m.raw })

      await react(sock, m, '💐')
    } catch (error) {
      console.error(
        '[ELYRA MEDIAFIRE]',
        error?.response?.data ||
        error?.stack ||
        error?.message ||
        error
      )

      await react(sock, m, '☘️')

      return m.reply([
        '🌷 *Elyra MediaFire Downloader*',
        '',
        'Gagal mengunduh file.',
        `♡ Pesan : ${error?.message || 'Terjadi kesalahan.'}`,
        '',
        FOOTER
      ].join('\n'))
    }
  }
}