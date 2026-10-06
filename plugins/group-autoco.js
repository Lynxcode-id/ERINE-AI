let handler = async (m, { conn, args, command, usedPrefix, isOwner, isAdmin }) => {
    if (!m.isGroup) return conn.sendMessage(m.chat, { text: '⚠️ Fitur ini khusus untuk di dalam grup, bre!' }, { quoted: m })
    if (!isAdmin && !isOwner) return conn.sendMessage(m.chat, { text: '⚠️ Lu bukan admin grup, bre!' }, { quoted: m })

    let chat = global.db.data.chats[m.chat]
    if (!chat) return m.reply('Database chat tidak ditemukan.')

    switch (command) {
        case 'setclose':
            if (!args[0]) {
                let errTeks = `┌˚₊ ๑│ A U T O  C L O S E │๑˚₊ 🌙\n` +
                              `┇ \n` +
                              `│ Masukkan jam untuk tutup grup, bre!\n` +
                              `│ *Contoh:* ${usedPrefix + command} 00:00\n` +
                              `┇ \n` +
                              `└˚₊ ๑ ────────────── ๑˚₊\n` +
                              `> © ERINE-AI`
                return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
            }
            if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(args[0])) {
                return conn.sendMessage(m.chat, { text: '⚠️ Format waktu salah! Gunakan format HH:MM (contoh: 00:00)' }, { quoted: m })
            }

            chat.closeTime = args[0]
            await m.react('✅')
            conn.sendMessage(m.chat, { text: `✅ Berhasil mengatur jam tutup ke *${args[0]} WITA*.\n\nPastikan fitur aktif dengan mengetik *${usedPrefix}autoco on*` }, { quoted: m })
            break

        case 'setopen':
            if (!args[0]) {
                let errTeks = `┌˚₊ ๑│ A U T O  O P E N │๑˚₊ ☀️\n` +
                              `┇ \n` +
                              `│ Masukkan jam untuk buka grup, bre!\n` +
                              `│ *Contoh:* ${usedPrefix + command} 05:40\n` +
                              `┇ \n` +
                              `└˚₊ ๑ ────────────── ๑˚₊\n` +
                              `> © ERINE-AI`
                return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
            }
            if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(args[0])) {
                return conn.sendMessage(m.chat, { text: '⚠️ Format waktu salah! Gunakan format HH:MM (contoh: 05:40)' }, { quoted: m })
            }

            chat.openTime = args[0]
            await m.react('✅')
            conn.sendMessage(m.chat, { text: `✅ Berhasil mengatur jam buka ke *${args[0]} WITA*.\n\nPastikan fitur aktif dengan mengetik *${usedPrefix}autoco on*` }, { quoted: m })
            break

        case 'autoco':
            if (!args[0] || !['on', 'off'].includes(args[0].toLowerCase())) {
                let errTeks = `┌˚₊ ๑│ A U T O  C L O S E / O P E N │๑˚₊ ⚙️\n` +
                              `┇ \n` +
                              `│ Pilih untuk mengaktifkan atau mematikan, bre!\n` +
                              `│ *Contoh:* ${usedPrefix + command} on\n` +
                              `│ *Contoh:* ${usedPrefix + command} off\n` +
                              `┇ \n` +
                              `└˚₊ ๑ ────────────── ๑˚₊\n` +
                              `> © ERINE-AI`
                return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
            }

            if (args[0].toLowerCase() === 'on') {
                if (!chat.closeTime || !chat.openTime) {
                    return conn.sendMessage(m.chat, { text: `⚠️ Atur waktu tutup dan buka dulu bre!\nKetik *${usedPrefix}setclose HH:MM* dan *${usedPrefix}setopen HH:MM*` }, { quoted: m })
                }
                chat.autoco = true
                await m.react('✅')
                conn.sendMessage(m.chat, { text: '✅ Fitur Auto Close/Open berhasil *Diaktifkan* untuk grup ini!' }, { quoted: m })
            } else {
                chat.autoco = false
                await m.react('✅')
                conn.sendMessage(m.chat, { text: '✅ Fitur Auto Close/Open berhasil *Dimatikan* untuk grup ini!' }, { quoted: m })
            }
            break

        case 'resetco':
            chat.autoco = false
            chat.closeTime = ''
            chat.openTime = ''
            delete chat.isClosed
            delete chat.lastCloseDate
            delete chat.lastOpenDate
            delete chat.lastErrorDate

            await m.react('✅')
            conn.sendMessage(m.chat, { text: '✅ Konfigurasi Auto Close/Open grup ini berhasil direset!' }, { quoted: m })
            break
    }
}

handler.help = ['setclose <waktu>', 'setopen <waktu>', 'autoco <on/off>', 'resetco']
handler.tags = ['group']
handler.command = /^(setclose|setopen|autoco|resetco)$/i
handler.admin = true
handler.group = true

export default handler
