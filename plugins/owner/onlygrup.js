import { getBotSettingValue, updateBotSetting } from '../../lib/groupAndBot.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

function buildStatus(m) {
  const on = Boolean(getBotSettingValue('onlygroup'))
  const ownerDm = Boolean(getBotSettingValue('onlygroup_owner'))
  const p = `${shown(m)}${m.command}`

  return [
    '🌷 *Only Group*',
    '',
    'Bot hanya merespon chat grup.',
    'Chat pribadi diabaikan total supaya',
    'lebih aman dari ban WhatsApp.',
    '',
    `♡ Status : ${on ? 'aktif ✅' : 'nonaktif ❌'}`,
    `♡ Chat pribadi : ${!on ? 'dilayani seperti biasa' : ownerDm ? 'hanya owner yang dilayani' : 'diabaikan semua'}`,
    '',
    `♡ ${p} on`,
    `♡ ${p} on owner`,
    `♡ ${p} off`,
    '',
    FOOTER
  ].join('\n')
}

export default {
  command: 'onlygroup',
  alias: ['grouponly', 'gconly', 'modegrup'],
  category: 'owner',
  description: `> Mode only group: kalau aktif, bot hanya merespon chat grup. Chat pribadi tidak diproses, tidak dibalas, dan tidak dicatat.

*Keterangan Format:*
> \`on\` = aktifkan, semua chat pribadi diabaikan.
> \`on owner\` = aktifkan, tapi owner masih boleh lewat chat pribadi.
> \`off\` = nonaktifkan.

contoh penggunaan:
> \`.onlygroup on\`
> \`.onlygroup on owner\``,
  help: 'on|on owner|off',
  onlyOwner: true,

  async execute(m, { args }) {
    const sub = String(args[0] || '').toLowerCase()
    const mode = String(args[1] || '').toLowerCase()

    if (!sub || sub === 'status') return m.reply(buildStatus(m))

    if (['on', 'true', 'aktif'].includes(sub)) {
      const ownerDm = ['owner', 'dm'].includes(mode)
      updateBotSetting('onlygroup', true)
      updateBotSetting('onlygroup_owner', ownerDm)
      return m.reply([
        '✅ *Only Group aktif*',
        '',
        ownerDm
          ? '♡ Chat pribadi selain owner diabaikan.'
          : '♡ Semua chat pribadi diabaikan (termasuk owner).',
        '♡ Chat grup tetap normal.',
        '',
        m.isGroup ? '' : 'Mulai sekarang chat pribadi ini tidak akan dibalas lagi. Atur lewat grup.',
        FOOTER
      ].filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i !== a.length - 1)).join('\n'))
    }

    if (['off', 'false', 'mati'].includes(sub)) {
      updateBotSetting('onlygroup', false)
      updateBotSetting('onlygroup_owner', false)
      return m.reply('✅ Only Group dinonaktifkan. Chat pribadi dilayani seperti biasa.')
    }

    return m.reply(buildStatus(m))
  }
}