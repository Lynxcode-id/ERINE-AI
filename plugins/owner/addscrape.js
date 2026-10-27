import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const SCRAPE_DIR = path.resolve(process.cwd(), 'scrape')
const BACKUP_DIR = path.resolve(process.cwd(), 'store', 'scrape-backup')
const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

function parseScrapeName(raw) {
  let name = String(raw || '').trim()

  if (!name) return null
  if (!name.toLowerCase().endsWith('.js')) name += '.js'

  if (!/^[\w$][\w$.-]*\.js$/i.test(name) || name.includes('..')) {
    return null
  }

  return name
}

async function readSource(m, inline) {
  const quoted = m.quoted
  let source = null

  if (quoted) {
    const type = String(
      quoted.mediaType || quoted.type || ''
    ).toLowerCase()

    const mime = String(
      quoted.mimetype || quoted.mime || ''
    ).toLowerCase()

    const isDocument =
      type === 'document' ||
      type === 'documentmessage' ||
      mime.includes('javascript') ||
      mime.includes('text/plain')

    if (isDocument && typeof quoted.download === 'function') {
      const data = await quoted.download()

      if (data) {
        source = Buffer.from(data).toString('utf8')
      }
    } else if (!quoted.isMedia && typeof quoted.text === 'string') {
      source = quoted.text
    }
  }

  if (!source?.trim()) {
    source = String(inline || '').trim()
  }

  if (!source.trim()) return null

  return source
    .replace(/^\s*```(?:javascript|js|mjs|node)?\s*\r?\n/i, '')
    .replace(/\r?\n```\s*$/, '')
    .replace(/^\uFEFF/, '')
    .trim()
}

async function checkSyntax(source) {
  const tempFile = path.join(
    os.tmpdir(),
    `elyra-scrape-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`
  )

  await fs.writeFile(tempFile, source, 'utf8')

  try {
    await execFileAsync(
      process.execPath,
      ['--check', tempFile],
      { timeout: 15000 }
    )

    return null
  } catch (error) {
    const details = String(
      error.stderr || error.message || 'Syntax error'
    )
      .split(tempFile)
      .join('scraper.js')
      .split('\n')
      .filter(line =>
        line.trim() &&
        !/^\s+at /.test(line) &&
        !/^Node\.js v/.test(line)
      )
      .slice(0, 8)
      .join('\n')

    return details || 'JavaScript syntax tidak valid.'
  } finally {
    await fs.rm(tempFile, { force: true }).catch(() => {})
  }
}

async function listFiles() {
  return fs.readdir(SCRAPE_DIR, { withFileTypes: true })
    .then(entries =>
      entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
        .map(entry => entry.name)
        .sort()
    )
    .catch(error => {
      if (error.code === 'ENOENT') return []
      throw error
    })
}

export default {
  command: 'addscrape',
  category: 'owner',
  tags: ['owner'],
  description: 'Menambahkan atau memperbarui file scraper JavaScript.',
  help: '<nama.js> (reply kode/dokumen)',
  typing: true,
  wait: false,
  onlyOwner: true,

  async execute(m, { args = [] }) {
    const name = parseScrapeName(args[0])
    const prefix = shown(m)

    if (!name) {
      return m.reply([
        '🌷 *Elyra Scrape Manager*',
        '',
        'Simpan source JavaScript ke folder scrape.',
        '',
        `♡ Format : ${prefix}${m.command} <nama.js>`,
        '♡ Source : Reply kode atau dokumen JavaScript.',
        '',
        `♡ Contoh : ${prefix}${m.command} tiktok.js`,
        '',
        FOOTER
      ].join('\n'))
    }

    let source

    try {
      source = await readSource(m, args.slice(1).join(' '))
    } catch (error) {
      return m.reply(
        `☘️ Gagal membaca source scraper.\n♡ Pesan : ${error.message}`
      )
    }

    if (!source) {
      return m.reply([
        '🌷 *Elyra Scrape Manager*',
        '',
        'Reply pesan teks atau dokumen yang berisi source JavaScript.',
        '',
        `♡ Contoh : ${prefix}${m.command} tiktok.js`,
        '',
        FOOTER
      ].join('\n'))
    }

    const syntaxError = await checkSyntax(source)

    if (syntaxError) {
      return m.reply([
        '☘️ *Syntax Error*',
        '',
        'Scraper tidak disimpan.',
        '',
        syntaxError,
        '',
        FOOTER
      ].join('\n'))
    }

    const target = path.join(SCRAPE_DIR, name)
    const existed = await fs.access(target)
      .then(() => true)
      .catch(() => false)

    let backupPath = null

    try {
      await fs.mkdir(SCRAPE_DIR, { recursive: true })

      if (existed) {
        const stat = await fs.stat(target)

        if (!stat.isFile()) {
          return m.reply('Target bukan file biasa. Operasi dibatalkan.')
        }

        await fs.mkdir(BACKUP_DIR, { recursive: true })

        backupPath = path.join(
          BACKUP_DIR,
          `${Date.now()}-${name}`
        )

        await fs.copyFile(target, backupPath)
      }

      await fs.writeFile(target, source, 'utf8')
    } catch (error) {
      console.error('[ADDSCRAPE]', error?.stack || error?.message || error)

      return m.reply([
        '☘️ Gagal menyimpan scraper.',
        `♡ Pesan : ${error.message || 'Terjadi kesalahan.'}`,
        '',
        FOOTER
      ].join('\n'))
    }

    const files = await listFiles().catch(() => [])

    return m.reply([
      `💐 *${existed ? 'Scraper Diperbarui' : 'Scraper Ditambahkan'}*`,
      '',
      `♡ File : scrape/${name}`,
      `♡ Ukuran : ${(Buffer.byteLength(source) / 1024).toFixed(1)} KB`,
      `♡ Total scraper : ${files.length}`,
      backupPath
        ? `♡ Backup : ${path.relative(process.cwd(), backupPath)}`
        : '',
      '',
      existed
        ? 'Versi lama sudah dicadangkan. Restart bot jika modul sebelumnya sudah ter-cache.'
        : 'Source berhasil disimpan.',
      '',
      FOOTER
    ].filter(Boolean).join('\n'))
  }
}