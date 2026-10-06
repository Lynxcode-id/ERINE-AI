export const growth = Math.pow(Math.PI / Math.E, 1.618) * Math.E * 0.75

const toSafeInt = (value, fallback = 0) => {
    const n = Number(value)
    return Number.isSafeInteger(n) ? n : fallback
}

export function xpRange(level, multiplier = global.multiplier || 1) {
    level = Math.max(0, Math.floor(Number(level) || 0))
    multiplier = Number(multiplier) > 0 && Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1

    if (level < 0) throw new TypeError('level tidak boleh negatif')

    const min = level === 0 ? 0 : Math.round(Math.pow(level, growth) * multiplier) + 1
    const max = Math.max(min, Math.round(Math.pow(level + 1, growth) * multiplier))
    return { min, max, xp: Math.max(0, max - min) }
}

export function findLevel(xp, multiplier = global.multiplier || 1) {
    if (xp === Infinity) return Infinity
    const value = Number(xp)
    if (Number.isNaN(value)) return NaN
    if (value <= 0) return 1

    const mult = Number(multiplier) > 0 && Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1
    let low = 1
    let high = 2

    while (high < 1_000_000_000 && xpRange(high, mult).min <= value) {
        high *= 2
    }

    let answer = 1
    while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        if (xpRange(mid, mult).min <= value) {
            answer = mid
            low = mid + 1
        } else {
            high = mid - 1
        }
    }

    return Math.max(1, answer)
}

export function canLevelUp(level, xp, multiplier = global.multiplier || 1) {
    const currentLevel = Math.max(1, toSafeInt(level, 1))
    if (xp === Infinity) return true
    const value = Number(xp)
    if (!Number.isFinite(value) || value < 0) return false
    return currentLevel < findLevel(value, multiplier)
}

export function syncLevel(user, multiplier = global.multiplier || 1) {
    if (!user || typeof user !== 'object') return { before: 1, after: 1, changed: false }

    const before = Math.max(1, toSafeInt(user.level, 1))
    const exp = Math.max(0, toSafeInt(user.exp, 0))
    const target = findLevel(exp, multiplier)
    const after = Math.max(before, target)

    user.level = after
    return { before, after, changed: after !== before }
}

export function applyExp(user, amount, multiplier = global.multiplier || 1) {
    if (!user || typeof user !== 'object') {
        return { added: 0, beforeExp: 0, afterExp: 0, beforeLevel: 1, afterLevel: 1, levelUp: false }
    }

    const add = Number(amount)
    if (!Number.isFinite(add) || add <= 0) {
        const levelState = syncLevel(user, multiplier)
        return {
            added: 0,
            beforeExp: Math.max(0, toSafeInt(user.exp, 0)),
            afterExp: Math.max(0, toSafeInt(user.exp, 0)),
            beforeLevel: levelState.before,
            afterLevel: levelState.after,
            levelUp: levelState.changed
        }
    }

    const safeAdd = Math.min(Math.floor(add), Number.MAX_SAFE_INTEGER)
    const beforeExp = Math.max(0, toSafeInt(user.exp, 0))
    const beforeLevel = Math.max(1, toSafeInt(user.level, 1))
    const afterExp = Math.min(Number.MAX_SAFE_INTEGER, beforeExp + safeAdd)

    user.exp = afterExp
    const target = findLevel(afterExp, multiplier)
    const afterLevel = Math.max(beforeLevel, target)
    user.level = afterLevel

    return {
        added: safeAdd,
        beforeExp,
        afterExp,
        beforeLevel,
        afterLevel,
        levelUp: afterLevel !== beforeLevel
    }
}

export async function addExpAndCheckLevel(m, conn, exp = 500) {
    const user = global.db?.data?.users?.[m?.sender]
    if (!user) return null

    const result = applyExp(user, exp)
    if (result.levelUp && conn?.sendMessage && m?.chat) {
        const msg = `┌˚₊ ๑│ L E V E L  U P │๑˚₊ 🎉\n` +
                    `┇ \n` +
                    `│ Selamat @${String(m.sender).split('@')[0]}!\n` +
                    `│ Kamu naik level.\n` +
                    `│ 📉 *Level Lama:* ${result.beforeLevel}\n` +
                    `│ 📈 *Level Baru:* ${result.afterLevel}\n` +
                    `└˚₊ ๑ ────────────── ๑˚₊\n` +
                    `> © ERINE-AI`
        await conn.sendMessage(m.chat, { text: msg, mentions: [m.sender] }, { quoted: m }).catch(() => {})
    }

    return result
}


