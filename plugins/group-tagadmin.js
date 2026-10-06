
let handler = async (m, { conn, text, participants, groupMetadata }) => {
    let admins = participants.filter(v => v.admin !== null).map(v => conn.decodeJid(v.id));

    if (admins.length === 0) return m.reply('❌ Grup ini tidak memiliki Admin.');

    await m.react('🚨');

    let pesan = text ? `\n│ 💬 *Pesan:* ${text}` : '';
    let caption = `┌˚₊ ๑│ ᴘ ᴀ ɴ ɢ ɢ ɪ ʟ ᴀ ɴ  ᴀ ᴅ ᴍ ɪ ɴ │๑˚₊ 🚨
┇
│ ⚠️ Ada member yang memanggil jajaran admin!${pesan}
┇ \n`;

    admins.forEach((v, i) => {
        caption += `│ 🛡️ @${v.split('@')[0]}\n`;
    });

    caption += `┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`;

    await conn.sendMessage(m.chat, {
        text: caption.trim(),
        mentions: admins
    }, { quoted: m });
}

handler.help = ['tagadmin <pesan>', 'reportadmin <pesan>'];
handler.tags = ['group'];
handler.command = /^(tagadmin|reportadmin|panggiladmin)$/i;
handler.group = true;

export default handler;
