import fs from 'fs';
import path from 'path';

let handler = async (m, { conn, usedPrefix, command, isOwner }) => {
    if (!isOwner) return m.reply('❌ Akses ditolak! Khusus Owner.');

    const ROOT = path.join(process.cwd(), 'session', 'jadibot');
    if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });

    const dirs = fs.readdirSync(ROOT);
    const activeSessions = global.jadibotSessions || new Map();

    let activeCount = 0;
    let inactiveCount = 0;
    let corruptCount = 0;
    let toDelete = [];
    let listText = '';

    for (let dir of dirs) {
        const sessionPath = path.join(ROOT, dir);
        const credsPath = path.join(sessionPath, 'creds.json');

        const isActive = activeSessions.has(dir);
        const isCorrupt = !fs.existsSync(credsPath);

        if (isCorrupt) {
            corruptCount++;
            toDelete.push(sessionPath);
            listText += `• ${dir} (Corrupt)\n`;
        } else if (isActive) {
            activeCount++;
            listText += `• ${dir} (Aktif)\n`;
        } else {
            inactiveCount++;
            toDelete.push(sessionPath);
            listText += `• ${dir} (Offline)\n`;
        }
    }

    if (command.includes('clean') || command.includes('del')) {
        if (toDelete.length === 0) {
            return m.reply('✅ Server sudah bersih. Tidak ada sesi offline atau corrupt.');
        }

        await m.react('⏳');
        for (let p of toDelete) {
            try {
                fs.rmSync(p, { recursive: true, force: true });
            } catch (e) {
                console.error('[Clean Jadibot Error]', e);
            }
        }
        await m.react('✅');
        return m.reply(`🧹 Berhasil menghapus ${toDelete.length} sesi Jadibot yang offline/corrupt dari server.`);
    }

    let caption = `*Status Server Jadibot*\n\n` +
                  `Total: ${dirs.length} Sesi\n` +
                  `🟢 Aktif: ${activeCount}\n` +
                  `🔴 Offline: ${inactiveCount}\n` +
                  `⚠️ Corrupt: ${corruptCount}\n\n`;

    if (dirs.length > 0) {
        caption += `*Daftar Sub-Bot:*\n${listText}\n` +
                   `> Ketik *${usedPrefix}cleanjadibot* untuk pembersihan server.`;
    } else {
        caption += `_Tidak ada sesi jadibot saat ini._`;
    }

    await m.reply(caption.trim());
};

handler.help = ['listjadibot', 'cleanjadibot'];
handler.tags = ['owner'];
handler.command = /^(listjadibot|cekjadibot|cleanjadibot|deljadibot)$/i;
handler.owner = true;

export default handler;
