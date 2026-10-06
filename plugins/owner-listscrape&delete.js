import fs from 'fs';
import path from 'path';

let handler = async (m, { text, usedPrefix, command }) => {
    const scrapeDir = path.join(process.cwd(), 'scrape');
    if (!fs.existsSync(scrapeDir)) fs.mkdirSync(scrapeDir, { recursive: true });

    const isList = /^(listscrape|lsp)$/i.test(command);
    const isDel = /^(delscrape|dsp)$/i.test(command);
    if (isList) {
        try {
            const files = fs.readdirSync(scrapeDir);
            const jsFiles = files.filter(f => f.endsWith('.js'));

            if (jsFiles.length === 0) {
                return m.reply(`📂 *Folder Scrape Kosong*\n\nBelum ada file scraper yang disimpan cuy.`);
            }

            let txt = `> 💠 *LIST FILE SCRAPE* 💠\n\n`;
            jsFiles.forEach((f, i) => {
                txt += `│ ├ ${i + 1}. ${f}\n`;
            });
            txt += `\n_Total: ${jsFiles.length} file_\n\nKetik *${usedPrefix}dsp <namafile>* untuk menghapus.`;

            return m.reply(txt);
        } catch (e) {
            console.error(e);
            return m.reply(`❌ *Gagal membaca folder:*\n> ${e.message}`);
        }
    }

    if (isDel) {
        if (!text) return m.reply(`❖ *Cara Penggunaan:*\n\n> *${usedPrefix + command} namafile*\n\n_Contoh: ${usedPrefix + command} llamacoder_`);

        let filename = text.trim();
        if (!filename.endsWith('.js')) filename += '.js';

        const filePath = path.join(scrapeDir, filename);

        if (!fs.existsSync(filePath)) {
            return m.reply(`❌ *File tidak ditemukan!*\n\nFile *${filename}* ga ada di dalam folder scrape.`);
        }

        try {
            fs.unlinkSync(filePath);
            m.reply(`✅ *Berhasil menghapus file!*\n\n🗑️ File *${filename}* telah dihapus dari sistem.\n\n_Aman cuy`);
        } catch (e) {
            console.error(e);
            m.reply(`❌ *Gagal menghapus file:*\n> ${e.message}`);
        }
    }
};

handler.help = ['delscrape <nama>', 'listscrape'];
handler.tags = ['owner'];
handler.command = /^(delscrape|dsp|listscrape|lsp)$/i;
handler.owner = true;

export default handler;
