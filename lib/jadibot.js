import path from 'path'
import fs from 'fs'
import pino from 'pino'
import { makeWASocket } from './simple.js'
import * as baileys from '@whiskeysockets/baileys'
import * as handlerModule from '../handler.js'
import NodeCache from 'node-cache'
import { dbSwapLock } from './dbLock.js'

const {
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    makeInMemoryStore,
    Browsers
} = baileys

const delay = ms => new Promise(res => setTimeout(res, ms))

const ROOT = path.join(process.cwd(), 'session', 'jadibot')
const CLONE_REQUEST_FILE = path.join(ROOT, '_clone_requests.json')
const DB_PATH = path.join(process.cwd(), 'dbjadibot.json')
const JADIBOT_DB_DEFAULTS = { users: {}, chats: {}, settings: {}, msgs: {}, sticker: {}, game: {}, stats: {}, opts: {} }

function getJadibotDB() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(JADIBOT_DB_DEFAULTS, null, 2))
    }
    const loaded = { ...JADIBOT_DB_DEFAULTS, ...JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) }
    return {
        data: loaded,
        write: async function() {
            try {
                await fs.promises.writeFile(DB_PATH, JSON.stringify(this.data, null, 2))
            } catch (e) {
                console.error('Gagal save dbjadibot.json:', e)
            }
        }
    }
}
const globalJadibotDb = getJadibotDB()

const sessions = global.jadibotSessions ??= new Map()
const reconnect = new Map()
const stoppingSessions = new Set()
const requestQueue = []
let isProcessingQueue = false

const MODE = {
    REGULAR: 'regular',
    PREMIUM: 'premium',
    CLONE: 'clone'
}

async function processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return
    isProcessingQueue = true
    while (requestQueue.length > 0) {
        const fn = requestQueue.shift()
        try {
            await fn()
        } catch (e) {
            console.error('Queue error:', e)
        }
        await delay(5000)
    }
    isProcessingQueue = false
}

function addToQueue(fn) {
    requestQueue.push(fn)
    processQueue()
}

if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true })

