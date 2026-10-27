import { getEffectiveGroupSettings, updateGroupSettings } from '../../lib/groupAndBot.js'

export default {
  command: 'onlyadmin',
  alias: ['adminonly', 'botadmin'],
  category: 'owner',
  description: `> Jika aktif, di grup ini hanya admin (dan owner) yang bisa memakai bot. Member biasa diabaikan.

contoh penggunaan:
> \`.onlyadmin on\`
> \`.onlyadmin off\``,
  help: '<on/off>',
  onlyOwner: true,
  onlyGroup: true,

  async execute(m, { args }) {
    const v = args[0]?.toLowerCase()
    if (!['on', 'off', 'true', 'false'].includes(v)) {
      const now = getEffectiveGroupSettings(m.chat)?.onlyadmin
      return m.reply(`🌷 *Only Admin*\n\n♡ Status : ${now ? 'aktif' : 'nonaktif'}\n\nFormat: ${m.prefix}${m.command} <on/off>`)
    }
    const on = v === 'on' || v === 'true'
    updateGroupSettings(m.chat, { onlyadmin: on })
    return m.reply(on
      ? '✅ Only Admin *aktif*. Hanya admin yang bisa memakai bot di grup ini.'
      : '✅ Only Admin *nonaktif*. Semua member bisa memakai bot lagi.')
  }
}
