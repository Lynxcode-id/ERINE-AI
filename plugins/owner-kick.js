import pkg from '@whiskeysockets/baileys'
const { areJidsSameUser } = pkg

let handler = async (m, { conn, participants, isAdmin, usedPrefix, command }) => {
    let users = m.mentionedJid.filter(u => !areJidsSameUser(u, conn.user.id))
    let quoted = m.quoted ? [m.quoted.sender] : []
    let targets = [...new Set([...users, ...quoted])].filter(u => u.endsWith('@s.whatsapp.net'))

    if (targets.length === 0) {
        return m.reply(`⚠️ Tag atau reply orang yang mau dikeluarkan, Bang!\nContoh: *${usedPrefix + command}* @user`)
    }

    await m.react('⏳')

    try {
        for (let user of targets) {
            let isTargetAdmin = participants.find(v => areJidsSameUser(v.id, user))?.admin

            if (!isTargetAdmin) {
                await conn.groupParticipantsUpdate(m.chat, [user], "remove")
                await delay(1000)
            } else {
                await m.reply(`❌ Gagal mengeluarkan @${user.split('@')[0]} karena dia adalah Admin.`, null, { mentions: [user] })
            }
        }

        await m.react('✅')

    } catch (e) {
        console.error(e)
        await m.react('❌')
        m.reply('❌ Terjadi kesalahan saat mencoba mengeluarkan anggota.')
    }
}

handler.help = ['kick @tag']
handler.tags = ['group']
handler.command = /^(kick|remove|keluarkan)$/i

handler.group = true
handler.botAdmin = true
handler.admin = true

export default handler

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
