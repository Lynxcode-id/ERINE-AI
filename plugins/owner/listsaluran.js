import { listChannels } from '../../lib/saluran.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

const wita = (ts) => new Date(ts).toLocaleString('id-ID', {
  timeZone: 'Asia/Makassar', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
})

export default {
  command: 'listsaluran',
  alias: ['listch', 'listchannel'],
  category: 'owner',
  description: `> Menampilkan daftar saluran yang di-add beserta mode-nya (biasa / owner).

contoh penggunaan:
> \`.listsaluran\``,
  help: '',
  onlyOwner: true,

  async execute(m) {
    const list = listChannels()
    const head = ['🌷 *List Saluran*', '', `♡ Total : ${list.length} saluran`, '']

    if (!list.length) {
      return m.reply([...head, 'Belum ada saluran.', `Ketik ${shown(m)}addsaluran <idch> untuk menambahkan.`, '', FOOTER].join('\n'))
    }

    const rows = list.map((c, i) => [
      `*${i + 1}. ${c.name || '(tanpa nama)'}*`,
      `♡ ID : ${c.jid}`,
      `♡ Mode : ${c.owner ? 'owner 👑' : 'biasa'}`,
      `♡ Ditambahkan : ${wita(c.addedAt)} WITA`
    ].join('\n'))

    return m.reply([
      ...head,
      rows.join('\n\n'),
      '',
      `♡ ${shown(m)}ownersaluran <nomor> — jadikan owner`,
      `♡ ${shown(m)}delsaluran <nomor> — hapus`,
      '',
      FOOTER
    ].join('\n'))
  }
}
