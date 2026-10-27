
import { getStatus, listBlocked } from '../../lib/autoblock.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

const wita = (ts) => new Date(ts).toLocaleString('id-ID', {
  timeZone: 'Asia/Makassar',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
})

export default {
  command: 'listblock',
  alias: ['listblokir', 'daftarblokir', 'blocklist'],
  category: 'owner',
  description: `> Menampilkan daftar nomor yang diblokir oleh Auto Block.

*Keterangan Format:*
> \`[halaman]\` = nomor halaman, opsional.

contoh penggunaan:
> \`.listblock\`
> \`.listblock 2\``,
  help: '[halaman]',
  onlyOwner: true,

  async execute(m, { args }) {
    const page = Math.max(1, parseInt(args[0], 10) || 1)
    const { total, pages, page: current, items } = listBlocked(page)
    const st = getStatus()

    if (!total) {
      return m.reply([
        '🌷 *List Blokir*',
        '',
        'Belum ada nomor yang diblokir',
        'oleh Auto Block.',
        '',
        `♡ Antrean : ${st.queueExisting + st.queueNew}`,
        `♡ Status : ${st.enabled ? 'aktif ✅' : 'nonaktif ❌'}`,
        '',
        FOOTER
      ].join('\n'))
    }

    const start = (current - 1) * 15
    const rows = items.map((it, i) => {
      const who = it.number ? `+${it.number}` : it.key.replace('lid:', 'LID ')
      return [
        `*${start + i + 1}. ${who}*`,
        `♡ Grup : ${it.group}`,
        `♡ Waktu : ${wita(it.at)} WITA`,
        `♡ Sumber : ${it.source === 'new' ? 'member baru' : 'scan grup'}`
      ].join('\n')
    })

    return m.reply([
      '🌷 *List Blokir*',
      '',
      `♡ Total : ${total} nomor`,
      `♡ Antrean : ${st.queueExisting + st.queueNew}`,
      `♡ Halaman : ${current}/${pages}`,
      '',
      rows.join('\n\n'),
      '',
      current < pages ? `♡ ${shown(m)}${m.command} ${current + 1} untuk halaman berikutnya` : '',
      FOOTER
    ].filter(l => l !== '').join('\n'))
  }
}