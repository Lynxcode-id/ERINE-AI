import axios from 'axios'

const API_URL = `${global.bintang}/api/amfind/`
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
const REFERER = `${global.starlabs}/ampresetfind/`
const REQUEST_TIMEOUT = 110000
const FOOTER = 'with love, elyra !!'
const BUTTONS_PER_MESSAGE = 3

function isUrl(value) {
  if (typeof value !== 'string') return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function isTikTokUrl(value) {
  if (!isUrl(value)) return false

  try {
    return /(^|\.)tiktok\.com$/i.test(new URL(value).hostname)
  } catch {
    return false
  }
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
}

function extractPresets(value) {
  const output = []
  const seen = new Set()

  const visit = item => {
    if (typeof item === 'string') {
      if (isUrl(item) && !seen.has(item)) {
        seen.add(item)
        output.push({
          label: `Preset ${output.length + 1}`,
          url: item
        })
      }
      return
    }

    if (Array.isArray(item)) {
      for (const entry of item) visit(entry)
      return
    }

    if (!item || typeof item !== 'object') return

    if (isUrl(item.url)) {
      if (!seen.has(item.url)) {
        seen.add(item.url)
        output.push({
          label: cleanText(
            item.label ||
            item.title ||
            item.text ||
            `Preset ${output.length + 1}`
          ),
          url: item.url
        })
      }
      return
    }

    for (const entry of Object.values(item)) {
      visit(entry)
    }
  }

  visit(value)
  return output
}

async function react(sock, m, emoji) {
  try {
    if (typeof sock.sendReact === 'function') {
      await sock.sendReact(m.chat, emoji, m.key || m.id)
    }
  } catch {}
}

function buildInfo(data, presets, inputUrl) {
  const title = cleanText(
    data.video?.title || 'Tidak ada deskripsi'
  )
  const author = cleanText(
    data.user?.nickname ||
    data.user?.unique_id ||
    'Unknown'
  )
  const scanned = Number(data.total_comments_scanned || 0)

  return [
    '🌷 *Elyra Preset Finder*',
    '',
    `♡ Author : ${author}`,
    `♡ Komentar dipindai : ${scanned.toLocaleString('id-ID')}`,
    `♡ Deskripsi : ${title.slice(0, 500)}${title.length > 500 ? '…' : ''}`,
    `♡ Preset ditemukan : ${presets.length}`,
    `♡ Source : ${inputUrl}`,
    '',
    FOOTER
  ].join('\n')
}

function buildCopyButton(preset, index) {
  const label = cleanText(
    preset.label || `Preset ${index + 1}`
  )

  return {
    name: 'cta_copy',
    buttonParamsJson: JSON.stringify({
      display_text: `Salin Preset ${index + 1}`,
      copy_code: preset.url
    })
  }
}

async function sendCopyButtons(m, presets) {
  for (
    let start = 0;
    start < presets.length;
    start += BUTTONS_PER_MESSAGE
  ) {
    const batch = presets.slice(
      start,
      start + BUTTONS_PER_MESSAGE
    )

    const buttons = batch.map((preset, index) =>
      buildCopyButton(preset, start + index)
    )

    const entries = batch.map((preset, index) => [
      `*${start + index + 1}. ${preset.label || `Preset ${start + index + 1}`}*`,
      preset.url
    ].join('\n'))

    await m.reply({
      interactiveMessage: {
        header: {
          title: '✦ Preset Ditemukan',
          hasMediaAttachment: false
        },
        body: {
          text: entries.join('\n\n')
        },
        footer: {
          text: 'Tekan tombol untuk menyalin tautan preset.'
        },
        nativeFlowMessage: {
          buttons,
          messageVersion: 1
        }
      }
    })
  }
}

export default {
  command: 'caripreset',
  category: 'search',
  tags: ['search'],
  description: 'Mencari preset dari komentar video TikTok.',
  help: '<link TikTok>',
  typing: true,
  wait: false,

  async execute(m, { sock, args }) {
    const inputUrl = Array.isArray(args)
      ? args.join(' ').trim()
      : String(args || '').trim()

    if (!isTikTokUrl(inputUrl)) {
      return m.reply([
        '🌷 *Elyra Preset Finder*',
        '',
        '› Masukkan tautan video TikTok yang valid.',
        '',
        `♡ Contoh : ${(m.prefix || '.')}${m.command} https://vt.tiktok.com/xxxx/`,
        '',
        FOOTER
      ].join('\n'))
    }

    await react(sock, m, '🌱')

    try {
      const { data } = await axios.get(API_URL, {
        params: {
          url: inputUrl
        },
        timeout: REQUEST_TIMEOUT,
        maxContentLength: 15 * 1024 * 1024,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          Referer: REFERER
        }
      })

      if (
        !data ||
        data.success === false ||
        data.status === false
      ) {
        throw new Error(
          data?.error ||
          data?.message ||
          'Preset tidak ditemukan di komentar.'
        )
      }

      const result = data.data || data.result?.data || data.result || data
      const presets = extractPresets(result?.preset)
      const info = buildInfo(result || {}, presets, inputUrl)

      if (
        isUrl(result?.thumbnail) &&
        typeof sock.sendThumbnail === 'function'
      ) {
        try {
          await sock.sendThumbnail(m.chat, {
            url: inputUrl,
            title: 'Elyra Preset Finder',
            body: cleanText(
              result.video?.title || 'TikTok Preset Search'
            ),
            thumbnail: result.thumbnail,
            text: info,
            quote: m
          })
        } catch (error) {
          console.error(
            '[CARIPRESET] Link preview gagal:',
            error?.message || error
          )

          await m.reply(info)
        }
      } else {
        await m.reply(info)
      }

      if (presets.length) {
        await sendCopyButtons(m, presets)
      } else {
        await m.reply(
          '☘️ Tidak ada tautan preset valid yang ditemukan pada komentar video ini.'
        )
      }

      await react(sock, m, '💐')
    } catch (error) {
      console.error(
        '[CARIPRESET]',
        error?.response?.data ||
        error?.stack ||
        error?.message ||
        error
      )

      await react(sock, m, '☘️')

      let detail = error?.response?.status
        ? `HTTP ${error.response.status}`
        : error?.message || 'Terjadi kesalahan sistem.'

      if (
        error?.code === 'ECONNRESET' ||
        /socket hang up/i.test(detail)
      ) {
        detail = 'Server API sedang sibuk atau koneksi terputus. Coba lagi nanti.'
      } else if (
        error?.code === 'ECONNABORTED' ||
        /timeout/i.test(detail)
      ) {
        detail = 'Permintaan API melewati batas waktu saat memindai komentar.'
      }

      return m.reply([
        '🌷 *Elyra Preset Finder*',
        '',
        '› Gagal mencari preset.',
        `♡ Pesan : ${detail}`,
        '',
        FOOTER
      ].join('\n'))
    }
  }
}