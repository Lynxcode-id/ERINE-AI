
let handler = async (m, { conn, participants }) => {
    let admins = participants.filter(v => v.admin !== null).map(v => v.id);
    let users = global.db.data.users || {};

    let text = `┌˚₊ ๑│ ᴀ ᴅ ᴍ ɪ ɴ  ᴘ ᴇ ʀ ꜰ ᴏ ʀ ᴍ ᴀ ɴ ᴄ ᴇ │๑˚₊ 📈\n┇ \n`;

    admins.sort((a, b) => (users[b]?.chatCount || 0) - (users[a]?.chatCount || 0));

    admins.forEach((v, i) => {
        let count = users[v]?.chatCount || 0;
        text += `│ *${i + 1}.* @${v.split('@')[0]}\n│ 💬 *Total Chat:* ${count} pesan\n┇ \n`;
    });

    text += `└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`;
    conn.sendMessage(m.chat, { text, mentions: admins }, { quoted: m });
}

handler.help = ['adminperf'];
handler.tags = ['group', 'owner'];
handler.command = /^(adminperf|cekadminaktif)$/i;
handler.group = true;
handler.owner = true;

export default handler;
