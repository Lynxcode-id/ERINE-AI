
import fetch from 'node-fetch';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''; // Pastiin token lu ga expired
const GITHUB_USERNAME = 'Lynxcode-id';
const GITHUB_REPO = 'Kyy-nyengkrep'; // <--- Repo udah diganti ke Kyy-nyengkrep

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let filename = text?.trim();
    const cmd = command.toLowerCase();

    if (cmd === 'listscrape' || cmd === 'cekscrape') {
        await m.react('⏳');
        try {
            const listUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/`;
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'Lynx-Decode'
            };

            const listRes = await fetch(listUrl, { headers });

            if (!listRes.ok) {
                if (listRes.status === 404) throw new Error(`Repo *${GITHUB_REPO}* kosong atau kaga nemu wak.`);
                throw new Error(`Gagal ngambil data: ${listRes.statusText}`);
            }

            const listData = await listRes.json();

            if (!Array.isArray(listData)) throw new Error('Format datanya ngaco.');

            const files = listData.filter(item => item.type === 'file');
            const totalFiles = files.length;

            if (totalFiles === 0) {
                await m.react('✅');
                return m.reply(`┌˚₊ ๑│ s ʜ ᴀ ʀ ᴇ  s ᴄ ʀ ᴀ ᴘ ᴇ │๑˚₊ 📂\n┇ \n│ ⚠️ Repo *${GITHUB_REPO}* lu masih kosong melompong cuy!\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © LYNX DECODE`);
            }

            let caption = `┌˚₊ ๑│ s ʜ ᴀ ʀ ᴇ  s ᴄ ʀ ᴀ ᴘ ᴇ │๑˚₊ 📂\n┇ \n`;
            caption += `│ 📊 *Total Scrape:* ${totalFiles}\n`;
            caption += `│ 📦 *Repo:* ${GITHUB_REPO}\n│ \n`;
            caption += `│ 📝 *Daftar Script:*\n`;

            files.forEach((file, index) => {
                caption += `│ ${index + 1}. ${file.name}\n`;
            });

            caption += `┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © LYNX DECODE`;

            await m.react('✅');
            return m.reply(caption);
        } catch (error) {
            console.error('[GITHUB LIST ERROR]', error);
            await m.react('❌');
            return m.reply(`┌˚₊ ๑│ s ʏ s ᴛ ᴇ ᴍ  ᴇ ʀ ʀ ᴏ ʀ │๑˚₊ ❌\n┇ Gagal ngecek repo cuy.\n┇ *Detail:* ${error.message}\n└˚₊ ๑ ────────────── ๑˚₊\n> © LYNX DECODE`);
        }
    }

    if (!filename) {
        return m.reply(`┌˚₊ ๑│ s ʜ ᴀ ʀ ᴇ  s ᴄ ʀ ᴀ ᴘ ᴇ │๑˚₊ ⚠️\n┇ \n│ ❌ *Format lu salah wak!*\n│ \n│ 📌 *Cara pakai:*\n│ ${usedPrefix}upscrape <NamaFile.js> (Upload/Timpa script)\n│ ${usedPrefix}delscrape <NamaFile.js> (Hapus script)\n│ ${usedPrefix}listscrape (Cek isi repo scrape)\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © LYNX DECODE`);
    }

    await m.react('⏳');

    try {
        const checkFileUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filename}`;
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'Lynx-Decode'
        };

        const checkRes = await fetch(checkFileUrl, { headers });
        let fileSha = null;
        let isUpdate = false;

        if (checkRes.ok) {
            const checkData = await checkRes.json();
            fileSha = checkData.sha;
            isUpdate = true;
        }

        if (cmd === 'delscrape') {
            if (!fileSha) {
                await m.react('❌');
                return m.reply(`┌˚₊ ๑│ s ʏ s ᴛ ᴇ ᴍ  ᴇ ʀ ʀ ᴏ ʀ │๑˚₊ ❌\n┇ File *${filename}* kaga nemu di Repo ${GITHUB_REPO}.\n└˚₊ ๑ ────────────── ๑˚₊\n> © LYNX DECODE`);
            }

            const delRes = await fetch(checkFileUrl, {
                method: 'DELETE',
                headers: headers,
                body: JSON.stringify({
                    message: `Delete scrape ${filename} by Lynx`,
                    sha: fileSha
                })
            });

            if (!delRes.ok) throw new Error(`Gagal ngehapus cuy: ${delRes.statusText}`);

            await m.react('✅');
            return m.reply(`┌˚₊ ๑│ s ʜ ᴀ ʀ ᴇ  s ᴄ ʀ ᴀ ᴘ ᴇ │๑˚₊ 🗑️\n┇ \n│ ✅ Mantap, file *${filename}* sukses dihapus dari Repo ${GITHUB_REPO}!\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © LYNX DECODE`);
        }

        let q = m.quoted ? m.quoted : m;
        let code = q.text || q.caption;

        if (!code || code === text) {
            await m.react('❌');
            return m.reply(`┌˚₊ ๑│ s ʏ s ᴛ ᴇ ᴍ  ᴇ ʀ ʀ ᴏ ʀ │๑˚₊ ❌\n┇ Reply pesan yang isinya kode scrape lu dulu!\n└˚₊ ๑ ────────────── ๑˚₊\n> © LYNX DECODE`);
        }

        if (code.length < 10) {
            await m.react('❌');
            return m.reply(`┌˚₊ ๑│ s ʏ s ᴛ ᴇ ᴍ  ᴇ ʀ ʀ ᴏ ʀ │๑˚₊ ❌\n┇ Kodenya kependekan wak (minimal 10 karakter).\n└˚₊ ๑ ────────────── ๑˚₊\n> © LYNX DECODE`);
        }

        await m.react('⚡');

        const base64Content = Buffer.from(code).toString('base64');

        const payload = {
            message: `${isUpdate ? 'Update' : 'Upload'} scrape ${filename} by Lynx`,
            content: base64Content
        };

        if (fileSha) payload.sha = fileSha;

        const res = await fetch(checkFileUrl, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            let errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${res.statusText}\n${errorText.substring(0, 100)}`);
        }

        const data = await res.json();

        if (data && data.content && data.content.html_url) {
            let caption = `┌˚₊ ๑│ s ʜ ᴀ ʀ ᴇ  s ᴄ ʀ ᴀ ᴘ ᴇ │๑˚₊ 💻\n┇ \n`;
            caption += `│ 📌 *File:* ${filename}\n`;
            caption += `│ 📦 *Repo:* ${GITHUB_REPO}\n`;
            caption += `│ ⚙️ *Status:* ${isUpdate ? 'Diupdate (Overwritten)' : 'Sukses Diupload (Created)'}\n`;
            caption += `│ 📏 *Size:* ${code.length} chars\n`;
            caption += `│ 🔗 *Link:* ${data.content.html_url}\n`;
            caption += `┇ \n`;
            caption += `└˚₊ ๑ ────────────── ๑˚₊\n`;
            caption += `> © LYNX DECODE`;

            await conn.sendMessage(m.chat, {
                text: caption,
                contextInfo: {
                    isForwarded: true,
                    forwardingScore: 9999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363400612665352@newsletter",
                        newsletterName: "🔥 𝙻𝚈𝙽𝚇 𝙳𝙴𝙲𝙾𝙳𝙴 𝙸𝙽𝙵𝙾",
                        serverMessageId: -1
                    }
                }
            }, { quoted: m });

            await m.react('🔥');
        } else {
            throw new Error('Server kaga ngasih URL File.');
        }

    } catch (error) {
        console.error('[GITHUB REPO ERROR]', error);
        await m.react('❌');

        let errorMsg = error.message;
        let replyMsg = '';

        if (errorMsg.includes('401') || errorMsg.includes('Bad credentials')) {
            replyMsg = 'Token GitHub lu mokat/expired wak! Cek ulang dah.';
        } else if (errorMsg.includes('404')) {
            replyMsg = `Repo *${GITHUB_REPO}* kaga nemu atau Token lu kaga ada akses ke situ.`;
        } else if (errorMsg.includes('422')) {
            replyMsg = 'Gagal mroses (422). Filenya bermasalah atau format namanya ngaco.';
        } else {
            replyMsg = `Gagal ngeproses kodenya.\n┇ *Detail:* ${errorMsg}`;
        }

        m.reply(`┌˚₊ ๑│ s ʏ s ᴛ ᴇ ᴍ  ᴇ ʀ ʀ ᴏ ʀ │๑˚₊ ❌\n┇ ${replyMsg}\n└˚₊ ๑ ────────────── ๑˚₊\n> © LYNX DECODE`)
    }
}

handler.help = ['upscrape <filename>', 'delscrape <filename>', 'listscrape']
handler.tags = ['tools']
handler.command = /^(upscrape|delscrape|listscrape|cekscrape)$/i
handler.owner = true
handler.premium = true

export default handler
