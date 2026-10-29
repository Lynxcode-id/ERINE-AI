import { createJsonStore, digits } from './_store.js'

export const DAY = 86_400_000
export const AUTO_INTERVAL = 7 * DAY
const store = createJsonStore('sider', { groups: {} })
const all = () => store.data.groups

export function getGroup(jid) {
  return (all()[jid] ||= { since: Date.now(), last: {}, auto: false, lastAuto: 0, list: [], listAt: 0, pending: 0 })
}

export const peekGroup = (jid) => all()[jid] || null
export function touch(jid, ids, ts = Date.now()) {
  const g = getGroup(jid)
  let changed = false
  for (const id of ids) {
    const k = digits(id)
    if (!k) continue
    if ((g.last[k] || 0) < ts) { g.last[k] = ts; changed = true }
  }
  if (changed) store.save({ debounce: true })
}

export const lastActive = (g, ids) => Math.max(0, ...ids.map(digits).filter(Boolean).map(k => g.last[k] || 0))

export function setAuto(jid, on) {
  const g = getGroup(jid)
  g.auto = Boolean(on)
  if (on) g.lastAuto = Date.now()
  store.save()
  return g
}

export function saveList(jid, list, { auto = false } = {}) {
  const g = getGroup(jid)
  g.list = list
  g.listAt = Date.now()
  g.pending = 0
  if (auto) g.lastAuto = Date.now()
  store.save()
  return g
}

export function setPending(jid, ts) {
  getGroup(jid).pending = ts
  store.save()
}

export const listAutoGroups = () => Object.keys(all()).filter(jid => all()[jid].auto)

export function markAutoChecked(jid) {
  getGroup(jid).lastAuto = Date.now()
  store.save()
}
