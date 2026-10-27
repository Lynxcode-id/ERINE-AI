
import fs from 'fs/promises'
import path from 'path'
import { reloadGlobalPlugins } from '../../lib/loadPlugins.js'
import { parseTarget } from './addplugins.js'

const PLUGINS_ROOT = path.resolve(process.cwd(), 'plugins')

const PROTECTED_FILES = ['owner/addplugins.js', 'owner/delplugins.js', 'owner/reload.js']

export default {
  command: 'delplugins',
  alias: ['delplugin', 'deleteplugin', 'removeplugin'],
  category: 'owner',
  description: `> Hapus file plugin dari folder plugins lalu reload.

*Keterangan Format:*
> \`<tags>\` = nama folder/kategori plugin.
> \`<nama.js>\` = nama file plugin.

contoh penggunaan:
> \`.delplugins downloader|tiktok.js\``,
  help: '<tags>|<nama.js>',
  onlyOwner: true,

  async execute(m, { args }) {
    const target = parseTarget(args)
    if (!target) {
      return m.reply(`Format salah.\n\n*Format:*\n> ${m.prefix}${m.command} <tags>|<nama.js>\n\nContoh: ${m.prefix}${m.command} downloader|tiktok.js`)
    }

    const rel = `${target.tags}/${target.file}`
    if (PROTECTED_FILES.includes(rel)) {
      return m.reply(`Plugin \`${rel}\` dilindungi dan tidak bisa dihapus lewat bot.`)
    }

    const exists = await fs.access(target.full).then(() => true).catch(() => false)
    if (!exists) return m.reply(`File \`plugins/${rel}\` tidak ditemukan.`)

    try {
      await fs.unlink(target.full)
    } catch (err) {
      return m.reply(`Gagal menghapus plugin: ${err.message}`)
    }

    const lines = ['🗑️ Plugin dihapus', `› Folder : plugins/${target.tags}`, `› File : ${target.file}`]

    try {
      const left = await fs.readdir(path.dirname(target.full))
      if (!left.length) {
        await fs.rmdir(path.dirname(target.full))
        lines.push(`› Folder \`${target.tags}\` kosong, ikut dihapus`)
      }
    } catch {}

    try {
      const res = await reloadGlobalPlugins(PLUGINS_ROOT)
      lines.push(`› Loaded : ${res.loaded}`)
      if (res.errors) lines.push('', `ℹ️ Ada ${res.errors} plugin yang error, cek ${m.prefix}reload.`)
    } catch (err) {
      lines.push('', `❌ Reload gagal: ${err.message}`)
    }

    return m.reply(lines.join('\n'))
  }
}
