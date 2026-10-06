let handler = async (m, { conn, text, usedPrefix, command }) => {
    let who;
    if (m.isGroup) {
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            who = m.mentionedJid[0];
        } else if (m.quoted) {
            who = m.quoted.sender;
        } else if (text) {
            let input = text.replace(/[^0-9]/g, '');
            if (!input) return m.reply(`Input tidak valid! Gunakan tag, reply, atau ketik nomor.\n\nContoh: ${usedPrefix + command} @user`);
            who = input + '@s.whatsapp.net';
        }
    } else {
        who = text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : m.chat;
    }

    if (!who || who === '@s.whatsapp.net') return m.reply(`Tag targetnya atau reply pesannya, cuy!\nContoh: ${usedPrefix + command} @user`);

    let users = global.db.data.users;
    if (!users) {
        global.db.data.users = {};
        users = global.db.data.users;
    }

    if (!users[who]) {
        users[who] = {
            banned: false,
            name: await Promise.resolve(conn.getName(who)).catch(() => 'Unknown')
        };
    }

    users[who].banned = false;
    users[who].banReason = '';

    await conn.sendMessage(m.chat, {
        text: `✅ *User Berhasil Di-Unban!*\n👤 *User:* @${who.split('@')[0]}\n🛡️ *Status:* Unbanned`,
        mentions: [who]
    }, { quoted: m });
};

handler.help = ['unban @user'];
handler.tags = ['owner'];
handler.command = /^unban(user)?$/i;
handler.owner = true;

export default handler;
