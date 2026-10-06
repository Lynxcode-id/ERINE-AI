let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
    if (!isOwner) return m.reply('⚠️ Fitur ini khusus Owner, bre!')

    let botJid = conn.user?.id ? conn.user.id.split(':')[0] + '@s.whatsapp.net' : conn.user.jid
    global.db.data.settings[botJid] = global.db.data.settings[botJid] || {}
    let setting = global.db.data.settings[botJid]

    if (!args[0]) {
        let teks = `┌˚₊ ๑│ S E T  R E P L Y │๑˚₊ ⚙️\n` +
                   `┇ \n` +
                   `│ Pilih style balasan default bot:\n` +
                   `│ *1.* Fake Payment\n` +
                   `│ *2.* Fake Live Location\n` +
                   `│ *3.* Fake Status\n` +
                   `│ *4.* Fake Kontak\n` +
                   `│ *5.* Fake Voice Note\n` +
                   `│ *6.* Fake Text\n` +
                   `│ *7.* Fake Gif/Video\n` +
                   `│ *8.* Fake Toko\n` +
                   `│ *9.* Fake Document\n` +
                   `│ *10.* Fake Group Invite\n` +
                   `│ *11.* Link Preview (Lynx Apis)\n` +
                   `┇ \n` +
                   `│ *Contoh:* ${usedPrefix + command} 11\n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: teks }, { quoted: m })
    }

    let type = parseInt(args[0])
    if (isNaN(type) || type < 1 || type > 11) {
        return m.reply('⚠️ Masukkan angka yang valid antara 1 sampai 11, bre!')
    }

    setting.replyType = type
    global.replyType = type

    await m.react('✅')
    m.reply(`✅ Berhasil mengubah style reply bot ke tipe *${type}*!`)
}

handler.help = ['setreply <1-11>']
handler.tags = ['owner']
handler.command = /^(setreply|replyset)$/i
handler.owner = true

export default handler
