
let handler = async (m, { conn, usedPrefix }) => {
    let chat = global.db.data.chats[m.chat];
    if (!chat.announcements || chat.announcements.length === 0) return m.reply('❌ Gak ada pengumuman tersimpan.');

    let text = `┌˚₊ ๑│ ʜ ɪ s ᴛ ᴏ ʀ ʏ  ᴀ ɴ ɴ ᴏ ᴜ ɴ ᴄ ᴇ │๑˚₊ 📢\n\n`;
    chat.announcements.forEach((v, i) => {
        text += `*${i + 1}.* ${v.text}\n🕒 ${v.date}\n\n`;
    });

    m.reply(text);
}

handler.help = ['pengumuman', 'historygc'];
handler.tags = ['group'];
handler.command = /^(pengumuman|historygc)$/i;
handler.group = true;
export default handler;
