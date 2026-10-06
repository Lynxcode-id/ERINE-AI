import fs from 'node:fs'
import path from 'node:path'

const DB_PATH = process.env.RPG_DB_PATH || './rpgdatabase.json'
const ABS_DB_PATH = path.resolve(DB_PATH)
const MAX_SAFE_MONEY = Number.MAX_SAFE_INTEGER

const CORE_FIELDS = new Set([
    'registered', 'name', 'age', 'regTime', 'warn', 'limit', 'afk', 'afkReason',
    'banned', 'banReason', 'role', 'autolevelup', 'premium', 'premiumTime',
    'sn', 'lastclaim', 'lastNotified', 'lastHistoryDate', 'lastSeen', 'joinedAt',
    'registeredAt', 'registerDate', 'daily', 'limitCount', 'premiumUntil'
])

let state = null
let transactionDepth = 0
let transactionDirty = false
let flushScheduled = false

const now = () => Date.now()

function clone(value) {
    if (value === undefined) return undefined
    return JSON.parse(JSON.stringify(value))
}

function ensureParent() {
    fs.mkdirSync(path.dirname(ABS_DB_PATH), { recursive: true })
}

function atomicWrite(file, value) {
    ensureParent()
    const tmp = `${file}.tmp-${process.pid}-${Date.now()}`
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8')
    fs.renameSync(tmp, file)
}

function emptyState() {
    return {
        version: 5,
        updatedAt: now(),
        players: {},
        items: [],
        inventory: [],
        mining_locations: [],
        mining_ores: [],
        recipes: [],
        recipe_ingredients: [],
        quests: [],
        user_quests: [],
        achievements: [],
        user_achievements: [],
        tools: [],
        equipment: [],
        fishing_state: [],
        farm_plots: [],
        pets: [],
        guilds: [],
        guild_members: [],
        market_orders: [],
        auctions: [],
        dungeon_runs: [],
        jobs: [],
        job_progress: [],
        locations: [],
        travel: [],
        world_events: [],
        event_contributions: [],
        properties: [],
        businesses: [],
        crime: [],
        insurance: [],
        relationships: [],
        cooldowns: [],
        ledger: [],
        counters: {
            rpg_auctions: 0,
            rpg_market_orders: 0,
            rpg_dungeon_runs: 0,
            rpg_businesses: 0,
            rpg_properties: 0,
            rpg_events: 0,
            rpg_equipment: 0,
            rpg_tools: 0,
            rpg_ledger: 0
        }
    }
}

function normalizeState(input) {
    const s = input && typeof input === 'object' ? input : emptyState()
    const base = emptyState()

    for (const key of Object.keys(base)) {
        if (key === 'counters') continue
        if (s[key] === undefined) s[key] = base[key]
    }

    s.version = Number(s.version) || 5
    s.updatedAt = Number(s.updatedAt) || now()
    s.players = s.players && typeof s.players === 'object' && !Array.isArray(s.players) ? s.players : {}
    s.counters = s.counters && typeof s.counters === 'object' ? s.counters : { ...base.counters }

    for (const [key, fallback] of Object.entries(base)) {
        if (key === 'players' || key === 'counters') continue
        if (!Array.isArray(s[key])) s[key] = fallback
    }

    for (const key of Object.keys(base.counters)) {
        if (!Number.isSafeInteger(Number(s.counters[key])) || Number(s.counters[key]) < 0) {
            s.counters[key] = 0
        } else {
            s.counters[key] = Number(s.counters[key])
        }
    }

    return s
}

function loadState() {
    if (state) return state

    ensureParent()

    if (!fs.existsSync(ABS_DB_PATH)) {
        state = emptyState()
        atomicWrite(ABS_DB_PATH, state)
        return state
    }

    try {
        const raw = fs.readFileSync(ABS_DB_PATH, 'utf8')
        state = normalizeState(raw.trim() ? JSON.parse(raw) : emptyState())
    } catch (error) {
        console.error('[RPG JSON DB] Database rusak, membuat database baru:', error)

        try {
            if (fs.existsSync(ABS_DB_PATH)) {
                const backup = `${ABS_DB_PATH}.corrupt-${Date.now()}.bak`
                fs.copyFileSync(ABS_DB_PATH, backup)
            }
        } catch {}

        state = emptyState()
        atomicWrite(ABS_DB_PATH, state)
    }

    return state
}

function markDirty() {
    transactionDirty = true
    if (transactionDepth > 0) return
    scheduleSave()
}

function flush() {
    const s = loadState()
    s.updatedAt = now()
    atomicWrite(ABS_DB_PATH, s)
    transactionDirty = false
}

function save() {
    if (transactionDepth > 0) {
        transactionDirty = true
        return
    }
    flush()
}

function scheduleSave() {
    if (transactionDepth > 0 || flushScheduled) return
    flushScheduled = true
    setImmediate(() => {
        flushScheduled = false
        if (transactionDirty) {
            try { flush() } catch (error) { console.error('[RPG JSON DB] flush:', error) }
        }
    })
}

function tableRows(table) {
    const s = loadState()
    if (table === 'rpg_players') {
        return Object.entries(s.players).map(([canonical_jid, player]) => ({
            canonical_jid,
            level: Number(player.level) || 1,
            exp: Number(player.exp) || 0,
            hp: Number(player.health) || 100,
            max_hp: Number(player.maxHealth) || 100,
            stamina: Number(player.stamina) || 100,
            max_stamina: Number(player.maxStamina) || 100,
            reputation: Number(player.reputation) || 0,
            karma: Number(player.karma) || 0,
            fame: Number(player.fame) || 0,
            location_id: player.location || 'city',
            data_json: JSON.stringify(player),
            created_at: Number(player._createdAt) || 0,
            updated_at: Number(player._updatedAt) || 0
        }))
    }

    const map = {
        rpg_items: 'items',
        rpg_inventory: 'inventory',
        rpg_mining_locations: 'mining_locations',
        rpg_mining_ores: 'mining_ores',
        rpg_recipes: 'recipes',
        rpg_recipe_ingredients: 'recipe_ingredients',
        rpg_quests: 'quests',
        rpg_user_quests: 'user_quests',
        rpg_achievements: 'achievements',
        rpg_user_achievements: 'user_achievements',
        rpg_tools: 'tools',
        rpg_equipment: 'equipment',
        rpg_fishing_state: 'fishing_state',
        rpg_farm_plots: 'farm_plots',
        rpg_pets: 'pets',
        rpg_guilds: 'guilds',
        rpg_guild_members: 'guild_members',
        rpg_market_orders: 'market_orders',
        rpg_auctions: 'auctions',
        rpg_dungeon_runs: 'dungeon_runs',
        rpg_jobs: 'jobs',
        rpg_job_progress: 'job_progress',
        rpg_locations: 'locations',
        rpg_travel: 'travel',
        rpg_world_events: 'world_events',
        rpg_event_contributions: 'event_contributions',
        rpg_properties: 'properties',
        rpg_businesses: 'businesses',
        rpg_crime: 'crime',
        rpg_insurance: 'insurance',
        rpg_relationships: 'relationships',
        rpg_cooldowns: 'cooldowns',
        rpg_ledger: 'ledger'
    }

    return clone(s[map[table] || table] || [])
}

function setTable(table, rows) {
    const s = loadState()
    const map = {
        rpg_items: 'items',
        rpg_inventory: 'inventory',
        rpg_mining_locations: 'mining_locations',
        rpg_mining_ores: 'mining_ores',
        rpg_recipes: 'recipes',
        rpg_recipe_ingredients: 'recipe_ingredients',
        rpg_quests: 'quests',
        rpg_user_quests: 'user_quests',
        rpg_achievements: 'achievements',
        rpg_user_achievements: 'user_achievements',
        rpg_tools: 'tools',
        rpg_equipment: 'equipment',
        rpg_fishing_state: 'fishing_state',
        rpg_farm_plots: 'farm_plots',
        rpg_pets: 'pets',
        rpg_guilds: 'guilds',
        rpg_guild_members: 'guild_members',
        rpg_market_orders: 'market_orders',
        rpg_auctions: 'auctions',
        rpg_dungeon_runs: 'dungeon_runs',
        rpg_jobs: 'jobs',
        rpg_job_progress: 'job_progress',
        rpg_locations: 'locations',
        rpg_travel: 'travel',
        rpg_world_events: 'world_events',
        rpg_event_contributions: 'event_contributions',
        rpg_properties: 'properties',
        rpg_businesses: 'businesses',
        rpg_crime: 'crime',
        rpg_insurance: 'insurance',
        rpg_relationships: 'relationships',
        rpg_cooldowns: 'cooldowns',
        rpg_ledger: 'ledger'
    }
    s[map[table] || table] = rows
}

