import { statusText } from '../../lib/tier.js'

export default {
  command: 'limit',
  alias: ['ceklimit', 'mylimit', 'tier'],
  category: 'info',
  description: '> Cek tier dan sisa limit harian kamu.\n\n*Tier:*\n> Free 20/hari • Premium 150/hari • VIP 500/hari',
  limit: false,
  async execute(m) {
    return m.reply(statusText(m), { mentions: [m.sender] })
  }
}
