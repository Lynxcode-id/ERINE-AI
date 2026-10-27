import { isWhitelistEnabled, listGroups, setWhitelistEnabled } from '../../lib/whitelist.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

function buildStatus(m) {
  const on = isWhitelistEnabled()
  const p = `${shown(m)}${m.command}`

  return [
    '🌷 *Whitelist*',
    '',
    'Kalau aktif, bot hanya berfungsi',
    'di grup yang sudah kamu whitelist.',
    '',
    `♡ Status : ${on ? 'aktif ✅' : 'nonaktif ❌'}`,
    `♡ Grup di whitelist : ${listGroups().length}`,
    '♡ Owner : selalu punya akses',
    '♡ Chat pribadi : tidak terpengaruh',
    '',
    `♡ ${p} on`,
    `♡ ${p} off`,
    `♡ ${shown(m)}addwl [idgc]`,
    `♡ ${shown(m)}delwl [idgc]`,
    `♡ ${shown(m)}listwl`,
    '',
    FOOTER
  ].join('\n')
}

export default {
  command: 'whitelist',
  alias: ['wl'],
  category: 'owner',
  description: `> Mengaktifkan / menonaktifkan mode whitelist. Saat aktif, bot hanya bisa dipakai di grup yang sudah di-whitelist owner. Grup lain mendapat info satu kali saja.

*Keterangan Format:*
> \`on\` = aktifkan.
> \`off\` = nonaktifkan.

contoh penggunaan:
> \`.whitelist on\`
> \`.whitelist off\``,
  help: 'on|off',
  onlyOwner: true,

  async execute(m, { args }) {
    const sub = String(args[0] || '').toLowerCase()

    if (!sub || sub === 'status') return m.reply(buildStatus(m))

    if (['on', 'aktif', 'true'].includes(sub)) {
      setWhitelistEnabled(true)
      const total = listGroups().length
      return m.reply([
        '✅ *Whitelist aktif*',
        '',
        `♡ Grup di whitelist : ${total}`,
        '♡ Grup lain tidak bisa memakai bot (info dikirim sekali saja).',
        total === 0 ? `⚠️ Belum ada grup di whitelist. Ketik ${shown(m)}addwl di grup yang ingin diaktifkan.` : '',
        '',
        FOOTER
      ].filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i !== a.length - 1)).join('\n'))
    }

    if (['off', 'mati', 'false'].includes(sub)) {
      setWhitelistEnabled(false)
      return m.reply('✅ Whitelist dinonaktifkan. Bot bisa dipakai di semua grup lagi.')
    }

    return m.reply(buildStatus(m))
  }
}
