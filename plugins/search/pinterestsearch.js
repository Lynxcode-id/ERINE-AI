import axios from 'axios';

export default {
    command: 'pins',
    tags: ['search'],
    description: 'Mencari gambar dari Pinterest',
    typing: true,
    execute: async (m, { sock, args }) => {
        const query = args.join(' ').trim();

        if (!query) return m.reply('Masukkan kata kunci pencarian!');

        try {
            const res = await axios.get(`${global.theresav}/api/search/pinterest?q=${encodeURIComponent(query)}`, {
                headers: {
                    'x-apikey': global.apikey.theresav
                }
            });

            const data = res.data;

            if (!data.status || !data.result || data.result.length === 0) {
                return m.reply('Gambar tidak ditemukan.');
            }

            const medias = data.result.map(item => ({ image: item.image }));
            await sock.sendAlbum(m.chat, medias, { quote: m.raw || m });

            let infoText = `🌷 Pinterest Search\n\n`;
            infoText += `♡ Query : ${query}\n`;
            infoText += `♡ Total Result : ${data.total}\n`;
            infoText += `♡ Sent : ${medias.length} images\n\n`;
            infoText += `with love, elyra !!`;

            await m.reply(infoText);
        } catch (err) {
            m.reply(`Error: ${err.message}`);
        }
    }
};