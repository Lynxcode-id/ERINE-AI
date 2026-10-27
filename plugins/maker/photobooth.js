import axios from 'axios';
import { config } from '../../settings.js'
import { pickMedia } from '../../lib/album.js'

async function execRun(m, { sock, usedPrefix, command, text, args }) {
    const makeUI = (title, subtitle, content) => {
        return `୨୧ ${title}\n\n${subtitle}\n${content}\n\n> ${config.botName} • WHATSAPP BOT`;
    };

    let q = pickMedia(m, sock, { types: ['image'] });
    let mime = (q.mime || (q.mediaType === 'image' ? 'image/jpeg' : q.mediaType === 'video' ? 'video/mp4' : ''));

    if (!/image\/(jpe?g|png)/.test(mime)) {
        let helpText = `◦ Kirim atau balas gambar dengan pesan ini\n◦ Contoh: ${usedPrefix + command}`;
        return m.reply(makeUI('Photo Booth', 'Create your aesthetic photo booth.', helpText));
    }

    try {
        let media = Buffer.from(await q.download());
        if (!media) throw new Error("Gagal mengunduh gambar dari pesan.");
        
        let form = new FormData();
        form.append('image', new Blob([media], { type: 'image/jpeg' }), 'image.jpg');

        let apiUrl = `${global.cmnty}/canvas/photo-booth?apikey=${global.apikey.cmnty}`;
        
        let { data } = await axios.post(apiUrl, form, { responseType: 'arraybuffer' });

        await m.reply({
            type: 'image',
            media: Buffer.from(data),
            caption: makeUI('Photo Booth', 'Create your aesthetic photo booth.', '✨ Photo Booth berhasil dibuat.')
        });
        await sock.sendReact(m.chat, '🌸', m.id).catch(() => {});

    } catch (err) {
        await sock.sendReact(m.chat, '🍂', m.id).catch(() => {});
        await m.reply(makeUI('Photo Booth', 'Create your aesthetic photo booth.', `⚠️ Gagal memproses gambar.\n◦ Detail: ${err.message || 'API sedang gangguan.'}`));
    }
};
export default {
  command: 'photobooth',
  category: 'maker',
  tags: ['maker'],
  description: `> photobooth\n\ncontoh:\n> \`.photobooth\``,
  help: '',
  typing: true,
  wait: true,
  async execute(m, { sock, args }) {
    const text = m.text.slice((m.prefix || '').length + m.command.length).trim()
    return execRun(m, { sock, usedPrefix: m.prefix || '.', command: m.command, text, args })
  }
}
