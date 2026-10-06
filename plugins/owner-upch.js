let handler = async (m, { conn, text, usedPrefix, command }) => {
    let idch = global.chId || '120363400612665352@newsletter'
    let chList = Array.isArray(idch) ? idch : [idch]

    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''

    if (!text && !/image|video|audio|sticker/.test(mime)) {
        let errTeks = `┌˚₊ ๑│ U P D A T E  C H │๑˚₊\n` +
                      `┇ \n` +
                      `│ Masukkan teks atau balas media!\n` +
                      `│ *Contoh:* ${usedPrefix + command} Halo Semuanya\n` +
                      `┇ \n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
    }

    try {
        await m.react('⏳')

        let footer = `\n\n> pesan ini di buat oleh erine-ai\n> inf project community`
        let fullText = (text || q.text || '') + footer

        let messageOptions = {}

        if (/image/.test(mime)) {
            let media = await q.download()
            messageOptions = { image: media, caption: fullText }
        } else if (/video/.test(mime)) {
            let media = await q.download()
            messageOptions = { video: media, caption: fullText, mimetype: mime }
        } else if (/audio/.test(mime)) {
            let media = await q.download()
            messageOptions = { audio: media, mimetype: 'audio/mpeg', fileName: 'audio.mp3', ptt: true }
        } else if (/sticker/.test(mime)) {
            let media = await q.download()
            messageOptions = { sticker: media }
        } else {
            messageOptions = { text: fullText }
        }

        for (let ch of chList) {
            await conn.sendMessage(ch, messageOptions)
        }

        await m.react('✅')

        let succTeks = `┌˚₊ ๑│ U P D A T E  C H │๑˚₊\n` +
                       `┇ \n` +
                       `│ ✅ Pesan berhasil dikirim ke channel!\n` +
                       `┇ \n` +
                       `└˚₊ ๑ ────────────── ๑˚₊\n` +
                       `> © ERINE-AI`
        await conn.sendMessage(m.chat, { text: succTeks }, { quoted: m })

    } catch (err) {
        await m.react('❌')
        let errTeks = `┌˚₊ ๑│ E R R O R │๑˚₊\n` +
                      `┇ \n` +
                      `│ Gagal mengirim pesan ke channel.\n` +
                      `│ 💬 *Pesan:* ${err.message}\n` +
                      `┇ \n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `> © ERINE-AI`
        await conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
    }
}

handler.help = ['upch <teks/media>']
handler.tags = ['owner']
handler.command = /^(upch)$/i
handler.owner = true

export default handler
