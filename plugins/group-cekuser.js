let handler = async (m, { conn, text }) => {
    let target = m.mentionedJid[0] || m.sender;
    let user = global.db.data.users[target];
    let caption = `┌˚₊ ๑│ ᴍ ᴇ ᴍ ʙ ᴇ ʀ  ɪ ɴ s ɪ ɢ ʜ ᴛ │๑˚₊ 👤\n┇ \n│ 👤 *User:* @${target.split('@')[0]}\n│ 💬 *Total Pesan:* ${user.chatCount || 0}\n│ 📈 *Level:* ${user.level || 0}\n│ 📅 *First Join:* ${user.firstJoin || 'Tidak terdata'}\n┇ \n└˚₊ ๑ ────────────── ๑˚₊`;
    conn.sendMessage(m.chat, { text: caption, mentions: [target] }, { quoted: m });
}
handler.help = ['cekuser @tag'];
handler.tags = ['group'];
handler.command = /^(cekuser|userinfo)$/i;
handler.group = true;
export default handler;
