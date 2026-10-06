let handler = async (m, { conn, participants, isAdmin, isBotAdmin }) => {
    if (!isAdmin) return m.reply('❌ Khusus Admin grup!');
    if (!isBotAdmin) return m.reply('❌ Bot harus jadi Admin dulu cuy!');

    await m.react('⏳');

    let luarList = participants.filter(v => {
        let jid = conn.decodeJid(v.id);
        let num = jid.split('@')[0];
        return !num.startsWith('62') && jid !== conn.user.jid;
    }).map(v => conn.decodeJid(v.id));

    if (luarList.length === 0) {
        await m.react('✅');
        return m.reply(`┌˚₊ ๑│ ᴀ ɴ ᴛ ɪ  ʟ ᴜ ᴀ ʀ │๑˚₊ 🛡️\n┇ \n│ Aman cuy! Tidak ditemukan nomor luar negeri di grup ini.\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`);
    }

    let caption = `┌˚₊ ๑│ ᴀ ɴ ᴛ ɪ  ʟ ᴜ ᴀ ʀ │๑˚₊ 🧹\n┇ \n│ 🔍 Ditemukan *${luarList.length}* nomor luar negeri.\n│ Mengeksekusi pembersihan...\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`;

    await conn.sendMessage(m.chat, { text: caption.trim() }, { quoted: m });

    let success = 0;
    for (let target of luarList) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
            await conn.groupParticipantsUpdate(m.chat, [target], 'remove');
            success++;
        } catch (e) {}
    }

    m.reply(`✅ *Selesai!* Berhasil mengeluarkan ${success}/${luarList.length} nomor asing.`);
}

handler.help = ['kicknoasing'];
handler.tags = ['group'];
handler.command = /^(kicknoasing)$/i;
handler.group = true;

export default handler;
