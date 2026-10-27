import { isWhitelistEnabled, listGroups } from '../../lib/whitelist.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

const wita = (ts) => new Date(ts).toLocaleString('id-ID', {
  timeZone: 'Asia/Makassar',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

export default {
  command: 'listwl',
  alias: ['listwhitelist', 'wllist'],
  category: 'owner',
  description: `> Menampilkan daftar grup yang ada di whitelist.

contoh penggunaan:
> \`.listwl\``,
  help: '',
  onlyOwner: true,

  async execute(m) {
    const list = listGroups()
    const on = isWhitelistEnabled()

    const head = [
      '🌷 *List Whitelist*',
      '',
      `♡ Status : ${on ? 'aktif ✅' : 'nonaktif ❌'}`,
      `♡ Total : ${list.length} grup`,
      ''
    ]

    if (!list.length) {
      return m.reply([
        ...head,
        'Belum ada grup di whitelist.',
        `Ketik ${shown(m)}addwl di grup yang ingin didaftarkan.`,
        '',
        FOOTER
      ].join('\n'))
    }

    const rows = list.map((g, i) => [
      `*${i + 1}. ${g.name || '(tanpa nama)'}*`,
      `♡ ID : ${g.jid}`,
      `♡ Ditambahkan : ${wita(g.addedAt)} WITA`
    ].join('\n'))

    return m.reply([
      ...head,
      rows.join('\n\n'),
      '',
      `♡ ${shown(m)}delwl <nomor> untuk menghapus`,
      '',
      FOOTER
    ].join('\n'))
  }
}
