import { getRules } from '../../database/dbrulesgrup.js'

export default {
  command: 'rules',
  alias: ['aturan', 'peraturan', 'rulesgrup'],
  category: 'grup',
  description: '> Menampilkan rules (aturan) grup ini.\n\nAdmin mengatur lewat: .setrules / .changerules / .delrules',
  help: '',
  onlyGroup: true,

  async execute(m) {
    const rules = getRules(m.chat)
    if (!rules) return m.reply(`Grup ini belum punya rules.\nAdmin bisa membuatnya: ${m.prefix}setrules <teks aturan>`)
    return m.reply(['🌷 *Rules Grup*', `♡ ${m.groupName}`, '', rules.text, '', 'with love, elyra !!'].join('\n'))
  }
}
