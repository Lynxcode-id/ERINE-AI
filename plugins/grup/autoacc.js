import { JOINREQ_FOOTER, getMode, processGroup, setMode } from '../../lib/joinreq.js'

const MODE = 'accept'
const shown = m => m.prefix || '.'

export default {
  command: 'autoacc',
  alias: ['autoapprove', 'autoterima'],
  category: 'grup',
  tags: ['grup'],
  description: `> Otomatis menyetujui permintaan join grup. Berlaku untuk grup ini. Memengaruhi pengaturan auto acc/reject lainnya (hanya satu yang aktif).

*Keterangan Format:*
> \`on\` = aktifkan.
> \`off\` = nonaktifkan.

contoh penggunaan:
> \`.autoacc on\``,
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
        '🌷 *Auto Acc*',
        '',
        'Otomatis menyetujui permintaan join grup.',
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
        '✅ *Auto Acc aktif*',
        '',
        replaced ? '♡ Mode auto sebelumnya digantikan.' : '',
        '♡ Permintaan join disetujui otomatis (bertahap, ada jeda acak).',
        '♡ Bot harus jadi admin grup.',
        '',
        JOINREQ_FOOTER
      ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'))
    }

    if (['off', 'mati', 'false'].includes(sub)) {
      if (mode !== MODE) return m.reply('Auto Acc memang sedang nonaktif di grup ini.')
      setMode(m.chat, null)
      return m.reply('✅ Auto Acc dinonaktifkan.')
    }

    return m.reply(`Pakai ${p} on atau ${p} off`)
  }
}