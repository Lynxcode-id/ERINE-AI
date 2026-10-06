import fs from 'fs';
import archiver from 'archiver';
import path from 'path';

let handler = async (m, { conn }) => {
    m.reply('Tunggu bentar ya cuy, lagi proses nge-zip file Erine... ⏳');

    const backupName = 'backup_erine.zip';
    const output = fs.createWriteStream(backupName);
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    try {
        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);

            archive.pipe(output);

            archive.glob('**/*', {
                cwd: process.cwd(),
                ignore: [
                    'node_modules/**',
                    '.npm/**',
                    'package-lock.json',
                    backupName
                ]
            });

            archive.finalize();
        });

        const ownerJid = `${global.nomorown}@s.whatsapp.net`;

        await conn.sendMessage(ownerJid, {
            document: fs.readFileSync(backupName),
            mimetype: 'application/zip',
            fileName: backupName,
            caption: 'Nih cuy, backup file Erine lu udah kelar. 🚀'
        }, { quoted: m });

        fs.unlinkSync(backupName);
        m.reply('Backup sukses dikirim ke lu cuy!');

    } catch (err) {
        console.error(err);
        m.reply('Waduh, ada error pas nge-backup: ' + err.message);
    }
};

handler.help = ['backup'];
handler.tags = ['owner'];
handler.command = /^(backup)$/i;
handler.owner = true;

export default handler;
