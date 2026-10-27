import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from '../../settings.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SKIP_ALWAYS = new Set(['.git'])
const DB_ENTRIES = ['node_modules', 'store', 'data', 'package-lock.json']
const BAR_LEN = 14
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const fmt = (bytes) => {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + ' GB'
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(2) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return bytes + ' B'
}

const bar = (ratio) => {
  const filled = Math.round(Math.min(Math.max(ratio, 0), 1) * BAR_LEN)
  return '▕' + '█'.repeat(filled) + '░'.repeat(BAR_LEN - filled) + '▏'
}

async function dirSize(p) {
  let st
  try { st = await fs.lstat(p) } catch { return { size: 0, files: 0 } }
  if (!st.isDirectory()) return { size: st.isSymbolicLink() ? 0 : st.size, files: st.isSymbolicLink() ? 0 : 1 }
  let size = 0
  let files = 0
  let list = []
  try { list = await fs.readdir(p) } catch { return { size, files } }
  for (let i = 0; i < list.length; i += 64) {
    const part = await Promise.all(list.slice(i, i + 64).map((n) => dirSize(path.join(p, n))))
    for (const r of part) { size += r.size; files += r.files }
  }
  return { size, files }
}

async function scan() {
  const names = (await fs.readdir(ROOT)).filter((n) => !SKIP_ALWAYS.has(n))
  const res = await Promise.all(names.map(async (n) => [n, await dirSize(path.join(ROOT, n))]))
  const total = { size: 0, files: 0 }
  const clean = { size: 0, files: 0 }
  const dbParts = []
  for (const [n, r] of res) {
    total.size += r.size; total.files += r.files
    if (DB_ENTRIES.includes(n)) { if (r.size > 0) dbParts.push([n, r.size]) }
    else { clean.size += r.size; clean.files += r.files }
  }
  dbParts.sort((a, b) => b[1] - a[1])
  return { total, clean, dbParts }
}

const render = (d, p) => {
  const { total, clean, dbParts } = d
  const t = total.size || 1
  const lines = [
    `🌷 *${config.botName} • Size Script*`,
    '',
    '╭─〔 📦 Keseluruhan 〕',
    `│ ${bar((total.size / t) * p)}`,
    `│ ${fmt(total.size * p)}  •  ${Math.round(total.files * p)} file`,
    '╰────────────────',
    '',
    '╭─〔 🧼 Tanpa Database 〕',
    `│ ${bar((clean.size / t) * p)}`,
    `│ ${fmt(clean.size * p)}  •  ${Math.round(clean.files * p)} file`,
    `│ ${Math.round((clean.size / t) * 100 * p)}% dari total`,
    '╰────────────────'
  ]
  if (dbParts.length) {
    lines.push('', '╭─〔 🗄️ Yang Tidak Dihitung 〕')
    for (const [n, s] of dbParts) lines.push(`│ ${n}`, `│ ${bar((s / t) * p)} ${fmt(s * p)}`)
    lines.push('╰────────────────')
  }
  lines.push('', '_Tanpa database = tanpa node_modules, store, data, package-lock.json_')
  return lines.join('\n')
}

export default {
  command: 'sizescript',
  alias: ['sizesc', 'scsize', 'ukuranscript'],
  category: 'bot',
  tags: ['bot'],
  description: '> Hitung ukuran script bot: keseluruhan dan tanpa database (node_modules, store, data, package-lock.json).\n\ncontoh:\n> `.sizescript`',
  typing: true,

  async execute(m, { sock }) {
    try {
      const data = await scan()
      const msg = await m.reply(render(data, 0))
      for (const p of [0.35, 0.7, 1]) {
        await sleep(600)
        await sock.message.send(m.chat, render(data, p), { editKey: { id: msg.id } }).catch(() => {})
      }
      await sock.sendReact(m.chat, '💐', m.id).catch(() => {})
    } catch (err) {
      console.error('[SIZESCRIPT]', err?.message || err)
      await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
      await m.reply('❌ Gagal menghitung ukuran script.')
    }
  }
}