import fs from 'fs';
import path from 'path';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || '';

    if (!text) return m.reply(`❌ Masukkan nama file!\n\n*Contoh:* ${usedPrefix + command} nix.js`);
    if (!m.quoted) return m.reply(`❌ Reply dokumen atau teks kode yang mau disimpan!`);

    let filename = text.trim();
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
        return m.reply('❌ Nama file tidak valid.');
    }

    await m.react('⏳');

    try {
        const libDir = path.resolve('./lib');

        if (!fs.existsSync(libDir)) {
            fs.mkdirSync(libDir, { recursive: true });
        }

        const filePath = path.join(libDir, filename);

        if (mime) {
            let mediaBuffer = await q.download();
            if (!mediaBuffer) throw new Error('Gagal mengunduh media/dokumen.');
            fs.writeFileSync(filePath, mediaBuffer);
        } else if (q.text) {
            fs.writeFileSync(filePath, q.text, 'utf-8');
        } else {
            throw new Error('Pesan yang direply tidak memiliki konten yang valid.');
        }

        let caption = `
╭───「 𝐋𝐢𝐛𝐫𝐚𝐫𝐲 𝐒𝐚𝐯𝐞𝐝 」───⚡
│
│  📄 𝐅𝐢𝐥𝐞  : ${filename}
│  📂 𝐏𝐚𝐭𝐡  : ./lib/${filename}
│  📏 𝐒𝐢𝐳𝐞  : ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB
│
╰──────────────────────────✨
`.trim();

        await m.reply(caption);
        await m.react('✅');

    } catch (e) {
        console.error('[ADDLIB ERROR]', e);
        await m.react('❌');
        m.reply(`⚠️ *System Error:*\n_${e.message || e}_`);
    }
};

handler.help = ['addlib <nama>'];
handler.tags = ['owner'];
handler.command = /^(addlib|savelib)$/i;
handler.owner = true;

export default handler;
