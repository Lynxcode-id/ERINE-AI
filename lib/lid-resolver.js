import fs from 'fs'
import path from 'path'

const FILE = path.resolve('./lid-map.json')
const lidToPn = new Map()
const tried = new Map()

const clean = (j) => String(j || '').replace(/:\d+(?=@)/, '').trim()
const isLid = (j) => /@lid$/.test(j)
const isPn = (j) => /@s\.whatsapp\.net$/.test(j)
const asPn = (v) => {
    const s = clean(v)
    if (isPn(s)) return s
    const d = s.replace(/[^0-9]/g, '')
    return /^\+?\d{8,15}$/.test(s.replace(/\s/g, '')) && d ? `${d}@s.whatsapp.net` : ''
}

try {
    if (fs.existsSync(FILE)) {
        const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
        for (const [k, v] of Object.entries(raw)) if (isLid(k) && isPn(v)) lidToPn.set(k, v)
    }
} catch (e) { console.error('[LID] gagal baca lid-map.json:', e.message) }

let saveTimer = null
function scheduleSave() {
    if (saveTimer) return
    saveTimer = setTimeout(() => {
        saveTimer = null
        try {
            const tmp = FILE + '.tmp'
            fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(lidToPn)))
            fs.renameSync(tmp, FILE)
        } catch (e) { console.error('[LID] gagal simpan lid-map.json:', e.message) }
    }, 5000)
    saveTimer.unref?.()
}

function migrateFake(lid, pn) {
    try {
        const users = global.db?.data?.users
        if (!users) return
        const fakeKey = `${lid.split('@')[0]}@s.whatsapp.net`
        const fake = users[fakeKey]
        if (!fake || fakeKey === pn) return
        const real = users[pn]
        if (!real) users[pn] = fake
        else if (fake.registered && !real.registered) users[pn] = { ...real, ...fake }
        delete users[fakeKey]
        global.db.write?.()
        console.log(`[LID] data user ${fakeKey} digabung ke ${pn}`)
    } catch { }
}

export function learn(a, b) {
    a = clean(a); b = asPn(b) || clean(b)
    if (isPn(a) && isLid(b)) [a, b] = [b, a]
    if (!(isLid(a) && isPn(b))) return false
    if (lidToPn.get(a) === b) return false
    lidToPn.set(a, b)
    ;(global.lidMap ||= new Map()).set(a, b)
    ;(global.pnMap ||= new Map()).set(a, b.split('@')[0])
    if (global.conn) (global.conn.isLid ||= {})[a] = b
    migrateFake(a, b)
    scheduleSave()
    return true
}

export const lookup = (lid) => lidToPn.get(clean(lid)) || ''

export function learnParticipants(list) {
    for (const p of list || []) {
        if (!p || typeof p !== 'object') continue
        const ids = [p.id, p.lid, p.jid, p.phoneNumber, p.participantAlt, p.pn].map(clean).filter(Boolean)
        const lid = ids.find(isLid)
        const pn = ids.map(asPn).find(Boolean)
        if (lid && pn) learn(lid, pn)
    }
}

function learnContact(c) {
    if (!c) return
    const ids = [c.id, c.lid, c.jid, c.phoneNumber].map(clean).filter(Boolean)
    const lid = ids.find(isLid)
    const pn = ids.map(asPn).find(Boolean)
    if (lid && pn) learn(lid, pn)
}

