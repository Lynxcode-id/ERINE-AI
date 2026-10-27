import * as db from '../../database/dblinkjudol.js'

export default {
  command: 'listlinkjudol',
  alias: ['listjudol'],
  category: 'grup',
  description: '> Menampilkan daftar antilink judol & phishing buatan admin grup ini.',
  help: '',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m) {
    const list = db.getList(m.chat)
    if (!list.length) return m.reply('Daftar link judol/phishing grup ini masih kosong.\nDeteksi bawaan tetap jalan selama antilinkjudol aktif.')
    return m.reply(['🌷 *Link Judol/Phishing*', '', ...list.map((x, i) => `${i + 1}. ${x}`), '', 'with love, elyra !!'].join('\n'))
  }
}
