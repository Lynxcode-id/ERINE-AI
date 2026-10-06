import * as lidResolver from './lib/lid-resolver.js'
import { noPrefixAllowed } from './lib/prefixControl.js'
import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'
import { autoHealError } from './lib/selfheal-engine.js'
import { getRpgUser, saveRpgData } from './lib/rpg-db.js'
import { applyExp, syncLevel } from './lib/levelling.js'

import { proto } from '@whiskeysockets/baileys'

const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))

const getParticipantAdmin = (participant = {}) => {
    if (!participant || typeof participant !== 'object') return false
    const role = String(participant.admin || '').toLowerCase()
    if (role === 'superadmin' || participant.isSuperAdmin || participant.isCommunityAdmin) return 'superadmin'
    if (role === 'admin' || participant.isAdmin) return 'admin'
    return false
}

const lidCache = new Map()

const getPrimaryOwnerJid = () => {
    const candidates = [
        global.nomorown,
        ...(global.owner || []).map(v => Array.isArray(v) ? v[0] : v)
    ].filter(Boolean)

    const number = String(candidates[0] || '').replace(/[^0-9]/g, '')
    return number ? `${number}@s.whatsapp.net` : ''
}

const CMD_SPAM_WINDOW = 150 * 1000
const CMD_SPAM_LIMIT = 12
const CMD_SPAM_BAN_AT = 16
const CMD_SPAM_BLACKLIST_MS = 3 * 60 * 60 * 1000
const GC_BUSY_HITS = 25
const GC_SPAM_CLOSE_MS = 8 * 60 * 1000

const reopenGroup = async (conn, jid, chat) => {
    const g = global.erineCmdSpam.groups.get(jid)
    if (!g?.closed && !chat?.spamLockUntil) return
    global.erineCmdSpam.groups.set(jid, { count: 0, windowStart: Date.now(), closed: false })
    if (chat) delete chat.spamLockUntil
    try {
        await conn.groupSettingUpdate(jid, 'not_announcement')
        await conn.reply(jid, '✅ Grup dibuka lagi, jangan spam command ya bre.', null)
    } catch {}
}

const checkCommandSpam = async (m, { conn, isOwner, isMods, user, chat, isBotAdmin }) => {
    if (isOwner || isMods || !m?.sender) return false
    if (m._cmdSpamChecked) return m._cmdSpamBlocked || false
    m._cmdSpamChecked = true
    global.erineCmdSpam = global.erineCmdSpam || { users: new Map(), groups: new Map() }
    const now = Date.now()
    const sender = String(m.sender)

    if (m.isGroup && chat?.spamLockUntil && now >= chat.spamLockUntil) await reopenGroup(conn, m.chat, chat)

    if (user?.banned && user?.banReason === 'Spam command berlebihan' && user?.bannedUntil && now >= user.bannedUntil) {
        user.banned = false
        delete user.bannedUntil
        delete user.banReason
        await m.reply('✅ *ERINE Anti-Spam:* masa blacklist kamu sudah habis, silakan lanjut pakai bot ya.').catch(() => {})
    }
    if (user?.banned) { m._cmdSpamBlocked = true; return true }

    const rec = global.erineCmdSpam.users.get(sender) || { count: 0, windowStart: now, warned: false }
    if (now - rec.windowStart > CMD_SPAM_WINDOW) { rec.count = 0; rec.windowStart = now; rec.warned = false }
    rec.count += 1
    global.erineCmdSpam.users.set(sender, rec)

    let grec = null
    if (m.isGroup) {
        grec = global.erineCmdSpam.groups.get(m.chat) || { count: 0, windowStart: now, closed: false }
        if (now - grec.windowStart > CMD_SPAM_WINDOW) { grec.count = 0; grec.windowStart = now }
        grec.count += 1
        global.erineCmdSpam.groups.set(m.chat, grec)
    }

    if (rec.count <= CMD_SPAM_LIMIT) return false

    if (grec && isBotAdmin && grec.count >= GC_BUSY_HITS && !grec.closed) {
        grec.closed = true
        if (chat) chat.spamLockUntil = now + GC_SPAM_CLOSE_MS
        try {
            await conn.groupSettingUpdate(m.chat, 'announcement')
            await conn.sendMessage(m.chat, {
                text: `🚨 *ERINE Anti-Spam:* grup rame + @${sender.split('@')[0]} spam command. Grup ditutup ${GC_SPAM_CLOSE_MS / 60000} menit, nanti dibuka otomatis.`,
                mentions: [sender]
            }).catch(() => {})
            setTimeout(() => reopenGroup(conn, m.chat, chat), GC_SPAM_CLOSE_MS)
        } catch (error) {
            grec.closed = false
            if (chat) delete chat.spamLockUntil
            console.error('[GC ANTI-SPAM]', error)
        }
    }

    if (rec.count >= CMD_SPAM_BAN_AT) {
        user.banned = true
        user.banReason = 'Spam command berlebihan'
        user.bannedUntil = now + CMD_SPAM_BLACKLIST_MS
        global.erineCmdSpam.users.delete(sender)
        await m.reply(`🚫 *ERINE Anti-Spam:* kamu di-blacklist ${CMD_SPAM_BLACKLIST_MS / 3600000} jam karena maksa spam command lewat batas. Kebuka otomatis, gak perlu lapor.`).catch(() => {})
        setTimeout(() => {
            if (user.bannedUntil && Date.now() >= user.bannedUntil) {
                user.banned = false
                delete user.bannedUntil
                delete user.banReason
            }
        }, CMD_SPAM_BLACKLIST_MS + 1000)
        m._cmdSpamBlocked = true
        return true
    }

    if (!rec.warned) {
        rec.warned = true
        const sisa = Math.max(1, Math.ceil((rec.windowStart + CMD_SPAM_WINDOW - now) / 1000))
        await m.reply(`⚠️ *ERINE Anti-Spam:* batas ${CMD_SPAM_LIMIT} command / 2,5 menit kelewat (${rec.count}x). Command diblok dulu, tunggu ${sisa} detik. Lanjut spam sampai ${CMD_SPAM_BAN_AT}x = blacklist ${CMD_SPAM_BLACKLIST_MS / 3600000} jam.`).catch(() => {})
    }
    m._cmdSpamBlocked = true
    return true
}

