let handler = async (m, { conn, args, usedPrefix, command }) => {
    let chat = global.db.data.chats[m.chat] || {}
    let opt = (args[0] || '').toLowerCase()

    if (opt === 'on') {
        chat.stubReact = true
        let txt = `┌˚₊ ๑│ S T U B  R E A C T │๑˚₊\n` +
                  `┇ \n` +
                  `│ ✅ Fitur Auto React Stub Berhasil *Diaktifkan*!\n` +
                  `┇ \n` +
                  `└˚₊ ๑ ────────────── ๑˚₊\n` +
                  `> © ERINE-AI`
        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
    }
    else if (opt === 'off') {
        chat.stubReact = false
        let txt = `┌˚₊ ๑│ S T U B  R E A C T │๑˚₊\n` +
                  `┇ \n` +
                  `│ ❌ Fitur Auto React Stub Berhasil *Dimatikan*!\n` +
                  `┇ \n` +
                  `└˚₊ ๑ ────────────── ๑˚₊\n` +
                  `> © ERINE-AI`
        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
    }
    else {
        let emoji = args[0]
        if (emoji && emoji.length <= 4) {
            chat.stubEmoji = emoji
            chat.stubReact = true
            let txt = `┌˚₊ ๑│ S T U B  R E A C T │๑˚₊\n` +
                      `┇ \n` +
                      `│ ✅ Emoji React Stub berhasil diubah ke: ${emoji}\n` +
                      `┇ \n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `> © ERINE-AI`
            return await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }

        let txt = `┌˚₊ ๑│ S T U B  R E A C T │๑˚₊\n` +
                  `┇ \n` +
                  `│ ⚠️ *Format Salah!*\n` +
                  `│ \n` +
                  `│ *Cara Penggunaan:*\n` +
                  `│ ${usedPrefix + command} on  (Menyalakan)\n` +
                  `│ ${usedPrefix + command} off (Mematikan)\n` +
                  `│ ${usedPrefix + command} ❄️ (Ganti Emoji Beku/Lainnya)\n` +
                  `┇ \n` +
                  `└˚₊ ๑ ────────────── ๑˚₊\n` +
                  `> © ERINE-AI`
        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
    }
}

handler.help = ['stubreact <on/off/emoji>']
handler.tags = ['group']
handler.command = /^(stubreact|reactstub)$/i
handler.admin = true
handler.group = true

export default handler