function normalizeLegacy(data = {}) {
    const out = {}
    for (const [key, value] of Object.entries(data || {})) {
        if (CORE_FIELDS.has(key)) continue
        if (key === '_createdAt' || key === '_updatedAt') continue
        out[key] = clone(value)
    }

    if (!Object.prototype.hasOwnProperty.call(out, 'level')) out.level = 1
    if (!Object.prototype.hasOwnProperty.call(out, 'exp')) out.exp = 0
    if (!Object.prototype.hasOwnProperty.call(out, 'health')) out.health = 100
    if (!Object.prototype.hasOwnProperty.call(out, 'stamina')) out.stamina = 100
    if (!Object.prototype.hasOwnProperty.call(out, 'maxHealth')) out.maxHealth = 100
    if (!Object.prototype.hasOwnProperty.call(out, 'maxStamina')) out.maxStamina = 100
    if (!Object.prototype.hasOwnProperty.call(out, 'money')) out.money = 0
    if (!Object.prototype.hasOwnProperty.call(out, 'bank')) out.bank = 0
    if (!Object.prototype.hasOwnProperty.call(out, 'gold')) out.gold = 0
    if (!Object.prototype.hasOwnProperty.call(out, 'diamond')) out.diamond = 0
    if (!Object.prototype.hasOwnProperty.call(out, 'emerald')) out.emerald = 0
    if (!Object.prototype.hasOwnProperty.call(out, 'batu')) out.batu = 0
    if (!Object.prototype.hasOwnProperty.call(out, 'besi')) out.besi = 0
    if (!Object.prototype.hasOwnProperty.call(out, 'kayu')) out.kayu = 0
    if (!Object.prototype.hasOwnProperty.call(out, 'potion')) out.potion = 0
    if (!Object.prototype.hasOwnProperty.call(out, 'location')) out.location = 'city'
    if (!Object.prototype.hasOwnProperty.call(out, 'anak')) out.anak = []
    if (!Object.prototype.hasOwnProperty.call(out, 'dompet_kripto')) {
        out.dompet_kripto = { eri: 0, btc: 0, eth: 0, bnb: 0, sol: 0, doge: 0 }
    }

    if (!out.statusPasangan && out.status_hubungan) out.statusPasangan = out.status_hubungan
    if (!out.partnerPic && out.partnerpic) out.partnerPic = out.partnerpic
    if (!out.tglPacaran && out.waktu_jadian) out.tglPacaran = out.waktu_jadian

    for (const key of ['money', 'bank', 'diamond', 'gold', 'emerald', 'batu', 'besi', 'kayu', 'health', 'stamina']) {
        const n = Number(out[key])
        out[key] = Number.isFinite(n)
            ? Math.max(0, Math.min(MAX_SAFE_MONEY, Math.floor(n)))
            : 0
    }

    const level = Number(out.level)
    out.level = Number.isSafeInteger(level) && level > 0 ? level : 1

    const exp = Number(out.exp)
    out.exp = Number.isSafeInteger(exp) && exp >= 0 ? exp : 0

    return out
}

function createPlayer(jid, legacy = {}) {
    const s = loadState()
    if (s.players[jid]) return s.players[jid]

    const t = now()
    const player = normalizeLegacy(legacy)
    Object.defineProperty(player, '_createdAt', { value: t, enumerable: false, writable: true })
    Object.defineProperty(player, '_updatedAt', { value: t, enumerable: false, writable: true })
    s.players[jid] = player
    markDirty()
    return player
}

function syncNonEnumerableMeta(player) {
    if (!player || typeof player !== 'object') return
    const created = Number(player._createdAt) || now()
    const updated = Number(player._updatedAt) || now()
    try {
        Object.defineProperty(player, '_createdAt', { value: created, enumerable: false, writable: true, configurable: true })
        Object.defineProperty(player, '_updatedAt', { value: updated, enumerable: false, writable: true, configurable: true })
    } catch {
        player._createdAt = created
        player._updatedAt = updated
    }
}

function savePlayer(jid, raw) {
    const s = loadState()
    const normalized = normalizeLegacy(raw)
    const old = s.players[jid] || raw || {}
    const createdAt = Number(old._createdAt) || now()
    const updatedAt = now()

    Object.defineProperty(normalized, '_createdAt', { value: createdAt, enumerable: false, writable: true, configurable: true })
    Object.defineProperty(normalized, '_updatedAt', { value: updatedAt, enumerable: false, writable: true, configurable: true })

    s.players[jid] = normalized
    markDirty()
    return normalized
}

function getCoreUser(jid) {
    return global.db?.data?.users?.[jid] || null
}

function makeChildProxy(jid, root, target) {
    if (!target || typeof target !== 'object') return target

    return new Proxy(target, {
        get(obj, prop, receiver) {
            const value = Reflect.get(obj, prop, receiver)
            if (value && typeof value === 'object') return makeChildProxy(jid, root, value)
            return value
        },
        set(obj, prop, value) {
            obj[prop] = clone(value)
            markDirty()
            if (root) root._updatedAt = now()
            if (transactionDepth === 0) scheduleSave()
            return true
        },
        deleteProperty(obj, prop) {
            delete obj[prop]
            markDirty()
            if (root) root._updatedAt = now()
            if (transactionDepth === 0) scheduleSave()
            return true
        }
    })
}

function makePlayerProxy(jid, raw) {
    syncNonEnumerableMeta(raw)

    return new Proxy(raw, {
        get(obj, prop, receiver) {
            if (prop === '__rpgRaw') return obj
            if (prop === '__rpgJid') return jid

            const core = getCoreUser(jid)
            if (CORE_FIELDS.has(prop)) return core?.[prop]

            const value = Reflect.get(obj, prop, receiver)
            if (value && typeof value === 'object') return makeChildProxy(jid, obj, value)
            return value
        },
        set(obj, prop, value) {
            if (CORE_FIELDS.has(prop)) {
                const core = getCoreUser(jid)
                if (core) core[prop] = value
                return true
            }

            if (prop === 'money' || prop === 'bank') {
                const n = Number(value)
                obj[prop] = Number.isFinite(n)
                    ? Math.max(0, Math.min(MAX_SAFE_MONEY, Math.floor(n)))
                    : 0
            } else if (['level', 'exp', 'health', 'stamina', 'maxHealth', 'maxStamina'].includes(prop)) {
                const n = Number(value)
                obj[prop] = Number.isSafeInteger(n) ? Math.max(0, n) : 0
            } else {
                obj[prop] = clone(value)
            }

            markDirty()
            syncNonEnumerableMeta(obj)
            obj._updatedAt = now()
            if (transactionDepth === 0) scheduleSave()
            return true
        },
        deleteProperty(obj, prop) {
            delete obj[prop]
            markDirty()
            return true
        },
        ownKeys(obj) {
            const core = getCoreUser(jid) || {}
            return [...new Set([...Reflect.ownKeys(obj), ...Reflect.ownKeys(core)])]
        },
        getOwnPropertyDescriptor(obj, prop) {
            if (prop in obj) return Object.getOwnPropertyDescriptor(obj, prop)
            const core = getCoreUser(jid)
            if (core && prop in core) {
                return { configurable: true, enumerable: true, value: core[prop], writable: true }
            }
            return undefined
        }
    })
}

export function getRpgUser(jid) {
    if (!jid) return null
    const s = loadState()
    let raw = s.players[jid]
    if (!raw) {
        const core = getCoreUser(jid)
        if (!core) return null
        raw = createPlayer(jid, core)
    }
    if (!raw) return null

    syncNonEnumerableMeta(raw)

    if (!raw.__proxy) {
        Object.defineProperty(raw, '__proxy', {
            value: makePlayerProxy(jid, raw),
            enumerable: false,
            configurable: true
        })
    }

    return raw.__proxy
}

export function getRpgData() {
    return loadState()
}

export function saveRpgData() {
    save()
}

