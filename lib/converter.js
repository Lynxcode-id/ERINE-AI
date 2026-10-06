import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import pLimit from 'p-limit';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const tmpDir = join(__dirname, '../tmp');
await fs.mkdir(tmpDir, { recursive: true }).catch(() => {});
const limit = pLimit(3);
const TIMEOUT = 60000;

function sanitizeExt(ext) {
  return (ext || '').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
}

function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
  return limit(() => new Promise(async (resolve, reject) => {
    const id = crypto.randomBytes(6).toString('hex');
    const tmp = join(tmpDir, `${Date.now()}_${id}.${sanitizeExt(ext)}`);
    const out = `${tmp}.${sanitizeExt(ext2)}`;
    let killed = false;

    const cleanup = async () => {
      await fs.unlink(tmp).catch(() => {});
      await fs.unlink(out).catch(() => {});
    };

    try {
      await fs.writeFile(tmp, buffer);
      const ffmpegProcess = spawn('ffmpeg', [
        '-hide_banner',
        '-loglevel', 'error',
        '-y',
        '-i', tmp,
        ...args,
        out
      ]);

      let stderr = '';
      ffmpegProcess.stderr.on('data', chunk => stderr += chunk);

      const timeout = setTimeout(() => {
        killed = true;
        ffmpegProcess.kill('SIGKILL');
      }, TIMEOUT);

      ffmpegProcess.on('error', async (err) => {
        clearTimeout(timeout);
        await cleanup();
        reject(new Error(`FFmpeg spawn error: ${err.message}`));
      });

      ffmpegProcess.on('close', async (code) => {
        clearTimeout(timeout);
        await fs.unlink(tmp).catch(() => {});

        if (killed) {
          await cleanup();
          return reject(new Error('FFmpeg timeout 60s. Proses dibatalkan karena terlalu berat.'));
        }

        if (code !== 0) {
          await cleanup();
          return reject(new Error(`FFmpeg exit ${code}: ${stderr.trim().slice(-200)}`));
        }

        try {
          const data = await fs.readFile(out);
          resolve({
            data,
            filename: basename(out),
            delete: () => fs.unlink(out).catch(() => {})
          });
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      await cleanup();
      reject(e);
    }
  }));
}

function toPTT(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '64k',
    '-vbr', 'on',
    '-application', 'voip'
  ], ext, 'ogg');
}

function toAudio(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on',
    '-compression_level', '10'
  ], ext, 'opus');
}

function toVideo(buffer, ext) {
  return ffmpeg(buffer, [
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '28',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-movflags', '+faststart'
  ], ext, 'mp4');
}

setInterval(async () => {
  try {
    const files = await fs.readdir(tmpDir);
    const now = Date.now();
    for (const f of files) {
      const p = join(tmpDir, f);
      const stat = await fs.stat(p).catch(() => null);
      if (stat && now - stat.mtimeMs > 3600000) {
        await fs.unlink(p).catch(() => {});
      }
    }
  } catch {}
}, 3600000);

export {
  toAudio,
  toPTT,
  toVideo,
  ffmpeg
};
