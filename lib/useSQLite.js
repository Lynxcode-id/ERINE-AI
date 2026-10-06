
import Database from 'better-sqlite3'
import { BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'

const CHUNK = 500
const CREDS_BACKUP_EVERY = 15 * 1000
const LOCK_RETRY_MS = 500
const LOCK_TIMEOUT_MS = 30000

function withRetry(fn, tries = 5) {
    for (let i = 0; i < tries; i++) {
        try { return fn() }
        catch (e) {
            if (e?.code === 'SQLITE_BUSY' && i < tries - 1) continue
            throw e
        }
    }
}

export default async function useSQLiteAuthState(folder = './sessions') {
    const dbPath = path.join(folder, 'auth.db')
    const credsBackupPath = path.join(folder, 'creds.backup.json')
    const lockPath = path.join(folder, '.auth.lock')
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })

    const acquireLock = () => {
        const started = Date.now()
        while (true) {
            try {
                fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, started: Date.now() }), { flag: 'wx' })
                return
            } catch (error) {
                if (error?.code !== 'EEXIST') throw error
                let ownerPid = 0
                try { ownerPid = Number(JSON.parse(fs.readFileSync(lockPath, 'utf8'))?.pid || 0) } catch {}
                let alive = false
                if (ownerPid && ownerPid !== process.pid) {
                    try { process.kill(ownerPid, 0); alive = true } catch {}
                }
                if (!alive) {
                    try { fs.unlinkSync(lockPath) } catch {}
                    continue
                }
                if (Date.now() - started >= LOCK_TIMEOUT_MS) {
                    throw new Error(`Auth state sedang dipakai proses lain (PID ${ownerPid}). Hentikan instance lama sebelum menjalankan bot.`)
                }
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_RETRY_MS)
            }
        }
    }

    acquireLock()

    let db
    try {
        db = new Database(dbPath)
        db.pragma('journal_mode = WAL')
        db.pragma('synchronous = NORMAL')
        db.pragma('temp_store = MEMORY')
        db.pragma('busy_timeout = 15000')
        db.pragma('foreign_keys = ON')
        db.pragma('wal_autocheckpoint = 500')
        db.pragma(`journal_size_limit = ${8 * 1024 * 1024}`)

        db.exec(`
        CREATE TABLE IF NOT EXISTS creds (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS keys (
          category TEXT NOT NULL,
          id TEXT NOT NULL,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (category, id)
        );

        CREATE INDEX IF NOT EXISTS idx_keys_category ON keys(category);
        CREATE INDEX IF NOT EXISTS idx_keys_updated_at ON keys(updated_at);
      `)
    } catch (error) {
        try { fs.unlinkSync(lockPath) } catch {}
        throw error
    }

    try {
        const chk = db.pragma('quick_check', { simple: true })
        if (chk !== 'ok') console.error(`[AUTH-DB] quick_check: ${chk} (database sesi mungkin rusak, pertimbangkan .delsesi)`)
    } catch (e) { console.error('[AUTH-DB] quick_check gagal:', e.message) }

    const stmtGetCreds = db.prepare(`SELECT data FROM creds WHERE id = 1`)
    const stmtSetCreds = db.prepare(`
    INSERT INTO creds (id, data, updated_at) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `)
    const stmtSetKey = db.prepare(`
    INSERT INTO keys (category, id, data, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(category, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `)
    const stmtDelKey = db.prepare(`DELETE FROM keys WHERE category = ? AND id = ?`)
    const stmtDelCategory = db.prepare(`DELETE FROM keys WHERE category = ?`)
    const stmtDelAllKeys = db.prepare(`DELETE FROM keys`)
    const stmtFindSessions = db.prepare(`SELECT id FROM keys WHERE category = 'session' AND (id LIKE ? ESCAPE '\\' OR id LIKE ? ESCAPE '\\')`)

    function parseJSON(raw) {
        if (!raw) return null
        try { return JSON.parse(raw, BufferJSON.reviver) } catch { return null }
    }

    let lastCredsBackup = 0
    function backupCreds(json, force = false) {
        const now = Date.now()
        if (!force && now - lastCredsBackup < CREDS_BACKUP_EVERY) return
        lastCredsBackup = now
        try {
            const tmp = credsBackupPath + '.tmp'
            fs.writeFileSync(tmp, json)
            fs.renameSync(tmp, credsBackupPath)
        } catch (e) { console.error('[AUTH-DB] backup creds gagal:', e.message) }
    }

    async function readCreds() {
        const row = withRetry(() => stmtGetCreds.get())
        const fromDb = row?.data ? parseJSON(row.data) : null
        if (fromDb) return fromDb

        try {
            if (fs.existsSync(credsBackupPath)) {
                const raw = fs.readFileSync(credsBackupPath, 'utf8')
                const restored = parseJSON(raw)
                if (restored) {
                    console.error('[AUTH-DB] creds di DB rusak/hilang -> dipulihkan dari sessions/creds.backup.json')
                    withRetry(() => stmtSetCreds.run(raw, Date.now()))
                    return restored
                }
            }
        } catch (e) { console.error('[AUTH-DB] restore creds gagal:', e.message) }
        return null
    }

    let credsJsonCache = null
    async function writeCreds(creds) {
        const data = JSON.stringify(creds, BufferJSON.replacer)
        credsJsonCache = data
        withRetry(() => stmtSetCreds.run(data, Date.now()))
        backupCreds(data)
    }

    async function getKeys(category, ids) {
        const out = {}
        if (!ids.length) return out

        for (let i = 0; i < ids.length; i += CHUNK) {
            const part = ids.slice(i, i + CHUNK)
            const placeholders = part.map(() => '?').join(',')
            const rows = withRetry(() =>
                db.prepare(`SELECT id, data FROM keys WHERE category = ? AND id IN (${placeholders})`)
                    .all(category, ...part)
            )

            for (const row of rows) {
                let value = parseJSON(row.data)
                if (value === null) {
                    withRetry(() => stmtDelKey.run(category, row.id))
                    console.error(`[AUTH-DB] row rusak dihapus: ${category}/${row.id}`)
                    continue
                }
                if (category === 'app-state-sync-key') {
                    try { value = proto.Message.AppStateSyncKeyData.fromObject(value) } catch { /* keep raw */ }
                }
                out[row.id] = value
            }
        }
        for (const id of ids) if (!(id in out)) out[id] = null
        return out
    }

    async function setKeys(data) {
        const now = Date.now()
        const run = db.transaction((data) => {
            for (const category of Object.keys(data)) {
                const entries = data[category] || {}
                for (const id of Object.keys(entries)) {
                    const value = entries[id]
                    if (value === null || value === undefined) {
                        stmtDelKey.run(category, id)
                    } else {
                        stmtSetKey.run(category, id, JSON.stringify(value, BufferJSON.replacer), now)
                    }
                }
            }
        })
        withRetry(() => run(data))
    }

    async function deleteKey(category, id) {
        withRetry(() => stmtDelKey.run(category, id))
    }

    async function resetCategory(category) {
        withRetry(() => stmtDelCategory.run(category))
    }

    async function resetKeys() {
        withRetry(() => stmtDelAllKeys.run())
    }

    function findSessionIds(user) {
        const raw = String(user || '')
        const base = raw.split('@')[0].split(':')[0].replace(/[^0-9a-zA-Z]/g, '')
        if (!base) return []
        return withRetry(() => stmtFindSessions.all(`${base}.%`, `${base}\_%`)).map((r) => r.id)
    }

    const walTimer = setInterval(() => {
        try {
            const walSize = (() => { try { return fs.statSync(dbPath + '-wal').size } catch { return 0 } })()
            db.pragma(walSize > 32 * 1024 * 1024 ? 'wal_checkpoint(TRUNCATE)' : 'wal_checkpoint(PASSIVE)')
        } catch { /* sibuk, coba lagi nanti */ }
    }, 5 * 60 * 1000)
    walTimer.unref?.()

    const creds = (await readCreds()) || initAuthCreds()

    const state = {
        creds,
        keys: {
            get: async (type, ids) => getKeys(type, ids),
            set: async (data) => setKeys(data)
        }
    }

    async function saveCreds() {
        await writeCreds(state.creds)
    }

    async function close() {
        clearInterval(walTimer)
        try { if (credsJsonCache) backupCreds(credsJsonCache, true) } catch { }
        try { db.pragma('wal_checkpoint(TRUNCATE)') } catch {}
        try { db.close() } catch {}
        try {
            const ownerPid = Number(JSON.parse(fs.readFileSync(lockPath, 'utf8'))?.pid || 0)
            if (!ownerPid || ownerPid === process.pid) fs.unlinkSync(lockPath)
        } catch {}
    }

    return {
        state,
        saveCreds,
        close,
        helpers: {
            resetKeys, resetCategory, deleteKey, findSessionIds,
            getKey: (c, id) => getKeys(c, [id]).then(r => r[id]),
            setKey: async (c, id, v) => setKeys({ [c]: { [id]: v } })
        }
    }
}