export function flushRpgUser(jid) {
    const s = loadState()
    if (!s.players[jid]) return
    savePlayer(jid, s.players[jid])
}

export function closeRpgDatabase() {
    try { if (transactionDepth === 0 && transactionDirty) flush() } catch {}
    state = null
}

export function positiveInt(value, fallback = 1) {
    const n = Number(value)
    return Number.isSafeInteger(n) && n > 0 ? n : fallback
}

export function nonNegativeInt(value, fallback = 0) {
    const n = Number(value)
    return Number.isSafeInteger(n) && n >= 0 ? n : fallback
}

export function formatMoney(value) {
    return Number(value || 0).toLocaleString('id-ID')
}

export function setCooldown(jid, action, ms) {
    const s = loadState()
    const expiresAt = now() + Math.max(0, Number(ms) || 0)
    const row = s.cooldowns.find(v => v.canonical_jid === jid && v.action === action)
    if (row) row.expires_at = expiresAt
    else s.cooldowns.push({ canonical_jid: jid, action, expires_at: expiresAt })
    markDirty()
    return expiresAt
}

export function getCooldown(jid, action) {
    const s = loadState()
    const row = s.cooldowns.find(v => v.canonical_jid === jid && v.action === action)
    if (!row) return 0
    if (Number(row.expires_at) <= now()) {
        s.cooldowns = s.cooldowns.filter(v => !(v.canonical_jid === jid && v.action === action))
        markDirty()
        return 0
    }
    return Number(row.expires_at)
}

export function writeLedger(entry) {
    const s = loadState()
    const e = entry || {}
    s.ledger.push({
        id: ++s.counters.rpg_ledger,
        canonical_jid: e.canonical_jid || e.jid || '',
        type: e.type || 'unknown',
        amount: Number.isSafeInteger(Number(e.amount)) ? Number(e.amount) : 0,
        item_id: e.item_id || null,
        quantity: Number.isSafeInteger(Number(e.quantity)) ? Number(e.quantity) : 0,
        reference_type: e.reference_type || null,
        reference_id: e.reference_id || null,
        balance_before: e.balance_before ?? null,
        balance_after: e.balance_after ?? null,
        metadata: e.metadata ? (typeof e.metadata === 'string' ? e.metadata : JSON.stringify(e.metadata)) : null,
        created_at: now()
    })

    if (s.ledger.length > 10000) s.ledger.splice(0, s.ledger.length - 10000)
    markDirty()
}

export function addMoney(jid, amount, type = 'rpg_reward', reference = null) {
    const user = getRpgUser(jid)
    if (!user) throw new Error('RPG player tidak ditemukan.')

    const delta = Number(amount)
    if (!Number.isSafeInteger(delta) || delta < 0) throw new Error('Jumlah uang tidak valid.')

    const before = Number(user.money || 0)
    const after = before + delta
    if (!Number.isSafeInteger(after) || after > MAX_SAFE_MONEY) throw new Error('Saldo melebihi batas angka aman.')

    user.money = after
    writeLedger({
        jid,
        type,
        amount: delta,
        balance_before: before,
        balance_after: after,
        reference_type: reference?.type,
        reference_id: reference?.id
    })

    return after
}

export function removeMoney(jid, amount, type = 'rpg_spend', reference = null) {
    const user = getRpgUser(jid)
    if (!user) throw new Error('RPG player tidak ditemukan.')

    const delta = Number(amount)
    if (!Number.isSafeInteger(delta) || delta <= 0) throw new Error('Jumlah uang tidak valid.')

    const before = Number(user.money || 0)
    if (before < delta) throw new Error('Uang tidak cukup.')

    const after = before - delta
    user.money = after
    writeLedger({
        jid,
        type,
        amount: -delta,
        balance_before: before,
        balance_after: after,
        reference_type: reference?.type,
        reference_id: reference?.id
    })

    return after
}

export function addItem(jid, itemId, quantity) {
    const user = getRpgUser(jid)
    if (!user) throw new Error('RPG player tidak ditemukan.')

    const q = positiveInt(quantity, 0)
    if (!q) throw new Error('Jumlah item tidak valid.')

    const current = Number(user[itemId] || 0)
    const next = current + q
    if (!Number.isSafeInteger(next)) throw new Error('Jumlah item melebihi batas aman.')

    user[itemId] = next
    return next
}

export function removeItem(jid, itemId, quantity) {
    const user = getRpgUser(jid)
    if (!user) throw new Error('RPG player tidak ditemukan.')

    const q = positiveInt(quantity, 0)
    if (!q) throw new Error('Jumlah item tidak valid.')

    const have = Number(user[itemId] || 0)
    if (have < q) throw new Error(`Item ${itemId} tidak cukup.`)

    user[itemId] = have - q
    return user[itemId]
}

export function listRpgBounties(limit = 10) {
    const s = loadState()
    return Object.entries(s.players)
        .map(([canonical_jid, player]) => ({ canonical_jid, bounty: Number(player.bounty || 0) }))
        .filter(v => v.bounty > 0)
        .sort((a, b) => b.bounty - a.bounty)
        .slice(0, Number(limit) || 10)
        .map(v => [v.canonical_jid, { bounty: v.bounty }])
}

export function getGuildByName(name) {
    const s = loadState()
    return clone(s.guilds.find(v => String(v.name).toLowerCase() === String(name).toLowerCase())) || undefined
}

export function createGuild(jid, name, kas = { money: 0, batu: 0, besi: 0 }) {
    const s = loadState()
    const exists = s.guilds.find(v => String(v.name).toLowerCase() === String(name).toLowerCase())
    if (exists) throw new Error('Nama guild sudah digunakan.')

    const t = now()
    const guild = {
        guild_id: ++s.counters.rpg_guilds,
        name,
        owner_jid: jid,
        level: 1,
        exp: 0,
        bank_balance: 0,
        reputation: 0,
        kas_json: JSON.stringify(kas),
        created_at: t,
        updated_at: t
    }
    s.guilds.push(guild)
    s.guild_members.push({ guild_id: guild.guild_id, canonical_jid: jid, role: 'owner', contribution: 0, joined_at: t })
    markDirty()
    return clone(guild)
}

export function guildMembers(guildId) {
    const s = loadState()
    return clone(s.guild_members.filter(v => Number(v.guild_id) === Number(guildId)).sort((a, b) => Number(a.joined_at) - Number(b.joined_at)))
}

export function joinGuild(guildId, jid) {
    const s = loadState()
    if (!s.guild_members.some(v => Number(v.guild_id) === Number(guildId) && v.canonical_jid === jid)) {
        s.guild_members.push({ guild_id: Number(guildId), canonical_jid: jid, role: 'member', contribution: 0, joined_at: now() })
        markDirty()
    }
}

export function leaveGuild(guildId, jid) {
    const s = loadState()
    const before = s.guild_members.length
    s.guild_members = s.guild_members.filter(v => !(Number(v.guild_id) === Number(guildId) && v.canonical_jid === jid))
    if (s.guild_members.length !== before) markDirty()
}

function parseLimit(sql, fallback = Infinity) {
    const match = sql.match(/\bLIMIT\s+(\?|(\d+))/i)
    if (!match) return fallback
    if (match[1] === '?') return fallback
    return Number(match[2])
}

function projectRows(rows, sql) {
    const s = sql.toLowerCase()
    if (s.includes('select *')) return rows.map(clone)

    const selectPart = s.match(/^select\s+(.+?)\s+from\s+/i)?.[1] || '*'
    const cols = selectPart.split(',').map(v => v.trim())
    return rows.map(row => {
        const out = {}
        for (const col of cols) {
            if (!col) continue
            const asMatch = col.match(/^(?:[^\s]+(?:\s*\([^)]*\))?|[^\s]+)\s+as\s+(\w+)$/i)
            const alias = asMatch?.[1]
            if (alias) {
                const source = col.slice(0, asMatch.index + asMatch[0].indexOf(alias)).trim()
                if (/json_extract/i.test(source)) {
                    const field = source.match(/\$\.(\w+)/)?.[1]
                    out[alias] = field ? row[field] : null
                } else {
                    out[alias] = row[source] ?? null
                }
                continue
            }
            const name = col.replace(/\bAS\b.*$/i, '').trim().replace(/^json_extract\(.*?\)$/i, '')
            out[name.split('.').pop()] = row[name.split('.').pop()] ?? null
        }
        return out
    })
}

