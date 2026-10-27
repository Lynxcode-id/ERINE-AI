import { extractTarget } from '../../lib/utils.js'
import { isAdminInGroup } from '../../db/groupCache.js'
import { idsOf } from '../../lib/extraGuards.js'
import { config } from '../../settings.js'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const rand = (a, b) => Math.floor(a + Math.random() * (b - a + 1))
const OWNER = String(config.owner || '').replace(/\D/g, '')
const num = (j) => String(j).split('@')[0].split(':')[0]

export default {
  command: 'sulap',
  alias: ['sulapkick', 'abrakadabra'],
  category: 'grup',
  description: `> Mengeluarkan member dengan gaya sulap: bot mengedit pesannya sendiri (abrakadabra... BOM DUAR!) lalu member itu hilang dari grup.

contoh penggunaan:
> \`.sulap @mention\`
> \`.sulap\` (reply pesan)`,
  help: '(@mention/reply)',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,

  async execute(m, { sock, args }) {
    const target = extractTarget(m, args)
    if (!target) return m.reply(`Format: ${m.prefix}${m.command} @mention atau reply pesan target.`)

    const creds = sock.getCredentials?.()
    const bots = [creds?.meJid, creds?.meLid].filter(Boolean).map(num)
    if (bots.includes(num(target))) return m.reply('Bot tidak mau menyulap dirinya sendiri 🎩')
    if (num(target) === OWNER) return m.reply('Owner kebal sulap 😎')
    if (idsOf(target).some(j => isAdminInGroup(m.chat, j))) return m.reply('Admin grup kebal sulap, turunkan jabatannya dulu 🎩')

    const tag = `@${num(target)}`
    const frames = [
      '🎩 *SULAP DIMULAI*\nSemua perhatian ke sini ya...',
      `✨ Abrakadabra...\nTarget malam ini: ${tag}`,
      '🪄 Sim salabim...',
      `🌀 ${tag} mulai menghilang...`,
      '💨💨💨 ...',
      '💥 *BOM! DUAR!!* 💥'
    ]

    const first = await m.reply(frames[0], { mentions: [target] })
    const editKey = { id: first?.id }
    const edit = (text) => sock.message.send(m.chat, text, { editKey, mentions: [target] })

    try {
      for (const frame of frames.slice(1)) {
        await sleep(rand(1100, 1700))
        await edit(frame).catch(() => { })
      }

      const res = await sock.group.removeParticipants(m.chat, [target])
      const row = Array.isArray(res) ? res[0] : null
      if (row && row.status !== 'ok') throw new Error(`status ${row.code ?? row.status}`)

      await sleep(rand(900, 1300))
      await edit(`💥 *BOM! DUAR!!* 💥\n\n🎩 ${tag} telah dikeluarkan dari grup.\nSulap berhasil! ✨\n\nwith love, elyra !!`).catch(() => { })
    } catch (err) {
      console.error('[SULAP]', err?.message || err)
      await edit(`🎩 Yah, sulapnya gagal... ${tag} masih di sini.\n(${err?.message || 'tidak diketahui'})`).catch(() => { })
    }
  }
}
