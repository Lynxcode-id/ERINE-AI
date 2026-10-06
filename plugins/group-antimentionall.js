const handler = async (m, { text, command, usedPrefix, isAdmin, isOwner }) => {
    let chat = global.db.data.chats[m.chat]
    if (!chat) {
        global.db.data.chats[m.chat] = {}
        chat = global.db.data.chats[m.chat]
    }

    const action = text?.toLowerCase()?.trim() || ''
    const canManage = isAdmin || isOwner

    if (!canManage && action !== '') {
        return m.reply('❌ Perintah ini hanya untuk admin grup.')
    }

    const makeUI = (title, content) => {
        return `┌˚₊ ๑│ ${title} │๑˚₊\n` +
               `┇ \n` +
               content.split('\n').map(line => `│ ${line}`).join('\n') + `\n` +
               `┇ \n` +
               `└˚₊ ๑ ────────────── ๑˚₊\n` +
               `> © ERINE-AI`
    }

    if (['on', 'enable', 'aktif', '1'].includes(action)) {
        chat.antiTagAll = true
        return m.reply(makeUI('S U C C E S S', '✅ *Anti Tag All* berhasil diaktifkan!\nMember biasa yang menggunakan @all akan diberi peringatan hingga dikeluarkan.'))
    }

    if (['off', 'disable', 'mati', '0'].includes(action)) {
        chat.antiTagAll = false
        return m.reply(makeUI('S U C C E S S', '❌ *Anti Tag All* telah dimatikan.\nSemua member bebas menggunakan @all.'))
    }

    return m.reply(makeUI('S E T T I N G S', `ℹ️ Status saat ini: *${chat.antiTagAll ? 'AKTIF ✅' : 'MATI ❌'}*\n\n*Gunakan:*\n${usedPrefix + command} on\n${usedPrefix + command} off`))
}

handler.help = ['antitagall <on/off>', 'antimentionall <on/off>']
handler.tags = ['group']
handler.command = /^(antitagall|antimentionall)$/i
handler.group = true

handler.before = async function (m, { isBotAdmin, isAdmin, isOwner }) {
    if (m.isBaileys || m.fromMe) return
    if (!m.isGroup) return

    const DB = this.db || global.db
    let chat = DB?.data?.chats?.[m.chat] || {}

    if (!chat.antiTagAll) return

    if (isAdmin || isOwner) return

    let isNativeAll = m.message?.extendedTextMessage?.contextInfo?.nonJidMentions > 0
    let isManualAll = m.text && m.text.toLowerCase().includes('@all') && m.mentionedJid && m.mentionedJid.length > 10

    if (isNativeAll || isManualAll) {
        if (!isBotAdmin) return // Kalau bot bukan admin, diem aja

        let user = DB?.data?.users?.[m.sender]
        if (!user) {
            if (DB && DB.data && DB.data.users) DB.data.users[m.sender] = {}
            user = DB?.data?.users?.[m.sender] || {}
        }

        user.antiTagWarn = (user.antiTagWarn || 0) + 1

        const makeUI = (title, content) => {
            return `┌˚₊ ๑│ ${title} │๑˚₊\n` +
                   `┇ \n` +
                   content.split('\n').map(line => `│ ${line}`).join('\n') + `\n` +
                   `┇ \n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI`
        }

        if (user.antiTagWarn >= 2) {
            let kickMsg = makeUI('A N T I  T A G  A L L', `🚫 @${m.sender.split('@')[0]} telah dikeluarkan dari grup karena mengulangi spam Mention All!`)
            await this.sendMessage(m.chat, { text: kickMsg, mentions: [m.sender] })
            await this.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
            user.antiTagWarn = 0 // Reset setelah kick

            try { await this.sendMessage(m.chat, { delete: m.key }) } catch (e) {}
        } else {
            let warnMsg = makeUI('A N T I  T A G  A L L', `⚠️ *PERINGATAN (1/2)*\n\n@${m.sender.split('@')[0]}, member biasa dilarang menggunakan fitur Mention All / Tag All di grup ini!\n\nJika mengulangi sekali lagi, kamu akan *dikeluarkan otomatis* secara permanen.`)
            await this.sendMessage(m.chat, { text: warnMsg, mentions: [m.sender] })

            try { await this.sendMessage(m.chat, { delete: m.key }) } catch (e) {}
        }

        return true // Stop proses
    }
}

export default handler