const recordAntiSpam = async (m, { conn, isOwner, isMods, user, chat, groupMetadata, isBotAdmin }) => {
    if (!m?.text || m.fromMe || isOwner || isMods) return false

    global.erineSpamMap = global.erineSpamMap || { users: new Map(), groups: new Map() }
    const now = Date.now()
    const sender = String(m.sender || '')
    const ownerJid = getPrimaryOwnerJid()

    const previousUser = global.erineSpamMap.users.get(sender) || { count: 0, last: now }
    if (now - previousUser.last < 3000) previousUser.count += 1
    else previousUser.count = 1
    previousUser.last = now
    global.erineSpamMap.users.set(sender, previousUser)

    if (previousUser.count === 9) {
        await m.reply('⚠️ *ERINE Anti-Spam:* pelan-pelan bre, jangan spam bertubi-tubi.')
    } else if (previousUser.count >= 19 && !user.banned) {
        user.banned = true
        user.banReason = 'Spam berlebihan'
        await m.reply('🚨 *BANNED!* Akun lu masuk blacklist ERINE karena spam berlebihan.')

        if (ownerJid) {
            await conn.sendMessage(ownerJid, {
                text: `🚨 *ERINE SPAM REPORT*\n\nUser: @${sender.split('@')[0]}\nChat: ${m.chat}\nAlasan: spam berlebihan.`,
                mentions: [sender]
            }).catch(() => {})
        }
        return true
    }

    if (!m.isGroup) return false

    const previousGroup = global.erineSpamMap.groups.get(m.chat) || { count: 0, last: now, muted: false }
    if (now - previousGroup.last < 5000) previousGroup.count += 1
    else previousGroup.count = 1
    previousGroup.last = now
    global.erineSpamMap.groups.set(m.chat, previousGroup)

    if (previousGroup.count === 30 && isBotAdmin && !previousGroup.muted) {
        previousGroup.muted = true
        try {
            await conn.groupSettingUpdate(m.chat, 'announcement')
            await m.reply('🚨 *ERINE Anti-Spam:* grup terlalu rusuh. Chat dimute otomatis selama 1 menit.')

            setTimeout(async () => {
                try {
                    await conn.groupSettingUpdate(m.chat, 'not_announcement')
                    await conn.reply(m.chat, '✅ Mute otomatis selesai. Jangan spam lagi bre.', null)
                } catch {}
                previousGroup.muted = false
                previousGroup.count = 0
                global.erineSpamMap.groups.set(m.chat, previousGroup)
            }, 60000)
        } catch (error) {
            console.error('[ANTI-SPAM MUTE]', error)
        }
    }

    if (previousGroup.count >= 50 && !chat.isBanned) {
        chat.isBanned = true
        await m.reply('🚨 *ERINE Anti-Spam:* grup dibanned karena flood berat.')
        if (ownerJid) {
            await conn.sendMessage(ownerJid, {
                text: `🚨 *ERINE GROUP SPAM REPORT*\n\nGrup: *${groupMetadata?.subject || 'Unknown'}*\nID: ${m.chat}\nAlasan: flood berulang.`
            }).catch(() => {})
        }
        return true
    }

    return false
}

setInterval(() => {
    if (lidCache.size > 10000) lidCache.clear();
}, 24 * 60 * 60 * 1000);

const fetchGroupMetadata = async (jid, conn) => {
    try {
        if (global.erineGroupCache?.get(jid)) return global.erineGroupCache.get(jid)
        const fetcher = global.erineFetchGroupMetadata
            ? global.erineFetchGroupMetadata(jid, conn)
            : conn.groupMetadata(jid)
        const meta = await Promise.race([
            fetcher,
            new Promise((_, reject) => setTimeout(() => reject('timeout'), 5000))
        ]);
        if (meta && global.erineGroupCache) global.erineGroupCache.set(jid, meta)
        return meta || { participants: [] };
    } catch (e) {
        return { participants: [] };
    }
}

const resolvePhoneNumber = async (jid = '', conn = global.conn) => {
    jid = String(jid || '').decodeJid?.() || String(jid || '')
    if (!jid) return ''

    if (/^\d+$/.test(jid)) return jid
    if (jid.includes('@s.whatsapp.net')) return jid.split('@')[0]

    if (conn?.chats) {
        for (const chat of Object.values(conn.chats)) {
            const p = chat?.metadata?.participants?.find(v =>
                v.lid === jid || v.id === jid || v.jid === jid
            )
            if (p?.phoneNumber) return p.phoneNumber.replace(/[^0-9]/g, '')
            if (p?.id && !p.id.endsWith('@lid')) return p.id.split('@')[0]
        }
    }

    try {
        const [result] = await conn.onWhatsApp(jid).catch(() => [{}])
        if (result?.exists && result?.jid) return result.jid.split('@')[0]
    } catch {}

    return jid.replace(/[^0-9]/g, '')
}

const normalizeJid = async (jid = '', conn = global.conn) => {
    jid = String(jid || '').decodeJid?.() || String(jid || '')
    if (!jid) return ''

    if (/@(s\.whatsapp\.net|g\.us|broadcast|newsletter)$/.test(jid)) return jid
    if (/^\d+$/.test(jid)) return `${jid}@s.whatsapp.net`

    if (jid.endsWith('@lid')) {
        if (lidCache.has(jid)) return lidCache.get(jid)
        if (conn.isLid?.[jid]) return conn.isLid[jid]

        if (conn?.chats) {
            for (const chat of Object.values(conn.chats)) {
                const p = chat?.metadata?.participants?.find(v => v.lid === jid || v.id === jid)
                if (p?.id && !p.id.endsWith('@lid')) {
                    lidCache.set(jid, p.id)
                    if (!conn.isLid) conn.isLid = {}
                    conn.isLid[jid] = p.id
                    return p.id
                }
                if (p?.phoneNumber) {
                    const pnJid = `${p.phoneNumber.replace(/[^0-9]/g, '')}@s.whatsapp.net`
                    lidCache.set(jid, pnJid)
                    if (!conn.isLid) conn.isLid = {}
                    conn.isLid[jid] = pnJid
                    return pnJid
                }
            }
        }

        try {
            const [result] = await conn.onWhatsApp(jid).catch(() => [{}])
            if (result?.exists && result?.jid && !result.jid.endsWith('@lid')) {
                lidCache.set(jid, result.jid)
                if (!conn.isLid) conn.isLid = {}
                conn.isLid[jid] = result.jid
                return result.jid
            }
        } catch (e) {}
    }

    const pn = jid.replace(/[^0-9]/g, '')
    if (pn) return `${pn}@s.whatsapp.net`

    return jid
}

const sameJid = (a, b) => {
    if (!a || !b) return false
    return String(a).replace(/[^0-9]/g, '') === String(b).replace(/[^0-9]/g, '')
}

const AUTOLEVEL_XP_COOLDOWN_MS = 5000
const AUTOLEVEL_XP_MIN = 5
const AUTOLEVEL_XP_MAX = 10
const AUTOLEVEL_NOTIFY_COOLDOWN_MS = 8000

const getBotSettingsKey = (conn) => String(conn?.user?.jid || conn?.user?.id || '')

const getAutoLevelSettings = (DB, conn) => {
    DB.data.settings = DB.data.settings && typeof DB.data.settings === 'object'
        ? DB.data.settings
        : {}

    const key = getBotSettingsKey(conn)
    if (!key) return {}

    if (!DB.data.settings[key] || typeof DB.data.settings[key] !== 'object') {
        DB.data.settings[key] = {}
    }

    if (typeof DB.data.settings[key].autolevelup !== 'boolean') {
        DB.data.settings[key].autolevelup = false
    }

    return DB.data.settings[key]
}

const randomAutoLevelXp = () => {
    return Math.floor(Math.random() * (AUTOLEVEL_XP_MAX - AUTOLEVEL_XP_MIN + 1)) + AUTOLEVEL_XP_MIN
}

