import axios from 'axios';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../../settings.js'
import { pickMedia } from '../../lib/album.js'

async function downloadFile(url, dest) {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
    await writeFile(dest, Buffer.from(res.data));
}

async function rasterizeSvg(svgText, size) {
    const svg = await loadImage(Buffer.from(svgText));
    const c = createCanvas(size, Math.max(1, Math.round(size * svg.height / svg.width)));
    c.getContext('2d').drawImage(svg, 0, 0, c.width, c.height);
    return c.toBuffer('image/png');
}

async function tintImage(img, color) {
    const c = createCanvas(img.width, img.height);
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    cx.globalCompositeOperation = 'source-in';
    cx.fillStyle = color;
    cx.fillRect(0, 0, img.width, img.height);
    return await loadImage(await c.encode('png'));
}

async function execRun(m, { sock, usedPrefix, command, text, args }) {
    const makeUI = (title, content) => {
        return `✨ *${title}*\n\n` + content.split('\n').map(line => `🌸 ${line}`).join('\n') + `\n\n> © ${config.botName}`;
    };

    let q = pickMedia(m, sock, { types: ['image'] });
    let mime = (q.mime || (q.mediaType === 'image' ? 'image/jpeg' : q.mediaType === 'video' ? 'video/mp4' : ''));

    if (!mime.includes('image')) {
        return m.reply(makeUI('INFO', `Reply foto dengan caption:\n*${usedPrefix + command} username | like | comment | repost*`));
    }

    let [username, like, comment, repost] = text.split('|').map(v => v ? v.trim() : '');
    username = username || m.pushName || 'User';
    like = like || '100';
    comment = comment || '31';
    repost = repost || '489';

    try {
        const ASSETS_DIR = join(process.cwd(), 'assets', 'igstory');
        const FONTS_DIR = join(ASSETS_DIR, 'fonts');
        const ICONS_DIR = join(ASSETS_DIR, 'icons');
        const BG_LOCAL = join(ASSETS_DIR, 'bg.png');
        const FONT_LOCAL = join(FONTS_DIR, 'Inter-Medium.woff2');

        await mkdir(FONTS_DIR, { recursive: true });
        await mkdir(ICONS_DIR, { recursive: true });

        if (!existsSync(BG_LOCAL)) await downloadFile('https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/igstory/storyig.png', BG_LOCAL);
        if (!existsSync(FONT_LOCAL)) await downloadFile('https://github.com/rsms/inter/raw/refs/heads/master/docs/font-files/Inter-Medium.woff2', FONT_LOCAL);

        GlobalFonts.registerFromPath(FONT_LOCAL, 'InterIG');

        const ICON_URLS = {
            like: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/igstory/like.svg',
            comment: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/igstory/comment.svg',
            repost: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/igstory/repost.svg',
            share: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/igstory/share.svg',
            save: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/igstory/save.svg',
            verify: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/igstory/verifyig.svg',
        };

        const icons = {};
        for (const [name, url] of Object.entries(ICON_URLS)) {
            const cachePath = join(ICONS_DIR, `${name}.png`);
            if (!existsSync(cachePath)) {
                const svgBuf = await axios.get(url, { responseType: 'arraybuffer' }).then(res => res.data);
                const svgText = svgBuf.toString('utf-8');
                const rawPng = await rasterizeSvg(svgText, (name === 'verify' ? 40 : 80) * 3);
                const tintedImg = await tintImage(await loadImage(rawPng), name === 'verify' ? '#0095F6' : '#f9fdfe');
                
                const tmpC = createCanvas(tintedImg.width, tintedImg.height);
                const tmpCtx = tmpC.getContext('2d');
                tmpCtx.drawImage(tintedImg, 0, 0);
                await writeFile(cachePath, await tmpC.encode('png'));
            }
            icons[name] = await loadImage(cachePath);
        }

        let ppUrl = await sock.profile.getProfilePicture(m.sender, 'image').then(r => r?.url).catch(() => 'https://telegra.ph/file/320b066dc81928b782c7b.png');
        const [bgImg, avatarImg, photoImg] = await Promise.all([
            loadImage(BG_LOCAL),
            loadImage(await axios.get(ppUrl, { responseType: 'arraybuffer' }).then(res => res.data)),
            loadImage(Buffer.from(await q.download()))
        ]);

        const canvas = createCanvas(1080, 1564);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0c0f14';
        ctx.fillRect(0, 0, 1080, 1564);
        ctx.drawImage(bgImg, 0, 0, 1080, 1564);

        ctx.save();
        ctx.beginPath();
        ctx.rect(-3, 157, 1089, 1089);
        ctx.clip();
        
        let cw, ch;
        const imgRatio = photoImg.width / photoImg.height;
        if (imgRatio > (1089 / 1089)) { ch = 1089; cw = ch * imgRatio; } 
        else { cw = 1089; ch = cw / imgRatio; }
        
        ctx.filter = `blur(28px)`;
        ctx.drawImage(photoImg, -3 - (cw - 1089) / 2, 157 - (ch - 1089) / 2, cw, ch);
        ctx.filter = 'none';

        let fw, fh;
        if (imgRatio > 1) { fw = 1089; fh = fw / imgRatio; } 
        else { fh = 1089; fw = fh * imgRatio; }
        ctx.drawImage(photoImg, -3 + (1089 - fw) / 2, 157 + (1089 - fh) / 2, fw, fh);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(83.5, 85.5, 48.5, 0, Math.PI * 2);
        ctx.clip();
        const crop = Math.min(avatarImg.width, avatarImg.height);
        ctx.drawImage(avatarImg, (avatarImg.width - crop) / 2, (avatarImg.height - crop) / 2, crop, crop, 35, 37, 97, 97);
        ctx.restore();

        ctx.font = '500 38px InterIG';
        const textW = ctx.measureText(username).width;
        ctx.fillStyle = '#f9fdfe';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(username, 159, 58 + 59 / 2);
        ctx.drawImage(icons.verify, 159 + textW + 14, 71, 40, 40);

        ctx.font = '500 43px InterIG';
        const cY = 1285 + 17 + 48 / 2;
        const iY = 1264 + 17;

        ctx.drawImage(icons.like, 22, iY, 80, 80);
        ctx.fillText(like, 22 + 80 + 24, cY);

        const cX = Math.max(256, 22 + 80 + 24 + ctx.measureText(like).width + 43);
        ctx.drawImage(icons.comment, cX, iY, 80, 80);
        ctx.fillText(comment, cX + 80 + 24, cY);

        const rX = Math.max(459, cX + 80 + 24 + ctx.measureText(comment).width + 43);
        ctx.drawImage(icons.repost, rX, iY, 80, 80);
        ctx.fillText(repost, rX + 80 + 24, cY);

        const sX = Math.max(688, rX + 80 + 24 + ctx.measureText(repost).width + 43);
        ctx.drawImage(icons.share, sX, iY, 80, 80);
        ctx.drawImage(icons.save, 978, iY, 80, 80);

        const cropH = Math.min(1400, 1564);
        const finalCanvas = createCanvas(1080, cropH);
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.drawImage(canvas, 0, 0, 1080, cropH, 0, 0, 1080, cropH);

        const finalBuffer = await finalCanvas.encode('png');

        await m.reply({ type: 'image', media: finalBuffer,
            caption: makeUI('I G   S T O R Y', 'Berhasil membuat IG Story!') });

        await sock.sendReact(m.chat, '✅', m.id).catch(() => {});

    } catch (err) {
        console.error(err);
        await sock.sendReact(m.chat, '❌', m.id).catch(() => {});
        m.reply(makeUI('ERROR', `Gagal membuat IG Story.\n💬 *Detail:* ${err.message}`));
    }
};
export default {
  command: 'igstory',
  category: 'maker',
  tags: ['maker'],
  description: `> igstory\n\ncontoh:\n> \`.igstory\``,
  help: '',
  typing: true,
  wait: true,
  async execute(m, { sock, args }) {
    const text = m.text.slice((m.prefix || '').length + m.command.length).trim()
    return execRun(m, { sock, usedPrefix: m.prefix || '.', command: m.command, text, args })
  }
}
