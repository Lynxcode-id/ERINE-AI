
let handler = async (m, { conn, usedPrefix, command, isAdmin, isBotAdmin }) => {
    if (!isAdmin) return m.reply('❌ Khusus Admin grup!');
    if (!isBotAdmin) return m.reply('❌ Bot harus jadi Admin!');

    let users = m.mentionedJid;
    if (!users || users.length === 0) {
        return m.reply(`❌ Tag member yang mau dieksekusi!\n\n*Contoh:*\n${usedPrefix + command} @user1 @user2 @user3`);
    }

    await m.react('⏳');

    let action = command.toLowerCase().includes('promote') ? 'promote' : 'demote';
    let roleText = action === 'promote' ? 'menaikkan jabatan (Promote)' : 'menurunkan jabatan (Demote)';

    try {
        await conn.groupParticipantsUpdate(m.chat, users, action);

        let caption = `┌˚₊ ๑│ ᴍ ᴀ s s  ᴀ ᴄ ᴛ ɪ ᴏ ɴ │๑˚₊ ⚙️\n┇ \n│ ✅ Berhasil ${roleText} kepada *${users.length}* member secara massal!\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`;

        await conn.sendMessage(m.chat, {
            text: caption,
            mentions: users
        }, { quoted: m });

        await m.react('✅');
    } catch (e) {
        console.error('[MASS ACTION ERROR]', e);
        await m.react('❌');
        m.reply('❌ Gagal memproses aksi massal. Pastikan bot adalah admin dan tag valid.');
    }
}

handler.help = ['masspromote <tag>', 'massdemote <tag>'];
handler.tags = ['group'];
handler.command = /^(masspromote|mpromote|massdemote|mdemote)$/i;
handler.group = true;

export default handler;
