let handler = async (m, { conn, text, usedPrefix, command }) => {
    let idch = global.chId || '120363400612665352@newsletter'
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''

    if (!text && !/image|video|audio/.test(mime)) {
        let errTeks = `┌˚₊ ๑│ M E S S A G E  C H │๑˚₊\n` +
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

        let footer = `\n\n> Pesan ini di buat oleh ~ erine-ai\n> Pengirim : dev erine-ai`
        let fullText = (text ? text : '') + footer

        let content = {}
        if (/image/.test(mime)) {
            let media = await q.download()
            content = { image: media, caption: fullText }
        } else if (/video/.test(mime)) {
            let media = await q.download()
            content = { video: media, caption: fullText }
        } else if (/audio/.test(mime)) {
            let media = await q.download()
            content = { audio: media, mimetype: 'audio/mpeg', fileName: 'audio.mp3', ptt: true }
        } else {
            content = { text: fullText }
        }

        await conn.sendMessage(idch, content)
        await m.react('✅')

        let succTeks = `┌˚₊ ๑│ M E S S A G E  C H │๑˚₊\n` +
                       `┇ \n` +
                       `│ ✅ Pesan berhasil dikirim ke Channel!\n` +
                       `┇ \n` +
                       `└˚₊ ๑ ────────────── ๑˚₊\n` +
                       `> © ERINE-AI`
        await conn.sendMessage(m.chat, { text: succTeks }, { quoted: m })

    } catch (err) {
        await m.react('❌')
        let errTeks = `┌˚₊ ๑│ E R R O R │๑˚₊\n` +
                      `┇ \n` +
                      `│ Gagal mengirim pesan ke Channel.\n` +
                      `│ 💬 *Pesan:* ${err.message}\n` +
                      `┇ \n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `> © ERINE-AI`
        await conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
    }
}

handler.help = ['msgch <teks/media>']
handler.tags = ['owner']
handler.command = /^(msgch)$/i
handler.owner = true

export default handler
