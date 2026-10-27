import { JOINREQ_FOOTER, decide, fetchRequests, selectTargets } from '../../lib/joinreq.js'

const ACTION = 'reject'
const shown = m => m.prefix || '.'

export default {
  command: 'reject',
  alias: ['tolak', 'rejectjoin'],
  category: 'grup',
  tags: ['grup'],
  description: `> Menolak permintaan join grup (grup dengan persetujuan admin). Urutan sesuai yang request paling awal.

*Keterangan Format:*
> \`<jumlah>\` = tolak sejumlah itu dari yang request pertama (1 = yang pertama).
> \`all\` = semua permintaan.
> \`<nomor>\` = tolak satu nomor tertentu.

contoh penggunaan:
> \`.reject 1\`
> \`.reject 5\`
> \`.reject all\``,
  help: '<jumlah|all|nomor>',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,

  async execute(m, { sock, args }) {
    const p = `${shown(m)}${m.command}`

    if (!args.length) {
      return m.reply([
        '🌷 *Reject Join*',
        '',
        'Menolak permintaan join, urut dari',
        'yang request paling awal.',
        '',
        `♡ ${p} 1 (yang pertama request)`,
        `♡ ${p} 5 (lima pertama)`,
        `♡ ${p} all (semua)`,
        `♡ ${p} 628123456789 (satu nomor)`,
        `♡ ${shown(m)}listreq (lihat daftar)`,
        '',
        JOINREQ_FOOTER
      ].join('\n'))
    }

    let requests
    try {
      requests = await fetchRequests(sock, m.chat)
    } catch (err) {
      console.error('[REJECT] gagal mengambil daftar:', err?.message || err)
      return m.reply('❌ Gagal mengambil daftar permintaan. Pastikan bot admin dan grup memakai persetujuan admin.')
    }

    const { targets, error } = selectTargets(requests, args[0])
    if (error) return m.reply(error)

    try {
      const done = await decide(sock, m.chat, ACTION, targets)
      return m.reply([
        '❌ *Permintaan Ditolak*',
        '',
        `♡ Jumlah : ${done}/${targets.length} orang`,
        `♡ Sisa menunggu : ${requests.length - done}`,
        '',
        JOINREQ_FOOTER
      ].join('\n'))
    } catch (err) {
      console.error('[REJECT] gagal:', err?.message || err)
      return m.reply(`❌ Gagal memproses permintaan: ${err?.message || 'unknown'}`)
    }
  }
}