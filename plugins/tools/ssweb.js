import axios from 'axios';

export default {
    command: 'ssweb',
    tags: ['tools'],
    description: 'Screenshot website',
    typing: true,
    execute: async (m, { sock, args }) => {
        const query = args.join(' ').trim();

        if (!query) return m.reply('Masukkan link!\nContoh: ssweb lynxsnippets2.web.id | desktop');

        let url = query;
        let mode = 'desktop';

        if (query.includes('|')) {
            const parts = query.split('|');
            url = parts[0].trim();
            const inputMode = parts[1].trim().toLowerCase();
            if (inputMode === 'mobile' || inputMode === 'desktop') {
                mode = inputMode;
            }
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        try {
            const res = await axios.get(`https://lynxapis.my.id/api/tools/ssweb?url=${encodeURIComponent(url)}&mode=${mode}&output=image`, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'image/jpeg, image/png, image/*'
                }
            });

            const infoText = `🌷 SS Web Result\n\n♡ URL : ${url}\n♡ Mode : ${mode}\n\nwith love, elyra !!`;

            await sock.sendMessage(m.chat, {
                image: Buffer.from(res.data),
                caption: infoText
            }, { quoted: m });
        } catch (err) {
            m.reply(`Error: ${err.message}`);
        }
    }
};