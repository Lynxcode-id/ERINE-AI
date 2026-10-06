let handler = async (m, { conn, text, usedPrefix, command }) => {
    let isWelcome = /^(setwelcome|setw)$/i.test(command)
    let type = isWelcome ? 'Welcome' : 'Leave/Bye'
    let dbField = isWelcome ? 'sWelcome' : 'sBye'

    if (text) {
        global.db.data.chats[m.chat][dbField] = text
        await m.react('✅')

        let cap = `\`ᴇʀɪɴᴇ ᴍᴀɴᴀɢᴇᴍᴇɴᴛ ɢʀᴏᴜᴘ\`\n乂 *Status* : Berhasil mengatur pesan ${type}!\n\n*Variabel Pendukung:*\n• \`@user\` : Mention target\n• \`@subject\` : Judul Grup\n• \`@desc\` : Deskripsi Grup`

        m.reply(cap)
    } else {
        await m.react('❌')

        let ex = isWelcome ? 'Hai @user, selamat datang di @subject!\n\n@desc' : 'Selamat tinggal @user dari @subject!'

        let cap = `\`ᴇʀɪɴᴇ ᴍᴀɴᴀɢᴇᴍᴇɴᴛ ɢʀᴏᴜᴘ\`\n乂 *Status* : Gagal, teks pesan tidak ditemukan.\n\n*Contoh Penggunaan:*\n${usedPrefix + command} ${ex}\n\n*Variabel Pendukung:*\n• \`@user\` : Mention target\n• \`@subject\` : Judul Grup\n• \`@desc\` : Deskripsi Grup`

        m.reply(cap)
    }
}

handler.help = ['setwelcome <teks>', 'setleft <teks>']
handler.tags = ['group']
handler.command = /^(setwelcome|setw|setleft|setl|setbye)$/i
handler.group = true
handler.admin = true

export default handler
