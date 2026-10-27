import { setAfk, getAfk } from '../../database/dbafk.js'
import { idsOf } from '../../lib/extraGuards.js'

export default {
  command: 'afk',
  alias: ['awayfromkeyboard'],
  category: 'grup',
  description: `> Aktifkan mode AFK. Kalau ada yang me-reply atau men-tag kamu, bot memberi tahu bahwa kamu sedang AFK beserta alasannya. AFK otomatis berhenti begitu kamu chat lagi di grup.

contoh penggunaan:
> \`.afk tidur dulu\``,
  help: '[alasan]',
  onlyGroup: true,

  async execute(m, { args }) {
    const reason = args.join(' ').trim().slice(0, 200) || 'Tanpa alasan'
    const ids = idsOf(m.sender)
    const was = getAfk(ids)
    setAfk(ids, { reason, jid: m.sender, name: m.pushName })
    return m.reply([
      `💤 *AFK ${was ? 'Diperbarui' : 'Aktif'}*`,
      '',
      `♡ @${String(m.sender).split('@')[0]} sekarang AFK`,
      `♡ Alasan : ${reason}`,
      '',
      'Kirim pesan apa saja untuk keluar dari mode AFK.',
      'with love, elyra !!'
    ].join('\n'), { mentions: [m.sender] })
  }
}
