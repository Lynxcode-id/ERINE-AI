
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'

const LIB_DIR = path.resolve(process.cwd(), 'lib')
const BACKUP_DIR = path.resolve(process.cwd(), 'store', 'lib-backup')
const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

export function parseLibName(raw) {
  let name = String(raw || '').trim()
  if (!name) return null
  if (!name.toLowerCase().endsWith('.js')) name += '.js'
  if (!/^[\w$][\w$.-]*\.js$/i.test(name) || name.includes('..')) return null
  return name
}

async function readSource(m) {
  const quoted = m.quoted
  if (!quoted) return null

  let text = null
  if (quoted.mediaType === 'document' || quoted.type === 'documentMessage') {
    const buffer = await quoted.download()
    text = buffer ? Buffer.from(buffer).toString('utf8') : null
  } else if (!quoted.isMedia && quoted.text) {
    text = quoted.text
  }
  if (!text) return null

  return text
    .replace(/^\s*```[a-z]*\r?\n/i, '')
    .replace(/\r?\n```\s*$/, '')
    .replace(/^\uFEFF/, '')
}

async function checkSyntax(code) {
  const tmp = path.join(os.tmpdir(), `addlib-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`)
  await fs.writeFile(tmp, code)

  try {
    await new Promise((resolve, reject) => {
      execFile(process.execPath, ['--check', tmp], { timeout: 15000 }, (err, _out, stderr) => {
        if (err) reject(new Error(String(stderr || err.message)))
        else resolve()
      })
    })
    return null
  } catch (err) {
    return err.message.split(tmp).join('lib').split('\n').filter(l => l.trim() && !/^\s+at /.test(l) && !/^Node\.js v/.test(l)).slice(0, 6).join('\n')
  } finally {
    fs.rm(tmp, { force: true }).catch(() => {})
  }
}

function buildUsage(m, files) {
  const p = `${shown(m)}${m.command}`
  return [
    '🌷 *Add Lib*',
    '',
    'Simpan atau timpa file di folder lib',
    '(otomatis menambah .js).',
    '',
    `♡ ${p} <nama>`,
    `♡ ${p} uploadImage`,
    '',
    '(reply kode / document)',
    ...(files.length ? ['', `♡ Lib saat ini (${files.length}) :`, files.join(', ')] : []),
    '',
    FOOTER
  ].join('\n')
}

export default {
  command: 'addlib',
  alias: ['addlibs', 'newlib'],
  category: 'owner',
  description: `> Menyimpan source ke folder lib. Kalau nama tidak diakhiri .js, otomatis ditambah. File lama ditimpa (dengan cadangan) dan syntax dicek dulu.

*Keterangan Format:*
> \`<nama>\` = nama file lib, tanpa/ dengan .js.
> (reply text/document) = source code lib.

contoh penggunaan:
> \`.addlib uploadImage\` (reply kode)`,
  help: '<nama> (reply text/document)',
  onlyOwner: true,

  async execute(m, { args }) {
    const files = await fs.readdir(LIB_DIR).then(l => l.filter(f => f.endsWith('.js')).sort()).catch(() => [])

    const name = parseLibName(args[0])
    if (!args[0]) return m.reply(buildUsage(m, files))
    if (!name) return m.reply('Nama file tidak valid. Pakai huruf/angka/_/-/. saja, tanpa folder.')

    let source
    try {
      source = await readSource(m)
    } catch (err) {
      return m.reply(`Gagal membaca source: ${err.message}`)
    }
    if (!source?.trim()) return m.reply(buildUsage(m, files))

    const syntaxError = await checkSyntax(source)
    if (syntaxError) {
      return m.reply(`❌ Syntax error, lib tidak disimpan:\n\n${syntaxError}\n\nPerbaiki lalu kirim lagi dengan ${shown(m)}${m.command} ${name}`)
    }

    const target = path.join(LIB_DIR, name)
    const existed = await fs.access(target).then(() => true).catch(() => false)

    try {
      await fs.mkdir(LIB_DIR, { recursive: true })
      if (existed) {
        await fs.mkdir(BACKUP_DIR, { recursive: true })
        await fs.copyFile(target, path.join(BACKUP_DIR, name))
      }
      await fs.writeFile(target, source, 'utf8')
    } catch (err) {
      return m.reply(`Gagal menyimpan lib: ${err.message}`)
    }

    return m.reply([
      existed ? '♻️ Lib ditimpa' : '✅ Lib baru disimpan',
      `♡ File : lib/${name}`,
      `♡ Ukuran : ${(Buffer.byteLength(source) / 1024).toFixed(1)} KB`,
      existed ? '♡ Cadangan lama : store/lib-backup/' + name : '',
      '',
      existed
        ? `Lib lama sudah ter-cache Node, ketik ${shown(m)}restart supaya versi baru terbaca.`
        : `Langsung bisa dipakai plugin lewat import '../../lib/${name}'.`
    ].filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n'))
  }
}