export async function resolve(conn, jid, groupJid) {
    jid = clean(jid)
    if (isPn(jid)) return jid
    if (!isLid(jid)) return ''
    let hit = lidToPn.get(jid)
    if (hit) return hit

    try { // Baileys: mapping bawaan (tersimpan di auth.db kategori lid-mapping)
        const r = await conn?.signalRepository?.lidMapping?.getPNForLID?.(jid)
        if (r) learn(jid, String(r))
    } catch { }
    if ((hit = lidToPn.get(jid))) return hit

    if (Date.now() - (tried.get(jid) || 0) < 60 * 1000) return ''
    tried.set(jid, Date.now())
    if (tried.size > 3000) tried.clear()

    try { // participant grup membawa 2 identitas (LID + PN)
        if (groupJid && String(groupJid).endsWith('@g.us')) {
            const meta = conn?.chats?.[groupJid]?.metadata || await conn?.groupMetadata?.(groupJid).catch(() => null)
            learnParticipants(meta?.participants)
        }
        if (!lidToPn.get(jid)) {
            for (const chat of Object.values(conn?.chats || {})) learnParticipants(chat?.metadata?.participants)
        }
    } catch { }
    if ((hit = lidToPn.get(jid))) return hit

    try {
        const [res] = (await conn?.onWhatsApp?.(jid)) || []
        if (res?.jid && isPn(clean(res.jid))) learn(jid, res.jid)
        if (res?.lid && res?.jid) learn(res.lid, res.jid)
    } catch { }
    return lidToPn.get(jid) || ''
}

export async function fixMentions(conn, content, chat) {
    if (!content || typeof content !== 'object') return content
    const hasLid = (o) => Array.isArray(o?.mentionedJid) && o.mentionedJid.some((j) => isLid(clean(j)))
    if (!hasLid(content) && !hasLid(content.contextInfo)) return content

    const rep = new Map()
    const fixList = async (arr) => {
        const out = []
        for (const j of arr) {
            const c = clean(j)
            if (isLid(c)) {
                const pn = await resolve(conn, c, chat)
                if (pn) { rep.set(c.split('@')[0], pn.split('@')[0]); out.push(pn); continue }
            }
            out.push(j)
        }
        return out
    }

    const next = { ...content }
    if (hasLid(next)) next.mentionedJid = await fixList(next.mentionedJid)
    if (next.contextInfo && hasLid(next.contextInfo)) {
        next.contextInfo = { ...next.contextInfo, mentionedJid: await fixList(next.contextInfo.mentionedJid) }
    }
    for (const key of ['text', 'caption']) {
        if (typeof next[key] !== 'string') continue
        for (const [from, to] of rep) next[key] = next[key].split('@' + from).join('@' + to)
    }
    return next
}

export function bindEvents(conn) {
    if (!conn?.ev || conn.__lidBound) return
    conn.__lidBound = true
    const safe = (fn) => (...a) => { try { fn(...a) } catch { } }

    conn.ev.on('lid-mapping.update', safe((u) => {
        for (const x of Array.isArray(u) ? u : [u]) learn(x?.lid, x?.pn || x?.pnJid || x?.phoneNumber)
    }))
    conn.ev.on('contacts.upsert', safe((cs) => cs.forEach(learnContact)))
    conn.ev.on('contacts.update', safe((cs) => cs.forEach(learnContact)))
    conn.ev.on('groups.upsert', safe((gs) => gs.forEach((g) => learnParticipants(g.participants))))
    conn.ev.on('group-participants.update', safe((e) => learnParticipants(e?.participants)))
    conn.ev.on('messages.upsert', safe(({ messages }) => {
        for (const m of messages || []) {
            learn(m?.key?.participant, m?.key?.participantAlt)
            learn(m?.key?.remoteJid, m?.key?.remoteJidAlt)
        }
    }))
}

export function cleanupFakeUsers(db) {
    try {
        const users = db?.data?.users
        if (!users) return
        const doomed = []
        for (const [k, v] of Object.entries(users)) {
            if (/@(g\.us|newsletter|broadcast)$/.test(k)) { doomed.push(k); continue }
            const num = k.split('@')[0]
            if (isPn(k) && num.length >= 15 && !v?.registered && !(v?.exp > 0) && !(v?.money > 0) && !((v?.level || 0) > 1)) doomed.push(k)
        }
        if (!doomed.length) return
        const bak = path.resolve('database.json.pre-lidclean')
        try { if (!fs.existsSync(bak) && fs.existsSync('database.json')) fs.copyFileSync('database.json', bak) } catch { }
        for (const k of doomed) delete users[k]
        db.write?.()
        console.log(`[LID] ${doomed.length} user sampah (LID dianggap nomor / key grup) dibersihkan dari database`)
    } catch (e) { console.error('[LID] cleanup gagal:', e.message) }
}
