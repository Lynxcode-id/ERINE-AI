import { deleteWelcome, getWelcome } from '../../lib/welcome.js'

const shown = m => m.prefix || '.'

export default {
  command: 'delwelcome',
  alias: ['delwlc', 'hapuswelcome', 'offwelcome'],
  category: 'grup',
  tags: ['grup'],
  description: `> Menghapus welcome grup, member baru tidak akan disambut lagi.

contoh penggunaan:
> \`.delwelcome\``,
  help: '',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m) {
    if (!getWelcome(m.chat)) {
      return m.reply(`Welcome grup ini belum diatur. Pakai ${shown(m)}setwelcome <teks>.`)
    }

    deleteWelcome(m.chat)
    return m.reply('🗑️ Welcome grup ini dihapus. Member baru tidak akan disambut lagi.')
  }
}
