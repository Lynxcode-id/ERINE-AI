import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { exec } from 'child_process';
import util from 'util';
import webp from 'node-webpmux';
import axios from 'axios';
import { config } from '../../settings.js'
import { getStickerWm } from '../../lib/stickerMeta.js'

const execPromise = util.promisify(exec);

async function downloadFile(url, dest) {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
    await fs.writeFile(dest, Buffer.from(res.data));
}

async function writeStickerExif(filePath, packName, authorName) {
    const img = new webp.Image();
    await img.load(filePath);
    const json = { 'sticker-pack-id': crypto.randomBytes(16).toString('hex'), 'sticker-pack-name': packName, 'sticker-pack-publisher': authorName, emojis: ['🎨'] };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    img.exif = exif;
    await img.save(filePath);
    return await fs.readFile(filePath);
}

function wrapText(ctx, text, maxWidth) {
    return text.split("\n").flatMap(p => {
        const clean = p.trim();
        if (!clean) return [""];
        const words = clean.split(" ").filter(Boolean);
        const lines = [];
        let current = "";
        for (const word of words) {
            const test = current ? `${current} ${word}` : word;
            if (ctx.measureText(test).width <= maxWidth) { current = test; continue; }
            if (current) { lines.push(current); current = ""; }
            if (ctx.measureText(word).width <= maxWidth) { current = word; } 
            else {
                const chars = [...word], parts = [];
                let cur = "";
                for (const c of chars) {
                    const t = cur + c;
                    if (ctx.measureText(t).width <= maxWidth || !cur) cur = t;
                    else { parts.push(cur); cur = c; }
                }
                if (cur) parts.push(cur);
                lines.push(...parts.slice(0, -1));
                current = parts.at(-1) || "";
            }
        }
        if (current) lines.push(current);
        return lines;
    });
}

function drawCenteredText(ctx, text, zone, style) {
    const rect = { x: zone.c, y: zone.a, w: zone.d - zone.c, h: zone.b - zone.a, centerX: (zone.c + zone.d) / 2 };
    let fitted = null;
    for (let size = style.maxFontSize; size >= style.minFontSize; size--) {
        ctx.font = `${size}px ${style.fontFamily}`;
        const lineHeight = Math.ceil(size * style.lineHeight);
        const lines = wrapText(ctx, text, rect.w);
        if (lines.length * lineHeight <= rect.h) { fitted = { size, lines, lineHeight, totalHeight: lines.length * lineHeight }; break; }
    }
    if (!fitted) {
        ctx.font = `${style.minFontSize}px ${style.fontFamily}`;
        const lineHeight = Math.ceil(style.minFontSize * style.lineHeight);
        const lines = wrapText(ctx, text, rect.w);
        const maxLines = Math.max(1, Math.floor(rect.h / lineHeight));
        const clipped = lines.slice(0, maxLines);
        if (lines.length > maxLines && clipped.length) {
            let last = clipped[clipped.length - 1];
            while (last.length > 0 && ctx.measureText(`${last}...`).width > rect.w) last = last.slice(0, -1);
            clipped[clipped.length - 1] = `${last}...`;
        }
        fitted = { size: style.minFontSize, lines: clipped, lineHeight, totalHeight: clipped.length * lineHeight };
    }
    const startY = rect.y + (rect.h - fitted.totalHeight) / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
    ctx.font = `${fitted.size}px ${style.fontFamily}`; ctx.fillStyle = style.color; ctx.textAlign = style.align; ctx.textBaseline = "top";
    fitted.lines.forEach((line, i) => ctx.fillText(line, rect.centerX, startY + i * fitted.lineHeight));
    ctx.restore();
}

