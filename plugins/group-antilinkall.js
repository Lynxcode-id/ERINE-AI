let handler = async (m, { conn, args, usedPrefix, command }) => {
    let chat = global.db.data.chats[m.chat] || {}
    let type = (args[0] || '').toLowerCase()

    if (type === 'on') {
        chat.antilink = true
        let capBox = `┌˚₊ ๑│ A N T I  L I N K │๑˚₊ 🟢\n` +
                     `┇ \n` +
                     `│ ✅ _Anti Link berhasil diaktifkan!_\n` +
                     `│ Member yang kirim link akan dihapus pesannya.\n` +
                     `┇ \n` +
                     `└˚₊ ๑ ────────────── ๑˚₊\n` +
                     `> © ERINE-AI`
        await conn.sendMessage(m.chat, { text: capBox }, { quoted: m })
    } else if (type === 'off') {
        chat.antilink = false
        let capBox = `┌˚₊ ๑│ A N T I  L I N K │๑˚₊ 🔴\n` +
                     `┇ \n` +
                     `│ ❌ _Anti Link berhasil dimatikan!_\n` +
                     `│ Member sekarang bebas mengirim link.\n` +
                     `┇ \n` +
                     `└˚₊ ๑ ────────────── ๑˚₊\n` +
                     `> © ERINE-AI`
        await conn.sendMessage(m.chat, { text: capBox }, { quoted: m })
    } else {
        let errTeks = `┌˚₊ ๑│ A N T I  L I N K │๑˚₊ ⚙️\n` +
                      `┇ \n` +
                      `│ Format salah, bre!\n` +
                      `│ *Cara pakai:* ${usedPrefix + command} on/off\n` +
                      `│ *Contoh:* ${usedPrefix + command} on\n` +
                      `┇ \n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `> © ERINE-AI`
        await conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
    }
}

handler.before = async function (m, { conn, isAdmin, isBotAdmin }) {
    if (!m.isGroup) return false

    let chat = global.db.data.chats[m.chat] || {}
    if (!chat.antilink) return false

    if (!isBotAdmin) return false
    if (isAdmin) return false

    const linkRegex = /https?:\/\/[^\s]+/i
    const containsLink = linkRegex.test(m.text || '')

    if (containsLink) {
        await conn.sendMessage(m.chat, { delete: m.key })

        let warningMessage = `┌˚₊ ๑│ A N T I  L I N K │๑˚₊ ⛔\n` +
                             `┇ \n` +
                             `│ Deteksi tautan terlarang!\n` +
                             `│ Pesan dari @${m.sender.split('@')[0]} telah dihapus otomatis karena mengirimkan link.\n` +
                             `┇ \n` +
                             `└˚₊ ๑ ────────────── ๑˚₊\n` +
                             `> © ERINE-AI`

        await conn.sendMessage(m.chat, {
            text: warningMessage,
            mentions: [m.sender]
        })

        return true
    }
    return false
}

handler.help = ['antilink <on/off>']
handler.tags = ['group']
handler.command = /^(antilink)$/i
handler.group = true
handler.admin = true

export default handler
