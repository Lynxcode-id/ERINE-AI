const makeUI = (title, content) => {
    return `┌˚₊ ๑│ ${title} │๑˚₊\n` +
           `┇ \n` +
           content.split('\n').map(line => `│ ${line}`).join('\n') + `\n` +
           `┇ \n` +
           `└˚₊ ๑ ────────────── ๑˚₊\n` +
           `> © ERINE-AI`
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let contextInfo = m.msg?.contextInfo || m.message?.extendedTextMessage?.contextInfo || {}
    let stanzaId = contextInfo.stanzaId
    let participant = contextInfo.participant

    if (!stanzaId) {
        let helpText = `⚠️ *Format Salah!* 🎀\n\nReply pesan yang ingin disematkan/dilepas dengan perintah:\n*${usedPrefix}pin* (untuk menyematkan)\n*${usedPrefix}unpin* (untuk melepas)`
        return conn.sendMessage(m.chat, { text: makeUI('P I N  M E S S A G E', helpText) }, { quoted: m })
    }

    let { key } = await conn.sendMessage(m.chat, { text: makeUI('P R O C E S S I N G', '⏳ _Memproses permintaan..._ ✨') }, { quoted: m })
    await m.react('⏳')

    try {
        let isPin = /^(pin|sematkan)$/i.test(command)
        let botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
        let fromMe = participant === botJid || participant === conn.user.jid

        let targetKey = {
            remoteJid: m.chat,
            fromMe: fromMe,
            id: stanzaId,
            participant: participant
        }

        await conn.sendMessage(m.chat, {
            pin: targetKey,
            type: isPin ? 1 : 2,
            time: 86400
        })

        let statusText = isPin
            ? '✅ _Pesan berhasil disematkan (Durasi: 24 Jam)!_ 🎀'
            : '✅ _Pesan berhasil dilepas dari sematan!_ 🎀'

        await conn.sendMessage(m.chat, { text: makeUI('S U C C E S S', statusText), edit: key })
        await m.react('✅')

    } catch (e) {
        await m.react('❌')
        let errorMsg = e.message || 'Terjadi kesalahan sistem.'

        await conn.sendMessage(m.chat, {
            text: makeUI('E R R O R', `⚠️ Gagal memproses. 🥀\n💬 *Pesan:* ${errorMsg}\n\n_Pastikan hak akses bot mencukupi!_`),
            edit: key
        })
    }
}

handler.help = ['pin <reply>']
handler.tags = ['group']
handler.command = /^(pin|unpin|sematkan|lepas)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
