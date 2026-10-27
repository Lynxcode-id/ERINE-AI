import { getRules, setRules, MAX_RULES_LENGTH } from '../../database/dbrulesgrup.js'

const textOf = (m) => String(m.text || '').slice((m.prefix || '').length + String(m.command || '').length).trim() || String(m.quoted?.text || '').trim()

export default {
  command: 'setrules',
  alias: ['addrules', 'setaturan'],
  category: 'grup',
  description: `> Mengatur rules (aturan) grup. Bisa multi-baris atau reply pesan teks.

contoh penggunaan:
> \`.setrules 1. No spam\\n2. Sopan\`
> \`.setrules\` (reply pesan berisi aturan)

Sudah pernah diatur? Pakai \`.changerules\`.`,
  help: '<teks rules/reply>',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m) {
    const text = textOf(m)
    const p = m.prefix
    if (!text) return m.reply(`Format: ${p}${m.command} <teks aturan>\nAtau reply pesan berisi aturan.`)

    const current = getRules(m.chat)
    if (current) {
      return m.reply([
        '⚠️ Rules grup ini sudah diatur.',
        '',
        'Teks saat ini:',
        current.text,
        '',
        `Untuk menggantinya pakai ${p}changerules <teks baru>`,
        `Untuk menghapus pakai ${p}delrules`
      ].join('\n'))
    }

    if (text.length > MAX_RULES_LENGTH) return m.reply(`Teks rules terlalu panjang (${text.length}/${MAX_RULES_LENGTH} karakter).`)
    setRules(m.chat, text, m.sender)
    return m.reply(['✅ *Rules berhasil diatur*', '', text, '', `♡ Lihat kapan saja: ${p}rules`, '', 'with love, elyra !!'].join('\n'))
  }
}
