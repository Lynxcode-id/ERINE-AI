import fs from 'node:fs/promises'
import path from 'node:path'

const SCRAPE_DIR = path.resolve(process.cwd(), 'scrape')
const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default {
  command: 'listscrape',
  category: 'owner',
  tags: ['owner'],
  description: 'Menampilkan daftar scraper di folder scrape.',
  help: '',
  typing: true,
  wait: false,
  onlyOwner: true,

  async execute(m) {
    try {
      const entries = await fs.readdir(SCRAPE_DIR, {
        withFileTypes: true
      })

      const files = []

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.js')) continue

        const filePath = path.join(SCRAPE_DIR, entry.name)
        const stat = await fs.stat(filePath)

        files.push({
          name: entry.name,
          size: stat.size,
          modified: stat.mtime
        })
      }

      files.sort((a, b) => a.name.localeCompare(b.name))

      const lines = [
        '🌷 *Elyra Scrape Manager*',
        '',
        'Daftar file scraper yang tersedia.',
        '',
        '♡ Folder : scrape/',
        `♡ Total : ${files.length} file`,
        ''
      ]

      if (!files.length) {
        lines.push('Belum ada file scraper.')
      } else {
        files.forEach((file, index) => {
          lines.push(
            `*${index + 1}. ${file.name}*`,
            `› Ukuran : ${formatBytes(file.size)}`,
            `› Diubah : ${file.modified.toISOString().replace('T', ' ').slice(0, 19)} UTC`,
            ''
          )
        })
      }

      lines.push(
        `♡ Tambah : ${(m.prefix || '.')}addscrape <nama.js>`,
        `♡ Hapus : ${(m.prefix || '.')}delscrape <nama.js>`,
        '',
        FOOTER
      )

      return m.reply(lines.join('\n'))
    } catch (error) {
      console.error('[LISTSCRAPE]', error?.stack || error?.message || error)

      return m.reply([
        '☘️ *Elyra Scrape Manager*',
        '',
        'Gagal membaca folder scrape.',
        `♡ Pesan : ${error.message || 'Terjadi kesalahan.'}`,
        '',
        FOOTER
      ].join('\n'))
    }
  }
}