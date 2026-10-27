import { JOINREQ_FOOTER, fetchRequests, getMode } from '../../lib/joinreq.js'

const MAX_SHOWN = 30
const shown = m => m.prefix || '.'

function ago(ms) {
  const min = Math.max(0, Math.round((Date.now() - ms) / 60000))
  if (min < 1) return 'baru saja'
  if (min < 60) return `${min} menit lalu`
  const h = Math.floor(min / 60)
  return h < 24 ? `${h} jam lalu` : `${Math.floor(h / 24)} hari lalu`
}

export default {
  command: 'listreq',
  alias: ['reqlist', 'listrequest', 'requestjoin'],
  category: 'grup',
  tags: ['grup'],
  description: `> Menampilkan daftar permintaan join grup yang menunggu, urut dari yang request paling awal.

contoh penggunaan:
> \`.listreq\``,
  help: '',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,

  async execute(m, { sock }) {
    let requests
    try {
      requests = await fetchRequests(sock, m.chat)
    } catch (err) {
      console.error('[LISTREQ] gagal:', err?.message || err)
      return m.reply('❌ Gagal mengambil daftar permintaan. Pastikan bot admin dan grup memakai persetujuan admin.')
    }

    const mode = getMode(m.chat)
    const head = [
      '🌷 *List Request Join*',
      '',
      `♡ Menunggu : ${requests.length} orang`,
      `♡ Auto : ${mode === 'accept' ? 'acc ✅' : mode === 'reject' ? 'reject ✅' : 'nonaktif'}`,
      ''
    ]

    if (!requests.length) return m.reply([...head, 'Tidak ada permintaan join yang menunggu.', '', JOINREQ_FOOTER].join('\n'))

    const rows = requests.slice(0, MAX_SHOWN).map((r, i) =>
      `${i + 1}. +${r.number}${r.time ? ` — ${ago(r.time)}` : ''}`)

    const p = shown(m)
    return m.reply([
      ...head,
      ...rows,
      requests.length > MAX_SHOWN ? `…dan ${requests.length - MAX_SHOWN} lainnya` : '',
      '',
      `♡ ${p}acc 1 / ${p}acc all`,
      `♡ ${p}reject 1 / ${p}reject all`,
      '',
      JOINREQ_FOOTER
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'))
  }
}