async function execRun(m, { sock, usedPrefix, command, text, args }) {
    const makeUI = (title, content) => `✨ *${title}*\n\n` + content.split('\n').map(line => `🌸 ${line}`).join('\n') + `\n\n> © ${config.botName}`;
    if (!text) return m.reply(makeUI('INFO', `Masukkan teksnya!\nContoh: *${usedPrefix + command} Halo semuanya*`));
    
    const tmpWorkDir = path.join(os.tmpdir(), `vermeilbratvid-${Date.now()}`);

    try {
        const ASSETS_DIR = path.join(process.cwd(), 'assets', 'brat');
        const BG_LOCAL = path.join(ASSETS_DIR, 'Vermile.jpg');
        const FONT_LOCAL = path.join(ASSETS_DIR, 'Poppins.ttf');
        
        await fs.mkdir(ASSETS_DIR, { recursive: true });
        await fs.mkdir(tmpWorkDir, { recursive: true });

        if (!existsSync(BG_LOCAL)) await downloadFile('https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Brat/Vermile.jpg', BG_LOCAL);
        if (!existsSync(FONT_LOCAL)) await downloadFile('https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Brat/Poppins.ttf', FONT_LOCAL);

        GlobalFonts.registerFromPath(FONT_LOCAL, 'Poppins');
        const image = await loadImage(BG_LOCAL);
        
        const inputText = String(text).replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
        const tokens = inputText.replace(/[,，]/g, " ").split(/\s+/).map(v => v.trim()).filter(Boolean);
        if (!tokens.length) throw new Error("Teks kosong");

        const layers = [];
        for (let i = 0; i < tokens.length; i += 5) layers.push(tokens.slice(i, i + 5));

        const frames = [];
        for (const layer of layers) {
            let current = "";
            for (let i = 0; i < layer.length; i++) {
                current += (current ? " " : "") + layer[i];
                frames.push({ text: current, duration: (i === layer.length - 1) ? 1.5 : 0.7 });
            }
        }

        const concatLines = [];
        for (let i = 0; i < frames.length; i++) {
            const framePath = path.join(tmpWorkDir, `frame-${i}.png`);
            const canvas = createCanvas(1254, 1254);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0, 1254, 1254);
            drawCenteredText(ctx, frames[i].text, { a: 655, b: 1118, c: 282, d: 993 }, { fontFamily: "Poppins", maxFontSize: 90, minFontSize: 22, lineHeight: 1.18, color: "#111111", align: "center" });
            await fs.writeFile(framePath, await canvas.encode("png"));
            concatLines.push(`file '${framePath.replace(/'/g, "'\\''")}'\nduration ${frames[i].duration}`);
        }
        concatLines.push(`file '${path.join(tmpWorkDir, `frame-${frames.length - 1}.png`).replace(/'/g, "'\\''")}'`);
        
        const concatPath = path.join(tmpWorkDir, "concat.txt");
        const tmpWebp = path.join(tmpWorkDir, "output.webp");
        await fs.writeFile(concatPath, concatLines.join('\n'));

        await execPromise(`ffmpeg -y -f concat -safe 0 -i "${concatPath}" -vcodec libwebp -filter:v "fps=24,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1" -loop 0 -preset default -an -vsync 0 -q:v 70 "${tmpWebp}"`);
        
        const finalBuffer = await writeStickerExif(tmpWebp, getStickerWm().packName, getStickerWm().author);
        await m.reply({ type: 'sticker', media: finalBuffer, mimetype: 'image/webp' });
        await sock.sendReact(m.chat, '✅', m.id).catch(() => {});

    } catch (err) {
        await sock.sendReact(m.chat, '❌', m.id).catch(() => {});
        m.reply(makeUI('ERROR', `Gagal membuat animasi.\n💬 *Detail:* ${err.message}`));
    } finally {
        await fs.rm(tmpWorkDir, { recursive: true, force: true }).catch(() => {});
    }
};
export default {
  command: 'bratvidvermeil',
  alias: ['bratvermeilv'],
  category: 'sticker',
  tags: ['sticker'],
  description: `> bratvidvermeil\n\ncontoh:\n> \`.bratvidvermeil\``,
  help: '',
  typing: true,
  wait: true,
  async execute(m, { sock, args }) {
    const text = m.text.slice((m.prefix || '').length + m.command.length).trim()
    return execRun(m, { sock, usedPrefix: m.prefix || '.', command: m.command, text, args })
  }
}
