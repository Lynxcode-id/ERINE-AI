import { JOINREQ_FOOTER, decide, fetchRequests, selectTargets } from '../../lib/joinreq.js'

const ACTION = 'approve'
const shown = m => m.prefix || '.'

export default {
  command: 'acc',
  alias: ['approve', 'terima', 'accjoin'],
  category: 'grup',
  tags: ['grup'],
  description: `> Menyetujui permintaan join grup (grup dengan persetujuan admin). Urutan sesuai yang request paling awal.

*Keterangan Format:*
> \`<jumlah>\` = setujui sejumlah itu dari yang request pertama (1 = yang pertama).
> \`all\` = semua permintaan.
> \`<nomor>\` = setujui satu nomor tertentu.

contoh penggunaan:
> \`.acc 1\`
> \`.acc 5\`
> \`.acc all\``,
  help: '<jumlah|all|nomor>',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,

  async execute(m, { sock, args }) {
    const p = `${shown(m)}${m.command}`

    if (!args.length) {
      return m.reply([
        '🌷 *Acc Join*',
        '',
        'Menyetujui permintaan join, urut dari',
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
      console.error('[ACC] gagal mengambil daftar:', err?.message || err)
      return m.reply('❌ Gagal mengambil daftar permintaan. Pastikan bot admin dan grup memakai persetujuan admin.')
    }

    const { targets, error } = selectTargets(requests, args[0])
    if (error) return m.reply(error)

    try {
      const done = await decide(sock, m.chat, ACTION, targets)
      return m.reply([
        '✅ *Permintaan Disetujui*',
        '',
        `♡ Jumlah : ${done}/${targets.length} orang`,
        `♡ Sisa menunggu : ${requests.length - done}`,
        '',
        JOINREQ_FOOTER
      ].join('\n'))
    } catch (err) {
      console.error('[ACC] gagal:', err?.message || err)
      return m.reply(`❌ Gagal memproses permintaan: ${err?.message || 'unknown'}`)
    }
  }
}