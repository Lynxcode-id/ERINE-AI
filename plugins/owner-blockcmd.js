
let handler = async (m, { text, usedPrefix, command }) => {
    if (!global.db.data.blockcmd) global.db.data.blockcmd = [];
    if (command === 'listblockcmd') {
        if (global.db.data.blockcmd.length === 0) return m.reply('✅ Belum ada command yang diblokir cuy.');
        let list = global.db.data.blockcmd.map((v, i) => `│ ${i + 1}. ${v}`).join('\n');
        return m.reply(`╭━━[ *DAFTAR BLOKIR CMD* ]━━\n${list}\n╰━━━━━━━━━━━━━━━━━━`);
    }

    if (!text) throw `Masukkan nama command yang mau diblokir/dibuka!\n\nContoh:\n${usedPrefix + command} tiktok\n${usedPrefix + command} getplugin`;

    let cmd = text.trim().toLowerCase();
    let isBlock = command === 'blockcmd';

    if (isBlock) {
        if (global.db.data.blockcmd.includes(cmd)) throw `⚠️ Command *${cmd}* udah ada di daftar blokir cuy!`;

        global.db.data.blockcmd.push(cmd);
        m.reply(`✅ Berhasil memblokir command *${cmd}*.\nSekarang cuma Owner yang bisa pake fitur ini!`);
    } else {
        if (!global.db.data.blockcmd.includes(cmd)) throw `⚠️ Command *${cmd}* emang ga ada di daftar blokir.`;

        global.db.data.blockcmd = global.db.data.blockcmd.filter(c => c !== cmd);
        m.reply(`✅ Berhasil ngebuka blokir command *${cmd}*.\nSekarang member biasa udah bisa pake lagi.`);
    }
};

handler.help = ['blockcmd', 'unblockcmd', 'listblockcmd'];
handler.tags = ['owner'];
handler.command = /^(blockcmd|unblockcmd|listblockcmd)$/i;
handler.owner = true;

export default handler;
