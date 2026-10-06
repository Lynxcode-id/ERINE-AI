
let handler = async (m, { conn, isAdmin, isBotAdmin }) => {
    if (!isAdmin) return m.reply('❌ Fitur ini khusus Admin grup!');
    if (!isBotAdmin) return m.reply('❌ Bot harus jadi Admin dulu cuy buat reset link!');

    await m.react('⏳');

    try {
        await conn.groupRevokeInvite(m.chat);
        let newLink = await conn.groupInviteCode(m.chat);

        let caption = `┌˚₊ ๑│ ʀ ᴇ s ᴇ ᴛ  ʟ ɪ ɴ ᴋ │๑˚₊ 🔄
┇
│ ✅ *Berhasil mereset link grup!*
│ Tautan lama sudah tidak bisa digunakan lagi.
┇
│ 🔗 *Link Baru:*
│ https://chat.whatsapp.com/${newLink}
┇
└˚₊ ๑ ────────────── ๑˚₊
> © ERINE-AI X LYNX DECODE`;

        await conn.sendMessage(m.chat, { text: caption.trim() }, { quoted: m });
        await m.react('✅');
    } catch (e) {
        console.error('[REVOKE ERROR]', e);
        await m.react('❌');
        m.reply('❌ Gagal mereset link grup. Pastikan bot adalah admin.');
    }
}

handler.help = ['revoke', 'resetlink'];
handler.tags = ['group'];
handler.command = /^(revoke|resetlink)$/i;
handler.group = true;

export default handler;
