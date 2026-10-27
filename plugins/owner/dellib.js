
import fs from 'fs/promises'
import path from 'path'
import { parseLibName } from './addlib.js'

const ROOT = process.cwd()
const LIB_DIR = path.resolve(ROOT, 'lib')
const BACKUP_DIR = path.resolve(ROOT, 'store', 'lib-backup')
const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

const PROTECTED = new Set([
  'function.js', 'wrapper.js', 'loadPlugins.js', 'rawMessageUtils.js', 'utils.js', 'lru.js',
  'groupAndBot.js', 'groupDetection.js', 'notifRestart.js', 'thumbAutoRefresh.js',
  'thumbnail.js', 'backupExclude.js', 'autoblock.js'
])

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) await walk(full, out)
    else if (e.name.endsWith('.js')) out.push(full)
  }
  return out
}

async function findUsers(name) {
  const base = name.replace(/\.js$/, '')
  const pattern = new RegExp(`['"\`][^'"\`]*(?:lib/|\\./)${base.replace(/[$.]/g, '\\$&')}(?:\\.js)?['"\`]`)
  const roots = ['plugins', 'lib', 'src'].map(d => path.join(ROOT, d))
  const files = [...(await Promise.all(roots.map(r => walk(r)))).flat(),
    path.join(ROOT, 'handler.js'), path.join(ROOT, 'index.js')]

  const users = []
  for (const file of files) {
    if (path.basename(file) === name && path.dirname(file) === LIB_DIR) continue
    const code = await fs.readFile(file, 'utf8').catch(() => null)
    if (code && pattern.test(code)) users.push(path.relative(ROOT, file))
  }
  return users
}

export default {
  command: 'dellib',
  alias: ['dellibs', 'removelib'],
  category: 'owner',
  description: `> Menghapus file dari folder lib (otomatis menambah .js). Dicadangkan dulu ke store/lib-backup dan dicek apakah masih dipakai plugin lain.

*Keterangan Format:*
> \`<nama>\` = nama file lib.
> \`force\` = opsional, hapus walau masih dipakai file lain.

contoh penggunaan:
> \`.dellib uploadImage\`
> \`.dellib uploadImage force\``,
  help: '<nama> [force]',
  onlyOwner: true,

  async execute(m, { args }) {
    const p = `${shown(m)}${m.command}`
    const name = parseLibName(args[0])

    if (!args[0]) {
      return m.reply([
        '🌷 *Delete Lib*',
        '',
        'Hapus file dari folder lib',
        '(otomatis menambah .js).',
        '',
        `♡ ${p} <nama>`,
        `♡ ${p} <nama> force`,
        '',
        FOOTER
      ].join('\n'))
    }
    if (!name) return m.reply('Nama file tidak valid.')

    if (PROTECTED.has(name)) {
      return m.reply(`Lib \`${name}\` adalah lib inti bot dan dilindungi dari penghapusan.`)
    }

    const target = path.join(LIB_DIR, name)
    const exists = await fs.access(target).then(() => true).catch(() => false)
    if (!exists) return m.reply(`File \`lib/${name}\` tidak ditemukan.`)

    const force = args.slice(1).some(a => a.toLowerCase() === 'force')
    const users = await findUsers(name)

    if (users.length && !force) {
      const list = users.slice(0, 8).map(u => `> ${u}`).join('\n')
      return m.reply([
        `⚠️ \`lib/${name}\` masih dipakai ${users.length} file:`,
        list,
        users.length > 8 ? `…dan ${users.length - 8} lainnya` : '',
        '',
        `Kalau tetap mau dihapus: ${p} ${name.replace(/\.js$/, '')} force`
      ].filter(Boolean).join('\n'))
    }

    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true })
      await fs.copyFile(target, path.join(BACKUP_DIR, name))
      await fs.unlink(target)
    } catch (err) {
      return m.reply(`Gagal menghapus lib: ${err.message}`)
    }

    return m.reply([
      '🗑️ Lib dihapus',
      `♡ File : lib/${name}`,
      `♡ Cadangan : store/lib-backup/${name}`,
      users.length ? `♡ Masih diimport : ${users.length} file (jadi error sampai lib dipulihkan)` : '',
      '',
      `Ketik ${shown(m)}restart supaya perubahan berlaku.`
    ].filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n'))
  }
}