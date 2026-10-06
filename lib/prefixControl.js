export const DEFAULT_PREFIXES = [...new Set([...(global.opts?.['prefix'] || '-.')])]
const escapeRe = (s) => s.replace(/[|\\{}()[\]^$+*?.\-]/g, '\\$&')

export function getPrefixConfig() {
    const d = global.db?.data
    if (!d) return { list: [...DEFAULT_PREFIXES], noprefix: 'all' }
    if (!d.prefixConfig || typeof d.prefixConfig !== 'object') d.prefixConfig = { list: [...DEFAULT_PREFIXES], noprefix: 'all' }
    const cfg = d.prefixConfig
    if (!Array.isArray(cfg.list)) cfg.list = [...DEFAULT_PREFIXES]
    if (!['off', 'owner', 'all'].includes(cfg.noprefix)) cfg.noprefix = 'off'
    return cfg
}

export function applyPrefix() {
    const cfg = getPrefixConfig()
    let list = cfg.list
    if (!list.length && cfg.noprefix === 'off') list = DEFAULT_PREFIXES
    global.prefix = list.length
        ? new RegExp('^(?:' + [...list].sort((a, b) => b.length - a.length).map(escapeRe).join('|') + ')')
        : /^(?!)/
    global.db?.write?.()
    return global.prefix
}

export function noPrefixAllowed(plugin, isOwner) {
    if (plugin?.customPrefix) return false
    const mode = global.db?.data?.prefixConfig?.noprefix
    return mode === 'all' || (mode === 'owner' && !!isOwner)
}
