
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

let handler = async (m, { conn, usedPrefix, command }) => {
    let waitTeks = `┌˚₊ ๑│ S C A N N I N G │๑˚₊\n` +
                   `┇ \n` +
                   `│ ⏳ Sedang menghitung berat file...\n` +
                   `┇ \n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI`;

    let { key } = await conn.sendMessage(m.chat, { text: waitTeks }, { quoted: m });

    try {
        const { stdout: totalSize } = await execPromise('du -sh .');

        const { stdout: nodeSize } = await execPromise('du -sh node_modules 2>/dev/null || echo "0B (Tidak ditemukan)"');

        const { stdout: lineCount } = await execPromise('find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*" | xargs wc -l | tail -n 1');

        let teks = `┌˚₊ ๑│ S C  W E I G H T │๑˚₊\n` +
                   `┇ \n` +
                   `│ 📂 *Total Project:* ${totalSize.trim().split('\t')[0]}\n` +
                   `│ 📦 *Node_Modules:* ${nodeSize.trim().split('\t')[0]}\n` +
                   `│ 📝 *Total Lines:* ${lineCount.trim().split(' ')[0]} Baris\n` +
                   `┇ \n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI | Monitor Bloat`;

        await conn.sendMessage(m.chat, { text: teks, edit: key });
        await m.react('✅');

    } catch (e) {
        await m.react('❌');
        await conn.sendMessage(m.chat, { text: `❌ *Error:* ${e.message}`, edit: key });
    }
}

handler.help = ['scweight'];
handler.tags = ['owner'];
handler.command = /^(scweight)$/i;
handler.owner = true;

export default handler;
