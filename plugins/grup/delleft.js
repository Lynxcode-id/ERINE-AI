import { deleteLeft, getLeft } from '../../lib/welcome.js'

const shown = m => m.prefix || '.'

export default {
  command: 'delleft',
  alias: ['delbye', 'hapusleft', 'offleft'],
  category: 'grup',
  tags: ['grup'],
  description: `> Menghapus pesan left grup, member yang keluar tidak akan dikirimi pesan lagi.

contoh penggunaan:
> \`.delleft\``,
  help: '',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m) {
    if (!getLeft(m.chat)) {
      return m.reply(`Pesan left grup ini belum diatur. Pakai ${shown(m)}setleft <teks>.`)
    }

    deleteLeft(m.chat)
    return m.reply('🗑️ Pesan left grup ini dihapus. Member yang keluar tidak akan dikirimi pesan lagi.')
  }
}
