const VALID_TAGS = ['rpg', 'game']

function getBotJid(conn) {
    return conn.user?.id
        ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
        : conn.user?.jid
}

function getDisabledTags(botJid) {
    if (!global.db?.data) return {}
    if (!global.db.data.settings || typeof global.db.data.settings !== 'object') {
        global.db.data.settings = {}
    }
    if (!global.db.data.settings[botJid] || typeof global.db.data.settings[botJid] !== 'object') {
        global.db.data.settings[botJid] = {}
    }
    if (!global.db.data.settings[botJid].disabledTags || typeof global.db.data.settings[botJid].disabledTags !== 'object') {
        global.db.data.settings[botJid].disabledTags = {}
    }
    return global.db.data.settings[botJid].disabledTags
}

function normalizeTags(tags) {
    if (Array.isArray(tags)) {
        return tags
            .map(tag => String(tag).trim().toLowerCase())
            .filter(Boolean)
    }

    if (typeof tags === 'string') {
        return tags
            .split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(Boolean)
    }

    return []
}

function commandMatches(plugin, command) {
    if (!plugin?.command) return false

    if (plugin.command instanceof RegExp) {
        plugin.command.lastIndex = 0
        return plugin.command.test(command)
    }

    if (Array.isArray(plugin.command)) {
        return plugin.command.some(cmd => {
            if (cmd instanceof RegExp) {
                cmd.lastIndex = 0
                return cmd.test(command)
            }

            return String(cmd).toLowerCase() === command
        })
    }

    if (typeof plugin.command === 'string') {
        return plugin.command.toLowerCase() === command
    }

    return false
}

function applyGuard(botJid) {
    for (let name in global.plugins) {
        let plugin = global.plugins[name]
        if (!plugin || plugin.__categoryGuarded) continue

        let myTags = normalizeTags(plugin.tags)
            .filter(tag => VALID_TAGS.includes(tag))

        if (!myTags.length) continue

        plugin.__categoryGuarded = true

        let origBefore = typeof plugin.before === 'function'
            ? plugin.before
            : null

        plugin.before = async function (m, ctx) {
            let disabled = getDisabledTags(botJid)

            if (!myTags.some(tag => disabled[tag])) {
                return origBefore
                    ? origBefore.call(this, m, ctx)
                    : false
            }

            let match = ctx?.match?.[0]
            let usedPrefix = Array.isArray(match)
                ? match[0]
                : typeof match === 'string'
                    ? match
                    : ''

            if (!usedPrefix) {
                return origBefore
                    ? origBefore.call(this, m, ctx)
                    : false
            }

            let text = String(m?.text || '')
            let noPrefix = text.startsWith(usedPrefix)
                ? text.slice(usedPrefix.length)
                : text.replace(usedPrefix, '')

            let command = (noPrefix.trim().split(/\s+/)[0] || '')
                .toLowerCase()

            if (!commandMatches(plugin, command)) {
                return origBefore
                    ? origBefore.call(this, m, ctx)
                    : false
            }

            if (!m.__categoryNotified) {
                m.__categoryNotified = true
                await m.reply(
                    `🚫 Fitur kategori *${myTags.join('/')}* sedang dinonaktifkan sementara oleh owner.`
                )
            }

            return true
        }
    }
}

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
    if (!isOwner) {
        return m.reply('⚠️ Fitur ini khusus Owner, bre!')
    }

    let botJid = getBotJid(conn)
    let disabled = getDisabledTags(botJid)

    applyGuard(botJid)

    let action = String(args[args.length - 1] || '').toLowerCase()
    let tags = args
        .slice(0, -1)
        .map(tag => String(tag).toLowerCase())
        .filter(tag => VALID_TAGS.includes(tag))

    if (!tags.length || !['on', 'off'].includes(action)) {
        let status = VALID_TAGS
            .map(tag => `│ • ${tag} : ${disabled[tag] ? '🔴 OFF' : '🟢 ON'}`)
            .join('\n')

        return m.reply(
            `┌˚₊ ๑│ T O G G L E  F I T U R │๑˚₊ ⚙️\n` +
            `┇\n` +
            `│ Matiin/nyalain semua plugin per kategori sekaligus.\n` +
            `┇\n` +
            `│ *Contoh:*\n` +
            `│ ${usedPrefix + command} rpg off\n` +
            `│ ${usedPrefix + command} game off\n` +
            `│ ${usedPrefix + command} rpg game off\n` +
            `┇\n` +
            `│ *Status sekarang:*\n${status}\n` +
            `└˚₊ ๑ ────────────── ๑˚₊\n` +
            `> © ERINE-AI`
        )
    }

    for (let tag of tags) {
        disabled[tag] = action === 'off'
    }

    await m.react('✅')

    return m.reply(
        `✅ Kategori *${tags.join(', ')}* berhasil di-${action === 'off' ? 'nonaktifkan' : 'aktifkan'} serentak.`
    )
}

handler.help = ['matikanfitur <rpg/game> <on/off>']
handler.tags = ['owner']
handler.command = ['matikanfitur']
handler.limit = false
handler.owner = true

export default handler
