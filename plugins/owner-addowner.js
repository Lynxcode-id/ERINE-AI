let handler = async (m, { conn, args, command, usedPrefix, isOwner }) => {
    if (!isOwner) throw '❌ Hanya owner utama yang bisa menggunakan perintah ini!'

    global.owner = global.owner || []
    let cmd = command.toLowerCase()

    if (cmd === 'addowner') {
        if (!args[0]) return m.reply(`⚠️ Contoh penggunaan:\n*${usedPrefix + command} 628xxxxx (nama)*`)

        let number = args[0].replace(/[^0-9]/g, '')
        let name = args.slice(1).join(' ') || 'Owner Kedua'
        if (!number) return m.reply('❌ Nomor tidak valid!')

        let jid = number + '@s.whatsapp.net'
        let exist = global.owner.some(([id]) => id === number)
        if (exist) return m.reply('⚠️ Nomor tersebut sudah terdaftar sebagai owner!')

        global.owner.push([number, name, true])

        let teks = `┌˚₊ ๑│ A D D  O W N E R │๑˚₊ 👑\n` +
                   `┇ \n` +
                   `│ ✅ Berhasil menambahkan owner baru!\n` +
                   `│ 👤 *Nomor:* @${number}\n` +
                   `│ 🏷️ *Nama:* ${name}\n` +
                   `│ 📌 *Status:* Permanen (Owner Kedua)\n` +
                   `┇ \n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: teks, mentions: [jid] }, { quoted: m })
    }

    if (cmd === 'delowner' || cmd === 'hapusowner') {
        if (!args[0]) return m.reply(`⚠️ Contoh penggunaan:\n*${usedPrefix + command} 628xxxxx*`)

        let number = args[0].replace(/[^0-9]/g, '')
        if (!number) return m.reply('❌ Nomor tidak valid!')

        if (global.owner.length > 0 && global.owner[0][0] === number) {
            return m.reply('❌ Goblok, mana bisa hapus Owner Utama! 👑')
        }

        let index = global.owner.findIndex(([id]) => id === number)
        if (index === -1) return m.reply('❌ Nomor tersebut tidak ditemukan di daftar owner!')

        global.owner.splice(index, 1)

        let teks = `┌˚₊ ๑│ D E L  O W N E R │๑˚₊ 👑\n` +
                   `┇ \n` +
                   `│ ✅ Berhasil menghapus owner dari daftar!\n` +
                   `│ 👤 *Nomor:* ${number}\n` +
                   `┇ \n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI`
        return conn.reply(m.chat, teks, m)
    }

    if (cmd === 'listowner' || cmd === 'ownerlist') {
        let owners = global.owner || []
        let listTeks = owners.map(([id, name], i) => {
            let role = i === 0 ? '👑 Owner Utama (Pusat)' : '⭐ Owner Kedua / Partner'
            return `│ *${i + 1}.* @${id}\n│    • Nama: ${name || 'Tanpa Nama'}\n│    • Status: ${role}`
        }).join('\n│\n')

        let teks = `┌˚₊ ๑│ L I S T  O W N E R │๑˚₊ 👑\n` +
                   `┇ \n` +
                   `${listTeks}\n` +
                   `┇ \n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI`

        let mentions = owners.map(([id]) => id + '@s.whatsapp.net')
        return conn.sendMessage(m.chat, { text: teks, mentions: mentions }, { quoted: m })
    }
}

handler.help = ['addowner <nomor>', 'delowner <nomor>', 'listowner']
handler.tags = ['owner']
handler.command = /^(addowner|delowner|hapusowner|listowner|ownerlist)$/i
handler.owner = true

export default handler
