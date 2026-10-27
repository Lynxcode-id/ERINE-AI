export default {
  command: 'setmenu',
  category: 'owner',
  tags: ['owner'],
  description: '> Mengatur tampilan menu bot secara global.\n\ncontoh:\n> .setmenu 2',
  help: '<1|2>',
  onlyOwner: true,
  typing: true,

  async execute(m, { args }) {
    const style = parseInt(args[0])
    
    if (style !== 1 && style !== 2) {
      return m.reply('🌷 *Elyra Set Menu*\n- Pilih tipe menu yang valid!\n\n♡ .setmenu 1 = Menu Text (Link Preview bawaan)\n♡ .setmenu 2 = Menu List (Interactive Button)')
    }

    if (!globalThis.db) globalThis.db = {}
    if (!globalThis.db.data) globalThis.db.data = {}
    if (!globalThis.db.data.settings) globalThis.db.data.settings = {}

    globalThis.db.data.settings.setmenu = style

    await m.reply('🌷 *Elyra Set Menu*\n- Tampilan menu berhasil diubah ke tipe ' + style + '.')
  }
}