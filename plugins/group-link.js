let handler = async (m, { conn }) => {
    if (!m.isGroup) return m.reply('❌ Fitur ini hanya bisa digunakan di grup!')

    try {
        let inviteCode;
        try {
            inviteCode = await conn.groupInviteCode(m.chat)
            inviteCode = `https://chat.whatsapp.com/${inviteCode}`
        } catch {
            inviteCode = '❌ Gagal mengambil link grup'
        }

        m.reply(`*Link Grup:*\n${inviteCode}`)
    } catch (err) {
        console.log(err)
        m.reply('❌ Terjadi kesalahan saat mengambil link grup.')
    }
}

handler.help = ['linkgrup', 'linkgc']
handler.tags = ['group']
handler.command = /^(linkgrup|linkgc)$/i
handler.group = true
handler.botAdmin = true
handler.admin = true

export default handler
