import { JOINREQ_FOOTER, getMode, processGroup, setMode } from '../../lib/joinreq.js'

const MODE = 'reject'
const shown = m => m.prefix || '.'

export default {
  command: 'autoreject',
  alias: ['autotolak'],
  category: 'grup',
  tags: ['grup'],
  description: `> Otomatis menolak permintaan join grup. Berlaku untuk grup ini. Memengaruhi pengaturan auto acc/reject lainnya (hanya satu yang aktif).

*Keterangan Format:*
> \`on\` = aktifkan.
> \`off\` = nonaktifkan.

contoh penggunaan:
> \`.autoreject on\``,
  help: 'on|off',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,

  async execute(m, { sock, args }) {
    const sub = String(args[0] || '').toLowerCase()
    const mode = getMode(m.chat)
    const p = `${shown(m)}${m.command}`

    if (!sub || sub === 'status') {
      return m.reply([
        '🌷 *Auto Reject*',
        '',
        'Otomatis menolak permintaan join grup.',
        '',
        `♡ Status grup ini : ${mode === 'accept' ? 'auto acc aktif ✅' : mode === 'reject' ? 'auto reject aktif ✅' : 'nonaktif ❌'}`,
        '',
        `♡ ${p} on`,
        `♡ ${p} off`,
        '',
        JOINREQ_FOOTER
      ].join('\n'))
    }

    if (['on', 'aktif', 'true'].includes(sub)) {
      const replaced = mode && mode !== MODE
      setMode(m.chat, MODE)
      processGroup(sock, m.chat).catch(() => {})
      return m.reply([
        '✅ *Auto Reject aktif*',
        '',
        replaced ? '♡ Mode auto sebelumnya digantikan.' : '',
        '♡ Permintaan join ditolak otomatis (bertahap, ada jeda acak).',
        '♡ Bot harus jadi admin grup.',
        '',
        JOINREQ_FOOTER
      ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'))
    }

    if (['off', 'mati', 'false'].includes(sub)) {
      if (mode !== MODE) return m.reply('Auto Reject memang sedang nonaktif di grup ini.')
      setMode(m.chat, null)
      return m.reply('✅ Auto Reject dinonaktifkan.')
    }

    return m.reply(`Pakai ${p} on atau ${p} off`)
  }
}