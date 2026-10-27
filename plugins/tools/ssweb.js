import axios from 'axios'

const API_URL = `${global.lynxapis}/api/tools/ssweb`
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const FOOTER = 'with love, elyra !!'

function getImageMime(buffer, header = '') {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return ''

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.subarray(0, 3).toString() === 'GIF') return 'image/gif'
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp'
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString() === 'ftyp' && /^(avif|avis)$/.test(buffer.subarray(8, 12).toString())) return 'image/avif'

  const declaredMime = String(header).split(';')[0].trim().toLowerCase()
  if (/^image\/(png|jpeg|jpg|webp|gif|avif|bmp)$/.test(declaredMime)) {
    return declaredMime === 'image/jpg' ? 'image/jpeg' : declaredMime
  }
  return ''
}

function readApiMessage(data) {
  if (data == null) return ''

  if (typeof data === 'object' && !Buffer.isBuffer(data) && !(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data)) {
    const message = data.message || data.error || data.detail || data.reason
    return typeof message === 'string' ? message.trim().slice(0, 250) : ''
  }

  let body
  try {
    body = Buffer.isBuffer(data) || data instanceof ArrayBuffer || ArrayBuffer.isView(data)
      ? Buffer.from(data).toString('utf8').trim()
      : String(data).trim()
  } catch {
    return ''
  }

  if (!body || body.startsWith('<')) return ''

  try {
    const parsed = JSON.parse(body)
    const message = parsed.message || parsed.error || parsed.detail || parsed.reason || parsed.result?.message
    if (typeof message === 'string') return message.trim().slice(0, 250)
  } catch {}

  return body.slice(0, 250)
}

function usage(m) {
  const prefix = m.prefix || '.'
  return [
    '🌷 *SS Web*',
    '',
    'Screenshot halaman website dalam mode desktop atau mobile.',
    '',
    `› ${prefix}ssweb https://example.com`,
    `› ${prefix}ssweb example.com | mobile`,
    '',
    'Mode: `desktop` atau `mobile`',
    '',
    FOOTER
  ].join('\n')
}

export default {
  command: 'ssweb',
  category: 'tools',
  tags: ['tools'],
  description: 'Mengambil screenshot website dalam mode desktop atau mobile.',
  typing: true,
  wait: true,

  async execute(m, { sock, args = [] }) {
    const query = args.join(' ').trim()
    if (!query) return m.reply(usage(m))

    const separator = query.indexOf('|')
    const rawUrl = (separator >= 0 ? query.slice(0, separator) : query).trim()
    const requestedMode = separator >= 0 ? query.slice(separator + 1).trim().toLowerCase() : 'desktop'

    if (!rawUrl) return m.reply('❌ Masukkan URL website yang ingin di-screenshot.')

    if (!['desktop', 'mobile'].includes(requestedMode)) {
      return m.reply('❌ Mode tidak valid. Gunakan `desktop` atau `mobile`.\nContoh: .ssweb example.com | mobile')
    }

    if (/^[a-z][a-z\d+.-]*:\/\//i.test(rawUrl) && !/^https?:\/\//i.test(rawUrl)) {
      return m.reply('❌ URL harus menggunakan protokol HTTP atau HTTPS.')
    }

    let url
    try {
      url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`)
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('invalid URL')
      url = url.href
    } catch {
      return m.reply('❌ URL tidak valid. Contoh: `ssweb https://example.com`')
    }

    try {
      const response = await axios.get(API_URL, {
        params: { url, mode: requestedMode, output: 'image' },
        responseType: 'arraybuffer',
        timeout: 90000,
        maxContentLength: 30 * 1024 * 1024,
        maxBodyLength: 30 * 1024 * 1024,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
        }
      })

      const buffer = Buffer.from(response.data || [])
      const mimetype = getImageMime(buffer, response.headers?.['content-type'])

      if (!buffer.length || !mimetype) {
        const apiMessage = readApiMessage(buffer)
        throw new Error(apiMessage || 'API tidak mengembalikan gambar yang valid. Coba lagi beberapa saat.')
      }

      const caption = [
        '🌷 *SS Web Result*',
        '',
        `♡ URL : ${url}`,
        `♡ Mode : ${requestedMode}`,
        '',
        FOOTER
      ].join('\n')

      return await sock.message.send(m.chat, {
        type: 'image',
        media: buffer,
        mimetype,
        caption
      }, { quote: m.raw })
    } catch (err) {
      console.error('[SSWEB] Gagal mengambil screenshot:', err?.stack || err?.message || err)

      const status = err.response?.status
      const responseMessage = readApiMessage(err.response?.data)
      const message = responseMessage || err.message || 'Terjadi kesalahan yang tidak diketahui.'
      const statusText = status ? `\nStatus API: ${status}` : ''

      return m.reply(`❌ *SS Web gagal*${statusText}\nPesan: ${message}`)
    }
  }
}