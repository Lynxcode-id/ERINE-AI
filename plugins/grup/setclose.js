import {
  AUTOCO_FOOTER,
  getAutoCo,
  nowInZone,
  parseTime,
  resolveZone,
  setTime,
  zoneLabel
} from '../../lib/autoco.js'

const KIND = 'close'
const shown = m => m.prefix || '.'

export default {
  command: 'setclose',
  alias: ['settutup', 'jamtutup'],
  category: 'grup',
  tags: ['grup'],
  description: `> Mengatur jam tutup otomatis grup ini. Jadwal per grup, zona waktu bawaan WITA. Aktifkan dengan \`.autoco on\`.

*Keterangan Format:*
> \`<jam>\` = format 24 jam (6:00, 06.00, 23:30).
> \`[zona]\` = opsional: wita (bawaan), wib, wit, atau nama zona (Asia/Jakarta).

contoh penggunaan:
> \`.setclose 23:00\`
> \`.setclose 23:00 wib\``,
  help: '<jam> [zona]',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m, { args }) {
    const p = `${shown(m)}${m.command}`

    if (!args.length) {
      return m.reply([
        '🌷 *Set Close*',
        '',
        'Atur jam tutup otomatis grup ini,',
        'zona waktu bawaan WITA.',
        '',
        `♡ ${p} 23:00`,
        `♡ ${p} 23:00 wib`,
        '',
        AUTOCO_FOOTER
      ].join('\n'))
    }

    const time = parseTime(args[0])
    if (!time) return m.reply(`Format jam tidak valid. Contoh: ${p} 23:00`)

    let zone
    if (args[1]) {
      zone = resolveZone(args[1])
      if (!zone) return m.reply('Zona waktu tidak dikenal. Pakai wita, wib, wit, atau nama zona seperti Asia/Jakarta.')
    }

    const current = getAutoCo(m.chat)
    const other = KIND === 'open' ? current?.close : current?.open
    if (other && other === time) return m.reply('Jam buka dan jam tutup tidak boleh sama.')

    const entry = setTime(m.chat, KIND, time, zone)
    const label = zoneLabel(entry.zone)

    return m.reply([
      `🔒 Jam tutup diatur: *${time} ${label}*`,
      '',
      `♡ Sekarang : ${nowInZone(entry.zone)} ${label}`,
      entry.open && entry.close
        ? (entry.enabled ? '♡ Auto close/open sudah aktif.' : `♡ Aktifkan dengan ${shown(m)}autoco on`)
        : `♡ Lengkapi dengan ${shown(m)}${KIND === 'open' ? 'setclose' : 'setopen'} <jam>`,
      '',
      AUTOCO_FOOTER
    ].join('\n'))
  }
}