import { FIRST_IS, buildWatermarkedSticker } from '../../lib/stickerwm.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

function buildUsage(m) {
  const order = FIRST_IS === 'packname' ? '<packname>|<author>' : '<author>|<packname>'
  const p = `${shown(m)}${m.command}`
  return [
    '🌷 *Sticker Watermark*',
    '',
    'Ganti packname dan author',
    'sticker kamu sesuka hati.',
    '',
    `♡ ${p} ${order}`,
    `♡ ${p} by|lynx`,
    '',
    '(reply sticker, foto, atau video)',
    '',
    FOOTER
  ].join('\n')
}

export default {
  command: 'swm',
  alias: ['wm', 'stickerwm'],
  category: 'sticker',
  tags: ['sticker'],
  description: `> Mengganti watermark (packname dan author) sticker. Sticker animasi tidak di-encode ulang, jadi kualitasnya tidak pecah. Foto dan video juga bisa dijadikan sticker.

*Keterangan Format:*
> \`<packname>|<author>\` = nama pack dan author, kosongkan untuk memakai bawaan.

contoh penggunaan:
> \`.swm by|lynx\` (reply sticker / foto / video)`,
  help: '<packname>|<author> (reply sticker / foto / video)',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    if (!m.quoted) return m.reply(buildUsage(m))

    let result
    try {
      result = await buildWatermarkedSticker(m, args)
    } catch (err) {
      console.error('[SWM] gagal:', err?.stack || err?.message || err)
      return m.reply(`❌ Gagal membuat sticker: ${err?.message || 'unknown'}`)
    }

    if (!result) return m.reply(buildUsage(m))

    await m.reply({
      type: 'sticker',
      media: result.sticker,
      mimetype: 'image/webp'
    })

    return m.reply([
      '✅ *Watermark terpasang*',
      `♡ Packname : ${result.meta.packName}`,
      `♡ Author : ${result.meta.author}`,
      `♡ Tipe : ${result.isAnimated ? 'animasi' : 'statis'}`
    ].join('\n'))
  }
}