let handler = async (m, { conn, usedPrefix, command }) => {
    let users = global.db.data.users || {}

    let bannedUsers = Object.entries(users).filter(([jid, user]) => user.banned)

    if (bannedUsers.length === 0) {
        let emptyTeks = `┌˚₊ ๑│ L I S T  B A N │๑˚₊ 🛡️\n` +
                        `┇ \n` +
                        `│ ℹ️ Tidak ada user yang di-ban saat ini.\n` +
                        `┇ \n` +
                        `└˚₊ ๑ ────────────── ๑˚₊\n` +
                        `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: emptyTeks }, { quoted: m })
    }

    let teks = `┌˚₊ ๑│ L I S T  B A N │๑˚₊ 🛡️\n` +
               `┇ \n` +
               `│ 📊 *Total Banned:* ${bannedUsers.length} User\n` +
               `┇ \n`

    let mentions = []
    bannedUsers.forEach(([jid, user], i) => {
        let name = user.name || 'Unknown'
        teks += `│ ${i + 1}. @${jid.split('@')[0]} (${name})\n`
        mentions.push(jid)
    })

    teks += `┇ \n` +
            `└˚₊ ๑ ────────────── ๑˚₊\n` +
            `> © ERINE-AI`

    await conn.sendMessage(m.chat, {
        text: teks,
        mentions: mentions
    }, { quoted: m })
}

handler.help = ['listban', 'ceklistban']
handler.tags = ['owner', 'info']
handler.command = /^(listban)$/i
handler.rowner = true

export default handler
