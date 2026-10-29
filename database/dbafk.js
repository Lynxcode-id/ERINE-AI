import { createJsonStore, digits } from './_store.js'

const store = createJsonStore('afk', { users: {} })
const u = () => store.data.users
const keysOf = (ids) => [...new Set(ids.map(digits).filter(Boolean))]

export function getAfk(ids) {
  const wanted = new Set(keysOf(ids))
  if (!wanted.size || !Object.keys(u()).length) return null
  for (const rec of Object.values(u())) if (rec.ids.some(id => wanted.has(id))) return rec
  return null
}

export function setAfk(ids, { reason, jid, name }) {
  const keys = keysOf(ids)
  if (!keys.length) return null
  removeAfk(keys)
  u()[keys[0]] = { ids: keys, reason: reason || 'Tanpa alasan', since: Date.now(), jid, name: name || '' }
  store.save()
  return u()[keys[0]]
}

export function removeAfk(ids) {
  const rec = getAfk(ids)
  if (!rec) return null
  delete u()[rec.ids[0]]
  store.save()
  return rec
}

export const countAfk = () => Object.keys(u()).length
