import decodeAudio from 'audio-decode'
import { convertMediaBuffer } from '../../lib/mediaConvert.js'
import {
  listChannels,
  normalizeChannelJid
} from '../../lib/saluran.js'

const FOOTER = 'with love, elyra !!'
const MAX_MEDIA_BYTES = 50 * 1024 * 1024
const GAP_MS = 1500
const WAVEFORM_POINTS = 64

const shown = m => m.prefix || '.'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const TYPE_LABEL = {
  text: 'teks',
  image: 'foto',
  video: 'video',
  audio: 'audio',
  vn: 'voice note'
}


function splitTargets(text, channels) {
  const match = /\|\s*([^|]+)$/.exec(text)

  if (!match) {
    return {
      text,
      targets: null
    }
  }

  const tokens = match[1]
    .split(/[,\s]+/)
    .filter(Boolean)

  const parsed = tokens.map(token => {
    if (/^\d{1,4}$/.test(token)) {
      return {
        index: Number(token)
      }
    }

    return {
      jid: normalizeChannelJid(token)
    }
  })

  if (
    !tokens.length ||
    parsed.some(item => !item.index && !item.jid)
  ) {
    return {
      text,
      targets: null
    }
  }

  const targets = []
  const invalid = []

  parsed.forEach((item, index) => {
    const jid = item.index
      ? channels[item.index - 1]?.jid
      : channels.find(channel =>
          channel.jid === item.jid
        )?.jid

    if (jid) {
      targets.push(jid)
    } else {
      invalid.push(tokens[index])
    }
  })

  return {
    text: text.slice(0, match.index).trim(),
    targets: [...new Set(targets)],
    invalid
  }
}


async function generateAudioMetadata(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error(
      'Buffer audio kosong atau tidak valid.'
    )
  }


  const decoded = await decodeAudio(buffer)

  let channels = []

  if (Array.isArray(decoded?.channelData)) {
    channels = decoded.channelData
  } else if (
    ArrayBuffer.isView(decoded?.channelData)
  ) {
    channels = [decoded.channelData]
  } else if (
    typeof decoded?.getChannelData === 'function' &&
    decoded?.numberOfChannels
  ) {
    channels = Array.from(
      {
        length: decoded.numberOfChannels
      },
      (_, index) => decoded.getChannelData(index)
    )
  }

  channels = channels.filter(channel =>
    channel &&
    typeof channel.length === 'number' &&
    channel.length > 0
  )

  const sampleRate = Number(decoded?.sampleRate)

  if (!channels.length || sampleRate <= 0) {
    throw new Error(
      'Gagal membaca sampel audio atau sample rate.'
    )
  }

  const sampleCount = Math.max(
    ...channels.map(channel => channel.length)
  )

  if (!sampleCount) {
    throw new Error(
      'Audio tidak memiliki sampel yang dapat diproses.'
    )
  }

  const amplitudes = new Float64Array(
    WAVEFORM_POINTS
  )

  const blockSize = sampleCount / WAVEFORM_POINTS

  let maxAmplitude = 0


  for (let i = 0; i < WAVEFORM_POINTS; i++) {
    const start = Math.floor(i * blockSize)

    const end = Math.min(
      sampleCount,
      Math.max(
        start + 1,
        Math.floor((i + 1) * blockSize)
      )
    )

    let sum = 0
    let count = 0

    for (const channel of channels) {
      for (
        let sampleIndex = start;
        sampleIndex < end &&
        sampleIndex < channel.length;
        sampleIndex++
      ) {
        const value = Number(channel[sampleIndex])

        if (Number.isFinite(value)) {
          sum += Math.abs(value)
          count++
        }
      }
    }

    const average = count
      ? sum / count
      : 0

    amplitudes[i] = average

    if (average > maxAmplitude) {
      maxAmplitude = average
    }
  }


  const waveform = new Uint8Array(
    WAVEFORM_POINTS
  )

  if (maxAmplitude > 0) {
    for (let i = 0; i < WAVEFORM_POINTS; i++) {
      const normalized =
        amplitudes[i] / maxAmplitude

      waveform[i] = Math.max(
        0,
        Math.min(
          100,
          Math.round(normalized * 100)
        )
      )
    }
  }

  const decodedDuration = Number(decoded?.duration)

  const duration = decodedDuration > 0
    ? decodedDuration
    : sampleCount / sampleRate

  return {
    waveform,
    seconds: Math.max(
      1,
      Math.round(duration)
    )
  }
}