function readJSON(file, fallback = {}) {
    try {
        if (!fs.existsSync(file)) return fallback
        return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {
        return fallback
    }
}

function writeJSON(file, data) {
    if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

function getJid(jid) {
    return jid ? String(jid).replace(/[^0-9]/g, '') : ''
}

function getPath(jid) {
    return path.join(ROOT, getJid(jid))
}

function normalizeMode(input) {
    if (typeof input === 'boolean') return input ? MODE.PREMIUM : MODE.REGULAR
    if (typeof input === 'string') {
        const v = input.toLowerCase()
        if (['clone', 'full', '100', 'all'].includes(v)) return MODE.CLONE
        if (['premium', 'prem', 'vip'].includes(v)) return MODE.PREMIUM
        return MODE.REGULAR
    }
    return MODE.REGULAR
}

function canUsePremiumFeature(mode) {
    return mode === MODE.PREMIUM || mode === MODE.CLONE
}

export function isActive(jid) {
    return sessions.has(getJid(jid))
}

export function isJadibotPremium(jid) {
    const id = getJid(jid)
    const child = sessions.get(id)
    return child?.jadibotMode === MODE.PREMIUM || child?.jadibotMode === MODE.CLONE
}

export function setJadibotPremium(jid, status = true) {
    const id = getJid(jid)
    const child = sessions.get(id)
    if (child) {
        const botJid = child.user?.jid || (id + '@s.whatsapp.net')
        child.jadibotMode = status ? MODE.PREMIUM : MODE.REGULAR
        child.isPremium = status
        if (child.db.data.settings[botJid]) {
            child.db.data.settings[botJid].jadibotMode = child.jadibotMode
            child.db.data.settings[botJid].jadibotPremium = status
            child.db.write()
        }
    }
}

export function getCloneRequests() {
    return readJSON(CLONE_REQUEST_FILE, { pending: [] })
}

export function requestCloneJadibot(payload) {
    const db = getCloneRequests()
    const now = Date.now()

    const req = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        target: getJid(payload?.target),
        requester: getJid(payload?.requester),
        requesterName: payload?.requesterName || '',
        chat: payload?.chat || '',
        note: payload?.note || '',
        createdAt: now,
        status: 'pending'
    }

    if (!req.target || !req.requester) throw new Error('Target atau requester kosong.')

    db.pending = Array.isArray(db.pending) ? db.pending : []
    db.pending.push(req)
    writeJSON(CLONE_REQUEST_FILE, db)
    return req
}

export function consumeCloneRequest(targetJid) {
    const target = getJid(targetJid)
    const db = getCloneRequests()
    db.pending = Array.isArray(db.pending) ? db.pending : []

    const idx = db.pending.findIndex(v => v.target === target && v.status === 'pending')
    if (idx === -1) return null

    const [req] = db.pending.splice(idx, 1)
    req.status = 'approved'
    req.approvedAt = Date.now()
    writeJSON(CLONE_REQUEST_FILE, db)
    return req
}

export async function startJadibot(conn, m, jid, isReconnect = false, modeInput = 'regular') {
    const id = getJid(jid)
    const botJid = id + '@s.whatsapp.net'
    const mode = normalizeMode(modeInput)
    const isPremium = canUsePremiumFeature(mode)

    if (sessions.has(id) && !isReconnect) throw '❌ Sesi Jadibot ini sudah aktif!'

    if (mode === MODE.PREMIUM) {
        const user = global.db.data.users[m?.sender || botJid] || {}
        if (!user.premium || (user.premiumTime && user.premiumTime < Date.now())) {
            throw new Error('Premium aktif diperlukan untuk menjalankan mode Jadibot Premium.\nSilakan perpanjang status premium kamu.')
        }
    }

    const sessionPath = getPath(jid)
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()
    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
    const msgRetryCounterCache = new NodeCache()
    const groupCache = new NodeCache({stdTTL: 5 * 60, useClones: false})
    const child = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Edge'),
        markOnlineOnConnect: true,
        syncFullHistory: true,
        generateHighQualityLinkPreview: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        msgRetryCounterCache,
        cachedGroupMetadata: async (groupId) => groupCache.get(groupId),
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage ||
                message.interactiveMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        },
        getMessage: async (key) => {
            if (store) {
                const normalizedJid = jidNormalizedUser(key.remoteJid)
                const msg = await store.loadMessage(normalizedJid, key.id)
                return msg?.message || undefined
            }
            return { conversation: 'Erine-MD Jadibot Message' }
        }
    })

    store.bind(child.ev)

    if (typeof child.isLid === 'undefined') child.isLid = conn.isLid || global.isLid || {}
    if (typeof child.lidMap === 'undefined') child.lidMap = conn.lidMap || global.lidMap || new Map()
    if (typeof child.normalizeJid === 'undefined') child.normalizeJid = conn.normalizeJid || global.normalizeJid
    if (typeof child.resolvePn === 'undefined') {
        child.resolvePn = global.resolvePn || conn.resolvePn || (async (id) => id.replace(/[^0-9]/g, ''))
    }

    child.db = globalJadibotDb

    if (!child.db.data.settings) child.db.data.settings = {}
    if (!child.db.data.settings[botJid]) {
        child.db.data.settings[botJid] = {
            autoread: false,
            pconly: false,
            gconly: false,
            self: false,
            jadibotMode: mode,
            jadibotPremium: isPremium
        }
    } else {
        child.db.data.settings[botJid].jadibotMode = mode
        child.db.data.settings[botJid].jadibotPremium = isPremium
    }

    await child.db.write()

    child.isJadibot = true
    child.jadibotMode = mode
    child.isPremium = isPremium
    child.public = true
    child.self = false

    const dbSaveInterval = setInterval(async () => {
        if (sessions.has(id) && child.db) {
            await child.db.write()
            try { await child.sendPresenceUpdate('available') } catch (e) {}
        } else {
            clearInterval(dbSaveInterval)
        }
    }, 60 * 1000)

    if (!state.creds.registered && !isReconnect) {
        if (child.requestPairingCode) {
            addToQueue(async () => {
                try {
                    await delay(3000)
                    const code = await child.requestPairingCode(id)
                    const pairing = code?.match(/.{1,4}/g)?.join('-') || code

                    await conn.sendMessage(m.chat, {
                        text: `┌˚₊ ๑│ ᴊ ᴀ ᴅ ɪ ʙ ᴏ ᴛ  ᴘ ᴀ ɪ ʀ ɪ ɴ ɢ │๑˚₊ 🤖\n┇ \n│ 🎯 *Target:* ${id}\n│ ⚡ *Mode:* ${mode.toUpperCase()}\n│ \n│ 🔗 *CODE:* \`${pairing}\`\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`
                    }, { quoted: m })
                } catch (err) {
                    console.log('Gagal meminta pairing code:', err)
                }
            })
        }
    }

    child.ev.on('creds.update', saveCreds)

    child.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
            sessions.set(id, child)
            const botNumber = jidNormalizedUser(child.user.id)

            if (child.user) child.user.jid = botNumber

            if (!child.db.data.settings[botNumber] && botNumber !== botJid) {
                 child.db.data.settings[botNumber] = child.db.data.settings[botJid] || {
                    autoread: false, pconly: false, gconly: false, self: false, jadibotMode: mode, jadibotPremium: isPremium
                 }
            }

            try { await child.sendPresenceUpdate('available') } catch (e) {}

            if (!isReconnect && m?.chat && m.chat !== botNumber) {
                await conn.sendMessage(m.chat, {
                    text: `✅ *Jadibot Mode ${mode.toUpperCase()} Berhasil Aktif!*\n\nUser: @${id}\nID: ${botNumber}`,
                    mentions: [jid]
                }, { quoted: m })
            }
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            sessions.delete(id)
            clearInterval(dbSaveInterval)

            if (stoppingSessions.has(id)) {
                stoppingSessions.delete(id)
                reconnect.delete(id)
                return
            }

            if (reason === DisconnectReason.loggedOut) {
                fs.rmSync(sessionPath, { recursive: true, force: true })
                reconnect.delete(id)
                return
            }

            const attempt = reconnect.get(id) || 0
            if (attempt < 3) {
                reconnect.set(id, attempt + 1)
                addToQueue(() => startJadibot(conn, m, jid, true, mode))
            } else {
                reconnect.delete(id)
            }
        }
    })

    child.ev.on('group-participants.update', async (room) => {
        try {
            if (handlerModule.participantsUpdate) {
                await handlerModule.participantsUpdate.call(child, room)
            }
        } catch (e) {}
    })

    child.ev.on('groups.update', async (room) => {
        try {
            if (handlerModule.groupsUpdate) {
                await handlerModule.groupsUpdate.call(child, room)
            }
        } catch (e) {}
    })

    const groupHasMainBot = new NodeCache({ stdTTL: 60, useClones: false });

    child.ev.on('messages.upsert', async (chatUpdate) => {
        if (chatUpdate.type !== 'notify') return

        await child.pushMessage(chatUpdate.messages).catch(() => {})

        if (!chatUpdate.messages || chatUpdate.messages.length === 0) return;

        const ms = chatUpdate.messages[0];
        if (ms.key.remoteJid?.endsWith('@g.us')) {
            const cacheKey = ms.key.remoteJid;
            let adaMainBot = groupHasMainBot.get(cacheKey);

            if (adaMainBot === undefined) {
                try {
                    const metadata = await child.groupMetadata(ms.key.remoteJid).catch(() => null);
                    const mainBotJid = conn.user?.id ? jidNormalizedUser(conn.user.id) : null;

                    adaMainBot = metadata && mainBotJid ? metadata.participants.some(p =>
                        jidNormalizedUser(p.id) === mainBotJid
                    ) : false;

                    groupHasMainBot.set(cacheKey, adaMainBot);
                } catch {
                    adaMainBot = false;
                }
            }

            if (adaMainBot) return;
        }

        await dbSwapLock.runExclusive(async () => {
        const prevDb = global.db.data;
        try {
            chatUpdate.isJadibot = true;
            global.db.data = child.db.data;

            if (ms.message) {
                const text = ms.message.conversation || ms.message.extendedTextMessage?.text || '';
                const isCmd = global.prefix.test(text);

                if (isCmd) {
                    const command = text.replace(global.prefix, '').trim().split(' ')[0].toLowerCase();
                    const ownerOnlyCmds = ['restart', 'setbotbio', 'setbotname', 'jadibot', 'jadibotprem', 'jadibotclone', 'stopjadibot', 'broadcast', 'bcgc', 'accjadibotclone'];
                    const premiumOnlyCmds = ['hd', 'remini', 'openai', 'bard', 'gpt4', 'tovid', 'tovn'];

                    if (child.jadibotMode !== MODE.CLONE && ownerOnlyCmds.includes(command)) return;
                    if (child.jadibotMode === MODE.REGULAR && premiumOnlyCmds.includes(command)) return;
                }
            }

            await handlerModule.handler.call(child, chatUpdate);
        } catch (e) {
            console.error('🔥 Jadibot Handler Error:', e)
        } finally {
            global.db.data = prevDb;
        }
        });
    })
}

