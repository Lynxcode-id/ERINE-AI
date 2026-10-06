
let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isBotAdmin }) => {
    if (!isAdmin) return m.reply('❌ Khusus Admin grup cuy!');
    if (!isBotAdmin) return m.reply('❌ Bot harus jadi Admin dulu buat ngubah setelan!');

    let isClose = /^(lock|tutup|close)$/i.test(args[0]);
    let isOpen = /^(unlock|buka|open)$/i.test(args[0]);

    if (isClose) {
        await m.react('⏳');
        await conn.groupSettingUpdate(m.chat, 'locked');
        m.reply(`┌˚₊ ๑│ s ᴇ ᴛ ᴇ ʟ ᴀ ɴ  ɢ ʀ ᴜ ᴘ │๑˚₊ 🔒\n┇ \n│ ✅ *Info Grup Dikunci!*\n│ Sekarang hanya Admin yang bisa mengganti Nama, Deskripsi, dan Foto Grup.\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`);
    } else if (isOpen) {
        await m.react('⏳');
        await conn.groupSettingUpdate(m.chat, 'unlocked');
        m.reply(`┌˚₊ ๑│ s ᴇ ᴛ ᴇ ʟ ᴀ ɴ  ɢ ʀ ᴜ ᴘ │๑˚₊ 🔓\n┇ \n│ ✅ *Info Grup Dibuka!*\n│ Semua peserta sekarang dapat mengedit Info Grup.\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`);
    } else {
        m.reply(`❌ Format salah!\n\n*Pilih opsi:*\n${usedPrefix + command} lock\n${usedPrefix + command} unlock`);
    }
}

handler.help = ['editinfo <lock/unlock>'];
handler.tags = ['group'];
handler.command = /^(editinfo|setinfo|infogrup)$/i;
handler.group = true;

export default handler;
