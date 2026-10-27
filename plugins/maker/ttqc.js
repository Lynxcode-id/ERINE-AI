import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import axios from 'axios';
import { config } from '../../settings.js'

async function downloadFile(url, dest) {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
    await writeFile(dest, Buffer.from(res.data));
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(/(\s+)/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if (!word) continue;
        if (word.trim() === '' && currentLine === '') continue;

        const testLine = currentLine + word;
        if (ctx.measureText(testLine).width > maxWidth) {
            if (currentLine !== '') {
                lines.push(currentLine.trimEnd());
                currentLine = word.trimStart();
            } else {
                lines.push(testLine);
                currentLine = '';
            }
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine.trim()) lines.push(currentLine.trimEnd());
    return lines;
}

function drawRoundedRect(ctx, x, y, w, h, r, fill, stroke = null, shadow = false) {
    ctx.save();
    if (shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.05)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 12;
    }
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
}

async function execRun(m, { sock, usedPrefix, command, text, args }) {
    const makeUI = (title, content) => {
        return `✨ *${title}*\n\n` + content.split('\n').map(line => `🌸 ${line}`).join('\n') + `\n\n> © ${config.botName}`;
    };

    if (!text) return m.reply(makeUI('INFO', `Masukkan teksnya!\nContoh: *${usedPrefix + command} Halo kawan*`));

    try {
        const ASSETS_DIR = join(process.cwd(), 'assets', 'ttqc');
        const FONTS_DIR = join(ASSETS_DIR, 'fonts');
        const TEMPLATE_PATH = join(ASSETS_DIR, 'template.png');

        await mkdir(FONTS_DIR, { recursive: true });

        if (!existsSync(TEMPLATE_PATH)) await downloadFile('https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/ttqc/qyzwa.png', TEMPLATE_PATH);

        const FONT_ASSETS = [
            { name: 'PlusJakartaSans-Regular', url: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/ttqc/PlusJakartaSans-Regular.ttf', family: 'Plus Jakarta Sans' },
            { name: 'PlusJakartaSans-Bold', url: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/ttqc/PlusJakartaSans-Bold.ttf', family: 'Plus Jakarta Sans' },
            { name: 'FontAwesome-Solid', url: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/ttqc/fa-solid-900.ttf', family: 'Font Awesome 6 Free' },
            { name: 'NotoColorEmoji', url: 'https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf', family: 'Noto Color Emoji' }
        ];

        for (const font of FONT_ASSETS) {
            const dest = join(FONTS_DIR, `${font.name}.ttf`);
            if (!existsSync(dest)) await downloadFile(font.url, dest);
            GlobalFonts.registerFromPath(dest, font.family);
        }

        let ppUrl = await sock.profile.getProfilePicture(m.sender, 'image').then(r => r?.url).catch(() => 'https://telegra.ph/file/320b066dc81928b782c7b.png');
        const username = m.pushName || 'User';

        const templateImage = await loadImage(TEMPLATE_PATH);
        const avatarImage = await loadImage(await axios.get(ppUrl, { responseType: 'arraybuffer' }).then(res => res.data));

        const canvas = createCanvas(1080 * 2, 2280 * 2);
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);

        ctx.drawImage(templateImage, 0, 0, 1080, 2280);

        ctx.save();
        ctx.beginPath();
        ctx.arc(183, 83, 42, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImage, 183 - 42, 83 - 42, 84, 84);
        ctx.restore();

        ctx.font = `bold 34px 'Plus Jakarta Sans', 'Noto Color Emoji'`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(username, 250, 82);

        ctx.font = `500 30px 'Plus Jakarta Sans', 'Noto Color Emoji'`;
        const lines = wrapText(ctx, text, 520 - 52);
        const lineH = 30 * 1.45;

        let maxW = 0;
        for (const l of lines) {
            const w = ctx.measureText(l).width;
            if (w > maxW) maxW = w;
        }

        const bubbleW = Math.max(maxW + 60, 180);
        const bubbleH = lines.length * lineH + 48;
        const bubbleX = 145;
        const bubbleY = 938;

        ctx.save();
        ctx.beginPath();
        ctx.arc(75, bubbleY + bubbleH / 2, 38, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImage, 75 - 38, bubbleY + bubbleH / 2 - 38, 76, 76);
        ctx.restore();

        drawRoundedRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 35, '#ffffff');

        ctx.fillStyle = '#161823';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        lines.forEach((line, i) => {
            ctx.fillText(line, 175, 962 + i * lineH + 15);
        });

        const menuY = bubbleY + bubbleH + 28;
        drawRoundedRect(ctx, 90, menuY, 565, 580, 40, '#ffffff', 'rgba(0,0,0,0.02)', true);

        const MENU_ICONS = [
            { unicode: '\uf3e5', text: 'Balas', color: '#000000' },
            { unicode: '\uf064', text: 'Teruskan', color: '#000000' },
            { unicode: '\uf0c5', text: 'Salin', color: '#000000' },
            { unicode: '\uf1ab', text: 'Terjemahkan', color: '#000000' },
            { unicode: '\uf2ed', text: 'Hapus untuk saya', color: '#000000' },
            { unicode: '\uf024', text: 'Laporkan', color: '#ea4335' }
        ];

        MENU_ICONS.forEach((item, i) => {
            const cy = menuY + 25 + i * 90 + 45;
            ctx.fillStyle = item.color;
            ctx.font = `900 34px 'Font Awesome 6 Free'`;
            ctx.textAlign = 'center';
            ctx.fillText(item.unicode, 150, cy);
            ctx.font = `500 34px 'Plus Jakarta Sans'`;
            ctx.textAlign = 'left';
            ctx.fillText(item.text, 220, cy);
        });

        const finalBuffer = await canvas.encode('png');
        await m.reply({ type: 'image', media: finalBuffer, caption: makeUI('T T   Q C', 'Berhasil membuat TikTok QC!') });
        await sock.sendReact(m.chat, '✅', m.id).catch(() => {});

    } catch (err) {
        await sock.sendReact(m.chat, '❌', m.id).catch(() => {});
        m.reply(makeUI('ERROR', `Gagal membuat QC.\n💬 *Detail:* ${err.message}`));
    }
};
export default {
  command: 'ttqc',
  category: 'maker',
  tags: ['maker'],
  description: `> ttqc\n\ncontoh:\n> \`.ttqc\``,
  help: '',
  typing: true,
  wait: true,
  async execute(m, { sock, args }) {
    const text = m.text.slice((m.prefix || '').length + m.command.length).trim()
    return execRun(m, { sock, usedPrefix: m.prefix || '.', command: m.command, text, args })
  }
}