function selectRows(sql, params) {
    const nsql = sql.replace(/\s+/g, ' ').trim()
    const low = nsql.toLowerCase()

    if (low.includes('json_extract(data_json') && low.includes("'$.money'") && low.includes('order by money desc')) {
        const limit = /limit\s+\?/i.test(low) ? Number(params[0]) || 5 : parseLimit(nsql, 5)
        return Object.entries(loadState().players)
            .map(([canonical_jid, player]) => ({ canonical_jid, money: Number(player.money || 0) }))
            .filter(r => r.money > 0)
            .sort((a, b) => b.money - a.money)
            .slice(0, limit)
            .map(clone)
    }

    if (low.startsWith('select canonical_jid, level, exp, json_extract(data_json')) {
        let rows = Object.entries(loadState().players).map(([canonical_jid, player]) => ({
            canonical_jid,
            level: Number(player.level || 1),
            exp: Number(player.exp || 0),
            money: Number(player.money || 0),
            diamond: Number(player.diamond || 0)
        }))
        const order = low.match(/order by\s+([a-z_]+)\s+desc/i)?.[1] || 'level'
        if (order === 'money') rows.sort((a, b) => b.money - a.money)
        else if (order === 'diamond') rows.sort((a, b) => b.diamond - a.diamond)
        else if (order === 'exp') rows.sort((a, b) => b.exp - a.exp)
        else rows.sort((a, b) => b.level - a.level)
        return rows.slice(0, parseLimit(nsql, 10)).map(clone)
    }

    const matchTable = low.match(/\bfrom\s+([a-z0-9_]+)/i)
    if (!matchTable) throw new Error(`RPG JSON DB: SELECT table tidak dikenali: ${nsql}`)
    const table = matchTable[1]
    let rows = tableRows(table)

    if (table === 'rpg_items') {
        if (/where category in/i.test(low)) {
            let cats = (params || []).map(String).filter(Boolean)
            if (!cats.length) {
                const inMatch = low.match(/category\s+in\s*\(([^)]+)\)/i)
                if (inMatch) {
                    cats = inMatch[1]
                        .split(',')
                        .map(v => v.trim().replace(/^['"]|['"]$/g, ''))
                        .filter(Boolean)
                }
            }
            rows = rows.filter(r => cats.includes(String(r.category)))
            rows.sort((a, b) => Number(a.buy_price) - Number(b.buy_price) || String(a.name).localeCompare(String(b.name)))
        } else if (/where item_id=\?/i.test(low)) {
            rows = rows.filter(r => String(r.item_id) === String(params[0]))
        }
        if (/order by category\s*,\s*name/i.test(low)) rows.sort((a, b) => String(a.category).localeCompare(String(b.category)) || String(a.name).localeCompare(String(b.name)))
    }

    else if (table === 'rpg_mining_locations') {
        if (/where location_id=\?/i.test(low)) rows = rows.filter(r => r.location_id === params[0])
        if (/select 1/i.test(low)) rows = rows.map(() => ({ '1': 1 }))
        if (/order by required_tool_level,min_depth/i.test(low)) rows.sort((a, b) => Number(a.required_tool_level) - Number(b.required_tool_level) || Number(a.min_depth) - Number(b.min_depth))
    }

    else if (table === 'rpg_mining_ores') {
        rows = rows.filter(r => r.location_id === params[0] && Number(r.min_depth) <= Number(params[1]) && Number(r.max_depth) >= Number(params[2]))
    }

    else if (table === 'rpg_achievements') {
        if (/where condition_type = \?/i.test(low)) rows = rows.filter(r => r.condition_type === params[0])
        if (/order by achievement_id/i.test(low)) rows.sort((a, b) => String(a.achievement_id).localeCompare(String(b.achievement_id)))
    }

    else if (table === 'rpg_user_achievements') {
        rows = rows.filter(r => r.canonical_jid === params[0] && r.achievement_id === params[1])
    }

    else if (table === 'rpg_quests') {
        if (/where active = 1 and objective = \?/i.test(low)) rows = rows.filter(r => Number(r.active) === 1 && r.objective === params[0])
        else if (/where active = 1/i.test(low)) rows = rows.filter(r => Number(r.active) === 1)
        if (/order by type,quest_id/i.test(low)) rows.sort((a, b) => String(a.type).localeCompare(String(b.type)) || String(a.quest_id).localeCompare(String(b.quest_id)))
    }

    else if (table === 'rpg_user_quests') {
        rows = rows.filter(r => r.canonical_jid === params[0] && r.quest_id === params[1])
    }

    else if (table === 'rpg_jobs') {
        if (/where job_id=\?/i.test(low)) rows = rows.filter(r => r.job_id === params[0])
        if (/order by required_level,salary_min/i.test(low)) rows.sort((a, b) => Number(a.required_level) - Number(b.required_level) || Number(a.salary_min) - Number(b.salary_min))
    }

    else if (table === 'rpg_market_orders') {
        rows = rows.filter(r => r.status === 'open' && Number(r.quantity) > 0)
        rows.sort((a, b) => Number(b.id) - Number(a.id))
    }

    else if (table === 'rpg_auctions') {
        if (/where status='open' and ends_at>\?/i.test(low)) {
            rows = rows.filter(r => r.status === 'open' && Number(r.ends_at) > Number(params[0]))
            rows.sort((a, b) => Number(a.ends_at) - Number(b.ends_at))
        } else if (/where id=\? and status='open'/i.test(low)) {
            rows = rows.filter(r => Number(r.id) === Number(params[0]) && r.status === 'open')
        } else if (/where id=\?/i.test(low)) {
            rows = rows.filter(r => Number(r.id) === Number(params[0]))
        }
    }

    else if (table === 'rpg_equipment') {
        if (/where canonical_jid = \?/i.test(low)) {
            rows = rows.filter(r => r.canonical_jid === params[0])
            rows.sort((a, b) => String(a.slot).localeCompare(String(b.slot)) || Number(a.id) - Number(b.id))
        } else if (/where id = \? and canonical_jid = \?/i.test(low)) {
            rows = rows.filter(r => Number(r.id) === Number(params[0]) && r.canonical_jid === params[1])
        }
    }

    else if (table === 'rpg_locations') {
        if (/where location_id=\?/i.test(low)) rows = rows.filter(r => r.location_id === params[0])
        if (/order by required_level,location_id/i.test(low)) rows.sort((a, b) => Number(a.required_level) - Number(b.required_level) || String(a.location_id).localeCompare(String(b.location_id)))
    }

    else if (table === 'rpg_travel') {
        if (/where canonical_jid=\?/i.test(low)) rows = rows.filter(r => r.canonical_jid === params[0])
    }

    else if (table === 'rpg_world_events') {
        if (/where status='active' and start_at<=\? and end_at>\?/i.test(low)) {
            rows = rows.filter(r => r.status === 'active' && Number(r.start_at) <= Number(params[0]) && Number(r.end_at) > Number(params[1]))
            rows.sort((a, b) => Number(a.end_at) - Number(b.end_at))
        }
    }

    else if (table === 'rpg_event_contributions') {
        if (/sum\(contribution\)/i.test(low)) {
            rows = rows.filter(r => Number(r.event_id) === Number(params[0]))
            const total = rows.reduce((a, b) => a + Number(b.contribution || 0), 0)
            return [{ total }]
        }
        rows = rows.filter(r => Number(r.event_id) === Number(params[0]) && r.canonical_jid === params[1])
    }

    else if (table === 'rpg_cooldowns') {
        rows = rows.filter(r => r.canonical_jid === params[0] && r.action === params[1])
    }

    else if (table === 'rpg_players') {
        if (/where canonical_jid = \?/i.test(low)) rows = rows.filter(r => r.canonical_jid === params[0])

        if (/json_extract\(data_json, '\$\.bounty'\)/i.test(low)) {
            rows = rows
                .map(r => ({ canonical_jid: r.canonical_jid, bounty: Number(JSON.parse(r.data_json || '{}')?.bounty || 0) }))
                .filter(r => r.bounty > 0)
                .sort((a, b) => b.bounty - a.bounty)
        }

        if (/json_extract\(data_json,'\$\.money'\)/i.test(low) || /json_extract\(data_json, '\$\.money'\)/i.test(low)) {
            rows = rows.map(r => {
                const data = JSON.parse(r.data_json || '{}')
                return {
                    canonical_jid: r.canonical_jid,
                    level: Number(r.level) || 1,
                    exp: Number(r.exp) || 0,
                    money: Number(data.money || 0),
                    diamond: Number(data.diamond || 0)
                }
            })
            if (/order by money desc/i.test(low)) rows.sort((a, b) => b.money - a.money)
        }
    }

    else if (table === 'rpg_guilds') {
        if (/where name = \?/i.test(low)) rows = rows.filter(r => r.name === params[0])
        if (/where guild_id = \?/i.test(low)) rows = rows.filter(r => Number(r.guild_id) === Number(params[0]))
    }

    else if (table === 'rpg_guild_members') {
        if (/where guild_id = \?/i.test(low)) rows = rows.filter(r => Number(r.guild_id) === Number(params[0]))
        if (/and canonical_jid = \?/i.test(low)) rows = rows.filter(r => r.canonical_jid === params[1])
        if (/order by joined_at asc/i.test(low)) rows.sort((a, b) => Number(a.joined_at) - Number(b.joined_at))
    }

    const limit = parseLimit(nsql)
    if (Number.isFinite(limit)) rows = rows.slice(0, limit)

    return projectRows(rows, nsql)
}

function insertRow(table, sql, params) {
    const s = loadState()
    const nowTs = now()

    const insert = (collection, row, unique = null) => {
        if (unique && collection.some(unique)) return { changes: 0, lastInsertRowid: 0 }
        collection.push(row)
        markDirty()
        return { changes: 1, lastInsertRowid: Number(row.id || row.guild_id || row.event_id || 0) }
    }

    if (table === 'rpg_players') {
        const jid = params[0]
        if (s.players[jid]) return { changes: 0, lastInsertRowid: 0 }
        const data = normalizeLegacy(JSON.parse(params[11] || '{}'))
        data.level = Number(params[1]) || data.level
        data.exp = Number(params[2]) || data.exp
        data.health = Number(params[3]) || data.health
        data.maxHealth = Number(params[4]) || data.maxHealth
        data.stamina = Number(params[5]) || data.stamina
        data.maxStamina = Number(params[6]) || data.maxStamina
        data.reputation = Number(params[7]) || data.reputation || 0
        data.karma = Number(params[8]) || data.karma || 0
        data.fame = Number(params[9]) || data.fame || 0
        data.location = params[10] || data.location || 'city'
        Object.defineProperty(data, '_createdAt', { value: Number(params[12]) || nowTs, enumerable: false, writable: true, configurable: true })
        Object.defineProperty(data, '_updatedAt', { value: Number(params[13]) || nowTs, enumerable: false, writable: true, configurable: true })
        s.players[jid] = data
        markDirty()
        return { changes: 1, lastInsertRowid: 0 }
    }

    if (table === 'rpg_items') {
        return insert(s.items, {
            item_id: params[0], name: params[1], category: params[2], rarity: params[3], stackable: Number(params[4]), tradable: Number(params[5]), sell_price: Number(params[6]), buy_price: Number(params[7]), description: params[8] || ''
        }, r => r.item_id === params[0])
    }

    if (table === 'rpg_mining_locations') {
        return insert(s.mining_locations, {
            location_id: params[0], name: params[1], min_depth: Number(params[2]), max_depth: Number(params[3]), required_tool_level: Number(params[4]), danger: Number(params[5]), metadata: params[6] || null
        }, r => r.location_id === params[0])
    }

    if (table === 'rpg_mining_ores') {
        return insert(s.mining_ores, {
            ore_id: params[0], item_id: params[1], location_id: params[2], min_depth: Number(params[3]), max_depth: Number(params[4]), rarity_weight: Number(params[5]), min_amount: Number(params[6]), max_amount: Number(params[7]), xp_reward: Number(params[8])
        }, r => r.ore_id === params[0])
    }

    if (table === 'rpg_quests') {
        return insert(s.quests, {
            quest_id: params[0], name: params[1], type: params[2], objective: params[3], required_value: Number(params[4]), reward_money: Number(params[5]), reward_exp: Number(params[6]), reward_item_id: params[7] || null, reward_item_quantity: Number(params[8] || 0), active: params[9] === undefined ? 1 : Number(params[9]), metadata: params[10] || null
        }, r => r.quest_id === params[0])
    }

    if (table === 'rpg_recipes') {
        return insert(s.recipes, {
            recipe_id: params[0], output_item_id: params[1], output_quantity: Number(params[2]), required_level: Number(params[3]), craft_time: Number(params[4]), xp_reward: Number(params[5]), metadata: params[6] || null
        }, r => r.recipe_id === params[0])
    }

    if (table === 'rpg_recipe_ingredients') {
        return insert(s.recipe_ingredients, { recipe_id: params[0], item_id: params[1], quantity: Number(params[2]) }, r => r.recipe_id === params[0] && r.item_id === params[1])
    }

    if (table === 'rpg_jobs') {
        return insert(s.jobs, { job_id: params[0], name: params[1], salary_min: Number(params[2]), salary_max: Number(params[3]), required_level: Number(params[4]), exp_reward: Number(params[5]), cooldown: Number(params[6]), metadata: params[7] || null }, r => r.job_id === params[0])
    }

    if (table === 'rpg_locations') {
        return insert(s.locations, { location_id: params[0], name: params[1], region: params[2], travel_time: Number(params[3]), required_level: Number(params[4]), danger: Number(params[5]), metadata: params[6] || null }, r => r.location_id === params[0])
    }

    if (table === 'rpg_achievements') {
        return insert(s.achievements, { achievement_id: params[0], name: params[1], description: params[2], condition_type: params[3], condition_value: Number(params[4]), reward_money: Number(params[5]), reward_exp: Number(params[6]), reward_title: params[7] || null, metadata: params[8] || null }, r => r.achievement_id === params[0])
    }

    if (table === 'rpg_auctions') {
        const id = ++s.counters.rpg_auctions
        return insert(s.auctions, { id, seller_jid: params[0], item_id: params[1], quantity: Number(params[2]), starting_bid: Number(params[3]), current_bid: Number(params[4]), current_bidder: params[5], status: params[6], ends_at: Number(params[7]), created_at: Number(params[8]) || nowTs })
    }

    if (table === 'rpg_market_orders') {
        const id = ++s.counters.rpg_market_orders
        return insert(s.market_orders, { id, seller_jid: params[0], item_id: params[1], quantity: Number(params[2]), price_per_unit: Number(params[3]), status: params[4], created_at: Number(params[5]) || nowTs, expires_at: params[6] || null })
    }

    if (table === 'rpg_travel') {
        const row = { canonical_jid: params[0], from_location: params[1], target_location: params[2], state: params[3], started_at: Number(params[4]), finish_at: Number(params[5]), transport_id: params[6] || null }
        const idx = s.travel.findIndex(v => v.canonical_jid === row.canonical_jid)
        if (idx >= 0) s.travel[idx] = { ...s.travel[idx], ...row }
        else s.travel.push(row)
        markDirty()
        return { changes: 1, lastInsertRowid: 0 }
    }

    if (table === 'rpg_guilds') {
        const guildId = ++s.counters.rpg_guilds
        const row = { guild_id: guildId, name: params[0], owner_jid: params[1], level: Number(params[2]), exp: Number(params[3]), bank_balance: Number(params[4]), reputation: Number(params[5]), kas_json: params[6] || '{}', created_at: Number(params[7]) || nowTs, updated_at: Number(params[8]) || nowTs }
        return insert(s.guilds, row, r => String(r.name).toLowerCase() === String(row.name).toLowerCase())
    }

    if (table === 'rpg_guild_members') {
        return insert(s.guild_members, { guild_id: Number(params[0]), canonical_jid: params[1], role: params[2], contribution: Number(params[3]), joined_at: Number(params[4]) || nowTs }, r => Number(r.guild_id) === Number(params[0]) && r.canonical_jid === params[1])
    }

    if (table === 'rpg_ledger') {
        const id = ++s.counters.rpg_ledger
        return insert(s.ledger, { id, canonical_jid: params[0], type: params[1], amount: Number(params[2]), item_id: params[3], quantity: Number(params[4]), reference_type: params[5], reference_id: params[6], balance_before: params[7], balance_after: params[8], metadata: params[9], created_at: Number(params[10]) || nowTs })
    }

    return { changes: 0, lastInsertRowid: 0 }
}

function updateRows(table, sql, params) {
    const s = loadState()
    const low = sql.replace(/\s+/g, ' ').trim().toLowerCase()
    let changes = 0

    if (table === 'rpg_players') {
        const jid = params[params.length - 1]
        const player = s.players[jid]
        if (!player) return { changes: 0, lastInsertRowid: 0 }
        player.level = Number(params[0]) || player.level
        player.exp = Number(params[1]) || player.exp
        player.health = Number(params[2]) || player.health
        player.maxHealth = Number(params[3]) || player.maxHealth
        player.stamina = Number(params[4]) || player.stamina
        player.maxStamina = Number(params[5]) || player.maxStamina
        player.reputation = Number(params[6]) || 0
        player.karma = Number(params[7]) || 0
        player.fame = Number(params[8]) || 0
        player.location = params[9] || 'city'
        const parsed = JSON.parse(params[10] || '{}')
        const normalized = normalizeLegacy(parsed)
        Object.defineProperty(normalized, '_createdAt', { value: Number(player._createdAt) || now(), enumerable: false, writable: true, configurable: true })
        Object.defineProperty(normalized, '_updatedAt', { value: now(), enumerable: false, writable: true, configurable: true })
        s.players[jid] = normalized
        markDirty()
        return { changes: 1, lastInsertRowid: 0 }
    }

    const matchId = params[params.length - 1]

    if (table === 'rpg_auctions') {
        const row = s.auctions.find(v => Number(v.id) === Number(matchId))
        if (!row) return { changes: 0, lastInsertRowid: 0 }
        if (/set current_bid=\?, current_bidder=\?/i.test(low)) {
            row.current_bid = Number(params[0])
            row.current_bidder = params[1]
        } else if (/set status=/i.test(low)) {
            row.status = low.match(/set status='([^']+)'/)?.[1] || params[0] || row.status
        }
        changes = 1
    }

    else if (table === 'rpg_market_orders') {
        const row = s.market_orders.find(v => Number(v.id) === Number(matchId))
        if (!row) return { changes: 0, lastInsertRowid: 0 }
        row.quantity = Number(params[0])
        row.status = params[1]
        changes = 1
    }

    else if (table === 'rpg_equipment') {
        const canonical = params[params.length - 2]
        const slot = params[params.length - 1]
        if (/set equipped = case when id = \? then 1 else 0 end/i.test(low)) {
            const id = Number(params[0])
            for (const row of s.equipment) {
                if (row.canonical_jid === canonical && row.slot === slot) {
                    row.equipped = Number(row.id) === id ? 1 : 0
                    changes++
                }
            }
        }
    }

    else if (table === 'rpg_travel') {
        const row = s.travel.find(v => v.canonical_jid === params[params.length - 1])
        if (!row) return { changes: 0, lastInsertRowid: 0 }
        if (/set state='arrived'/i.test(low)) {
            row.state = 'arrived'
            row.finish_at = Number(params[0])
            changes = 1
        }
    }

    else if (table === 'rpg_world_events') {
        if (/set status='closed' where status='active'/i.test(low)) {
            for (const row of s.world_events) if (row.status === 'active') { row.status = 'closed'; changes++ }
        } else if (/where event_id=\?/i.test(low)) {
            const row = s.world_events.find(v => Number(v.event_id) === Number(matchId))
            if (row) { row.status = low.match(/set status='([^']+)'/)?.[1] || row.status; changes = 1 }
        }
    }

    else if (table === 'rpg_event_contributions') {
        if (/set reward_claimed=1/i.test(low)) {
            const row = s.event_contributions.find(v => Number(v.event_id) === Number(params[0]) && v.canonical_jid === params[1])
            if (row) { row.reward_claimed = 1; changes = 1 }
        }
    }

    else if (table === 'rpg_user_quests') {
        if (/set status='completed'/i.test(low)) {
            const row = s.user_quests.find(v => v.canonical_jid === params[1] && v.quest_id === params[2])
            if (row) { row.status = 'completed'; row.completed_at = Number(params[0]); changes = 1 }
        }
    }

    else if (table === 'rpg_user_achievements') {
        if (/set unlocked_at=\?/i.test(low)) {
            const row = s.user_achievements.find(v => v.canonical_jid === params[1] && v.achievement_id === params[2])
            if (row) { row.unlocked_at = Number(params[0]); changes = 1 }
        }
    }

    if (changes) markDirty()
    return { changes, lastInsertRowid: 0 }
}

function deleteRows(table, sql, params) {
    const s = loadState()
    const beforeMap = {
        rpg_cooldowns: s.cooldowns.length,
        rpg_guild_members: s.guild_members.length
    }

    if (table === 'rpg_cooldowns') {
        s.cooldowns = s.cooldowns.filter(v => !(v.canonical_jid === params[0] && v.action === params[1]))
    } else if (table === 'rpg_guild_members') {
        s.guild_members = s.guild_members.filter(v => !(Number(v.guild_id) === Number(params[0]) && v.canonical_jid === params[1]))
    } else {
        return { changes: 0, lastInsertRowid: 0 }
    }

    const after = table === 'rpg_cooldowns' ? s.cooldowns.length : s.guild_members.length
    const changes = beforeMap[table] - after
    if (changes) markDirty()
    return { changes, lastInsertRowid: 0 }
}

function upsertSpecial(table, sql, params) {
    const s = loadState()
    const low = sql.replace(/\s+/g, ' ').trim().toLowerCase()

    if (table === 'rpg_cooldowns') {
        const row = s.cooldowns.find(v => v.canonical_jid === params[0] && v.action === params[1])
        if (row) row.expires_at = Number(params[2])
        else s.cooldowns.push({ canonical_jid: params[0], action: params[1], expires_at: Number(params[2]) })
        markDirty()
        return { changes: 1, lastInsertRowid: 0 }
    }

    if (table === 'rpg_user_quests') {
        const jid = params[0]
        const questId = params[1]
        const add = Number(params[5]) || 0
        const max = Number(params[6]) || 0
        const row = s.user_quests.find(v => v.canonical_jid === jid && v.quest_id === questId)
        if (row) row.progress = Math.min(Number(row.progress || 0) + add, max)
        else s.user_quests.push({ canonical_jid: jid, quest_id: questId, progress: Math.min(Number(params[2]) || 0, max), status: params[3], started_at: Number(params[4]) || now(), completed_at: null })
        markDirty()
        return { changes: 1, lastInsertRowid: 0 }
    }

    if (table === 'rpg_user_achievements') {
        const jid = params[0]
        const achId = params[1]
        const add = Number(params[3]) || 0
        const max = Number(params[4]) || 0
        const row = s.user_achievements.find(v => v.canonical_jid === jid && v.achievement_id === achId)
        if (row) row.progress = Math.min(Number(row.progress || 0) + add, max)
        else s.user_achievements.push({ canonical_jid: jid, achievement_id: achId, progress: Math.min(Number(params[2]) || 0, max), unlocked_at: null })
        markDirty()
        return { changes: 1, lastInsertRowid: 0 }
    }

    if (table === 'rpg_event_contributions') {
        const eventId = Number(params[0])
        const jid = params[1]
        const add = Number(params[2]) || 0
        const row = s.event_contributions.find(v => Number(v.event_id) === eventId && v.canonical_jid === jid)
        if (row) row.contribution = Number(row.contribution || 0) + add
        else s.event_contributions.push({ event_id: eventId, canonical_jid: jid, contribution: add, reward_claimed: 0 })
        markDirty()
        return { changes: 1, lastInsertRowid: 0 }
    }

    return insertRow(table, low, params)
}

class JsonStatement {
    constructor(sql) {
        this.sql = String(sql || '')
    }

    get(...params) {
        const rows = this.all(...params)
        return rows[0]
    }

    all(...params) {
        const low = this.sql.replace(/\s+/g, ' ').trim().toLowerCase()
        if (low.startsWith('select')) return selectRows(this.sql, params)
        return []
    }

    run(...params) {
        const normalized = this.sql.replace(/\s+/g, ' ').trim()
        const low = normalized.toLowerCase()

        if (low.startsWith('insert')) {
            const table = low.match(/insert(?: or ignore)? into\s+([a-z0-9_]+)/i)?.[1]
            if (!table) throw new Error(`RPG JSON DB: INSERT tidak dikenali: ${this.sql}`)
            const result = low.includes('on conflict') ? upsertSpecial(table, normalized, params) : insertRow(table, normalized, params)
            return result
        }

        if (low.startsWith('update')) {
            const table = low.match(/^update\s+([a-z0-9_]+)/i)?.[1]
            if (!table) throw new Error(`RPG JSON DB: UPDATE tidak dikenali: ${this.sql}`)
            return updateRows(table, normalized, params)
        }

        if (low.startsWith('delete')) {
            const table = low.match(/^delete from\s+([a-z0-9_]+)/i)?.[1]
            if (!table) throw new Error(`RPG JSON DB: DELETE tidak dikenali: ${this.sql}`)
            return deleteRows(table, normalized, params)
        }

        return { changes: 0, lastInsertRowid: 0 }
    }
}

let jsonDb = null

export function getRpgDb() {
    if (jsonDb) return jsonDb
    loadState()

    jsonDb = {
        store: loadState(),
        prepare(sql) {
            return new JsonStatement(sql)
        },
        transaction(callback) {
            return (...args) => {
                const snapshot = clone(loadState())
                transactionDepth++
                try {
                    const result = callback(...args)
                    transactionDepth--
                    if (transactionDepth === 0 && transactionDirty) flush()
                    return result
                } catch (error) {
                    state = normalizeState(snapshot)
                    jsonDb.store = state
                    transactionDepth--
                    transactionDirty = false
                    throw error
                }
            }
        },
        save() {
            save()
        },
        close() {
            closeRpgDatabase()
            jsonDb = null
        }
    }

    return jsonDb
}

export function seedRpgData() {
    const s = loadState()
    let changed = false

    const addUnique = (array, key, value) => {
        if (array.some(v => String(v[key]) === String(value[key]))) return false
        array.push(value)
        changed = true
        return true
    }

    const items = [
        ['stone','Stone','mineral','common',1,1,15,30,'Material dasar'],
        ['coal','Coal','mineral','common',1,1,25,50,'Bahan bakar'],
        ['iron_ore','Iron Ore','mineral','common',1,1,35,70,'Bijih besi'],
        ['copper_ore','Copper Ore','mineral','common',1,1,40,80,'Bijih tembaga'],
        ['tin_ore','Tin Ore','mineral','uncommon',1,1,60,120,'Bijih timah'],
        ['nickel_ore','Nickel Ore','mineral','uncommon',1,1,90,180,'Bijih nikel'],
        ['cobalt_ore','Cobalt Ore','mineral','rare',1,1,150,300,'Bijih kobalt'],
        ['silver_ore','Silver Ore','mineral','rare',1,1,300,650,'Bijih perak'],
        ['gold_ore','Gold Ore','mineral','epic',1,1,600,1200,'Bijih emas'],
        ['diamond','Diamond','gem','legendary',1,1,800,2500,'Berlian'],
        ['emerald','Emerald','gem','epic',1,1,1200,3000,'Zamrud'],
        ['ruby','Ruby','gem','epic',1,1,1200,3000,'Delima'],
        ['sapphire','Sapphire','gem','epic',1,1,1100,2800,'Safir'],
        ['platinum','Platinum','mineral','legendary',1,1,3000,8000,'Platina'],
        ['amethyst','Amethyst','gem','rare',1,1,500,1500,'Kecubung'],
        ['jade','Jade','gem','rare',1,1,700,1800,'Giok'],
        ['aquamarine','Aquamarine','gem','rare',1,1,900,2200,'Akuamarin'],
        ['tanzanite','Tanzanite','gem','mythic',1,1,5000,12000,'Tanzanite'],
        ['iron_ingot','Iron Ingot','material','common',1,1,80,160,'Hasil peleburan'],
        ['copper_ingot','Copper Ingot','material','common',1,1,90,180,'Hasil peleburan'],
        ['gold_ingot','Gold Ingot','material','rare',1,1,900,1800,'Hasil peleburan'],
        ['steel','Steel','material','uncommon',1,1,400,800,'Bahan forging'],
        ['bait','Bait','consumable','common',1,1,10,25,'Umpan'],
        ['potion','Potion','consumable','common',1,0,100,250,'Memulihkan HP'],
        ['wood','Wood','material','common',1,1,10,20,'Kayu'],
        ['fiber','Fiber','material','common',1,1,12,25,'Serat'],
        ['glass','Glass','material','common',1,1,20,45,'Kaca'],
        ['rubber','Rubber','material','common',1,1,25,55,'Karet'],
        ['obsidian','Obsidian','material','epic',1,1,900,2200,'Batuan vulkanik'],
        ['ancient_artifact','Ancient Artifact','artifact','mythic',1,1,5000,15000,'Artefak kuno'],
        ['iron','Iron','material','common',1,1,20,50,'Iron legacy alias'],
        ['copper','Copper','material','common',1,1,30,70,'Copper legacy alias'],
        ['gold','Gold','gem','rare',1,1,500,1000,'Gold legacy alias'],
        ['diamond_ore','Diamond Ore','mineral','rare',1,1,700,2000,'Bijih berlian'],
        ['water','Water','consumable','common',1,1,5,10,'Air bersih'],
        ['quartz','Quartz','gem','common',1,1,25,60,'Kristal kuarsa']
    ]
    for (const row of items) addUnique(s.items, 'item_id', {
        item_id: row[0], name: row[1], category: row[2], rarity: row[3], stackable: row[4], tradable: row[5], sell_price: row[6], buy_price: row[7], description: row[8]
    })

    const locations = [
        ['quarry','Quarry',0,100,1,5],
        ['mountain_mine','Mountain Mine',80,300,2,10],
        ['deep_cave','Deep Cave',250,650,3,20],
        ['volcanic_mine','Volcanic Mine',500,900,4,35],
        ['frozen_mine','Frozen Mine',450,900,4,25],
        ['desert_mine','Desert Mine',300,700,3,20],
        ['underwater_mine','Underwater Mine',200,900,5,35],
        ['crystal_cavern','Crystal Cavern',600,1100,5,30],
        ['abandoned_mine','Abandoned Mine',700,1300,6,40],
        ['deep_earth','Deep Earth',1000,2000,8,60]
    ]
    for (const row of locations) addUnique(s.mining_locations, 'location_id', {
        location_id: row[0], name: row[1], min_depth: row[2], max_depth: row[3], required_tool_level: row[4], danger: row[5]
    })

    const ores = [
        ['q_stone','stone','quarry',0,100,50,5,30,4],
        ['q_coal','coal','quarry',0,100,25,2,10,6],
        ['q_iron','iron_ore','quarry',20,120,16,1,8,8],
        ['q_copper','copper_ore','quarry',30,150,12,1,7,10],
        ['m_iron','iron_ore','mountain_mine',80,300,20,2,12,12],
        ['m_nickel','nickel_ore','mountain_mine',120,300,10,1,5,18],
        ['m_silver','silver_ore','mountain_mine',180,300,5,1,3,25],
        ['m_gold','gold_ore','mountain_mine',220,350,2.5,1,2,35],
        ['d_gold','gold_ore','deep_cave',250,700,8,1,4,35],
        ['d_diamond','diamond','deep_cave',400,750,0.65,1,3,80],
        ['d_emerald','emerald','deep_cave',350,650,0.85,1,2,65],
        ['d_ruby','ruby','deep_cave',450,750,0.55,1,2,75],
        ['v_sapphire','sapphire','volcanic_mine',550,900,1.5,1,2,90],
        ['v_platinum','platinum','volcanic_mine',750,950,0.25,1,1,130],
        ['f_amethyst','amethyst','frozen_mine',500,950,2.5,1,3,65],
        ['u_cobalt','cobalt_ore','underwater_mine',450,900,1.0,1,3,95],
        ['c_aqua','aquamarine','crystal_cavern',600,1100,1.3,1,2,110],
        ['c_jade','jade','crystal_cavern',650,1100,1.2,1,2,105],
        ['a_tanzanite','tanzanite','abandoned_mine',900,1400,0.05,1,1,180],
        ['a_obsidian','obsidian','abandoned_mine',750,1300,0.8,1,4,130],
        ['e_diamond','diamond','deep_earth',1100,2000,1.0,1,5,180],
        ['e_platinum','platinum','deep_earth',1300,2000,0.4,1,2,220],
        ['e_tanzanite','tanzanite','deep_earth',1500,2000,0.08,1,1,300],
        ['e_artifact','ancient_artifact','deep_earth',1800,2200,0.01,1,1,500]
    ]
    for (const row of ores) addUnique(s.mining_ores, 'ore_id', {
        ore_id: row[0], item_id: row[1], location_id: row[2], min_depth: row[3], max_depth: row[4], rarity_weight: row[5], min_amount: row[6], max_amount: row[7], xp_reward: row[8]
    })

    const quests = [
        ['daily_mining','Mining Routine','daily','mine',3,250,80,null,0],
        ['daily_fishing','Fisherman Routine','daily','fish',5,300,90,null,0],
        ['daily_work','Hard Worker','daily','work',3,300,70,null,0],
        ['weekly_diamond','Diamond Hunter','weekly','diamond',5,2500,500,'diamond',1],
        ['weekly_market','Trader','weekly','market_sell',10,1500,300,null,0]
    ]
    for (const row of quests) addUnique(s.quests, 'quest_id', {
        quest_id: row[0], name: row[1], type: row[2], objective: row[3], required_value: row[4], reward_money: row[5], reward_exp: row[6], reward_item_id: row[7], reward_item_quantity: row[8], active: 1
    })

    const recipes = [
        ['iron_ingot_recipe','iron_ingot',1,1,300,10],
        ['copper_ingot_recipe','copper_ingot',1,1,300,10],
        ['gold_ingot_recipe','gold_ingot',1,5,600,25],
        ['steel_recipe','steel',1,8,900,45],
        ['glass_recipe','glass',1,3,300,15]
    ]
    for (const row of recipes) addUnique(s.recipes, 'recipe_id', {
        recipe_id: row[0], output_item_id: row[1], output_quantity: row[2], required_level: row[3], craft_time: row[4], xp_reward: row[5]
    })

    const ingredients = [
        ['iron_ingot_recipe','iron_ore',2],
        ['copper_ingot_recipe','copper_ore',2],
        ['gold_ingot_recipe','gold_ore',2],
        ['steel_recipe','iron_ingot',2],
        ['steel_recipe','coal',1],
        ['glass_recipe','quartz',2]
    ]
    for (const row of ingredients) {
        if (!s.recipe_ingredients.some(v => v.recipe_id === row[0] && v.item_id === row[1])) {
            s.recipe_ingredients.push({ recipe_id: row[0], item_id: row[1], quantity: row[2] })
            changed = true
        }
    }

    const jobs = [
        ['miner','Miner',250,700,1,40,600],
        ['farmer','Farmer',200,600,1,35,600],
        ['fisherman','Fisherman',220,650,1,40,600],
        ['chef','Chef',300,900,3,60,900],
        ['programmer','Programmer',500,1400,5,100,1200],
        ['engineer','Engineer',700,2000,8,150,1800],
        ['blacksmith','Blacksmith',900,2500,10,180,1800]
    ]
    for (const row of jobs) addUnique(s.jobs, 'job_id', {
        job_id: row[0], name: row[1], salary_min: row[2], salary_max: row[3], required_level: row[4], exp_reward: row[5], cooldown: row[6]
    })

    const locs = [
        ['city','Kota Erine','world',0,1,0,{ minDepth: 0, maxDepth: 0 }],
        ['forest','Hutan','world',900,1,8,{ minDepth: 0, maxDepth: 100 }],
        ['mountain','Pegunungan','world',2700,3,20,{ minDepth: 500, maxDepth: 1000 }],
        ['desert','Gurun','world',1800,2,18,{ minDepth: 300, maxDepth: 800 }],
        ['deep_mine','Deep Mine','world',5400,6,40,{ minDepth: 800, maxDepth: 1600 }],
        ['ocean','Laut','world',3600,2,15,{ minDepth: 0, maxDepth: 0 }]
    ]
    for (const row of locs) addUnique(s.locations, 'location_id', {
        location_id: row[0], name: row[1], region: row[2], travel_time: row[3], required_level: row[4], danger: row[5], metadata: JSON.stringify(row[6])
    })

    const achievements = [
        ['first_diamond','Diamond Hunter I','Menemukan 1 diamond','diamond',1,500,50,'Diamond Hunter'],
        ['hundred_mining','Master Miner','Melakukan mining 100 kali','mining',100,5000,500,'Master Miner'],
        ['millionaire','Millionaire','Memiliki $1.000.000','money',1000000,10000,1000,'Millionaire'],
        ['dungeon_slayer','Dungeon Slayer I','Menyelesaikan 10 dungeon','dungeon',10,8000,800,'Dungeon Slayer'],
        ['guild_founder','Guild Founder','Membuat sebuah guild','guild',1,5000,500,'Guild Founder'],
        ['deep_miner','Deep Miner','Mencapai Deep Earth','deep_mine',1,15000,1500,'Deep Miner']
    ]
    for (const row of achievements) addUnique(s.achievements, 'achievement_id', {
        achievement_id: row[0], name: row[1], description: row[2], condition_type: row[3], condition_value: row[4], reward_money: row[5], reward_exp: row[6], reward_title: row[7]
    })

    if (changed) save()
    return s
}

export function incrementQuest(jid, objective, amount = 1) {
    const s = loadState()
    const rows = s.quests.filter(v => Number(v.active) === 1 && v.objective === objective)
    const user = getRpgUser(jid)
    if (!user || !rows.length) return []

    const results = []
    const t = now()

    for (const quest of rows) {
        let stateRow = s.user_quests.find(v => v.canonical_jid === jid && v.quest_id === quest.quest_id)
        if (!stateRow) {
            stateRow = { canonical_jid: jid, quest_id: quest.quest_id, progress: 0, status: 'active', started_at: t, completed_at: null }
            s.user_quests.push(stateRow)
        }

        if (stateRow.status === 'completed') continue

        stateRow.progress = Math.min(
            Number(quest.required_value) || 1,
            Number(stateRow.progress || 0) + Math.max(0, Number(amount) || 0)
        )

        if (stateRow.progress >= Number(quest.required_value) && stateRow.status !== 'completed') {
            stateRow.status = 'completed'
            stateRow.completed_at = t

            if (quest.reward_money) addMoney(jid, Number(quest.reward_money), 'quest_reward', { type: 'quest', id: quest.quest_id })
            if (quest.reward_exp) user.exp = Number(user.exp || 0) + Number(quest.reward_exp)
            if (quest.reward_item_id && quest.reward_item_quantity) addItem(jid, quest.reward_item_id, Number(quest.reward_item_quantity))

            results.push(clone(quest))
        }
    }

    markDirty()
    return results
}

export function incrementAchievement(jid, type, amount = 1) {
    const s = loadState()
    const rows = s.achievements.filter(v => v.condition_type === type)
    const user = getRpgUser(jid)
    if (!user || !rows.length) return []

    const result = []
    const t = now()

    for (const ach of rows) {
        let stateRow = s.user_achievements.find(v => v.canonical_jid === jid && v.achievement_id === ach.achievement_id)
        if (!stateRow) {
            stateRow = { canonical_jid: jid, achievement_id: ach.achievement_id, progress: 0, unlocked_at: null }
            s.user_achievements.push(stateRow)
        }

        if (stateRow.unlocked_at) continue

        stateRow.progress = Math.min(
            Number(ach.condition_value) || 1,
            Number(stateRow.progress || 0) + Math.max(0, Number(amount) || 0)
        )

        if (stateRow.progress >= Number(ach.condition_value) && !stateRow.unlocked_at) {
            stateRow.unlocked_at = t
            if (ach.reward_money) addMoney(jid, Number(ach.reward_money), 'achievement_reward', { type: 'achievement', id: ach.achievement_id })
            if (ach.reward_exp) user.exp = Number(user.exp || 0) + Number(ach.reward_exp)
            if (ach.reward_title) user.title = ach.reward_title
            result.push(clone(ach))
        }
    }

    markDirty()
    return result
}

export function migrateLegacyUsers(users = {}) {
    const s = loadState()
    let created = 0

    for (const [jid, legacy] of Object.entries(users || {})) {
        if (!legacy || typeof legacy !== 'object') continue
        if (!s.players[jid]) {
            createPlayer(jid, legacy)
            created++
        }
    }

    if (created) save()
    return created
}

loadState()
seedRpgData()
