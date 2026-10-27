import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import axios from 'axios';
import { config } from '../../settings.js'
import { pickMedia } from '../../lib/album.js'

function drawImageCover(ctx, img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const targetRatio = w / h;
    let sx, sy, sw, sh;

    if (imgRatio > targetRatio) {
        sh = img.height;
        sw = sh * targetRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
    } else {
        sw = img.width;
        sh = sw / targetRatio;
        sx = 0;
        sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

async function execRun(m, { sock, usedPrefix, command, text, args }) {
    const makeUI = (title, content) => {
        return `✨ *${title}*\n\n` +
               content.split('\n').map(line => `🌸 ${line}`).join('\n') + `\n\n` +
               `> © ${config.botName}`;
    };

    let q = pickMedia(m, sock, { types: ['image'] });
    let mime = (q.mime || (q.mediaType === 'image' ? 'image/jpeg' : q.mediaType === 'video' ? 'video/mp4' : ''));

    if (!/image/.test(mime)) {
        return m.reply(makeUI('INFO', `Kirim/reply foto dengan caption:\n*${usedPrefix + command}*`));
    }

    try {
        const ASSETS_DIR = join(process.cwd(), 'assets', 'beautiful');
        const BG_LOCAL = join(ASSETS_DIR, '2image.jpeg');
        const BG_URL = "https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/Image/2image.jpeg";
        const CANVAS_SIZE = { width: 1217, height: 1280 };

        await mkdir(ASSETS_DIR, { recursive: true });

        if (!existsSync(BG_LOCAL)) {
            const res = await axios.get(BG_URL, { responseType: 'arraybuffer', timeout: 60000 });
            await writeFile(BG_LOCAL, Buffer.from(res.data));
        }

        const imgBuffer = Buffer.from(await q.download());
        const userImg = await loadImage(imgBuffer);
        const bgImg = await loadImage(BG_LOCAL);

        const canvas = createCanvas(CANVAS_SIZE.width, CANVAS_SIZE.height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(bgImg, 0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);

        ctx.save();
        drawImageCover(ctx, userImg, 833, 61, 305, 344);
        ctx.restore();

        ctx.save();
        drawImageCover(ctx, userImg, 841, 719, 299, 348);
        ctx.restore();

        const finalBuffer = await canvas.encode('png');

        await m.reply({ type: 'image', media: finalBuffer,
            caption: makeUI('B E A U T I F U L', 'Berhasil membuat gambar!') });

        await sock.sendReact(m.chat, '✅', m.id).catch(() => {});

    } catch (err) {
        console.error(err);
        await sock.sendReact(m.chat, '❌', m.id).catch(() => {});
        m.reply(makeUI('ERROR', `Gagal memproses gambar.\n💬 *Detail:* ${err.message}`));
    }
};
export default {
  command: 'beautiful',
  category: 'maker',
  tags: ['maker'],
  description: `> beautiful\n\ncontoh:\n> \`.beautiful\``,
  help: '',
  typing: true,
  wait: true,
  async execute(m, { sock, args }) {
    const text = m.text.slice((m.prefix || '').length + m.command.length).trim()
    return execRun(m, { sock, usedPrefix: m.prefix || '.', command: m.command, text, args })
  }
}
