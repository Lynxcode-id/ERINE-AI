import {
  AUTOCO_FOOTER,
  buildAutoCoStatus,
  getAutoCo,
  resetAutoCo,
  resolveZone,
  setEnabled,
  setZone,
  zoneLabel
} from '../../lib/autoco.js'

const shown = m => m.prefix || '.'

export default {
  command: 'autoco',
  alias: ['autoclose', 'autoopen', 'autogc'],
  category: 'grup',
  tags: ['grup'],
  description: `> Mengatur fitur auto close/open grup ini (jadwal diatur lewat setopen dan setclose).

*Keterangan Format:*
> \`on\` / \`off\` = aktifkan / nonaktifkan.
> \`reset\` = hapus semua jadwal grup ini.
> \`zone <wita|wib|wit|nama zona>\` = ganti zona waktu.
> Tanpa argumen = lihat status.

contoh penggunaan:
> \`.autoco on\`
> \`.autoco zone wib\``,
  help: 'on|off|reset|zone <zona>',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m, { args }) {
    const sub = String(args[0] || '').toLowerCase()
    const entry = getAutoCo(m.chat)

    if (!sub || sub === 'status') return m.reply(buildAutoCoStatus(m, entry))

    if (sub === 'on') {
      if (!entry?.open || !entry?.close) {
        return m.reply([
          '⚠️ Jadwal belum lengkap.',
          '',
          `♡ Jam buka : ${entry?.open || 'belum diatur'}  → ${shown(m)}setopen 06:00`,
          `♡ Jam tutup : ${entry?.close || 'belum diatur'}  → ${shown(m)}setclose 23:00`
        ].join('\n'))
      }
      const updated = setEnabled(m.chat, true)
      return m.reply([
        '✅ *Auto Close / Open aktif*',
        '',
        `♡ Buka : ${updated.open} ${zoneLabel(updated.zone)}`,
        `♡ Tutup : ${updated.close} ${zoneLabel(updated.zone)}`,
        '♡ Bot harus jadi admin grup agar bisa menjalankannya.',
        '',
        AUTOCO_FOOTER
      ].join('\n'))
    }

    if (sub === 'off') {
      if (!entry) return m.reply('Auto close/open belum pernah diatur di grup ini.')
      setEnabled(m.chat, false)
      return m.reply('✅ Auto close/open dinonaktifkan. Jadwal tetap tersimpan (aktifkan lagi dengan autoco on).')
    }

    if (sub === 'reset') {
      return m.reply(resetAutoCo(m.chat)
        ? '🗑️ Jadwal auto close/open grup ini dihapus dan fitur dinonaktifkan.'
        : 'Belum ada jadwal yang diatur di grup ini.')
    }

    if (sub === 'zone' || sub === 'zona') {
      const zone = resolveZone(args[1])
      if (!zone) return m.reply(`Zona tidak dikenal. Contoh: ${shown(m)}${m.command} zone wib (pilihan: wita, wib, wit, atau nama zona seperti Asia/Jakarta)`)
      const updated = setZone(m.chat, zone)
      return m.reply(`✅ Zona waktu grup ini: *${zoneLabel(updated.zone)}* (${updated.zone})`)
    }

    return m.reply(buildAutoCoStatus(m, entry))
  }
}