import axios from 'axios'
import * as settingsModule from '../../settings.js'

const API_URL = `${global.xrina}/canvas/ffgirl`
const MIN_TEMPLATE = 1
const MAX_TEMPLATE = 13
const TIMEOUT = 120000

function getPesan() {
  const settings =
    globalThis.settings ||
    settingsModule.default ||
    settingsModule.settings ||
    settingsModule

  return {
    wait: '🌱 Request sedang diproses, Tunggu sampai proses ini selesai!',
    error: '🍂 Terjadi kesalahan, coba lagi nanti.',
    done: '💐 Task selesai..',
    ...(globalThis.settings?.pesan || settings?.pesan || {})
  }
}

async function react(sock, m, emoji) {
  try {
    await sock.sendReact(m.chat, emoji, m.key || m.id)
  } catch {}
}

function randomTemplate() {
  return Math.floor(
    Math.random() * (MAX_TEMPLATE - MIN_TEMPLATE + 1)
  ) + MIN_TEMPLATE
}

function parseInput(args = []) {
  const input = [...args]
  let template = null

  if (input.length && /^\d+$/.test(input[input.length - 1])) {
    const candidate = Number(input[input.length - 1])

    if (candidate >= MIN_TEMPLATE && candidate <= MAX_TEMPLATE) {
      template = candidate
      input.pop()
    }
  }

  const username = input.join(' ').trim()

  return {
    username,
    template: template ?? randomTemplate(),
    random: template === null
  }
}

function getImageMime(buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return 'image/png'
  }

  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg'
  }

  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }

  if (
    buffer.toString('ascii', 0, 6) === 'GIF87a' ||
    buffer.toString('ascii', 0, 6) === 'GIF89a'
  ) {
    return 'image/gif'
  }

  return null
}

function getApiError(data) {
  if (Buffer.isBuffer(data)) {
    try {
      data = JSON.parse(data.toString('utf8'))
    } catch {
      return 'Server tidak memberikan gambar yang valid.'
    }
  }

  if (typeof data === 'string') {
    try {
      return getApiError(JSON.parse(data))
    } catch {
      return data.slice(0, 200)
    }
  }

  return String(
    data?.message ||
    data?.error ||
    data?.msg ||
    data?.result?.message ||
    'Gagal membuat gambar.'
  )
}

export default {
  command: 'ffgirl',
  category: 'maker',
  tags: ['maker'],
  description: 'Membuat gambar Free Fire Girl dengan 13 pilihan template.',
  help: [
    'ffgirl <username>',
    'ffgirl <username>|<template>',
    'Contoh: ffgirl lynxdecode|2',
    'Template tersedia: 1–13. Tanpa template akan dipilih secara acak.'
  ],
  typing: true,
  wait: false,

  async execute(m, { sock, args }) {
    const pesan = getPesan()

    try {
      const rawInput = Array.isArray(args) ? args.join(' ') : ''
      const separatorIndex = rawInput.lastIndexOf('|')

      let username = ''
      let template = null

      if (separatorIndex !== -1) {
        username = rawInput.slice(0, separatorIndex).trim()

        const templateInput = rawInput
          .slice(separatorIndex + 1)
          .trim()

        if (!/^\d+$/.test(templateInput)) {
          return m.reply(
            'Template harus berupa angka 1–13. Contoh: ffgirl lynxdecode|2'
          )
        }

        template = Number(templateInput)

        if (template < MIN_TEMPLATE || template > MAX_TEMPLATE) {
          return m.reply(
            'Template tidak tersedia. Pilih template dari 1 sampai 13.'
          )
        }
      } else {
        const parsed = parseInput(
          Array.isArray(args) ? args : []
        )

        username = parsed.username
        template = parsed.template
      }

      if (!username) {
        return m.reply([
          '୨ৎ *ELYRA FREE FIRE GIRL*',
          '',
          '› Buat gambar Free Fire Girl menggunakan username.',
          '',
          '› Pilih template:',
          '.ffgirl lynxdecode|2',
          '',
          '› Template tersedia: 1–13',
          '› Tanpa nomor template, bot memilih secara acak.',
          '',
          '© ELYRA-AI'
        ].join('\n'))
      }

      if (username.length > 100) {
        return m.reply('Username maksimal 100 karakter.')
      }

      if (/\r|\n/.test(username)) {
        return m.reply('Username tidak boleh mengandung baris baru.')
      }

      await react(sock, m, '🌱')
      await m.reply(pesan.wait)

      const response = await axios.get(API_URL, {
        params: {
          username,
          template
        },
        responseType: 'arraybuffer',
        timeout: TIMEOUT,
        maxContentLength: 20 * 1024 * 1024,
        validateStatus: status => status >= 200 && status < 300
      })

      const buffer = Buffer.from(response.data || [])
      const responseType = String(
        response.headers?.['content-type'] || ''
      ).toLowerCase()

      if (!buffer.length) {
        throw new Error('Server menghasilkan gambar kosong.')
      }

      const mime = getImageMime(buffer)

      if (!mime) {
        throw new Error(getApiError(buffer))
      }

      const caption = [
        '୨ৎ *ELYRA FREE FIRE GIRL*',
        '',
        `› Username: ${username}`,
        `› Template: ${template}`,
        `› Mode: ${separatorIndex === -1 && !/^\d+$/.test(rawInput.trim().split(/\s+/).at(-1) || '') ? 'Random' : 'Pilihan pengguna'}`,
        '',
        pesan.done,
        '',
        '© ELYRA-AI'
      ].join('\n')

      await m.reply({
        type: 'image',
        media: buffer,
        mimetype: mime,
        caption
      })

      await react(sock, m, '💐')
    } catch (error) {
      console.error(
        '[ELYRA FFGIRL]',
        error?.response?.status || '',
        error?.stack || error?.message || error
      )

      await react(sock, m, '🍂')

      return m.reply([
        pesan.error,
        '',
        `› ${error?.message || 'Gagal membuat gambar.'}`,
        '',
        '© ELYRA-AI'
      ].join('\n'))
    }
  }
}