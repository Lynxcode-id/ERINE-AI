let handler = async (m, { conn, participants, groupMetadata }) => {
    await m.react('⏳')

    try {
        let admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')

        if (admins.length === 0) {
            return m.reply('❌ Grup ini tidak memiliki admin.')
        }

        let caption = `╭─── [ *L I S T - A D M I N* ] ───💠
│
│  🌟 *Grup:* ${groupMetadata.subject}
│  👑 *Total Admin:* ${admins.length} Orang
│
┣─────────[ *A B S E N* ]─────────💠
│\n`

        for (let admin of admins) {
            let role = admin.admin === 'superadmin' ? '👑 Owner Grup' : '🛡️ Admin'
            caption += `┣ 👤 @${admin.id.split('@')[0]} ( ${role} )\n`
        }

        caption += `│\n╰──────────────────────────💠`

        await conn.sendMessage(m.chat, {
            text: caption,
            mentions: admins.map(a => a.id)
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error(e)
        await m.react('❌')
        m.reply('❌ Gagal mengambil data admin grup.')
    }
}

handler.help = ['listadmin', 'cekadmin']
handler.tags = ['group']
handler.command = /^(listadmin|adminlist|cekadmin|admin(grup|gc)?)$/i

handler.group = true

export default handler
