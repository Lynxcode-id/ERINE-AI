import { getConfig, setConfig } from '../../database/dbownerreact.js'

export default {
  command: 'ownerreact',
  alias: ['reactowner'],
  category: 'owner',
  description: `> Bot otomatis me-react pesan owner di grup dengan emoji (default 🦵).

contoh penggunaan:
> \`.ownerreact on\`
> \`.ownerreact off\`
> \`.ownerreact 🦵\` (ganti emoji)`,
  help: '<on/off/emoji>',
  onlyOwner: true,

  async execute(m, { args }) {
    const v = args[0]
    const cfg = getConfig()
    if (!v) return m.reply(`🌷 *Owner React*\n\n♡ Status : ${cfg.enabled ? 'ON' : 'OFF'}\n♡ Emoji : ${cfg.emoji}\n\nFormat: ${m.prefix}ownerreact <on/off/emoji>`)
    if (['on', 'off'].includes(v.toLowerCase())) {
      const next = setConfig({ enabled: v.toLowerCase() === 'on' })
      return m.reply(`✅ Owner react ${next.enabled ? 'diaktifkan' : 'dinonaktifkan'} (${next.emoji}).`)
    }
    if (/^[a-z0-9\s]+$/i.test(v) || [...v].length > 4) return m.reply('Kasih satu emoji ya, atau on/off.')
    const next = setConfig({ emoji: v, enabled: true })
    return m.reply(`✅ Emoji owner react diganti ke ${next.emoji} (aktif).`)
  }
}
