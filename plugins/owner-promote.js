const areJidsSameUser = (a, b) => {
    if (!a || !b) return false
    return a.split('@')[0].split(':')[0] === b.split('@')[0].split(':')[0]
}

let handler = async (m, { conn, participants }) => {
    let users = m.mentionedJid.filter(u => !areJidsSameUser(u, conn.user.id))

    if (users.length === 0) return m.reply('⚠️ Tag orang yang mau di-promote, Bang!')

    for (let user of users) {
        let participant = participants.find(v => areJidsSameUser(v.id, user))

        if (participant && !participant.admin) {
            await conn.groupParticipantsUpdate(m.chat, [user], 'promote')
            await delay(1000)
        }
    }

    m.reply('✅ *Success:* User yang di-tag berhasil di-promote jadi admin.')
}

handler.help = ['opromote @tag']
handler.tags = ['owner']
handler.command = /^(opromote)$/i

handler.owner = true
handler.group = true
handler.botAdmin = true

export default handler

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
