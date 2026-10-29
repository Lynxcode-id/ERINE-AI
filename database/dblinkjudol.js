import { createJsonStore } from './_store.js'

export const MODES = ['delete', 'kick', 'both']
const store = createJsonStore('linkjudol', { groups: {} })
const entry = (jid) => (store.data.groups[jid] ||= { mode: 'off', defaults: true, list: [] })

export const getConfig = (jid) => store.data.groups[jid] || { mode: 'off', defaults: true, list: [] }
export const isActive = (jid) => (store.data.groups[jid]?.mode || 'off') !== 'off'

export function setMode(jid, mode) {
  entry(jid).mode = mode
  store.save()
  return getConfig(jid)
}

export function setDefaults(jid, on) {
  entry(jid).defaults = Boolean(on)
  store.save()
  return getConfig(jid)
}

export const getList = (jid) => [...getConfig(jid).list]

export function addItem(jid, item) {
  const e = entry(jid)
  if (e.list.includes(item)) return false
  e.list.push(item)
  store.save()
  return true
}

export function removeItem(jid, query) {
  const e = entry(jid)
  if (query === 'all') { const n = e.list.length; e.list = []; store.save(); return { removed: 'all', count: n } }
  const idx = /^\d+$/.test(query) ? Number(query) - 1 : e.list.indexOf(query)
  if (idx < 0 || idx >= e.list.length) return null
  const [gone] = e.list.splice(idx, 1)
  store.save()
  return { removed: gone, count: e.list.length }
}
