
let handler = async (m, { conn, text, participants, usedPrefix, command }) => {
    if (!participants || participants.length === 0) return m.reply('❌ Gagal mengambil data member grup.');

    await m.react('🎲');

    let member = participants.filter(v => v.id !== conn.user.jid).map(v => v.id);
    let randomTarget = member[Math.floor(Math.random() * member.length)];
    let targetJid = conn.decodeJid(randomTarget);

    let reason = text ? `\n│ 💬 *Pesan:* ${text}` : '';

    let caption = `┌˚₊ ๑│ ʀ ᴀ ɴ ᴅ ᴏ ᴍ  ᴛ ᴀ ɢ │๑˚₊ 🎯
┇
│ ✨ *Terpilih:* @${targetJid.split('@')[0]} ${reason}
┇
└˚₊ ๑ ────────────── ๑˚₊
> © ERINE-AI X LYNX DECODE`;

    await conn.sendMessage(m.chat, {
        text: caption.trim(),
        mentions: [targetJid]
    }, { quoted: m });
}

handler.help = ['tagrandom <pesan>'];
handler.tags = ['group', 'fun'];
handler.command = /^(tagrandom)$/i;
handler.group = true;
handler.admin = true;

export default handler;
