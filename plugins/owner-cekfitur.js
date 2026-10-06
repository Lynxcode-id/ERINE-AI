import fs from 'fs';
import path from 'path';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const pluginDir = path.join(process.cwd(), 'plugins');
    const scrapeDir = path.join(process.cwd(), 'scrape');

    let pluginFiles = fs.existsSync(pluginDir) ? fs.readdirSync(pluginDir).filter(v => v.endsWith('.js')) : [];
    let scrapeFiles = fs.existsSync(scrapeDir) ? fs.readdirSync(scrapeDir).filter(v => v.endsWith('.js')) : [];

    if (!text) {
        let purePlugins = 0;
        let scraperPlugins = 0;

        for (let file of pluginFiles) {
            let content = fs.readFileSync(path.join(pluginDir, file), 'utf-8');
            if (/import.*from.*(\.\.|\.)\/scrape\//i.test(content)) {
                scraperPlugins++;
            } else {
                purePlugins++;
            }
        }

        let caption = `╭━━[ *SYSTEM ANALYZER* ]\n`;
        caption += `┃ ❖ *Total Plugins:* ${pluginFiles.length}\n`;
        caption += `┃ ❖ *Pure Plugins:* ${purePlugins} 📦\n`;
        caption += `┃ ❖ *Scraper Based:* ${scraperPlugins} 🔗\n`;
        caption += `┃ ❖ *Total Scrapers:* ${scrapeFiles.length} ⚙️\n`;
        caption += `╰━━━━━━━━━━━━━━━\n\n`;
        caption += `> _Ketik *${usedPrefix + command} <nama_file>* untuk cek detail fitur._\n`;
        caption += `> _Contoh: *${usedPrefix + command} ytmp3*_`;

        return m.reply(caption);
    }

    let query = text.toLowerCase().replace('.js', '') + '.js';
    let isPlugin = pluginFiles.includes(query);
    let isScrape = scrapeFiles.includes(query);

    if (!isPlugin && !isScrape) {
        return m.reply(`❌ File *${query}* tidak ditemukan di folder plugins maupun scrape.`);
    }

    let caption = `╭━━[ *FEATURE DETAIL* ]\n`;
    caption += `┃ ❖ *File:* ${query}\n`;

    if (isPlugin) {
        let content = fs.readFileSync(path.join(pluginDir, query), 'utf-8');
        let isUsingScraper = /import.*from.*(\.\.|\.)\/scrape\//i.test(content);
        let fileSize = (fs.statSync(path.join(pluginDir, query)).size / 1024).toFixed(2);

        caption += `┃ ❖ *Type:* ${isUsingScraper ? 'Plugin + Scraper 🔗' : 'Pure Plugin 📦'}\n`;
        caption += `┃ ❖ *Size:* ${fileSize} KB\n`;
        caption += `┃ ❖ *Location:* /plugins/\n`;

        let tagsMatch = content.match(/handler\.tags\s*=\s*\[(.*?)\]/);
        if (tagsMatch) caption += `┃ ❖ *Tags:* ${tagsMatch[1].replace(/['"]/g, '').trim()}\n`;

        let cmdMatch = content.match(/handler\.command\s*=\s*(.*)/);
        if (cmdMatch) {
            let cleanCmd = cmdMatch[1].replace(/;$/g, '').trim();
            caption += `┃ ❖ *Command:* ${cleanCmd}\n`;
        }

    } else if (isScrape) {
        let fileSize = (fs.statSync(path.join(scrapeDir, query)).size / 1024).toFixed(2);
        caption += `┃ ❖ *Type:* Core Scraper Engine ⚙️\n`;
        caption += `┃ ❖ *Size:* ${fileSize} KB\n`;
        caption += `┃ ❖ *Location:* /scrape/\n`;
    }

    caption += `╰━━━━━━━━━━━━━━━`;
    m.reply(caption);
};

handler.help = ['cekfitur <nama_file>'];
handler.tags = ['owner'];
handler.command = /^(cekfitur|cf)$/i;
handler.owner = true;

export default handler;
