const box = (title, emoji, lines) =>
    `┌˚₊ ๑│ ${title} │๑˚₊ ${emoji}\n┇ \n` +
    lines.map(l => `│ ${l}`).join('\n') +
    `\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`

const getTarget = (m, args) => {
    if (m.mentionedJid && m.mentionedJid[0]) return m.mentionedJid[0]
    if (m.quoted && m.quoted.sender) return m.quoted.sender
    if (args && args.length > 0) {
        let number = args.join('').replace(/[^0-9]/g, '')
        if (number.length > 8) return number + '@s.whatsapp.net'
    }
    return null
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let chat = global.db.data.chats[m.chat]
    if (!chat) chat = global.db.data.chats[m.chat] = {}
    if (!Array.isArray(chat.adminWajib)) chat.adminWajib = []

    let cmd = (command || '').toLowerCase()

    if (cmd === 'antikudeta') {
        let sub = (args[0] || '').toLowerCase()

        if (sub === 'on') {
            if (chat.antikudeta) return m.reply('✅ Anti Kudeta sudah aktif di grup ini.')
            chat.antikudeta = true
            return conn.sendMessage(m.chat, {
                text: box('A N T I  K U D E T A', '🛡️', [
                    '✅ *Anti Kudeta berhasil diaktifkan!*',
                    '┇ ',
                    'Kalau ada *Admin Wajib* yang diturunkan jabatannya (demote), bot otomatis mengeluarkan semua admin lain kecuali pemilik grup & Admin Wajib itu sendiri.',
                    '┇ ',
                    `📌 Atur daftarnya dengan *${usedPrefix}setwajib* (reply/tag/nomor)`
                ])
            }, { quoted: m })
        }

        if (sub === 'off') {
            if (!chat.antikudeta) return m.reply('❌ Anti Kudeta sudah nonaktif di grup ini.')
            chat.antikudeta = false
            return conn.sendMessage(m.chat, { text: box('A N T I  K U D E T A', '🛡️', ['❌ *Anti Kudeta dinonaktifkan!*']) }, { quoted: m })
        }

        return conn.sendMessage(m.chat, {
            text: box('A N T I  K U D E T A', '🛡️', [
                `Status: ${chat.antikudeta ? '✅ Aktif' : '❌ Nonaktif'}`,
                `Admin Wajib: ${chat.adminWajib.length} orang`,
                '┇ ',
                `📌 *${usedPrefix}antikudeta on/off*`,
                `📌 *${usedPrefix}setwajib* (reply/tag/nomor) - Tambah admin wajib`,
                `📌 *${usedPrefix}delwajib* (reply/tag/nomor) - Hapus admin wajib`,
                `📌 *${usedPrefix}listwajib* - Lihat daftar`
            ])
        }, { quoted: m })
    }

    if (cmd === 'setwajib') {
        let target = getTarget(m, args)
        if (!target) return m.reply(`❌ Reply/tag/masukkan nomor orang yang mau dijadiin Admin Wajib.\nContoh: *${usedPrefix}setwajib 628xxxxxxxx*`)

        if (chat.adminWajib.includes(target)) return m.reply(`❌ @${target.split('@')[0]} sudah ada di daftar Admin Wajib.`, null, { mentions: [target] })

        chat.adminWajib.push(target)
        return conn.sendMessage(m.chat, {
            text: box('S E T  A D M I N  W A J I B', '🔒', [
                `✅ @${target.split('@')[0]} ditambahkan ke daftar Admin Wajib.`,
                '┇ ',
                `Kalau dia diturunkan dari admin dan Anti Kudeta aktif, bot bakal ngeluarin semua admin lain (kecuali owner grup).`
            ])
        }, { quoted: m, mentions: [target] })
    }

    if (cmd === 'delwajib') {
        let target = getTarget(m, args)
        if (!target) return m.reply(`❌ Reply/tag/masukkan nomor orang yang mau dihapus dari Admin Wajib.\nContoh: *${usedPrefix}delwajib 628xxxxxxxx*`)

        if (!chat.adminWajib.includes(target)) return m.reply(`❌ @${target.split('@')[0]} tidak ada di daftar Admin Wajib.`, null, { mentions: [target] })

        chat.adminWajib = chat.adminWajib.filter(j => j !== target)
        return conn.sendMessage(m.chat, {
            text: box('D E L  A D M I N  W A J I B', '🔓', [`✅ @${target.split('@')[0]} dihapus dari daftar Admin Wajib.`])
        }, { quoted: m, mentions: [target] })
    }

    if (cmd === 'listwajib') {
        if (!chat.adminWajib.length) {
            return conn.sendMessage(m.chat, {
                text: box('L I S T  A D M I N  W A J I B', '📋', ['_Belum ada Admin Wajib di grup ini._'])
            }, { quoted: m })
        }

        let lines = chat.adminWajib.map((j, i) => `${i + 1}. @${j.split('@')[0]}`)
        return conn.sendMessage(m.chat, {
            text: box('L I S T  A D M I N  W A J I B', '📋', lines)
        }, { quoted: m, mentions: chat.adminWajib })
    }
}

handler.help = ['antikudeta on/off', 'setwajib', 'delwajib', 'listwajib']
handler.tags = ['group']
handler.command = /^(antikudeta|setwajib|delwajib|listwajib)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
