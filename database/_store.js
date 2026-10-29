import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = path.join(__dirname, 'data')

const stores = new Set()
const DEBOUNCE_MS = 5000

export function createJsonStore(name, defaults = {}) {
  const file = path.join(DATA_DIR, `${name}.json`)
  let timer = null
  let state = load()

  function load() {
    try {
      if (fs.existsSync(file)) return { ...structuredClone(defaults), ...JSON.parse(fs.readFileSync(file, 'utf8')) }
    } catch (err) {
      console.error(`[DB:${name}] gagal membaca data, pakai default:`, err?.message || err)
    }
    return structuredClone(defaults)
  }

  function flush() {
    if (timer) { clearTimeout(timer); timer = null }
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      const tmp = `${file}.tmp`
      fs.writeFileSync(tmp, JSON.stringify(state))
      fs.renameSync(tmp, file)
    } catch (err) {
      console.error(`[DB:${name}] gagal menyimpan data:`, err?.message || err)
    }
  }

  function save({ debounce = false } = {}) {
    if (!debounce) return flush()
    if (timer) return
    timer = setTimeout(flush, DEBOUNCE_MS)
    timer.unref?.()
  }

  const store = { name, file, save, flush, get data() { return state } }
  stores.add(store)
  return store
}

process.once('exit', () => { for (const s of stores) s.flush() })

export const digits = (jid) => String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '')

export function createToggleDb(name) {
  const store = createJsonStore(name, { groups: {} })
  const g = () => store.data.groups
  return {
    store,
    isEnabled: (jid) => Boolean(g()[jid]?.enabled),
    setEnabled(jid, enabled, by = '') {
      g()[jid] = { ...(g()[jid] || {}), enabled: Boolean(enabled), at: Date.now(), by }
      store.save()
      return g()[jid]
    },
    listEnabled: () => Object.keys(g()).filter(jid => g()[jid]?.enabled)
  }
}

export function createWarnDb(name) {
  const base = createToggleDb(name)
  const g = () => base.store.data.groups
  return {
    ...base,
    getWarn: (jid, key) => g()[jid]?.warns?.[key] || 0,
    addWarn(jid, key) {
      const entry = (g()[jid] ||= { enabled: false })
      entry.warns ||= {}
      entry.warns[key] = (entry.warns[key] || 0) + 1
      base.store.save()
      return entry.warns[key]
    },
    resetWarn(jid, key) {
      if (g()[jid]?.warns?.[key] === undefined) return
      delete g()[jid].warns[key]
      base.store.save()
    },
    clearWarns(jid) {
      if (!g()[jid]?.warns) return
      g()[jid].warns = {}
      base.store.save()
    }
  }
}
