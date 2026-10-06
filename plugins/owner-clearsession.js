import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

const DB_FILE = path.resolve('./sessions/auth.db')
const CFG_FILE = path.resolve('./sessions/autodelsesi.json')
const DAY = 24 * 60 * 60 * 1000
const INTERVAL = 60 * 60 * 1000

const LABEL = {
    'session': 'Session kontak',
    'sender-key': 'Sender key',
    'sender-key-memory': 'Sender key memory'
}

const sizeOf = (f) => { try { return fs.statSync(f).size } catch { return 0 } }
const fmt = (b) => (b > 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB')
const diskSize = () => sizeOf(DB_FILE) + sizeOf(DB_FILE + '-wal')

const readCfg = () => { try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) } catch { return { enabled: true } } }
const isAuto = () => readCfg().enabled !== false
const setAuto = (enabled) => {
    fs.mkdirSync(path.dirname(CFG_FILE), { recursive: true })
    fs.writeFileSync(CFG_FILE, JSON.stringify({ enabled }))
}

function open() {
    if (!fs.existsSync(DB_FILE)) throw new Error('sessions/auth.db tidak ditemukan.')
    return new Database(DB_FILE, { timeout: 8000 })
}

function cleanSessions(mode = 'all') {
    const db = open()
    try {
        const before = diskSize()
        const removed = {}

        if (mode === 'all') {
            for (const c of Object.keys(LABEL)) {
                removed[c] = db.prepare('DELETE FROM keys WHERE category = ?').run(c).changes
            }
        } else {
            const now = Date.now()
            const del = db.prepare('DELETE FROM keys WHERE category = ? AND updated_at < ?')
            removed['sender-key'] = del.run('sender-key', now - 7 * DAY).changes
            removed['session'] = del.run('session', now - 30 * DAY).changes
            removed['sender-key-memory'] = removed['sender-key'] > 0
                ? db.prepare('DELETE FROM keys WHERE category = ?').run('sender-key-memory').changes
                : 0
        }

        try { db.pragma('wal_checkpoint(TRUNCATE)') } catch {}
        try { db.exec('VACUUM') } catch {}
        try { db.pragma('wal_checkpoint(TRUNCATE)') } catch {}

        return { removed, before, after: diskSize(), total: Object.values(removed).reduce((a, b) => a + b, 0) }
    } finally {
        try { db.close() } catch {}
    }
}

if (global.erineAutoClearSession) clearInterval(global.erineAutoClearSession)
global.erineAutoClearSession = setInterval(() => {
    if (!isAuto()) return
    try {
        const r = cleanSessions('old')
        console.log(`[ERINE] Auto-clear session: ${r.total} data usang dihapus (${fmt(r.before)} -> ${fmt(r.after)})`)
    } catch (e) {
        console.error('[ERINE] Auto-clear session gagal:', e.message)
    }
}, INTERVAL)
global.erineAutoClearSession.unref?.()

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const sub = (args[0] || '').toLowerCase()
    try {
        if (command === 'autodelsesi' || command === 'autoclearsession') {
            if (['on', 'aktif', 'enable', '1'].includes(sub)) {
                setAuto(true)
                return m.reply('✅ Auto delete session *AKTIF* (dicek tiap 1 jam, hanya data usang).')
            }
            if (['off', 'nonaktif', 'disable', '0'].includes(sub)) {
                setAuto(false)
                return m.reply('✅ Auto delete session *DIMATIKAN*.\nBersihkan manual dengan *' + usedPrefix + 'delsesi*')
            }
            return m.reply(
                `*– 乂 Auto Delete Session*\n\nStatus: *${isAuto() ? 'ON' : 'OFF'}*\n\n` +
                `• ${usedPrefix}autodelsesi on\n• ${usedPrefix}autodelsesi off`
            )
        }

        if (sub === 'status' || sub === 'cek') {
            const db = open()
            let rows
            try { rows = db.prepare('SELECT category, COUNT(*) AS n FROM keys GROUP BY category ORDER BY category').all() } finally { db.close() }
            const list = rows.map((r) => `• ${r.category}: *${r.n}*`).join('\n') || '• (kosong)'
            return m.reply(
                `*– 乂 Session Status*\n\n${list}\n\n📦 Ukuran: *${fmt(diskSize())}*\n` +
                `⏱️ Auto-clear: *${isAuto() ? 'ON (tiap 1 jam)' : 'OFF'}*`
            )
        }

        const mode = ['old', 'usang'].includes(sub) ? 'old' : 'all'
        await m.reply(mode === 'all' ? '⏳ Menghapus semua session (lama & baru)...' : '⏳ Membersihkan session usang...')

        const r = cleanSessions(mode)
        const list = Object.keys(LABEL).map((c) => `• ${LABEL[c]}: *${r.removed[c] || 0}*`).join('\n')
        await m.reply(
            `*– 乂 Clear Session*\n\n✅ Session ${mode === 'all' ? 'berhasil dihapus semua' : 'usang berhasil dibersihkan'}!\n\n${list}\n\n` +
            `📦 Ukuran: *${fmt(r.before)}* → *${fmt(r.after)}*\n🔒 creds, pre-key & app-state tidak disentuh` +
            (mode === 'all' ? '\n\nℹ️ Session baru dibuat otomatis saat kontak chat lagi.' : '')
        )
    } catch (e) {
        m.reply(`⚠️ Gagal clear session.\n_${e.message}_\n\nCoba: *${usedPrefix}delsesi status*`)
    }
}

handler.command = ['autodelsesi', 'autoclearsession', 'delsesi', 'clearsesi', 'deletesesi', 'clearsession', 'clearsessions']
handler.help = ['autodelsesi on/off', 'clearsession', 'clearsession old', 'clearsession status']
handler.tags = ['owner']
handler.owner = true

export default handler