async function prepareVoiceNote(buffer, inputMime) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error(
      'Media audio kosong atau tidak valid.'
    )
  }

  let media = buffer

  const normalizedMime = String(
    inputMime || ''
  )
    .split(';', 1)[0]
    .trim()
    .toLowerCase()


  const isOggOpus =
    normalizedMime === 'audio/ogg' &&
    /opus/i.test(inputMime || '')

  if (!isOggOpus) {
    media = await convertMediaBuffer(buffer, {
      inputMime: inputMime || 'audio/mpeg',

      outputExtension: 'ogg',

      outputArgs: [
        '-vn',
        '-map_metadata',
        '-1',
        '-c:a',
        'libopus',
        '-b:a',
        '48k',
        '-ar',
        '48000',
        '-ac',
        '1'
      ]
    })
  }

  if (!media.length) {
    throw new Error(
      'Hasil konversi audio kosong.'
    )
  }

  if (media.length > MAX_MEDIA_BYTES) {
    throw new Error(
      'Audio hasil konversi melebihi batas 50 MB.'
    )
  }


  const metadata = await generateAudioMetadata(media)

  return {
    media,
    mimetype: 'audio/ogg; codecs=opus',
    ptt: true,
    waveform: metadata.waveform,
    seconds: metadata.seconds
  }
}


async function buildPayloads(m, text) {
  const quoted = m.quoted
  const type = quoted?.type

  if (
    quoted &&
    [
      'imageMessage',
      'videoMessage',
      'audioMessage'
    ].includes(type)
  ) {
    const content = quoted.full?.[type] || {}

    const raw = await quoted.download()

    let media = Buffer.isBuffer(raw)
      ? raw
      : Buffer.from(raw || [])

    if (!media.length) {
      throw new Error(
        'Gagal mengunduh media yang di-reply.'
      )
    }

    if (media.length > MAX_MEDIA_BYTES) {
      throw new Error(
        'Ukuran media terlalu besar (maksimal 50 MB).'
      )
    }

    if (type === 'imageMessage') {
      return {
        kind: 'image',

        payloads: [
          {
            type: 'image',
            media,
            mimetype:
              content.mimetype || 'image/jpeg',

            ...(text
              ? { caption: text }
              : {})
          }
        ]
      }
    }

    if (type === 'videoMessage') {
      return {
        kind: 'video',

        payloads: [
          {
            type: 'video',
            media,
            mimetype:
              content.mimetype || 'video/mp4',

            ...(content.gifPlayback
              ? { gifPlayback: true }
              : {}),

            ...(text
              ? { caption: text }
              : {})
          }
        ]
      }
    }


    const prepared = await prepareVoiceNote(
      media,
      content.mimetype || 'audio/mpeg'
    )

    const payloads = []


    if (text) {
      payloads.push({
        type: 'text',
        content: text
      })
    }

    payloads.push({
      type: 'audio',
      media: prepared.media,
      mimetype: prepared.mimetype,
      ptt: true,

      waveform: prepared.waveform,
      seconds: prepared.seconds
    })

    return {
      kind: 'vn',
      payloads
    }
  }

  if (!text) {
    return null
  }

  return {
    kind: 'text',

    payloads: [
      {
        type: 'text',
        content: text
      }
    ]
  }
}


async function sendChannelPayload(
  sock,
  jid,
  payload
) {
  if (payload.type === 'text') {
    return sock.message.send(
      jid,
      payload.content,
      {}
    )
  }

  if (
    payload.type === 'audio' &&
    payload.ptt === true
  ) {

    if (typeof sock.sendVoiceNote === 'function') {
      return sock.sendVoiceNote(
        jid,
        payload.media,
        {
          mimetype: payload.mimetype,
          waveform: payload.waveform,
          seconds: payload.seconds
        }
      )
    }

    return sock.message.send(
      jid,
      payload,
      {}
    )
  }

  return sock.message.send(
    jid,
    payload,
    {}
  )
}


