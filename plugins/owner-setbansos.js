let handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
    global.db.data.bansos = global.db.data.bansos || {}

    if (!text || !text.includes('|')) {
        let errTeks = `┌˚₊ ๑│ S E T  B A N S O S │๑˚₊ 🎁\n` +
                      `┇ \n` +
                      `│ Format salah, bre!\n` +
                      `│ *Cara pakai:* ${usedPrefix + command} tipe jumlah | kuota | kode\n` +
                      `│ *Contoh:* ${usedPrefix + command} limit 10 | 50 | lynx redeem\n` +
                      `┇ \n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
    }

    let [typeReward, quotaStr, ...codeArr] = text.split('|').map(v => v.trim())
    let code = codeArr.join('|')
    let [type, rewardStr] = typeReward.split(' ')

    let reward = parseInt(rewardStr)
    let quota = parseInt(quotaStr)

    if (!type || isNaN(reward) || isNaN(quota) || !code) {
        let errTeks = `┌˚₊ ๑│ E R R O R │๑˚₊ ⚠️\n` +
                      `┇ \n` +
                      `│ Pastikan jumlah hadiah dan kuota berupa angka!\n` +
                      `┇ \n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
    }

    if (global.db.data.bansos[code]) {
        let errTeks = `┌˚₊ ๑│ E R R O R │๑˚₊ ⚠️\n` +
                      `┇ \n` +
                      `│ Kode redeem *${code}* sudah ada!\n` +
                      `│ Silakan gunakan nama kode yang lain.\n` +
                      `┇ \n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
    }

    global.db.data.bansos[code] = {
        type: type.toLowerCase(),
        reward: reward,
        quota: quota,
        claimedBy: []
    }

    await m.react('✅')

    let suksesTeks = `┌˚₊ ๑│ B A N S O S  R E A D Y │๑˚₊ 🎉\n` +
                     `┇ \n` +
                     `│ ✅ *Bansos Berhasil Dibuat!*\n` +
                     `│ 🏷️ *Kode:* ${code}\n` +
                     `│ 🎁 *Hadiah:* ${reward} ${type.toUpperCase()}\n` +
                     `│ 👥 *Kuota:* ${quota} Orang\n` +
                     `┇ \n` +
                     `│ _Bagikan kode ini ke user agar mereka_\n` +
                     `│ _bisa klaim menggunakan_ *.claim ${code}*\n` +
                     `└˚₊ ๑ ────────────── ๑˚₊\n` +
                     `> © ERINE-AI`

    return conn.sendMessage(m.chat, { text: suksesTeks }, { quoted: m })
}

handler.help = ['setbansos <tipe jml | kuota | kode>']
handler.tags = ['owner']
handler.command = /^(setbansos|buatbansos|addbansos)$/i
handler.owner = true

export default handler
