import fs from 'node:fs/promises'
import path from 'node:path'

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

export default {
  command: 'delscrape',
  category: 'owner',
  tags: ['owner'],
  description: 'Menghapus file scraper dengan membuat backup terlebih dahulu.',
  help: '<nama.js>',
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
        'Hapus scraper dari folder scrape.',
        '',
        `♡ Format : ${prefix}${m.command} <nama.js>`,
        `♡ Contoh : ${prefix}${m.command} tiktok.js`,
        '',
        FOOTER
      ].join('\n'))
    }

    const target = path.join(SCRAPE_DIR, name)

    try {
      const stat = await fs.stat(target).catch(error => {
        if (error.code === 'ENOENT') return null
        throw error
      })

      if (!stat) {
        return m.reply(`☘️ File scrape/${name} tidak ditemukan.`)
      }

      if (!stat.isFile()) {
        return m.reply('Target bukan file biasa. Operasi dibatalkan.')
      }

      await fs.mkdir(BACKUP_DIR, { recursive: true })

      const backup = path.join(
        BACKUP_DIR,
        `${Date.now()}-${name}`
      )

      await fs.copyFile(target, backup)
      await fs.unlink(target)

      const remaining = await fs.readdir(SCRAPE_DIR)
        .then(entries =>
          entries.filter(file => file.endsWith('.js')).length
        )

      return m.reply([
        '💐 *Scraper Dihapus*',
        '',
        `♡ File : scrape/${name}`,
        `♡ Backup : ${path.relative(process.cwd(), backup)}`,
        `♡ Sisa scraper : ${remaining}`,
        '',
        'File cadangan tetap tersedia jika diperlukan.',
        'Restart bot jika modul tersebut masih ter-cache atau digunakan plugin lain.',
        '',
        FOOTER
      ].join('\n'))
    } catch (error) {
      console.error('[DELSCRAPE]', error?.stack || error?.message || error)

      return m.reply([
        '☘️ *Elyra Scrape Manager*',
        '',
        'Gagal menghapus scraper.',
        `♡ Pesan : ${error.message || 'Terjadi kesalahan.'}`,
        '',
        FOOTER
      ].join('\n'))
    }
  }
}