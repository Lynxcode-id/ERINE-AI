
let handler = async (m, { conn, isBotAdmin }) => {
    if (!isBotAdmin) return m.reply('❌ Bot harus jadi Admin dulu buat ambil link grup!');

    await m.react('⏳');

    try {
        let code = await conn.groupInviteCode(m.chat);
        let url = 'https://chat.whatsapp.com/' + code;

        let meta = await conn.groupMetadata(m.chat).catch(() => ({}));
        let gcName = meta.subject || 'Group';

        let qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`;

        let caption = `┌˚₊ ๑│ ǫ ʀ  ʟ ɪ ɴ ᴋ  ɢ ʀ ᴜ ᴘ │๑˚₊ 🔲
┇
│ 📍 *Grup:* ${gcName}
│ ✨ Scan QR Code ini menggunakan kamera atau scanner untuk langsung bergabung ke dalam grup!
┇
└˚₊ ๑ ────────────── ๑˚₊
> © ERINE-AI X LYNX DECODE`;

        await conn.sendMessage(m.chat, {
            image: { url: qrApi },
            caption: caption.trim()
        }, { quoted: m });

        await m.react('✅');
    } catch (e) {
        console.error('[QR LINK ERROR]', e);
        await m.react('❌');
        m.reply('❌ Gagal membuat QR Code grup.');
    }
}

handler.help = ['gcqr', 'linkqr'];
handler.tags = ['group'];
handler.command = /^(gcqr|qrgroup|qrgrup)$/i;
handler.group = true;

export default handler;
