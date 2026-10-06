
let handler = async (m, { conn, text, command, usedPrefix, isAdmin }) => {
    let chat = global.db.data.chats[m.chat];

    if (command === 'setrules') {
        if (!isAdmin) return m.reply('❌ Khusus Admin grup cuy!');
        if (!text) return m.reply(`❌ Masukkan teks peraturannya!\n\n*Contoh:*\n${usedPrefix + command} 1. Dilarang spam\n2. Dilarang SARA`);

        chat.rules = text;
        await m.react('✅');
        m.reply(`✅ Peraturan grup berhasil disimpan!\nKetik *${usedPrefix}rules* untuk melihat.`);
    }

    if (command === 'rules' || command === 'rulesgc') {
        let rulesText = chat.rules || 'Belum ada peraturan yang diatur oleh Admin di grup ini.';
        let meta = await conn.groupMetadata(m.chat).catch(() => ({}));
        let gcName = meta.subject || 'Group';

        let caption = `┌˚₊ ๑│ ʀ ᴜ ʟ ᴇ s  ɢ ʀ ᴜ ᴘ │๑˚₊ 📜\n┇ \n│ 📍 *Grup:* ${gcName}\n┇ \n${rulesText.split('\n').map(v => `│ ${v}`).join('\n')}\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`;

        await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
    }
}

handler.help = ['setrules <teks>', 'rules'];
handler.tags = ['group'];
handler.command = /^(setrules|rules|rulesgc)$/i;
handler.group = true;

export default handler;
