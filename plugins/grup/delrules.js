import { deleteRules } from '../../database/dbrulesgrup.js'

export default {
  command: 'delrules',
  alias: ['hapusrules', 'resetrules'],
  category: 'grup',
  description: '> Menghapus rules (aturan) grup ini.',
  help: '',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m) {
    if (!deleteRules(m.chat)) return m.reply('Grup ini memang belum punya rules.')
    return m.reply('✅ Rules grup berhasil dihapus.\n\nwith love, elyra !!')
  }
}
