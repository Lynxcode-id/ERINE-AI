import { getGroupMetadata } from '../../db/groupCache.js'
import * as sider from '../../database/dbsider.js'
import { botIdSet } from '../../lib/siderTools.js'

const CONFIRM_WINDOW = 2 * 60 * 1000
const GAP_MIN = 2500
const GAP_MAX = 6500
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const rand = (a, b) => Math.floor(a + Math.random() * (b - a + 1))
const digits = (j) => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '')

export default {
  command: 'kicksider',
  alias: ['kickallsider', 'depaksider'],
  category: 'grup',
  description: `> Mengeluarkan semua member yang masuk daftar hasil \`.ceksider\` atau autocheck sider terakhir. Admin tidak pernah dikeluarkan. Kick dilakukan satu per satu dengan jeda acak supaya aman dari spam.

*Langkah:*
> \`.kicksider\` = lihat pratinjau
> \`.kicksider ya\` = eksekusi (berlaku 2 menit)`,
  help: '[ya]',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,

  async execute(m, { sock, args }) {
    const p = m.prefix
    const g = sider.getGroup(m.chat)
    if (!g.list.length) return m.reply(`Belum ada daftar sider. Jalankan ${p}ceksider dulu (atau tunggu autocheck).`)

    const meta = await getGroupMetadata(m.chat, sock, { force: true })
    if (!meta?.participants) return m.reply('❌ Gagal mengambil data grup.')

    const bots = botIdSet(sock)
    const targets = []
    for (const item of g.list) {
      const want = digits(item.jid)
      const part = meta.participants.find(x => [x.jid, x.phoneNumber, x.phoneJid].filter(Boolean).some(j => digits(j) === want || digits(j) === digits(item.alt)))
      if (!part || part.isAdmin || part.isSuperAdmin) continue
      if ([part.jid, part.phoneNumber].filter(Boolean).some(j => bots.has(digits(j)))) continue
      targets.push({ primary: item.jid, alt: part.jid })
    }
    if (!targets.length) return m.reply('Tidak ada sider yang tersisa (semua sudah keluar / jadi admin).')

    const confirmed = args[0]?.toLowerCase() === 'ya' && g.pending && Date.now() - g.pending < CONFIRM_WINDOW
    if (!confirmed) {
      sider.setPending(m.chat, Date.now())
      const eta = Math.ceil((targets.length * ((GAP_MIN + GAP_MAX) / 2)) / 60000)
      return m.reply([
        '⚠️ *Konfirmasi Kick Sider*',
        '',
        `♡ Akan dikeluarkan : ${targets.length} member`,
        `♡ Daftar dari : ${new Date(g.listAt).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })}`,
        `♡ Perkiraan durasi : ±${eta} menit`,
        '',
        `Ketik *${p}kicksider ya* dalam 2 menit untuk lanjut.`
      ].join('\n'))
    }

    sider.setPending(m.chat, 0)
    await m.reply(`🚀 Memulai kick ${targets.length} sider, satu per satu dengan jeda acak...`)

    let ok = 0
    const failed = []
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i]
      let done = false
      for (const jid of [t.primary, t.alt].filter((v, idx, a) => v && a.indexOf(v) === idx)) {
        try {
          const res = await sock.group.removeParticipants(m.chat, [jid])
          const row = Array.isArray(res) ? res[0] : null
          if (!row || row.status === 'ok') { done = true; break }
        } catch {  }
      }
      if (done) ok++
      else failed.push(t.primary)
      if (i < targets.length - 1) await sleep(rand(GAP_MIN, GAP_MAX))
    }

    sider.saveList(m.chat, [])
    const lines = ['✅ *Kick Sider Selesai*', '', `♡ Berhasil : ${ok}`, `♡ Gagal : ${failed.length}`]
    if (failed.length) lines.push('', ...failed.slice(0, 20).map(j => `• @${digits(j)}`))
    lines.push('', 'with love, elyra !!')
    return m.reply(lines.join('\n'), { mentions: failed.slice(0, 20) })
  }
}