const claimAutoLevelCooldown = (sender) => {
    if (!sender) return false

    global.erineAutoLevel = global.erineAutoLevel || {
        cooldowns: new Map(),
        notices: new Map()
    }

    const now = Date.now()
    const previous = global.erineAutoLevel.cooldowns.get(sender) || 0

    if (now - previous < AUTOLEVEL_XP_COOLDOWN_MS) return false

    global.erineAutoLevel.cooldowns.set(sender, now)

    if (global.erineAutoLevel.cooldowns.size > 10000) {
        for (const [jid, time] of global.erineAutoLevel.cooldowns) {
            if (now - time > AUTOLEVEL_XP_COOLDOWN_MS * 20) global.erineAutoLevel.cooldowns.delete(jid)
        }
    }

    return true
}

const queueLevelChange = (m, result) => {
    if (!m || !result?.levelUp) return

    m._autoLevelChange = m._autoLevelChange || {
        before: result.beforeLevel,
        after: result.afterLevel
    }

    m._autoLevelChange.before = Math.min(m._autoLevelChange.before, result.beforeLevel)
    m._autoLevelChange.after = Math.max(m._autoLevelChange.after, result.afterLevel)
}

const syncCoreAndRpgUser = (DB, jid, shouldSyncLevel = false) => {
    if (!jid) return null

    const coreUser = DB.data.users?.[jid]
    if (!coreUser || typeof coreUser !== 'object') return null

    let rpgUser = null
    try {
        rpgUser = getRpgUser(jid)
    } catch {
        rpgUser = null
    }

    if (rpgUser) {
        const coreExp = Number.isFinite(Number(coreUser.exp)) ? Math.max(0, Math.floor(Number(coreUser.exp))) : 0
        const rpgExp = Number.isFinite(Number(rpgUser.exp)) ? Math.max(0, Math.floor(Number(rpgUser.exp))) : 0
        const coreLevel = Number.isFinite(Number(coreUser.level)) ? Math.max(1, Math.floor(Number(coreUser.level))) : 1
        const rpgLevel = Number.isFinite(Number(rpgUser.level)) ? Math.max(1, Math.floor(Number(rpgUser.level))) : 1

        rpgUser.exp = Math.max(coreExp, rpgExp)
        rpgUser.level = Math.max(coreLevel, rpgLevel)
        if (shouldSyncLevel) syncLevel(rpgUser, global.multiplier || 1)
        coreUser.exp = rpgUser.exp
        coreUser.level = rpgUser.level
    } else {
        try {
            rpgUser = getRpgUser(jid)
            if (rpgUser) {
                rpgUser.exp = Math.max(0, Number(coreUser.exp) || 0)
                rpgUser.level = Math.max(1, Number(coreUser.level) || 1)
                if (shouldSyncLevel) syncLevel(rpgUser, global.multiplier || 1)
                coreUser.exp = rpgUser.exp
                coreUser.level = rpgUser.level
            }
        } catch {
            rpgUser = null
        }
    }

    return { coreUser, rpgUser }
}

