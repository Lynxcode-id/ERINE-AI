let handler = async (m, { conn, text, usedPrefix, command }) => {
    let who
    if (m.isGroup) {
        if (m.mentionedJid[0]) {
            who = m.mentionedJid[0]
        } else if (m.quoted) {
            who = m.quoted.sender
        } else if (text) {
            who = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        }
    } else {
        if (text) {
            who = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        } else {
            who = m.chat
        }
    }

    if (!who || who === '@s.whatsapp.net') {
        let errTeks = `┌˚₊ ๑│ D E L  L I M I T │๑˚₊ 🗑️\n` +
                      `┇ \n` +
                      `│ ⚠️ Tag, reply pesan, atau ketik nomor target!\n` +
                      `│ *Contoh:* ${usedPrefix + command} 6283831186792\n` +
                      `┇ \n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `> © ERINE-MD`
        return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
    }

    let users = global.db.data.users
    if (!users[who]) {
        let notFound = `┌˚₊ ๑│ D E L  L I M I T │๑˚₊ ❌\n` +
                       `┇ \n` +
                       `│ ⚠️ Pengguna tidak ditemukan di database!\n` +
                       `┇ \n` +
                       `└˚₊ ๑ ────────────── ๑˚₊\n` +
                       `> © ERINE-MD`
        return conn.sendMessage(m.chat, { text: notFound }, { quoted: m })
    }

    users[who].limit = 0

    let successTeks = `┌˚₊ ๑│ D E L  L I M I T │๑˚₊ ✅\n` +
                      `┇ \n` +
                      `│ Limit pengguna berhasil dihapus.\n` +
                      `│ 👤 *Target:* @${who.split('@')[0]}\n` +
                      `│ 📉 *Sisa Limit:* 0\n` +
                      `┇ \n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `> © ERINE-MD`

    await conn.sendMessage(m.chat, { text: successTeks, mentions: [who] }, { quoted: m })
}

handler.help = ['dellimituser <target>']
handler.tags = ['owner']
handler.command = /^(dellimituser)$/i
handler.rowner = true

export default handler
