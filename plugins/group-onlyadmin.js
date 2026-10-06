
let handler = async (m, { conn, args, usedPrefix, command }) => {
    let chat = global.db.data.chats[m.chat]

    if (!chat) {
        global.db.data.chats[m.chat] = {}
        chat = global.db.data.chats[m.chat]
    }

    if (args[0] === 'on') {
        chat.onlyAdmin = true
        await m.reply(`┌˚₊ ๑│ ᴏ ɴ ʟ ʏ  ᴀ ᴅ ᴍ ɪ ɴ │๑˚₊ 🛡️\n┇ \n│ ✅ *Mode Only Admin Aktif!*\n│ \n│ Sekarang hanya Admin yang bisa mengakses fitur bot di grup ini.\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`)
    } else if (args[0] === 'off') {
        chat.onlyAdmin = false
        await m.reply(`┌˚₊ ๑│ ᴏ ɴ ʟ ʏ  ᴀ ᴅ ᴍ ɪ ɴ │๑˚₊ 🛡️\n┇ \n│ ✅ *Mode Only Admin Nonaktif!*\n│ \n│ Semua member sekarang bebas menggunakan bot kembali.\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`)
    } else {
        await m.reply(`┌˚₊ ๑│ ᴏ ɴ ʟ ʏ  ᴀ ᴅ ᴍ ɪ ɴ │๑˚₊ 🛡️\n┇ \n│ ❌ *Format Salah!*\n│ \n│ 📌 *Cara pakai:*\n│ ❦ ${usedPrefix + command} on\n│ ❦ ${usedPrefix + command} off\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`)
    }
}

handler.help = ['onlyadmin <on/off>']
handler.tags = ['group']
handler.command = /^(onlyadmin)$/i
handler.group = true
handler.admin = true

export default handler
