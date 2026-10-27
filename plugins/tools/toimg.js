
import sharp from 'sharp'

const FOOTER = 'with love, elyra !!'
const VIEW_ONCE_TYPES = ['imageMessage', 'videoMessage', 'audioMessage']

const shown = m => m.prefix || '.'

function buildUsage(m) {
  return [
    '🌷 *To Image*',
    '',
    'Ubah sticker atau pesan sekali lihat',
    'menjadi foto biasa.',
    '',
    `♡ ${shown(m)}${m.command} (reply sticker / foto sekali lihat)`,
    '',
    FOOTER
  ].join('\n')
}

function resolveMedia(quoted) {
  let type = quoted.type
  let content = quoted.full?.[type]

  if (/^viewOnceMessage/.test(type) && content?.message) {
    type = Object.keys(content.message).find(k => /Message$/.test(k))
    content = type ? content.message[type] : null
  }

  return { type, content }
}

export default {
  command: 'toimg',
  alias: ['toimage', 'topng'],
  category: 'tools',
  tags: ['tools'],
  description: `> Mengubah sticker menjadi foto, atau membuka pesan sekali lihat (view once) menjadi foto/video biasa.

contoh penggunaan:
> \`.toimg\` (reply sticker atau foto sekali lihat)`,
  help: '(reply sticker / foto sekali lihat)',
  typing: true,

  async execute(m, { sock }) {
    const quoted = m.quoted
    if (!quoted) return m.reply(buildUsage(m))

    if (quoted.type === 'stickerMessage') {
      try {
        const buffer = Buffer.from(await quoted.download())
        const png = await sharp(buffer).png().toBuffer()
        return m.reply({ type: 'image', media: png, caption: FOOTER })
      } catch (err) {
        console.error('[TOIMG] sticker gagal:', err?.stack || err?.message || err)
        return m.reply('❌ Gagal mengubah sticker menjadi foto.')
      }
    }

    const { type, content } = resolveMedia(quoted)

    if (VIEW_ONCE_TYPES.includes(type) && content) {
      if (!content.viewOnce) {
        return m.reply(type === 'imageMessage'
          ? 'Itu sudah foto biasa, bukan pesan sekali lihat.'
          : 'Itu bukan pesan sekali lihat.')
      }

      const msg = { ...content }
      delete msg.viewOnce

      try {
        return await sock.message.send(m.chat, { [type]: msg }, { quoted: m.raw })
      } catch (err) {
        console.error('[TOIMG] view once gagal:', err?.stack || err?.message || err)
        return m.reply('❌ Gagal membuka pesan sekali lihat. Mungkin media sudah kedaluwarsa.')
      }
    }

    return m.reply(buildUsage(m))
  }
}