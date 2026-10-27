import { getRules, setRules, MAX_RULES_LENGTH } from '../../database/dbrulesgrup.js'

const textOf = (m) => String(m.text || '').slice((m.prefix || '').length + String(m.command || '').length).trim() || String(m.quoted?.text || '').trim()

export default {
  command: 'changerules',
  alias: ['gantirules', 'editrules', 'updaterules'],
  category: 'grup',
  description: `> Mengganti rules (aturan) grup yang sudah ada.

contoh penggunaan:
> \`.changerules 1. No spam\\n2. Sopan\`
> \`.changerules\` (reply pesan berisi aturan baru)`,
  help: '<teks rules baru/reply>',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m) {
    const p = m.prefix
    if (!getRules(m.chat)) return m.reply(`Grup ini belum punya rules. Buat dulu pakai ${p}setrules <teks>`)
    const text = textOf(m)
    if (!text) return m.reply(`Format: ${p}${m.command} <teks aturan baru>\nAtau reply pesan berisi aturan.`)
    if (text.length > MAX_RULES_LENGTH) return m.reply(`Teks rules terlalu panjang (${text.length}/${MAX_RULES_LENGTH} karakter).`)
    setRules(m.chat, text, m.sender)
    return m.reply(['✅ *Rules berhasil diganti*', '', text, '', 'with love, elyra !!'].join('\n'))
  }
}