const applyAutoLevelExp = (DB, conn, m, amount) => {
    if (!m?.sender || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return null

    const users = DB.data.users || (DB.data.users = {})
    const coreUser = users[m.sender] || (users[m.sender] = {})
    let rpgUser = null
    try {
        rpgUser = getRpgUser(m.sender)
    } catch {}

    if (!rpgUser) {
        const result = applyExp(coreUser, amount, global.multiplier || 1)
        coreUser.exp = result.afterExp
        coreUser.level = result.afterLevel
        queueLevelChange(m, result)
        m.exp = (m.exp || 0) + result.added
        return result
    }

    const result = applyExp(rpgUser, amount, global.multiplier || 1)

    coreUser.exp = rpgUser.exp
    coreUser.level = rpgUser.level
    queueLevelChange(m, result)
    m.exp = (m.exp || 0) + result.added

    return result
}

const sendQueuedLevelNotice = async (m, conn) => {
    const change = m?._autoLevelChange
    if (!change || !m?.sender || change.after <= change.before) return

    global.erineAutoLevel = global.erineAutoLevel || { cooldowns: new Map(), notices: new Map() }
    const now = Date.now()
    const lastNotice = global.erineAutoLevel.notices.get(m.sender) || 0
    if (now - lastNotice < AUTOLEVEL_NOTIFY_COOLDOWN_MS) return

    global.erineAutoLevel.notices.set(m.sender, now)

    const currentUser = global.db?.data?.users?.[m.sender] || {}
    const role = currentUser.role || 'Free user'
    const text = `┌˚₊ ๑│ L E V E L  U P │๑˚₊ 🎉\n` +
                 `┇ \n` +
                 `│ Selamat @${String(m.sender).split('@')[0]}!\n` +
                 `│ EXP kamu sudah cukup untuk naik level.\n` +
                 `┇ \n` +
                 `│ 📉 *Level Lama:* ${change.before}\n` +
                 `│ 📈 *Level Baru:* ${change.after}\n` +
                 `│ 🏅 *Role:* ${role}\n` +
                 `└˚₊ ๑ ────────────── ๑˚₊\n` +
                 `> © ERINE-AI`

    await conn.sendMessage(m.chat, { text, mentions: [m.sender] }, { quoted: m }).catch(() => {})
}

const reconcileExpAfterPlugin = (DB, m, autoLevelEnabled) => {
    if (!autoLevelEnabled || !m?.sender || !m._expSnapshot) return

    const coreUser = DB.data.users?.[m.sender]
    if (!coreUser || typeof coreUser !== 'object') return

    let rpgUser = null
    try { rpgUser = getRpgUser(m.sender) } catch {}
    if (!rpgUser) return

    const coreNow = Number(coreUser.exp)
    const rpgNow = Number(rpgUser.exp)
    const coreBefore = Number(m._expSnapshot.core)
    const rpgBefore = Number(m._expSnapshot.rpg)

    const safeCoreNow = Number.isFinite(coreNow) ? Math.max(0, Math.floor(coreNow)) : coreBefore
    const safeRpgNow = Number.isFinite(rpgNow) ? Math.max(0, Math.floor(rpgNow)) : rpgBefore
    const coreDelta = safeCoreNow - coreBefore
    const rpgDelta = safeRpgNow - rpgBefore

    let canonicalExp = safeRpgNow
    if (coreDelta > 0 && rpgDelta <= 0) {
        canonicalExp = Math.min(Number.MAX_SAFE_INTEGER, rpgBefore + coreDelta)
    } else if (coreDelta > 0 && rpgDelta > 0) {
        canonicalExp = Math.min(Number.MAX_SAFE_INTEGER, rpgBefore + Math.max(coreDelta, rpgDelta))
    }

    rpgUser.exp = canonicalExp
    const levelState = syncLevel(rpgUser, global.multiplier || 1)
    coreUser.exp = rpgUser.exp
    coreUser.level = rpgUser.level

    if (levelState.changed) queueLevelChange(m, levelState)
}

const findParticipant = (list = [], jid = '') => {
    if (!jid) return {};
    const targetNum = String(jid).replace(/[^0-9]/g, '');

    return list.find(u => {
        const ids = [u?.id, u?.jid, u?.lid, u?.phoneNumber].filter(Boolean);
        return ids.some(v => String(v).replace(/[^0-9]/g, '') === targetNum);
    }) || {};
}

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || []

    if (!chatUpdate || !chatUpdate.messages) return;
    if (!chatUpdate.isJadibot) {
        try {
            await this.pushMessage(chatUpdate.messages)
        } catch (err) {
            console.error('Failed to push message in handler:', err)
        }
    }

    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return

    const conn = this
    const DB = conn.db || global.db

    if (DB.data == null) await global.loadDatabase()

    try {
        m = smsg(this, m) || m
        if (!m) return
        m.exp = 0
        m.limit = false

        const fieldsToNormalize = ['key.participant', 'key.remoteJid'];
        for (const field of fieldsToNormalize) {
            const keys = field.split('.');
            let obj = m;
            for (let i = 0; i < keys.length - 1; i++) obj = obj?.[keys[i]];
            if (obj && obj[keys[keys.length - 1]]) {
                obj[keys[keys.length - 1]] = await normalizeJid(obj[keys[keys.length - 1]], conn);
            }
        }

        const currentLid = m.senderLid || m.key.participant || m.participant || m.sender;
        const resolvedSender = await normalizeJid(currentLid, conn);
        const resolvedPn = (await Promise.resolve(m.senderPn).catch(() => '')) || (conn.resolvePn ? await conn.resolvePn(currentLid).catch(() => '') : currentLid.replace(/[^0-9]/g, ''));

        Object.defineProperty(m, 'sender', {
            value: resolvedSender,
            writable: true,
            configurable: true,
            enumerable: true
        });

        Object.defineProperty(m, 'senderPn', {
            value: resolvedPn,
            writable: true,
            configurable: true,
            enumerable: true
        });

        if (currentLid.endsWith('@lid')) {
            if (!conn.isLid) conn.isLid = {}
            conn.isLid[currentLid] = resolvedSender
            lidCache.set(currentLid, resolvedSender)
        }

        let context = m.message?.extendedTextMessage?.contextInfo ||
                      m.message?.templateButtonReplyMessage?.contextInfo ||
                      m.message?.buttonsResponseMessage?.contextInfo ||
                      m.message?.listResponseMessage?.contextInfo ||
                      m.message?.interactiveResponseMessage?.contextInfo;

        if (context?.mentionedJid) {
            const resolvedMentions = await Promise.all(
                context.mentionedJid.map(jid => normalizeJid(jid, conn))
            );
            const resolvedTagsPn = await Promise.all(
                context.mentionedJid.map(jid => resolvePhoneNumber(jid, conn))
            );

            Object.defineProperty(m, 'mentionedJid', {
                value: resolvedMentions,
                writable: true,
                configurable: true,
                enumerable: true
            });

            Object.defineProperty(m, 'mentionedPn', {
                value: resolvedTagsPn,
                writable: true,
                configurable: true,
                enumerable: true
            });

            context.mentionedJid = m.mentionedJid.filter(jid => jid && !jid.endsWith('@lid'))
        }

        if (context?.participant) {
            context.participant = await normalizeJid(context.participant, conn);
        }

        if (m.sender?.endsWith('@lid') || m.chat?.endsWith('@lid')) {
            console.log('Skip pesan LID gagal resolve:', m.key.id);
            return;
        }

        if (global.autotyping && typeof this.sendPresenceUpdate === 'function') {
            this.sendPresenceUpdate('composing', m.chat).catch(console.error)
        }
        if (global.autorecording && typeof this.sendPresenceUpdate === 'function') {
            this.sendPresenceUpdate('recording', m.chat).catch(console.error)
        }

        try {
            if (m.sender && typeof DB.data.users[m.sender] !== 'object')
                DB.data.users[m.sender] = {}

            let user = m.sender ? DB.data.users[m.sender] : {}

            const defaults = {
                registered: false, name: m.name || '', age: 0, regTime: -1,
                level: 0, warn: 0, exp: 0, limit: 100, afk: -1, afkReason: '',
                banned: false, banReason: '', role: 'Free user', autolevelup: false,
                premium: false, premiumTime: 0, health: 100, stamina: 100,
                money: 0, bank: 0, gold: 0, diamond: 0, emerald: 0,
                pasangan: '', status_hubungan: 'jomblo', partnerpic: '', cinta: 0, waktu_jadian: 0, waktu_nikah: 0,
                anak: [], exp_anak: 0, pendidikan_anak: 'Belum Sekolah',
                potion: 0, makanan: 0, kayu: 0, batu: 0, besi: 0,
                pickaxe: 0, pickaxedurability: 0, sword: 0, sworddurability: 0, armor: 0, armordurability: 0,
                lastdaily: 0, lastkerja: 0, lastlamar: 0, lastdate: 0, lastfeedkid: 0, lastplaykid: 0, lastteachkid: 0,
                lastmining: 0
            }

            for (let key in defaults) {
                if (!(key in user)) {
                    if (Array.isArray(defaults[key])) {
                        user[key] = []
                    } else {
                        user[key] = defaults[key]
                    }
                }
            }

            if (m.chat && typeof DB.data.chats[m.chat] !== 'object')
                DB.data.chats[m.chat] = {}

            let chat = m.chat ? DB.data.chats[m.chat] : {}
            const chatDefaults = {
                isBanned: false, welcome: false, detect: false, sWelcome: '', sBye: '', sPromote: '', sDemote: '',
                delete: false, onlyAdmin: false,
                antiLink: false, viewonce: false, antiToxic: false, simi: false, autogpt: false, autoSticker: false, premium: false, premiumTime: false, nsfw: false, menu: true, rpgs: true, expired: 0,
                antikudeta: false
            }
            for (let key in chatDefaults) if (!(key in chat)) chat[key] = chatDefaults[key]
            if (!Array.isArray(chat.adminWajib)) chat.adminWajib = []

            const userJid = conn.user?.jid || conn.user?.id
            if (userJid && typeof DB.data.settings[userJid] !== 'object')
                DB.data.settings[userJid] = {}

            let settings = userJid ? DB.data.settings[userJid] : {}
            const settingDefaults = { self: false, autoread: false, anticall: true, restartDB: 0, restrict: false, freerpg: true, autolevelup: false }
            for (let key in settingDefaults) if (!(key in settings)) settings[key] = settingDefaults[key]

        } catch (e) {
            console.error('INIT ERROR:', e)
        }

        const opts = global.opts || {}
        if (opts['nyimak']) return
        if (opts['pconly'] && m.chat && m.chat.endsWith('g.us')) return
        if (opts['gconly'] && m.chat && !m.chat.endsWith('g.us')) return
        if (opts['swonly'] && m.chat !== 'status@broadcast') return
        if (typeof m.text !== 'string') m.text = ''

        const botId = conn.user?.id ? conn.decodeJid(conn.user.id) : ''
        const mainBotId = global.conn?.user?.id ? conn.decodeJid(global.conn.user.id) : botId

        let ownerArray = (global.owner || []).map(v => Array.isArray(v) ? v[0] : v);
        if (global.nomorown) ownerArray.push(global.nomorown);

        const isROwner = [mainBotId, ...ownerArray].map(v => v?.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
        const isJadibotRenter = m.fromMe || (botId && botId === m.sender)
        const isJadibotSession = conn?.isJadibot
        const jadibotMode = conn?.jadibotMode || (isJadibotSession ? (conn?.isPremium ? 'premium' : 'regular') : 'main')
        const allowOwnerFeature = !isJadibotSession || jadibotMode === 'clone'
        const allowPremiumFeature = !isJadibotSession || jadibotMode === 'premium' || jadibotMode === 'clone'
        const isOwner = isROwner || (allowOwnerFeature && isJadibotRenter)
        const isMods = isOwner || (global.mods || []).map(v => v?.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
        const isPrems = isROwner || (allowPremiumFeature && isJadibotRenter) || (m.sender && DB.data.users[m.sender]?.premiumTime > 0)

        const isSelf = conn.self !== undefined ? conn.self : opts['self']
        if (!isOwner && !m.fromMe && isSelf) return

        if (conn.isJadibot && conn.jadibotMode === 'premium') {
            const botUser = global.db.data.users[botId] || {}
            if (!botUser.premium || (botUser.premiumTime && botUser.premiumTime < Date.now())) {
                conn.jadibotMode = 'regular'
                conn.isPremium = false
            }
        }

        if (m.isBaileys) return

        const autoLevelSettings = getAutoLevelSettings(DB, conn)
        const autoLevelEnabled = Boolean(autoLevelSettings.autolevelup)
        let autoLevelXpGranted = false

        syncCoreAndRpgUser(DB, m.sender, autoLevelEnabled)

        if (autoLevelEnabled && m.sender && !m.fromMe && claimAutoLevelCooldown(m.sender)) {
            const baseXp = randomAutoLevelXp()
            const result = applyAutoLevelExp(DB, conn, m, baseXp)
            autoLevelXpGranted = Boolean(result?.added)
        }

        let groupMetadata = {};
        if (m.isGroup) {
            try {
                groupMetadata = conn.chats[m.chat]?.metadata || {};
                if (!groupMetadata.participants || groupMetadata.participants.length === 0) {
                    groupMetadata = await fetchGroupMetadata(m.chat, conn);
                    if (!conn.chats[m.chat]) conn.chats[m.chat] = {};
                    conn.chats[m.chat].metadata = groupMetadata;
                }

                if (groupMetadata.participants) {
                    for (let p of groupMetadata.participants) {
                        if (p.lid && !p.id?.endsWith('@lid')) {
                            if (!conn.isLid) conn.isLid = {}
                            conn.isLid[p.lid] = p.id
                            lidCache.set(p.lid, p.id)
                        } else if (p.lid && !p.id) {
                            p.id = await normalizeJid(p.lid, conn)
                        }
                    }
                }
            } catch (e) {
                console.log('Gagal fetch metadata:', m.chat, e);
                groupMetadata = { participants: [] };
            }
        }

        const participants = groupMetadata.participants || []

        let groupUser = m.isGroup ? findParticipant(participants, m.sender) || findParticipant(participants, m.senderPn) : {}
        if (groupUser.lid && groupUser.id && !groupUser.id.endsWith('@lid')) {
            groupUser.id = groupUser.id;
        } else if (groupUser.lid && !groupUser.id) {
            groupUser.id = await normalizeJid(groupUser.lid, conn);
        }

        const bot = m.isGroup ? findParticipant(participants, await normalizeJid(conn.user?.jid || conn.user?.id || '', conn)) : {}

        const isRAdmin = getParticipantAdmin(groupUser) === 'superadmin'
        const isAdmin = isRAdmin || getParticipantAdmin(groupUser) === 'admin'
        const isBotAdmin = getParticipantAdmin(bot) || false

        try {
            const currentChat = DB.data.chats[m.chat] || (DB.data.chats[m.chat] = {})
            const handled = await recordAntiSpam(m, {
                conn: this,
                isOwner,
                isMods,
                user: DB.data.users[m.sender] || (DB.data.users[m.sender] = {}),
                chat: currentChat,
                groupMetadata,
                isBotAdmin
            })
            if (handled) return
        } catch (e) {
            console.error('[ANTI-SPAM]', e)
        }

        if (m.isGroup && m.text?.startsWith('.cekadmin')) {
            const meta = await fetchGroupMetadata(m.chat, conn).catch(() => ({}));
            const me = meta.participants?.find(p => sameJid(p.id, m.sender) || sameJid(p.lid, m.sender));
            return m.reply(`*DEBUG ADMIN*\nSender: ${m.sender}\nDi metadata: ${JSON.stringify(me, null, 2)}\nTotal member: ${meta.participants?.length}`);
        }

        if (m.isGroup && m.text?.startsWith('.cekid')) {
            const meta = await fetchGroupMetadata(m.chat, conn).catch(() => ({}));
            const me = meta.participants?.find(p =>
                sameJid(p.id, m.sender) ||
                sameJid(p.lid, currentLid) ||
                sameJid(p.phoneNumber, m.senderPn)
            );
            return m.reply(`*DEBUG ID*\nLID: ${currentLid}\nPN: ${m.senderPn}\nJID: ${m.sender}\nMeta: ${JSON.stringify(me, null, 2)}\nisAdmin: ${isAdmin}`);
        }

        if (m.text && !isOwner && global.db.data.blockcmd?.length) {
            let body = m.text.trim()
            let prefixRegex = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/i
            let hasPrefix = prefixRegex.test(body)
            let cmdName = hasPrefix
                ? body.replace(prefixRegex, '').trim().split(' ')[0].toLowerCase()
                : body.split(' ')[0].toLowerCase()

            if (global.db.data.blockcmd.includes(cmdName)) {
                await conn.reply(m.chat, `❌ *Akses Ditolak!*\n\nCommand *${cmdName}* sedang dikunci oleh Owner (Lynx). Lu ga punya izin buat pake fitur ini cuy.`, m)
                return
            }
        }

        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')

    for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin || plugin.disabled) continue

            let chat = m.chat ? DB.data.chats[m.chat] : {}

            if (chat?.isBanned && !isOwner) {
                continue
            }

            const __filename = join(___dirname, name)
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename })
                } catch (e) {
                    console.error(e)
                }
            }

            const pluginTags = Array.isArray(plugin.tags)
                ? plugin.tags
                : typeof plugin.tags === 'string'
                    ? [plugin.tags]
                    : []

            if (!opts['restrict'] && pluginTags.some(tag => String(tag).toLowerCase() === 'admin')) continue

            const pluginUser = plugin.rpg && m.sender
                ? (getRpgUser(m.sender) || user)
                : user

            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix
            let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] :
                Array.isArray(_prefix) ? _prefix.map(p => {
                    let re = p instanceof RegExp ? p : new RegExp(str2Regex(p))
                    return [re.exec(m.text), re]
                }) :
                typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] :
                [[[], new RegExp]]
            ).find(p => p[1])

            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, {
                    match, conn: this, participants, groupMetadata, user: pluginUser, bot,
                    isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename
                })) continue
            }

            if (typeof plugin !== 'function') continue

            let usedPrefix = (match[0] || '')[0]
            let viaNoPrefix = false
            if (!usedPrefix && typeof m.text === 'string' && m.text && noPrefixAllowed(plugin, isOwner)) {
                usedPrefix = ''
                viaNoPrefix = true
            }
            if (usedPrefix || viaNoPrefix) {
                let noPrefix = viaNoPrefix ? m.text : m.text.replace(usedPrefix, '')
                let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
                args = args || []
                let _args = noPrefix.trim().split` `.slice(1)
                let text = _args.join` `
                command = (command || '').toLowerCase()
                let fail = plugin.fail || global.dfail

                let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) :
                    Array.isArray(plugin.command) ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) :
                    typeof plugin.command === 'string' ? plugin.command === command : false

                if (!isAccept) continue

                m.plugin = name

                try {
                    if (await checkCommandSpam(m, { conn: this, isOwner, isMods, user: pluginUser, chat, isBotAdmin })) continue
                } catch (e) { console.error('[CMD ANTI-SPAM]', e) }

                if (plugin.rpg && m.isGroup && !chat?.rpgs) {
                    m.reply('🎮 Mode RPG di grup ini belum aktif\n\nKetik:\n.enable rpg')
                    continue
                }

                if (isJadibotSession) {
                    await delay(1500 + Math.random() * 2000)
                }

                if (chat?.isBanned && !isOwner) return
                if (pluginUser?.banned && !isOwner) return
                if (m.isGroup && chat?.onlyAdmin && !isAdmin && !isOwner) return
                if (plugin.rowner && !isROwner) { fail('rowner', m, this); continue }
                if (plugin.owner && !isOwner) { fail('owner', m, this); continue }
                if (plugin.mods && !isMods) { fail('mods', m, this); continue }
                if (plugin.premium && !isPrems) { fail('premium', m, this); continue }

                if (plugin.group && !m.isGroup) { fail('group', m, this); continue }
                if (plugin.botAdmin && !isBotAdmin) { fail('botAdmin', m, this); continue }
                if (plugin.admin && !isAdmin && !isOwner) { fail('admin', m, this); continue }
                if (plugin.private && m.isGroup) { fail('private', m, this); continue }
                if (plugin.register && !pluginUser?.registered) { fail('unreg', m, this); continue }

                m.isCommand = true

                const expPairBeforePlugin = syncCoreAndRpgUser(DB, m.sender, autoLevelEnabled)
                m._expSnapshot = {
                    core: Number(expPairBeforePlugin?.coreUser?.exp) || 0,
                    rpg: Number(expPairBeforePlugin?.rpgUser?.exp) || 0
                }

                let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17
                if (autoLevelEnabled && autoLevelXpGranted && Number.isFinite(xp) && xp > 0 && xp < 200) {
                    applyAutoLevelExp(DB, conn, m, xp)
                }

                syncCoreAndRpgUser(DB, m.sender, autoLevelEnabled)

                const isRpgOrGamePlugin = plugin.rpg === true || plugin.game === true || pluginTags.some(tag => {
                    const t = String(tag).toLowerCase()
                    return t === 'rpg' || t === 'game'
                })

                const userJidBot = conn.user?.jid || conn.user?.id
                const isFreeRpgActive = DB.data.settings?.[userJidBot]?.freerpg !== false

                const shouldBypassLimit = isRpgOrGamePlugin && isFreeRpgActive

                if (!isPrems && !shouldBypassLimit && plugin.limit && pluginUser?.limit < plugin.limit * 1) {
                    this.reply(m.chat, `[❗] Limit harian kamu telah habis`, m)
                    continue
                }

                if (plugin.level > (pluginUser?.level || 0)) {
                    this.reply(m.chat, `[💬] Diperlukan level ${plugin.level} untuk perintah ini\n*Level mu:* ${pluginUser?.level || 0} 📊`, m)
                    continue
                }

                let extra = {
                    match, usedPrefix, noPrefix, _args, args, command, text, conn: this,
                    participants, groupMetadata, user: pluginUser, bot, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename
                }

                try {
                    await plugin.call(this, m, extra)

                    reconcileExpAfterPlugin(DB, m, autoLevelEnabled)
                    await sendQueuedLevelNotice(m, this)

                    if (!isPrems && !shouldBypassLimit) {
                        m.limit = m.limit || plugin.limit || false
                    } else {
                        m.limit = false
                    }

                    if (!global.db.data.stats[name] || typeof global.db.data.stats[name] !== 'object') {
                        global.db.data.stats[name] = { total: 0 }
                    }
                    global.db.data.stats[name].total = (global.db.data.stats[name].total || 0) + 1
                } catch (e) {
                    m.error = e
                    console.error(e)
                    if (e) {
                        let errorText = format(e)
                        m.reply(`*Error:* ${errorText}`)

                        try {
                            const state = global.selfHeal || (global.selfHeal = {
                                active: true,
                                cooldown: 30000,
                                last: new Map()
                            })

                            if (state.active) {
                                if (!(state.last instanceof Map)) state.last = new Map()

                                const key = `${name}:${m.chat || 'global'}`
                                const now = Date.now()
                                const last = state.last.get(key) || 0

                                if (now - last >= Number(state.cooldown || 30000)) {
                                    state.last.set(key, now)
                                    const ownerJid = getPrimaryOwnerJid()

                                    autoHealError(e, {
                                        fileName: name,
                                        command,
                                        message: m.text,
                                        conn: this,
                                        chat: m.chat,
                                        notifyJid: ownerJid
                                    }).catch(err => {
                                        console.error('[SELF-HEAL]', err)
                                    })
                                }
                            }
                        } catch (healError) {
                            console.error('[SELF-HEAL INIT]', healError)
                        }
                    }
                } finally {
                    if (typeof plugin.after === 'function') {
                        try {
                            await plugin.after.call(this, m, extra)
                        } catch (e) {
                            console.error(e)
                        }
                    }
                    if (m.limit) m.reply(+m.limit + ' Limit terpakai')
                }
                break
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        if (m.text) {
            const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id)
            if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1)
        }

        let user = m.sender ? DB.data.users[m.sender] : null
        const autoLevelEnabledNow = Boolean(getAutoLevelSettings(DB, conn).autolevelup)

        if (autoLevelEnabledNow) {
            try {
                if (m?._expSnapshot) reconcileExpAfterPlugin(DB, m, autoLevelEnabledNow)
                await sendQueuedLevelNotice(m, conn)
            } catch (e) {
                console.error('[AUTOLEVEL FINALIZE]', e)
            }
        }

        if (user && m.limit) user.limit -= (m.limit * 1)

        await DB.write?.()
        if (m.plugin && global.plugins[m.plugin]?.rpg) {
            try {
                saveRpgData()
            } catch (e) {
                console.error('[RPG DB SAVE]', e)
            }
        }

        try {
            const opts = global.opts || {}
            if (!opts['noprint']) {
                const printLogger = await import('./lib/print.js')
                if (printLogger && printLogger.default) {
                    await printLogger.default(m, this)
                }
            }
        } catch (e) {
            console.error('[LOGGER ERROR]', e)
        }

        const opts = global.opts || {}
        if (opts['autoread']) await conn.readMessages([m.key]).catch(() => {})
    }
}

