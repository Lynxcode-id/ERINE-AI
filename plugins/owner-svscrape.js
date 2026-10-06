import fs from 'fs';
import path from 'path';

let handler = async (m, { text, usedPrefix, command }) => {
    if (!text) return m.reply(`❖ *Cara Penggunaan:*\n\n1. Balas kode dengan command:\n> *${usedPrefix + command} namafile*\n\n2. Atau langsung paste:\n> *${usedPrefix + command} namafile <kodenya>*`);

    let args = text.split(' ');
    let filename = args[0].trim();

    if (!filename.endsWith('.js')) filename += '.js';

    let code = m.quoted ? m.quoted.text : args.slice(1).join(' ');

    if (!code || code.trim() === '') return m.reply(`❌ Kodenya mana cuy? Balas pesan yang ada kodenya.`);

    const scrapeDir = path.join(process.cwd(), 'scrape');

    if (!fs.existsSync(scrapeDir)) fs.mkdirSync(scrapeDir, { recursive: true });

    const filePath = path.join(scrapeDir, filename);

    try {
        fs.writeFileSync(filePath, code);
        m.reply(`✅ *Berhasil menyimpan file!*\n\n📁 Path: *scrape/${filename}*`);
    } catch (e) {
        console.error(e);
        m.reply(`❌ *Gagal menyimpan file:*\n> ${e.message}`);
    }
};

handler.help = ['savescrape <nama>'];
handler.tags = ['owner'];
handler.command = /^(savescrape|ssp)$/i;
handler.owner = true;

export default handler;
