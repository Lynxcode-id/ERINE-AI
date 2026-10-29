import { createJsonStore } from './_store.js'

export const MAX_RULES_LENGTH = 3000
const store = createJsonStore('rulesgrup', { groups: {} })

export const getRules = (jid) => store.data.groups[jid] || null

export function setRules(jid, text, by = '') {
  const now = Date.now()
  const old = store.data.groups[jid]
  store.data.groups[jid] = { text, setBy: by || old?.setBy || '', setAt: old?.setAt || now, updatedAt: now }
  store.save()
  return store.data.groups[jid]
}

export function deleteRules(jid) {
  if (!store.data.groups[jid]) return false
  delete store.data.groups[jid]
  store.save()
  return true
}