export async function participantsUpdate({ id, author, participants, action }) {
    const conn = this
    const DB = conn.db || global.db
    const opts = global.opts || {}

    const isSelf = conn.self !== undefined ? conn.self : opts['self']

    if (isSelf) return

    if (DB.data == null) await global.loadDatabase()
    if (!DB.data.chats[id]) {
        DB.data.chats[id] = {
            isBanned: false, welcome: false, detect: false, sWelcome: '', sBye: '', sPromote: '', sDemote: '',
            delete: false, onlyAdmin: false, antiLink: false, viewonce: false, antiToxic: false, simi: false, autogpt: false, autoSticker: false, premium: false, premiumTime: false, nsfw: false, menu: true, rpgs: true, expired: 0,
            antikudeta: false, adminWajib: []
        }
    }

    if (action === 'demote') {
        try {
            const chatAK = DB.data.chats[id]
            const wajibList = Array.isArray(chatAK.adminWajib) ? chatAK.adminWajib : []

            if (chatAK.antikudeta && wajibList.length) {
                const demotedRaw = (participants || []).map(p => typeof p === 'string' ? p : (p?.id || p?.jid || p)).filter(Boolean)
                const demotedNorm = await Promise.all(demotedRaw.map(j => normalizeJid(j, conn)))
                const protectedHit = demotedNorm.find(jid => wajibList.includes(jid))

                if (protectedHit) {
                    const meta = await fetchGroupMetadata(id, conn)
                    const groupCreator = meta.owner || meta.subjectOwner ||
                        (meta.participants || []).find(p => p.admin === 'superadmin')?.id || null
                    const botId = conn.decodeJid ? conn.decodeJid(conn.user.id) : conn.user.id
                    const authorNorm = author ? await normalizeJid(author, conn) : null
                    if (authorNorm && groupCreator && authorNorm === groupCreator) {
                    } else {
                        const currentAdmins = (meta.participants || [])
                            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                            .map(p => p.id)

                        const toKickSet = new Set(currentAdmins)
                        if (authorNorm) toKickSet.add(authorNorm)
                        toKickSet.delete(botId)
                        if (groupCreator) toKickSet.delete(groupCreator)
                        toKickSet.delete(protectedHit)
                        const toKick = [...toKickSet]

                        if (toKick.length) {
                            await conn.groupParticipantsUpdate(id, toKick, 'remove').catch(() => {})
                        }

                        let teks = `┌˚₊ ๑│ A N T I  K U D E T A │๑˚₊ 🚨\n` +
                            `┇ \n` +
                            `│ ⚠️ *Percobaan Kudeta Terdeteksi!*\n` +
                            `│ Admin wajib @${protectedHit.split('@')[0]} baru saja diturunkan dari admin.\n` +
                            (authorNorm ? `│ 👤 *Pelaku:* @${authorNorm.split('@')[0]}\n` : '') +
                            `┇ \n` +
                            `│ 🔒 Seluruh admin lain otomatis dikeluarkan demi keamanan grup.\n` +
                            `└˚₊ ๑ ────────────── ๑˚₊\n` +
                            `> © ERINE-AI`

                        await conn.sendMessage(id, {
                            text: teks,
                            mentions: [protectedHit, ...(authorNorm ? [authorNorm] : []), ...toKick]
                        }).catch(() => {})
                    }
                }
            }
        } catch (e) {
            console.error('Gagal eksekusi Anti-Kudeta:', e)
        }
    }

    try {
        const newMeta = await fetchGroupMetadata(id, conn);
        if (!conn.chats[id]) conn.chats[id] = {};
        conn.chats[id].metadata = newMeta;

        for (let p of newMeta.participants || []) {
            if (p.lid && p.id && !p.id.endsWith('@lid')) {
                if (!conn.isLid) conn.isLid = {}
                conn.isLid[p.lid] = p.id
                lidCache.set(p.lid, p.id)
            }
            if (p.phoneNumber && p.lid) {
                const pnJid = `${p.phoneNumber.replace(/[^0-9]/g, '')}@s.whatsapp.net`
                if (!conn.isLid) conn.isLid = {}
                conn.isLid[p.lid] = pnJid
                lidCache.set(p.lid, pnJid)
            }
        }
    } catch (e) {
        console.log('Gagal update metadata pas participantsUpdate');
    }

    if (action === 'promote' || action === 'demote') {
        try {
            const newMetadata = await fetchGroupMetadata(id, conn)
            if (conn.chats && conn.chats[id]) {
                conn.chats[id].metadata = newMetadata
            }
        } catch (e) {
            console.error('Gagal update metadata grup saat promote/demote:', e)
        }
    }

    let chat = DB.data.chats[id]
    if (!chat.welcome) return

    let groupMetadata = (conn.chats && conn.chats[id] && conn.chats[id].metadata) ? conn.chats[id].metadata : {};
    if (Object.keys(groupMetadata).length === 0) {
        try {
            groupMetadata = await fetchGroupMetadata(id, conn);
        } catch (e) {
            groupMetadata = {};
        }
    }

    const groupName = groupMetadata.subject || 'Group'
    const memberCount = Array.isArray(groupMetadata.participants) ? groupMetadata.participants.length : 0

    for (let participant of (participants || [])) {
        let rawUser = typeof participant === 'string' ? participant : (participant?.id || participant?.jid || participant);
        if (!rawUser) continue
        if (participant && typeof participant === 'object') lidResolver.learnParticipants([participant])

        let user = await normalizeJid(rawUser, conn)

        if (user.endsWith('@s.whatsapp.net') && rawUser.endsWith('@lid')) {
            if (!conn.isLid) conn.isLid = {}
            conn.isLid[rawUser] = user;
            lidCache.set(rawUser, user);
        }

        if (!user.endsWith('@s.whatsapp.net')) {
            const pnRes = await lidResolver.resolve(conn, rawUser, id).catch(() => '')
            if (pnRes) user = pnRes
        }
        const tagOk = user.endsWith('@s.whatsapp.net')

        let jidNum = user.split('@')[0];
        let displayNum = jidNum;

        if (jidNum.startsWith('62') || jidNum.startsWith('08')) {
            let match = jidNum.match(/^(62|08)(\d{2,4})(\d{4})(\d{3,5})$/);
            if (match) {
                displayNum = `+${match[1]} ${match[2]}-${match[3]}-${match[4]}`;
            } else {
                displayNum = `+${jidNum}`;
            }
        }

        let pushName = '';
        try {
            if (conn.getName) pushName = await conn.getName(user);
        } catch (e) {}

        if (!pushName || pushName === jidNum) {
            pushName = jidNum
        }

        const tagText = tagOk ? '@' + jidNum : (pushName && pushName !== jidNum ? pushName : 'kak')
        const INVIS = /[\u200b-\u200f\u2060-\u2069\ufeff]/g

        let pp = 'https://i.ibb.co/1s8T3sY/48f7ce63c7aa.jpg'
        try {
            pp = await this.profilePictureUrl(user, 'image')
        } catch {}

        if (action === 'add') {
            let defaultWelcome = `👋 Halo @user!\n\nSelamat datang di *${groupName}* 🎉`
            let text = chat.sWelcome && chat.sWelcome.trim() ? chat.sWelcome.replace(INVIS, '') : defaultWelcome

            text = text
                .replace(/@user/g, tagText)
                .replace('@subject', groupName)
                .replace('@desc', groupMetadata.desc || '')
                .replace(/@rawUName/gi, pushName)
                .replace(/@rawGName/gi, groupName)

            let bgImage = global.welcomeBg || 'https://i.ibb.co/4YBNyvP/mountain-sunset.jpg'

            let api = `https://api.siputzx.my.id/api/canvas/welcomev5?username=Welcome&guildName=${encodeURIComponent(displayNum)}&memberCount=${memberCount + 1}&avatar=${encodeURIComponent(pp)}&background=${encodeURIComponent(bgImage)}&quality=90`

            let buffer = null
            try {
                let res = await fetch(api)
                if (res.ok) buffer = Buffer.from(await res.arrayBuffer())
            } catch (e) {
                console.error('WELCOME API ERROR:', e)
            }

            if (buffer) {
                await this.sendMessage(id, {
                    image: buffer,
                    caption: text,
                    contextInfo: {
                        mentionedJid: tagOk ? [user] : []
                    }
                })
            } else {
                await this.sendMessage(id, {
                    text,
                    contextInfo: {
                        mentionedJid: tagOk ? [user] : []
                    }
                })
            }
        }

        if (action === 'remove') {
            let defaultBye = `👋 Sampai jumpa @user`
            let text = chat.sBye && chat.sBye.trim() ? chat.sBye.replace(INVIS, '') : defaultBye

            text = text
                .replace(/@user/g, tagText)
                .replace('@subject', groupName)
                .replace('@desc', groupMetadata.desc || '')
                .replace(/@rawUName/gi, pushName)
                .replace(/@rawGName/gi, groupName)

            let bgImage = global.goodbyeBg || 'https://i.ibb.co/4YBNyvP/images-76.jpg'
            let titleText = 'Goodbye'
            let descText = displayNum

            let api = `https://api.siputzx.my.id/api/canvas/goodbyev4?avatar=${encodeURIComponent(pp)}&background=${encodeURIComponent(bgImage)}&title=${encodeURIComponent(titleText)}&description=${encodeURIComponent(descText)}&border=%232a2e35&avatarBorder=%232a2e35&overlayOpacity=0.3`

            let buffer = null
            try {
                let res = await fetch(api)
                if (res.ok) buffer = Buffer.from(await res.arrayBuffer())
            } catch (e) {
                console.error('GOODBYE API ERROR:', e)
            }

            if (buffer) {
                await this.sendMessage(id, {
                    image: buffer,
                    caption: text,
                    contextInfo: {
                        mentionedJid: tagOk ? [user] : []
                    }
                })
            } else {
                await this.sendMessage(id, {
                    text,
                    contextInfo: {
                        mentionedJid: tagOk ? [user] : []
                    }
                })
            }
        }
    }
}

