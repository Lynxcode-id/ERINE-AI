import {
  convertMediaBuffer,
  downloadQuoted,
  formatBytes,
  inspectMedia,
  quotedFileName
} from '../../lib/mediaConvert.js'

const FOOTER = 'with love, elyra !!'

const AUDIO_EXTENSIONS = new Set([
  'mp3', 'm4a', 'aac', 'ogg', 'opus', 'oga',
  'wav', 'flac', 'amr', 'wma', 'aiff', 'mpga',
  'weba', '3gp'
])

const VIDEO_EXTENSIONS = new Set([
  'mp4', 'm4v', 'mov', 'webm', 'mkv', '3gp',
  'avi', 'mpeg', 'mpg', 'ts', 'mts', 'm2ts',
  'wmv', 'flv', 'ogv'
])

const AUDIO_ARGS = [
  '-map', '0:a:0',
  '-vn',
  '-c:a', 'libmp3lame',
  '-b:a', '320k',
  '-ar', '44100',
  '-map_metadata', '-1',
  '-id3v2_version', '3',
  '-f', 'mp3'
]

const VN_ARGS = [
  '-map', '0:a:0',
  '-vn',
  '-c:a', 'libopus',
  '-b:a', '64k',
  '-ar', '48000',
  '-ac', '1',
  '-application', 'voip',
  '-avoid_negative_ts', 'make_zero',
  '-map_metadata', '-1',
  '-f', 'ogg'
]

function getMode(args = []) {
  const options = args.map(value =>
    String(value).trim().toLowerCase()
  )

  if (options.some(value => ['vn', 'voice', 'ptt'].includes(value))) {
    return 'vn'
  }

  if (options.some(value => ['doc', 'document', 'file'].includes(value))) {
    return 'document'
  }

  return 'audio'
}

function getExtension(info, fileName) {
  const detected = String(info?.ext || '')
    .toLowerCase()
    .replace(/^\./, '')

  if (detected && detected !== 'bin') return detected

  const match = String(fileName || '').match(/\.([a-z0-9]{1,8})$/i)
  return match ? match[1].toLowerCase() : detected
}

function resolveMediaType(info, quoted, fileName) {
  const mime = String(info?.mime || '')
    .split(';')[0]
    .trim()
    .toLowerCase()

  const quotedMime = String(
    quoted?.mime || quoted?.mimetype || ''
  )
    .split(';')[0]
    .trim()
    .toLowerCase()

  const type = String(quoted?.type || '').toLowerCase()
  const ext = getExtension(info, fileName)

  const video =
    mime.startsWith('video/') ||
    quotedMime.startsWith('video/') ||
    type.includes('video') ||
    VIDEO_EXTENSIONS.has(ext)

  const audio =
    mime.startsWith('audio/') ||
    quotedMime.startsWith('audio/') ||
    type.includes('audio') ||
    AUDIO_EXTENSIONS.has(ext)

  if (video) {
    const videoMime = mime.startsWith('video/')
      ? mime
      : quotedMime.startsWith('video/')
        ? quotedMime
        : ({
            mp4: 'video/mp4',
            m4v: 'video/mp4',
            mov: 'video/quicktime',
            webm: 'video/webm',
            mkv: 'video/x-matroska',
            '3gp': 'video/3gpp',
            avi: 'video/x-msvideo',
            wmv: 'video/x-ms-wmv',
            flv: 'video/x-flv',
            ogv: 'video/ogg'
          }[ext] || 'video/mp4')

    return {
      kind: 'video',
      mime: videoMime,
      ext,
      name: fileName
    }
  }

  if (audio) {
    const audioMime = mime.startsWith('audio/')
      ? mime
      : quotedMime.startsWith('audio/')
        ? quotedMime
        : ({
            mp3: 'audio/mpeg',
            m4a: 'audio/mp4',
            aac: 'audio/aac',
            ogg: 'audio/ogg',
            opus: 'audio/opus',
            oga: 'audio/ogg',
            wav: 'audio/wav',
            flac: 'audio/flac',
            amr: 'audio/amr',
            mpga: 'audio/mpeg',
            weba: 'audio/webm',
            '3gp': 'audio/3gpp'
          }[ext] || 'application/octet-stream')

    return {
      kind: 'audio',
      mime: audioMime,
      ext,
      name: fileName
    }
  }

  return null
}

function isMp3(media) {
  return media.kind === 'audio' &&
    (
      media.mime === 'audio/mpeg' ||
      media.mime === 'audio/mp3' ||
      media.ext === 'mp3'
    )
}

