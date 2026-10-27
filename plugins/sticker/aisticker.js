import { useStarforge, withQuote } from '../../lib/function.js'
import { buildWatermarkedSticker } from '../../lib/stickerwm.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

function buildUsage(m) {
  return [
    '🌷 *AI Sticker*',
    '',
    'Kirim sticker dengan label AI',
    'dan watermark bawaan bot.',
    '',
    `♡ ${shown(m)}${m.command}`,
    '',
    '(reply sticker, foto, atau video)',
    '',
    FOOTER
  ].join('\n')
}

export default {
  command: 'aisticker',
  alias: ['aistiker', 'stickerai'],
  category: 'sticker',
  tags: ['sticker'],
  description: `> Mengirim sticker dengan tanda AI sticker (starforge). Watermark memakai bawaan dari settings.js (stickerPack dan stickerAuthor). Mau watermark kustom? Pakai .swm.

contoh penggunaan:
> \`.aisticker\` (reply sticker / foto / video)`,
  help: '(reply sticker / foto / video)',
  typing: true,
  wait: true,

  async execute(m, { sock }) {
    if (!m.quoted) return m.reply(buildUsage(m))

    let result
    try {
      result = await buildWatermarkedSticker(m, [])
    } catch (err) {
      console.error('[AISTICKER] gagal membuat sticker:', err?.stack || err?.message || err)
      return m.reply(`❌ Gagal membuat sticker: ${err?.message || 'unknown'}`)
    }

    if (!result) return m.reply(buildUsage(m))
    try {
      await useStarforge(sock)
      await withQuote(m, quote => sock.sendSticker(m.chat, result.sticker, quote, { isAiSticker: true }))
    } catch (err) {
      console.error('[AISTICKER] starforge gagal, kirim sticker biasa:', err?.stack || err?.message || err)
      await m.reply({ type: 'sticker', media: result.sticker, mimetype: 'image/webp' })
      return m.reply('⚠️ Label AI gagal dipasang, sticker dikirim tanpa label AI.')
    }

    return m.reply([
      '✅ *AI Sticker terkirim*',
      `♡ Packname : ${result.meta.packName}`,
      `♡ Author : ${result.meta.author}`
    ].join('\n'))
  }
}
