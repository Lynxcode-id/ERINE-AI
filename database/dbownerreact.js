import { createJsonStore } from './_store.js'

const store = createJsonStore('ownerreact', { enabled: true, emoji: '🦵' })

export const getConfig = () => ({ enabled: store.data.enabled, emoji: store.data.emoji })

export function setConfig(patch) {
  if (typeof patch.enabled === 'boolean') store.data.enabled = patch.enabled
  if (patch.emoji) store.data.emoji = patch.emoji
  store.save()
  return getConfig()
}
