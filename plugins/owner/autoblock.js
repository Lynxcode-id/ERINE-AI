
import {
  SPEEDS,
  addSkip,
  disable,
  enable,
  getStatus,
  removeSkip,
  requestScan,
  setSpeed,
  unblock,
  unblockAll
} from '../../lib/autoblock.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

function fmtDuration(ms) {
  const s = Math.ceil(ms / 1000)
  if (s < 60) return `${s} detik`
  const min = Math.ceil(s / 60)
  return min < 60 ? `${min} menit` : `${Math.floor(min / 60)} jam ${min % 60} menit`
}

function buildStatus(m) {
  const st = getStatus()
  const p = `${shown(m)}${m.command}`

  const scan = st.scanPending
    ? `menunggu (${fmtDuration(st.scanInMs)} lagi)`
    : st.lastScanAt ? 'sudah berjalan' : '-'

  const lines = [
    '🌷 *Auto Block*',
    '',
    'Blokir member grup secara bertahap',
    'dan aman dari pembatasan WhatsApp.',
    '',
    `♡ Status : ${st.enabled ? 'aktif ✅' : 'nonaktif ❌'}`,
    `♡ Kecepatan : ${st.speed} (${st.batch} user / ${st.intervalMin} menit)`,
    `♡ Scan grup : ${scan}`,
    `♡ Antrean lama : ${st.queueExisting}`,
    `♡ Antrean baru masuk : ${st.queueNew}`,
    `♡ Sudah diblokir : ${st.blocked}`,
    `♡ Dikecualikan : ${st.skip}`,
    `♡ Gagal : ${st.failed}`
  ]
  if (st.pausedMs) lines.push(`♡ Dijeda : ${fmtDuration(st.pausedMs)} (rate limit)`)

  lines.push(
    '',
    `♡ ${p} on`,
    `♡ ${p} off`,
    `♡ ${p} speed <aman|normal|cepat>`,
    `♡ ${p} scan`,
    `♡ ${p} skip <nomor>`,
    `♡ ${p} unskip <nomor>`,
    `♡ ${p} unblock <nomor>`,
    `♡ ${p} unblockall`,
    `♡ ${shown(m)}listblock [halaman]`,
    '',
    FOOTER
  )
  return lines.join('\n')
}

function senderIds(m) {
  const key = m.raw?.key || {}
  return [m.sender, key.participant, key.participantAlt, key.remoteJid]
    .filter(v => v && !String(v).endsWith('@g.us'))
}

export default {
  command: 'autoblock',
  alias: ['ab', 'blokirall'],
  category: 'owner',
  description: `> Blokir semua member grup secara bertahap + otomatis memblokir member baru 2 menit setelah masuk grup.

*Keterangan Format:*
> \`on\` / \`off\` = aktif / nonaktifkan.
> \`speed <aman|normal|cepat>\` = kecepatan blokir.
> \`scan\` = scan ulang semua grup.
> \`skip\` / \`unskip <nomor>\` = kecualikan / batalkan pengecualian.
> \`unblock <nomor>\` / \`unblockall\` = buka blokir.

contoh penggunaan:
> \`.autoblock on\`
> \`.autoblock speed aman\``,
  help: 'on|off|speed|scan|skip|unskip|unblock|unblockall',
  onlyOwner: true,

  async execute(m, { sock, args }) {
    const sub = String(args[0] || '').toLowerCase()
    const arg = args[1]

    if (!sub || sub === 'status') return m.reply(buildStatus(m))

    if (sub === 'on') {
      const speed = SPEEDS[String(arg || '').toLowerCase()] ? String(arg).toLowerCase() : undefined
      const st = enable(senderIds(m), speed)
      return m.reply([
        '✅ *Auto Block diaktifkan*',
        '',
        `♡ Scan awal : ${fmtDuration(st.scanInMs)} lagi (tidak langsung memblokir)`,
        `♡ Kecepatan : ${st.speed} (${st.batch} user / ${st.intervalMin} menit)`,
        '♡ Member baru masuk : diblokir 2 menit setelah masuk',
        '♡ Jeda antar blokir : acak 10-25 detik',
        '♡ Owner & nomor bot tidak ikut diblokir',
        '',
        'Memblokir banyak akun sekaligus bisa memicu pembatasan WhatsApp. Pakai speed aman kalau ragu.',
        '',
        FOOTER
      ].join('\n'))
    }

    if (sub === 'off') {
      disable()
      return m.reply('✅ Auto Block dinonaktifkan. Antrean dikosongkan, daftar yang sudah diblokir tetap tersimpan.')
    }

    if (sub === 'speed') {
      const name = String(arg || '').toLowerCase()
      if (!setSpeed(name)) {
        const opts = Object.entries(SPEEDS)
          .map(([k, v]) => `> ${k} — ${v.batch} user / ${Math.round(v.intervalMs / 60000)} menit`)
          .join('\n')
        return m.reply(`Pilih salah satu:\n${opts}\n\nContoh: ${shown(m)}${m.command} speed aman`)
      }
      return m.reply(`✅ Kecepatan diubah ke *${name}*.`)
    }

    if (sub === 'scan') {
      const startAt = requestScan()
      return m.reply(`✅ Scan grup dijadwalkan ${fmtDuration(startAt - Date.now())} lagi. Member yang ditemukan masuk antrean dan diblokir bertahap (hanya jika Auto Block aktif).`)
    }

    if (sub === 'skip' || sub === 'unskip') {
      const target = arg || m.quoted?.sender
      const key = sub === 'skip' ? addSkip(target) : removeSkip(target)
      if (!key) {
        return m.reply(sub === 'skip'
          ? `Masukkan nomor atau reply pesan orangnya.\nContoh: ${shown(m)}${m.command} skip 6281234567890`
          : 'Nomor itu tidak ada di daftar pengecualian.')
      }
      return m.reply(`✅ ${key} ${sub === 'skip' ? 'dikecualikan dari blokir' : 'dihapus dari pengecualian'}.`)
    }

    if (sub === 'unblock') {
      const target = arg || m.quoted?.sender
      if (!target) return m.reply(`Masukkan nomor atau reply pesan orangnya.\nContoh: ${shown(m)}${m.command} unblock 6281234567890`)
      try {
        const key = await unblock(sock, target)
        return m.reply(`✅ ${key} dibuka blokirnya dan dikecualikan dari Auto Block.`)
      } catch (err) {
        console.error('[AUTOBLOCK] unblock gagal:', err?.message || err)
        return m.reply(`❌ Gagal membuka blokir: ${err?.message || err}`)
      }
    }

    if (sub === 'unblockall') {
      const { blocked } = getStatus()
      if (!blocked) return m.reply('Belum ada nomor yang diblokir oleh Auto Block.')

      await m.reply(`⏳ Membuka blokir ${blocked} nomor secara bertahap. Auto Block dinonaktifkan. Kabar menyusul kalau selesai.`)
      unblockAll(sock, ({ ok, fail }) => {
        m.reply(`✅ Selesai. Dibuka: ${ok}${fail ? `, gagal: ${fail}` : ''}.`).catch(() => {})
      }).catch(err => console.error('[AUTOBLOCK] unblockall error:', err?.message || err))
      return
    }

    return m.reply(buildStatus(m))
  }
}