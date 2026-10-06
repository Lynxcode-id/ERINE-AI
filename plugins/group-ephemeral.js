
let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isBotAdmin }) => {
    if (!isAdmin) return m.reply('❌ Fitur khusus Admin grup!');
    if (!isBotAdmin) return m.reply('❌ Bot harus jadi Admin!');

    if (!args[0]) {
        return m.reply(`┌˚₊ ๑│ ᴘ ᴇ s ᴀ ɴ  s ᴇ ᴍ ᴇ ɴ ᴛ ᴀ ʀ ᴀ │๑˚₊ ⏱️\n┇ \n│ ❌ Format salah! Pilih opsi timer:\n│ • 24jam\n│ • 7hari\n│ • 90hari\n│ • off (matikan)\n┇ \n│ *Contoh:* ${usedPrefix + command} 24jam\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`);
    }

    let timer = 0;
    let p = args[0].toLowerCase();

    if (p === '24jam') timer = 86400;
    else if (p === '7hari') timer = 604800;
    else if (p === '90hari') timer = 7776000;
    else if (p === 'off') timer = 0;
    else return m.reply('❌ Opsi timer tidak valid!');

    await m.react('⏳');

    try {
        await conn.sendMessage(m.chat, { disappearingMessagesInChat: timer });
        let status = timer === 0 ? 'dinonaktifkan ❌' : `diaktifkan selama *${p}* ✅`;
        m.reply(`┌˚₊ ๑│ ᴘ ᴇ s ᴀ ɴ  s ᴇ ᴍ ᴇ ɴ ᴛ ᴀ ʀ ᴀ │๑˚₊ ⏱️\n┇ \n│ Fitur pesan sementara berhasil ${status}\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`);
    } catch (e) {
        await m.react('❌');
        m.reply('❌ Gagal mengubah setelan pesan sementara.');
    }
}

handler.help = ['ephemeral <opsi>', 'pesansementara <opsi>'];
handler.tags = ['group'];
handler.command = /^(ephemeral|pesansementara)$/i;
handler.group = true;

export default handler;