export async function groupsUpdate(groupsUpdate) {
    const conn = this
    const DB = conn.db || global.db
    const opts = global.opts || {}

    const isSelf = conn.self !== undefined ? conn.self : opts['self']
    if (isSelf) return

    for (const groupUpdate of groupsUpdate) {
        const id = groupUpdate.id
        if (!id) continue

        try {
            const newMeta = await fetchGroupMetadata(id, conn);
            if (!conn.chats[id]) conn.chats[id] = {};
            conn.chats[id].metadata = newMeta;

            for (let p of newMeta.participants || []) {
                if (p.lid && p.id && !p.id.endsWith('@lid')) {
                    if (!conn.isLid) conn.isLid = {}
                    conn.isLid[p.lid] = p.id
                    lidCache.set(p.lid, p.id)
                }
            }
            console.log('Metadata updated:', id);
        } catch (e) {}

        let chats = DB.data.chats[id], text = ''
        if (!chats?.detect) continue

        if (groupUpdate.desc) text = (chats.sDesc || '\`\`\`Deskripsi diganti ke\`\`\`\n@desc').replace('@desc', groupUpdate.desc)
        if (groupUpdate.subject) text = (chats.sSubject || '\`\`\`Judul diganti ke\`\`\`\n@subject').replace('@subject', groupUpdate.subject)
        if (groupUpdate.icon) text = (chats.sIcon || '\`\`\`Icon grup diganti\`\`\`')
        if (groupUpdate.announce == true) text = '*Grup ditutup!*'
        if (groupUpdate.announce == false) text = '*Grup dibuka!*'

        if (!text) continue
        this.reply(id, text.trim())
    }
}

