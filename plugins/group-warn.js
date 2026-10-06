
let handler = async (m, { conn, command, usedPrefix, isAdmin, isBotAdmin }) => {
    if (!isAdmin) return m.reply('❌ Khusus Admin grup cuy!');
    if (!isBotAdmin) return m.reply('❌ Bot harus jadi Admin dulu!');

    let target = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : null);
    if (!target) return m.reply(`❌ Reply pesan atau tag membernya!\n\n*Contoh:*\n${usedPrefix + command} @user`);
    if (target === conn.user.jid) return m.reply('❌ Jangan nge-warn bot sendiri cuy.');

    let user = global.db.data.users[target];
    if (!user) return m.reply('❌ Member tersebut tidak terdaftar di database.');

    let maxWarn = 3;

    if (command === 'warn') {
        user.warn = (user.warn || 0) + 1;
        if (user.warn >= maxWarn) {
            await m.reply(`┌˚₊ ๑│ s ᴘ  ᴍ ᴀ x │๑˚₊ 🚨\n┇ \n│ @${target.split('@')[0]} telah mencapai batas peringatan (${maxWarn}/${maxWarn}).\n│ Mengeksekusi kick...\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`, null, { mentions: [target] });
            await conn.groupParticipantsUpdate(m.chat, [target], 'remove');
            user.warn = 0;
        } else {
            m.reply(`⚠️ *PERINGATAN!* \n@${target.split('@')[0]} kamu mendapat peringatan dari Admin.\n\n📊 *Total Warn:* ${user.warn}/${maxWarn}`, null, { mentions: [target] });
        }
    } else if (command === 'unwarn') {
        if (!user.warn || user.warn === 0) return m.reply('✅ Member ini tidak memiliki peringatan (bersih).');
        user.warn -= 1;
        m.reply(`✅ *Peringatan Dihapus!* \nWarn @${target.split('@')[0]} telah dikurangi.\n\n📊 *Total Warn:* ${user.warn}/${maxWarn}`, null, { mentions: [target] });
    }
}

handler.help = ['warn @tag', 'unwarn @tag'];
handler.tags = ['group', 'admin'];
handler.command = /^(warn|unwarn)$/i;
handler.group = true;

export default handler;
