import { BAN_FOOTER, formatRemaining, listBans } from '../../lib/ban.js'

const shown = m => m.prefix || '.'

export default {
  command: 'listban',
  alias: ['banlist', 'daftarban'],
  category: 'owner',
  description: `> Menampilkan daftar user yang sedang di-ban beserta sisa waktunya.

contoh penggunaan:
> \`.listban\``,
  help: '',
  onlyOwner: true,

  async execute(m) {
    const list = listBans()

    if (!list.length) {
      return m.reply(['🌷 *List Ban*', '', 'Tidak ada user yang sedang di-ban.', '', BAN_FOOTER].join('\n'))
    }

    const rows = list.map((b, i) => [
      `*${i + 1}. +${b.label}*`,
      `♡ Sisa : ${b.until ? `${formatRemaining(b.until - Date.now())} lagi` : 'permanen'}`,
      b.reason ? `♡ Alasan : ${b.reason}` : '',
      `♡ Diinfo : ${b.notified ? 'sudah' : 'belum'}`
    ].filter(Boolean).join('\n'))

    return m.reply([
      '🌷 *List Ban*',
      '',
      `♡ Total : ${list.length} user`,
      '',
      rows.join('\n\n'),
      '',
      `♡ ${shown(m)}unban <nomor> untuk membuka`,
      '',
      BAN_FOOTER
    ].join('\n'))
  }
}
