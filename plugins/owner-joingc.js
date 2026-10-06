let linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})(?:\s+(\d{1,4})\s*(?:h|hari)?)?/i;

let handler = async (m, { conn, text, isOwner }) => {
    let [_, code, durRaw] = text.match(linkRegex) || [];
    if (!code) throw 'Link invalid!\n\nContoh: .joingc https://chat.whatsapp.com/xxxxxxxx 30h';
    let res;
    try {
        res = await conn.groupAcceptInvite(code);
    } catch (error) {
        if (error && error.message) {
            if (error.message.includes('not-authorized')) {
                return m.reply(`
Tidak dapat bergabung karena sebelumnya terkena kick
Silahkan tunggu max 7 hari, jangan SPAM!!!

Note: Laporan apapun tentang ini tidak akan ditanggapi oleh Owner
                `);
            } else if (error.message.includes('gone')) {
                return m.reply('Link tidak valid/sudah diatur ulang oleh admin');
            }
        }
        throw error;
    }

    let user = global.db.data.users[m.sender];
    let now = Date.now();

    const requestedDays = durRaw ? parseInt(durRaw) : (isOwner ? 1 : 3);
    let expiredDays;

    if (isOwner) {
        expiredDays = Math.max(1, Math.min(365, requestedDays));
    } else {
        let maxTime = Math.floor(((user?.premiumTime || 0) - now) / (1000 * 60 * 60 * 24));
        if (!(maxTime > 0)) throw 'Durasi premium kamu sudah habis, ga bisa dipakai buat join grup.';
        if (requestedDays > maxTime) {
            return m.reply(`Max durasi grup mengikuti durasi premium anda\nMaximum hari anda adalah ${maxTime}`);
        }
        expiredDays = Math.max(1, Math.min(maxTime, requestedDays));
    }

    m.reply(`Berhasil join grup ${res} selama ${expiredDays} hari\n\nJika grup menggunakan persetujuan admin, silahkan ACC nomor ini`);
    let chats = global.db.data.chats[res];
    if (!chats) chats = global.db.data.chats[res] = {};
    chats.expired = now + expiredDays * 1000 * 60 * 60 * 24;
};

handler.help = ['joingc <chat.whatsapp.com> [durasi cth: 30h]'];
handler.tags = ['owner'];

handler.command = /^joingc$/i;
handler.rowner = true;
handler.premium = false;

export default handler;
