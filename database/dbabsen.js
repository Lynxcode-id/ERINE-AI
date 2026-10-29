import { createJsonStore, digits } from './_store.js'

const store = createJsonStore('absen', { sessions: {} })
const s = () => store.data.sessions

export const getSession = (jid) => s()[jid] || null

export function startSession(jid, title, by) {
  s()[jid] = { title: title || 'Absen', startedBy: by, startedAt: Date.now(), entries: {} }
  store.save()
  return s()[jid]
}

export function endSession(jid) {
  const old = s()[jid]
  if (!old) return null
  delete s()[jid]
  store.save()
  return old
}

export function addEntry(jid, ids, { jid: userJid, name }) {
  const sess = s()[jid]
  if (!sess) return null
  const keys = [...new Set(ids.map(digits).filter(Boolean))]
  if (hasEntry(sess, keys)) return false
  sess.entries[keys[0]] = { ids: keys, jid: userJid, name: name || '', at: Date.now() }
  store.save()
  return true
}

export function hasEntry(sess, keys) {
  const wanted = new Set(keys.map(digits).filter(Boolean))
  return Object.values(sess?.entries || {}).some(e => e.ids.some(id => wanted.has(id)))
}