export default {
  command: 'msgch',

  alias: [
    'kirimch',
    'postch',
    'sendch'
  ],

  category: 'owner',

  description: `> Mengirim pesan ke saluran yang sudah di-add (addsaluran).

Bisa mengirim teks, foto, video, audio, atau voice note.

*Keterangan Format:*
> <teks> = isi pesan.
> Reply foto = kirim foto.
> Reply video = kirim video.
> Reply audio biasa = otomatis dikonversi menjadi voice note dengan waveform.
> Reply voice note = kirim voice note dengan metadata waveform.
> | <nomor,nomor> = pilih saluran tertentu.
> Tanpa pilihan saluran = kirim ke semua saluran.

Contoh:
> \`.msgch halo semua\`
> \`.msgch halo | 1,2\` (reply foto)
> \`.msgch | 1,2\` (reply audio)
> \`.msgch -vn\` (reply audio)

© ERINE-AI`,

  help: '<teks> [| nomor] (reply media)',

  onlyOwner: true,

  wait: true,

  async execute(m, { sock }) {
    const prefix = shown(m)

    const command = `${prefix}${m.command}`

    const channels = listChannels()


    let text = String(m.text || '')
      .slice(
        (m.prefix || '').length +
        String(m.command || '').length
      )
      .trim()


    text = text
      .replace(/(^|\s)-vn(?=\s|$)/gi, ' ')
      .trim()

    const split = splitTargets(
      text,
      channels
    )

    text = split.text


    if (!channels.length) {
      return m.reply(
        'Belum ada saluran.\n\n' +
        `Tambahkan dahulu dengan ${prefix}addsaluran <idch>.`
      )
    }

    if (split.invalid?.length) {
      return m.reply(
        '❌ Tujuan saluran tidak ditemukan: ' +
        `${split.invalid.join(', ')}.\n\n` +
        `Cek daftar menggunakan ${prefix}listsaluran.`
      )
    }

    const targets = split.targets?.length
      ? split.targets
      : channels.map(channel => channel.jid)


    let built

    try {
      built = await buildPayloads(
        m,
        text
      )
    } catch (error) {
      console.error(
        '[MSGCH] Gagal menyiapkan media:',
        error?.stack || error
      )

      return m.reply(
        '❌ Gagal menyiapkan media.\n\n' +
        `› Detail: ${String(
          error?.message || error
        ).slice(0, 250)}`
      )
    }


    if (!built) {
      return m.reply([
        '🌷 *Kirim ke Saluran*',
        '',
        'Kirim teks, foto, video, audio, atau voice note',
        'ke saluran yang sudah ditambahkan.',
        '',
        `♡ ${command} halo semua`,
        `♡ ${command} halo | 1,2`,
        `♡ ${command} (reply foto/video)`,
        `♡ ${command} (reply audio → otomatis VN)`,
        `♡ ${command} -vn (reply audio)`,
        '',
        FOOTER
      ].join('\n'))
    }


    const results = []

    for (
      let i = 0;
      i < targets.length;
      i++
    ) {
      const jid = targets[i]

      const name =
        channels.find(channel =>
          channel.jid === jid
        )?.name || jid

      try {
        for (const payload of built.payloads) {
          await sendChannelPayload(
            sock,
            jid,
            payload
          )
        }

        results.push(
          `✅ ${name}`
        )
      } catch (error) {
        console.error(
          `[MSGCH] Gagal mengirim ke ${jid}:`,
          error?.stack || error
        )

        results.push(
          `❌ ${name} — ${String(
            error?.message || error
          ).slice(0, 100)}`
        )
      }

      if (i < targets.length - 1) {
        await sleep(GAP_MS)
      }
    }


    const successCount = results.filter(
      result => result.startsWith('✅')
    ).length

    const report = [
      '🌷 *Kirim ke Saluran*',
      '',
      `♡ Tipe : ${TYPE_LABEL[built.kind] || built.kind}`,
      `♡ Terkirim : ${successCount}/${targets.length} saluran`,
      '',

      ...results,

      successCount < targets.length
        ? '\nPastikan bot memiliki izin untuk mengirim pesan ke saluran.'
        : '',

      '',
      FOOTER
    ]
      .filter((line, index, array) =>
        line !== '' ||
        array[index - 1] !== ''
      )
      .join('\n')

    return m.reply(report)
  }
}