export async function deleteUpdate(message) {
    try {
        const conn = this
        const DB = conn.db || global.db
        const { fromMe, id, participant } = message
        if (fromMe) return
        let msg = this.serializeM(this.loadMessage(id))
        if (!msg || !DB.data.chats[msg.chat]?.delete) return

        const who = (await normalizeJid(participant || msg.sender, conn)).split('@')[0]
        await this.reply(msg.chat, `Terdeteksi @${who} telah menghapus pesan.`, msg, { mentions: [await normalizeJid(participant || msg.sender, conn)] })
        await this.copyNForward(msg.chat, msg).catch(() => {})
    } catch (e) {
        console.error(e)
    }
}

global.dfail = (type, m, conn) => {
    let msg = {
        rowner: '🍁 Akses ini di tujukan hanya untuk lynx decode saja..',
        owner: '🌟 Akses khusus pengembang lynx dan dinda..',
        mods: '🍂 ini bagian dari moderator..',
        premium: '🍃 fitur ini hanya bisa di akses user premium, beli premium akses? ketik .premium',
        group: 'fitur ini khusus grup kack 👥',
        private: 'gunakan di chat pribadi 💬',
        admin: '😉 Fitur ini di khususkan untuk admin ya, role member atau anggota tidak di ijinkan! ',
        botAdmin: 'Kak, saya di jadiin admin grup dulu ya, supaya fitur ini berfungsi. 😅',
        unreg: 'Hai Kack! kamu belum terdaftar nih. Ketik *.daftar* Dulu yaa biar bisa pakai bot.. 📝',
        restrict: 'restrict belum diaktifkan ⚙️',
        disable: 'perintah ini sedang dimatikan 🚫',
    }[type]
    if (msg) return conn.reply(m.chat, msg, m)
}

let file = global.__filename(import.meta.url, true)
watchFile(file, async () => {
    unwatchFile(file)
    console.log(chalk.redBright("Update 'handler.js'"))
    if (global.reloadHandler) console.log(await global.reloadHandler())
})