export async function stopJadibot(jid, deleteSession = false) {
    const id = getJid(jid)
    const child = sessions.get(id)
    stoppingSessions.add(id)
    reconnect.delete(id)

    if (child) {
        try { child.ws.close() } catch (e) {}
        sessions.delete(id)
    }

    if (deleteSession) {
        const sessionPath = getPath(jid)
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
        }
    }
    setTimeout(() => stoppingSessions.delete(id), 5000)
}

export async function restoreJadibot(conn) {
    if (!fs.existsSync(ROOT)) return
    const dirs = fs.readdirSync(ROOT)
    const centralDb = getJadibotDB().data

    for (let dir of dirs) {
        if (!/^[0-9]+$/.test(dir)) continue
        const jid = dir + '@s.whatsapp.net'

        let mode = 'regular'
        if (centralDb.settings && centralDb.settings[jid]) {
            mode = centralDb.settings[jid].jadibotMode || (centralDb.settings[jid].jadibotPremium ? 'premium' : 'regular')
        }

        const fakeMsg = { sender: jid, chat: jid }

        try {
            addToQueue(() => startJadibot(conn, fakeMsg, jid, true, mode))
        } catch (e) {
            console.log(`[JADIBOT RESTORE ERROR] ${jid}: ${e.message}`)
        }
    }
}
