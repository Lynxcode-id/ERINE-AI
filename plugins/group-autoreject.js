import { WAMessageStubType } from '@whiskeysockets/baileys'

const formatUI = (title, content) => {
    return `┌˚₊ ๑│ ${title.toUpperCase()} │๑˚₊\n┇ \n│ ${content}\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!m.isGroup) return m.reply(formatUI("ERROR", "Fitur ini hanya dapat digunakan di dalam grup!"))

    global.db.data.chats = global.db.data.chats || {}
    global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || {}
    let chat = global.db.data.chats[m.chat]

    let opt = (args[0] || '').toLowerCase()
    await m.react('⏳')

    if (opt === 'on' || opt === '1') {
        chat.autoReject = true
        await m.react('✅')
        return m.reply(formatUI("AUTO REJECT", "Fitur Auto Reject Request Bergabung telah diaktifkan di grup ini."))
    } else if (opt === 'off' || opt === '0') {
        chat.autoReject = false
        await m.react('✅')
        return m.reply(formatUI("AUTO REJECT", "Fitur Auto Reject Request Bergabung telah dinonaktifkan di grup ini."))
    } else {
        await m.react('❌')
        return m.reply(formatUI("AUTO REJECT", `Gunakan format:\n*${usedPrefix + command} on* untuk mengaktifkan\n*${usedPrefix + command} off* untuk menonaktifkan`))
    }
}

handler.before = async function (m, { conn }) {
    if (!m.isGroup) return false

    global.db.data.chats = global.db.data.chats || {}
    let chat = global.db.data.chats[m.chat]
    if (!chat || !chat.autoReject) return false

    if (m.messageStubType === 156 || m.messageStubType === WAMessageStubType.GROUP_MEMBERSHIP_JOIN_APPROVAL_REQUEST) {
        let requester = m.messageStubParameters?.[0]
        if (!requester) return false

        const groupMetadata = await conn.groupMetadata(m.chat)
        const participants = groupMetadata.participants
        const bot = participants.find(p => p.id === conn.user.jid)
        const isAdmin = bot && (bot.admin === 'admin' || bot.admin === 'superadmin')

        if (!isAdmin) {
            await conn.reply(m.chat, formatUI("AUTO REJECT", "Gagal menolak permintaan bergabung secara otomatis karena bot bukan admin grup!"), null)
            return false
        }

        try {
            await conn.groupRequestParticipantsUpdate(m.chat, [requester], 'reject')

            let mention = `@${requester.split('@')[0]}`
            let txt = `Berhasil menolak permintaan bergabung otomatis.\n\nTarget: ${mention}`

            await conn.reply(m.chat, formatUI("AUTO REJECT", txt), null, { mentions: [requester] })
            return true
        } catch (err) {
            console.error(err)
            return false
        }
    }
    return false
}

handler.help = ['autoreject']
handler.tags = ['group']
handler.command = /^(autoreject)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
