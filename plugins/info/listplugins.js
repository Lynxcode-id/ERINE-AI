import path from 'path'

function uniquePlugins(plugins) {
  const seen = new Set()
  const list = []
  for (const plugin of plugins.values()) {
    if (!plugin || seen.has(plugin)) continue
    seen.add(plugin)
    list.push(plugin)
  }
  return list
}

const toList = v => (Array.isArray(v) ? v : v ? [v] : []).map(x => String(x).trim()).filter(Boolean)
const fileOf = plugin => (plugin.source ? path.posix.basename(plugin.source) : '?')

export default {
  command: 'listplugins',
  alias: ['listplugin', 'daftarplugin', 'lsplugin'],
  category: 'info',
  tags: ['info'],
  description: `> Menampilkan semua plugin yang sedang termuat, dikelompokkan per folder.

*Keterangan Format:*
> \`[folder]\` = opsional, tampilkan satu folder saja beserta alias dan help-nya.

contoh penggunaan:
> \`.listplugins\`
> \`.listplugins downloader\``,
  help: '[folder]',
  onlyOwner: true,
  typing: true,

  async execute(m, { args, plugins }) {
    const filter = String(args[0] || '').toLowerCase().trim()
    const all = uniquePlugins(plugins)

    const groups = new Map()
    for (const plugin of all) {
      const folder = String(plugin.category || 'root').toLowerCase()
      if (!groups.has(folder)) groups.set(folder, [])
      groups.get(folder).push(plugin)
    }
    for (const list of groups.values()) {
      list.sort((a, b) => fileOf(a).localeCompare(fileOf(b)))
    }
    const folders = [...groups.keys()].sort()

    // detail satu folder
    if (filter) {
      const list = groups.get(filter)
      if (!list) {
        return m.reply(`Folder \`${filter}\` tidak ditemukan.\n\n*Folder tersedia:*\n${folders.map(f => `> ${f}`).join('\n')}`)
      }

      const lines = [`📁 *plugins/${filter}* (${list.length} plugin)`, '']
      list.forEach((p, i) => {
        const alias = toList(p.alias ?? p.aliases)
        lines.push(
          `*${i + 1}. ${fileOf(p)}*${p.hidden ? ' _(hidden)_' : ''}`,
          `   ◦ *Command:* ${p.command}`,
          `   ◦ *Alias:* ${alias.length ? alias.join(', ') : '-'}`,
          `   ◦ *Help:* ${p.help || '-'}`,
          ''
        )
      })
      return m.reply(lines.join('\n').trim())
    }

    // ringkasan semua folder
    const lines = [`📂 *DAFTAR PLUGIN*`, `› Total: ${all.length} plugin di ${folders.length} folder`, '']
    for (const folder of folders) {
      const list = groups.get(folder)
      lines.push(`📁 *${folder}* (${list.length})`)
      for (const p of list) lines.push(`> ${fileOf(p)} — ${p.command}`)
      lines.push('')
    }
    lines.push(`_Detail satu folder: ${m.prefix}${m.command} <folder>_`)

    return m.reply(lines.join('\n').trim())
  }
}