import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const JADIBOT_DIR = path.join(__dirname, 'jadibot')

const clean = (n) => String(n || '').replace(/\D/g, '')
const fileOf = (n) => path.join(JADIBOT_DIR, `${clean(n)}.json`)

export function getJadibot(number) {
  try {
    const f = fileOf(number)
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null
  } catch (err) {
    console.error('[DB:jadibot] gagal membaca', number, err?.message || err)
    return null
  }
}

export function saveJadibot(number, data) {
  const n = clean(number)
  if (!n) throw new Error('nomor jadibot tidak valid')
  fs.mkdirSync(JADIBOT_DIR, { recursive: true })
  const next = { ...(getJadibot(n) || { createdAt: Date.now() }), ...data, number: n, updatedAt: Date.now() }
  const tmp = `${fileOf(n)}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2))
  fs.renameSync(tmp, fileOf(n))
  return next
}

export function deleteJadibot(number) {
  try { fs.rmSync(fileOf(number), { force: true }); return true } catch { return false }
}

export function listJadibot() {
  try {
    fs.mkdirSync(JADIBOT_DIR, { recursive: true })
    return fs.readdirSync(JADIBOT_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => getJadibot(f.replace(/\.json$/, '')))
      .filter(Boolean)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
  } catch {
    return []
  }
}
