import axios from 'axios'

const API_URL = `${global.snowping}/api/aichat/gemini`
const FOOTER = 'with love, elyra !!'
const REQUEST_TIMEOUT = 60000
const MAX_MESSAGE_LENGTH = 3500

async function react(sock, m, emoji) {
  try {
    if (typeof sock.sendReact === 'function') {
      await sock.sendReact(m.chat, emoji, m.key)
    }
  } catch {}
}

function splitMessage(text, maxLength = MAX_MESSAGE_LENGTH) {
  const chunks = []
  let remaining = String(text || '').trim()

  while (remaining.length > maxLength) {
    let position = remaining.lastIndexOf('\n', maxLength)

    if (position < maxLength * 0.5) {
      position = remaining.lastIndexOf(' ', maxLength)
    }

    if (position < maxLength * 0.5) {
      position = maxLength
    }

    chunks.push(remaining.slice(0, position).trim())
    remaining = remaining.slice(position).trim()
  }

  if (remaining) chunks.push(remaining)

  return chunks
}

function extractResponse(data) {
  const result = data?.result
  const text = result?.text

  const content =
    text?.choices?.[0]?.message?.content ??
    text?.result ??
    text?.content ??
    result?.response ??
    result?.answer ??
    data?.response ??
    data?.answer

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI tidak memberikan jawaban.')
  }

  if (
    data?.status === false ||
    result?.status === false ||
    text?.status === false
  ) {
    throw new Error(content)
  }

  return content.trim()
}

export default {
  command: 'gemini',
  category: 'ai',
  tags: ['ai'],
  description: 'Berbincang dengan AI Gemini.',
  help: '<pertanyaan>',
  typing: true,
  wait: false,

  async execute(m, { sock, args }) {
    const prompt = Array.isArray(args)
      ? args.join(' ').trim()
      : String(args || '').trim()

    if (!prompt) {
      return m.reply([
        '୨ৎ *Elyra Gemini*',
        '',
        '› Tanya apa saja kepada AI Gemini.',
        '',
        `✦ ${(m.prefix || '.')}${m.command} <pertanyaan>`,
        '',
        'Contoh:',
        `› ${(m.prefix || '.')}${m.command} Jelaskan apa itu JavaScript`,
        `› ${(m.prefix || '.')}${m.command} Buatkan contoh program Python sederhana`,
        '',
        FOOTER
      ].join('\n'))
    }

    await react(sock, m, '🌱')

    try {
      const response = await axios.get(API_URL, {
        params: {
          text: prompt
        },
        timeout: REQUEST_TIMEOUT,
        headers: {
          Accept: 'application/json'
        },
        maxContentLength: 5 * 1024 * 1024
      })

      const answer = extractResponse(response.data)
      const chunks = splitMessage(answer)

      for (let index = 0; index < chunks.length; index++) {
        const message = index === 0
          ? chunks[index]
          : `✦ *Lanjutan Jawaban Gemini*\n\n${chunks[index]}`

        await m.reply(message)
      }

      await react(sock, m, '💐')
    } catch (error) {
      console.error(
        '[ELYRA GEMINI]',
        error?.response?.data || error?.stack || error?.message || error
      )

      await react(sock, m, '❌')

      const status = error?.response?.status
      const detail = status
        ? `HTTP ${status}`
        : error?.code === 'ECONNABORTED'
          ? 'Permintaan ke AI melebihi batas waktu.'
          : error?.message || 'Terjadi kesalahan.'

      return m.reply([
        '୨ৎ *Elyra Gemini*',
        '',
        `› Gagal mendapatkan jawaban.`,
        `› Pesan : ${detail}`,
        '',
        FOOTER
      ].join('\n'))
    }
  }
}