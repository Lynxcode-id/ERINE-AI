
let handler = async (m, { conn, participants }) => {
    let member = participants.filter(v => v.id !== conn.user.jid && v.id !== m.sender).map(v => v.id);

    if (member.length < 2) return m.reply('❌ Member kurang cuy buat dibikin couple, ajak orang masuk dulu!');

    await m.react('💖');

    let target1 = member[Math.floor(Math.random() * member.length)];
    let remainingMember = member.filter(id => id !== target1);
    let target2 = remainingMember[Math.floor(Math.random() * remainingMember.length)];

    let caption = `┌˚₊ ๑│ s ᴏ ᴜ ʟ ᴍ ᴀ ᴛ ᴇ  ɢ ᴀ ᴄ ʜ ᴀ │๑˚₊ 💖\n┇ \n│ 🎲 *Couple of the Day* di grup ini adalah...\n┇ \n│ @${target1.split('@')[0]}  💞  @${target2.split('@')[0]}\n┇ \n│ Ciee ciee! Semoga langgeng ya, jan lupa traktir admin!\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`;

    await conn.sendMessage(m.chat, {
        text: caption,
        mentions: [target1, target2]
    }, { quoted: m });
}

handler.help = ['soulmategc'];
handler.tags = ['group'];
handler.command = /^(soulmategc)$/i;
handler.group = true;

export default handler;
