
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const FOOTER = 'with love, elyra !!'
const MAX_USERNAME = 20
const MIN_LOBBY = 1
const MAX_LOBBY = 30
const shown = m => m.prefix || '.'

function loadGenerator() {
  const mod = require('fake-ff')
  const fn = typeof mod === 'function' ? mod : mod?.default
  if (typeof fn !== 'function') throw new Error('Modul fake-ff tidak valid.')
  return fn
}

const cleanUsername = (s) => String(s || '')
  .replace(/[^\p{L}\p{N} _.-]/gu, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, MAX_USERNAME)

function parseArgs(args, fallbackName) {
  const list = [...args]
  let lobby

  const last = list[list.length - 1]
  if (list.length && /^\d{1,2}$/.test(last)) {
    const n = Number(last)
    if (n >= MIN_LOBBY && n <= MAX_LOBBY) {
      lobby = n
      list.pop()
    }
  }

  const username = cleanUsername(list.join(' ')) || cleanUsername(fallbackName) || 'Player'
  return { username, lobby }
}

function buildUsage(m) {
  const p = `${shown(m)}${m.command}`
  return [
    '🌷 *Fake FF Lobby*',
    '',
    'Bikin kartu lobby Free Fire',
    'dengan background acak.',
    '',
    `♡ ${p} <username>`,
    `♡ ${p} <username> <lobby 1-30>`,
    `♡ ${p} (pakai nama kamu)`,
    '',
    FOOTER
  ].join('\n')
}

export default {
  command: 'fakeff',
  category: 'maker',
  tags: ['maker'],
  description: `> Membuat kartu lobby Free Fire palsu dengan background acak.

*Keterangan Format:*
> \`<username>\` = nama player (maks 20 karakter), kosong = nama kamu.
> \`[lobby]\` = nomor lobby 1-30, kosong = acak.

contoh penggunaan:
> \`.fakeff Elyra\`
> \`.fakeff Elyra 5\``,
  help: '[username] [lobby 1-30]',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    if (['help', 'menu', '?'].includes(String(args[0] || '').toLowerCase())) {
      return m.reply(buildUsage(m))
    }

    const { username, lobby } = parseArgs(args, m.pushName)

    let generate
    try {
      generate = loadGenerator()
    } catch (err) {
      console.error('[FAKEFF] modul tidak tersedia:', err?.message || err)
      return m.reply('❌ Modul `fake-ff` belum terpasang. Jalankan: npm install fake-ff')
    }

    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fakeff-'))

    try {
      const res = await generate({ username, ...(lobby ? { lobby } : {}), outputDir: outDir })
      if (res?.status !== 'success' || !res?.result) {
        throw new Error(res?.message || 'Generator tidak menghasilkan gambar.')
      }

      const file = path.isAbsolute(res.result) ? res.result : path.resolve(process.cwd(), res.result)
      const png = await fs.readFile(file).catch(() => fs.readFile(path.join(outDir, path.basename(res.result))))
      if (!png.length) throw new Error('File gambar kosong.')

      await fs.rm(file, { force: true }).catch(() => {})

      return await m.reply({
        type: 'image',
        media: png,
        caption: [
          '🌷 *Fake FF Lobby*',
          '',
          `♡ Username : ${res.username || username}`,
          `♡ Lobby : ${res.lobby ?? lobby ?? '-'} / ${MAX_LOBBY}`,
          '',
          FOOTER
        ].join('\n')
      })
    } catch (err) {
      console.error('[FAKEFF] gagal:', err?.stack || err?.message || err)
      return m.reply(`❌ Gagal membuat kartu lobby: ${err?.message || 'unknown'}`)
    } finally {
      await fs.rm(outDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}