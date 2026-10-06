let handler = async (m, { text, command }) => {
    let chat = global.db.data.chats[m.chat];
    if (command === 'addlink') {
        chat.links = chat.links || [];
        chat.links.push(text);
        m.reply('✅ Link tersimpan!');
    } else {
        m.reply('🔗 *Daftar Link Grup:*\n' + (chat.links || []).join('\n'));
    }
}
handler.command = /^(addlink|listlink)$/i;
handler.group = true;
export default handler;