function buildCaption(input, output, mode, originalIsMp3) {
  return [
    '୨ৎ *ELYRA • AUDIO CONVERTER*',
    '',
    `› File asal : ${formatBytes(input.length)}`,
    `› Hasil : ${mode === 'vn' ? 'Voice Note' : mode === 'document' ? `MP3 ${formatBytes(output.length)}` : `Audio MP3 ${formatBytes(output.length)}`}`,
    `› Encoding : ${originalIsMp3 && mode !== 'vn' ? 'MP3 asli, tanpa encode ulang' : mode === 'vn' ? 'Opus 64 kbps' : 'MP3 320 kbps'}`,
    '',
    FOOTER
  ].join('\n')
}

export default {
  command: 'tomp3',
  alias: ['toaudio', 'mp3'],
  category: 'tools',
  tags: ['tools'],
  description: `> Mengubah audio atau video menjadi audio MP3.
>
> Default: audio player WhatsApp.
> vn: kirim sebagai voice note.
> doc: kirim sebagai dokumen MP3.
>
> .tomp3 (reply audio / VN / video / dokumen media)
> .tomp3 vn
> .tomp3 doc`,
  help: '(reply audio/video/dokumen) [vn|doc]',
  typing: true,
  wait: true,

  async execute(m, { sock, args = [] }) {
    const quoted = m.quoted

    if (!quoted) {
      return m.reply([
        '୨ৎ *ELYRA • AUDIO CONVERTER*',
        '',
        'Reply audio, voice note, video, atau dokumen yang berisi media.',
        '',
        `› MP3 : ${(m.prefix || '.')}${m.command}`,
        `› Voice note : ${(m.prefix || '.')}${m.command} vn`,
        `› Dokumen MP3 : ${(m.prefix || '.')}${m.command} doc`,
        '',
        FOOTER
      ].join('\n'))
    }

    let input
    let info
    let originalName
    let media

    try {
      input = await downloadQuoted(quoted)
      originalName = quotedFileName(quoted)
      info = await inspectMedia(input, quoted)
      media = resolveMediaType(info, quoted, originalName)

      if (!media) {
        return m.reply([
          '୨ৎ *ELYRA • AUDIO CONVERTER*',
          '',
          'Pesan yang di-reply bukan audio atau video yang didukung.',
          'Format yang didukung mencakup MP3, M4A, OGG, WAV, MP4, MOV, MKV, dan WebM.',
          '',
          FOOTER
        ].join('\n'))
      }
    } catch (error) {
      console.error(
        '[TOMP3] Media download error:',
        error?.stack || error?.message || error
      )

      return m.reply(
        `Gagal mengunduh media: ${error?.message || 'Media tidak tersedia.'}`
      )
    }

    const mode = getMode(args)
    const baseName = originalName
      .replace(/\.[^.]+$/, '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .trim()
      .slice(0, 100) || 'audio'

    try {
      let output
      let mimetype
      let fileName
      let originalIsMp3 = false

      if (mode === 'vn') {
        output = await convertMediaBuffer(input, {
          inputMime: media.mime,
          inputName: originalName,
          outputExtension: 'ogg',
          outputArgs: VN_ARGS
        })

        mimetype = 'audio/ogg; codecs=opus'
      } else {
        originalIsMp3 = isMp3(media)

        output = originalIsMp3
          ? input
          : await convertMediaBuffer(input, {
              inputMime: media.mime,
              inputName: originalName,
              outputExtension: 'mp3',
              outputArgs: AUDIO_ARGS
            })

        mimetype = 'audio/mpeg'
        fileName = `${baseName}.mp3`
      }

      const caption = buildCaption(
        input,
        output,
        mode,
        originalIsMp3
      )

      if (mode === 'vn') {
        await sock.message.send(m.chat, {
          type: 'audio',
          media: output,
          mimetype,
          ptt: true
        }, { quote: m.raw })

        return
      }

      if (mode === 'document') {
        await sock.message.send(m.chat, {
          type: 'document',
          media: output,
          mimetype,
          fileName,
          caption
        }, { quote: m.raw })

        return
      }

      await sock.message.send(m.chat, {
        type: 'audio',
        media: output,
        mimetype,
        ptt: false
      }, { quote: m.raw })

      await m.reply(caption)
    } catch (error) {
      console.error(
        '[TOMP3] Conversion/send error:',
        error?.stack || error?.message || error
      )

      return m.reply([
        '୨ৎ *ELYRA • AUDIO CONVERTER*',
        '',
        'Gagal mengekstrak audio atau mengonversi media.',
        `› Pesan : ${error?.message || 'Coba media lain.'}`,
        '',
        'Pastikan video memiliki trek audio dan FFmpeg tersedia.',
        '',
        FOOTER
      ].join('\n'))
    }
  }
}