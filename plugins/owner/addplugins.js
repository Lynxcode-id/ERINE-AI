
import fs from 'fs/promises'
import path from 'path'
import { reloadGlobalPlugins } from '../../lib/loadPlugins.js'

const PLUGINS_ROOT = path.resolve(process.cwd(), 'plugins')

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

export function parseTarget(args) {
  const [rawTags = '', rawFile = ''] = args.join(' ').split('|').map(s => s.trim())
  const tags = rawTags.toLowerCase()
  let file = rawFile
  if (file && !file.toLowerCase().endsWith('.js')) file += '.js'

  if (!/^[a-z0-9_-]+$/.test(tags)) return null
  if (!/^[\w$][\w$.-]*\.js$/i.test(file) || file.includes('..')) return null

  const full = path.join(PLUGINS_ROOT, tags, file)
  if (path.relative(PLUGINS_ROOT, full).startsWith('..')) return null

  return { tags, file, full }
}

export default {
  command: 'addplugins',
  alias: ['addplugin', 'newplugin'],
  category: 'owner',
  description: `> Simpan source plugin ke folder plugins (otomatis menimpa kalau file sudah ada) lalu reload.

*Keterangan Format:*
> \`<tags>\` = nama folder/kategori, dibuat otomatis kalau belum ada.
> \`<nama.js>\` = nama file plugin.
> (reply text/document) = source code plugin.

contoh penggunaan:
> \`.addplugins downloader|tiktok.js\` (reply source plugin)`,
  help: '<tags>|<nama.js> (reply text/document)',
  onlyOwner: true,

  async execute(m, { args }) {
    const usage = `*Format:*\n> Reply kode plugin lalu ketik:\n> ${m.prefix}${m.command} <tags>|<nama.js>\n\nContoh: ${m.prefix}${m.command} downloader|tiktok.js`

    const target = parseTarget(args)
    if (!target) {
      return m.reply(`Format salah. Tags hanya huruf/angka/_/-, nama file harus berakhiran .js\n\n${usage}`)
    }

    let source
    try {
      source = await readSource(m)
    } catch (err) {
      return m.reply(`Gagal membaca source plugin: ${err.message}\n\n${usage}`)
    }
    if (!source?.trim()) {
      return m.reply(`Reply pesan teks / document berisi source plugin dulu.\n\n${usage}`)
    }

    const existed = await fs.access(target.full).then(() => true).catch(() => false)

    try {
      await fs.mkdir(path.dirname(target.full), { recursive: true })
      await fs.writeFile(target.full, source, 'utf8')
    } catch (err) {
      return m.reply(`Gagal menyimpan plugin: ${err.message}`)
    }

    const lines = [
      `${existed ? '♻️ Plugin ditimpa' : '✅ Plugin baru disimpan'}`,
      `› Folder : plugins/${target.tags}`,
      `› File : ${target.file}`
    ]

    try {
      const res = await reloadGlobalPlugins(PLUGINS_ROOT)
      lines.push(`› Loaded : ${res.loaded}`)

      const myErrors = (res.errorList || []).filter(e => e.folder === target.tags && e.file === target.file)
      const myDups = (res.duplicates || []).filter(d =>
        (d.a.folder === target.tags && d.a.file === target.file) ||
        (d.b.folder === target.tags && d.b.file === target.file))

      for (const e of myErrors) lines.push('', `❌ Plugin ini error:\n${e.reason}`)
      for (const d of myDups) {
        lines.push('', `⚠️ Duplikat dengan ${d.a.folder}/${d.a.file} ⚔️ ${d.b.folder}/${d.b.file}\n› Keys: ${d.keys.join(', ')}`)
      }

      if (myErrors.length || myDups.length) {
        lines.push('', `Perbaiki kodenya lalu kirim lagi dengan ${m.prefix}${m.command} ${target.tags}|${target.file}`)
      } else if (res.errors) {
        lines.push('', `ℹ️ Ada ${res.errors} plugin lain yang error, cek ${m.prefix}reload.`)
      }
    } catch (err) {
      lines.push('', `❌ Reload gagal: ${err.message}`)
    }

    return m.reply(lines.join('\n'))
  }
}
