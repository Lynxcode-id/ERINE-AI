const AUTO_RESTART_INTERVAL_MS = 40 * 60 * 1000

function getBotJid(conn) {
    return conn.user?.id
        ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
        : conn.user?.jid
}

function getSettings(botJid) {
    if (!global.db?.data) return {}
    if (!global.db.data.settings || typeof global.db.data.settings !== 'object') {
        global.db.data.settings = {}
    }
    if (!global.db.data.settings[botJid] || typeof global.db.data.settings[botJid] !== 'object') {
        global.db.data.settings[botJid] = {}
    }
    return global.db.data.settings[botJid]
}

if (!global.autoRestartStarted) {
    global.autoRestartStarted = true

    setInterval(async () => {
        try {
            const conn = global.conn
            if (!conn?.user) return
            const botJid = getBotJid(conn)
            const enabled = getSettings(botJid).autoRestart === true
            if (!enabled) return
            if (global.isRestarting || global.isReconnectScheduled) return
            if (!process.send) return

            console.log('[AUTO RESTART] Restart terjadwal (40 menit) dijalankan...')
            global.isRestarting = true
            await conn.ev.flush().catch(() => {})
            process.send('reset')
        } catch (e) {
            console.error('[AUTO RESTART ERROR]', e)
        }
    }, AUTO_RESTART_INTERVAL_MS)
}

let handler = async (m, { conn, args }) => {
    const botJid = getBotJid(conn)
    const settings = getSettings(botJid)
    const action = (args[0] || '').toLowerCase()

    if (action === 'on') {
        settings.autoRestart = true
        return m.reply(`✅ Auto-Restart diaktifkan. Bot bakal restart otomatis tiap ${AUTO_RESTART_INTERVAL_MS / 60000} menit.`)
    }
    if (action === 'off') {
        settings.autoRestart = false
        return m.reply('✅ Auto-Restart dimatikan.')
    }

    return m.reply(`🔄 *Auto-Restart:* ${settings.autoRestart === true ? 'AKTIF' : 'NONAKTIF'} (interval ${AUTO_RESTART_INTERVAL_MS / 60000} menit)\n\nKetik *.autorestart on* atau *.autorestart off* untuk ubah.`)
}

handler.help = ['autorestart <on/off>']
handler.tags = ['owner']
handler.command = /^(autorestart)$/i
handler.rowner = true

export default handler
