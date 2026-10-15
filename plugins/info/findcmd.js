const MAX_RESULTS = 15

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

export default {
  command: 'findcmd',
  alias: ['caricmd', 'searchcmd', 'whereis'],
  category: 'info',
  tags: ['info'],
  description: `> Mencari lokasi file plugin berdasarkan nama command atau alias.

*Keterangan Format:*
> \`<nama_cmd>\` = command / alias (boleh sebagian).

contoh penggunaan:
> \`.findcmd tiktok\``,
  help: '<nama_cmd>',
  onlyOwner: true,
  typing: true,

  async execute(m, { sock, args, plugins }) {
    const keyword = args.join(' ').toLowerCase().trim()

    if (!keyword) {
      return m.reply(`⚠️ *Nama command-nya apa?*\n\n📌 *Cara pakai:*\n> ${m.prefix}${m.command} <nama_cmd>\n\n*Contoh:*\n> ${m.prefix}${m.command} tiktok`)
    }

    await sock.sendReact(m.chat, '⏳', m.id).catch(() => {})

    const found = []
    for (const plugin of uniquePlugins(plugins)) {
      const names = [plugin.command, ...toList(plugin.alias ?? plugin.aliases)].map(n => String(n).toLowerCase())
      const exact = names.includes(keyword)
      if (!exact && !names.some(n => n.includes(keyword))) continue
      found.push({ plugin, exact })
    }

    if (!found.length) {
      await sock.sendReact(m.chat, '❌', m.id).catch(() => {})
      return m.reply(`❌ Plugin yang memuat command *${keyword}* tidak ditemukan.`)
    }

    found.sort((a, b) => Number(b.exact) - Number(a.exact))

    const lines = [`🔍 *HASIL PENCARIAN COMMAND: ${keyword}*`, `› Ditemukan: ${found.length} plugin`, '']
    found.slice(0, MAX_RESULTS).forEach(({ plugin }, i) => {
      const alias = toList(plugin.alias ?? plugin.aliases)
      const tags = toList(plugin.tags)
      lines.push(
        `*${i + 1}. ${plugin.source || '(lokasi tidak diketahui)'}*`,
        `   ◦ *Command:* ${plugin.command}`,
        `   ◦ *Alias:* ${alias.length ? alias.join(', ') : '-'}`,
        `   ◦ *Kategori:* ${plugin.category || '-'}`,
        `   ◦ *Tags:* ${tags.length ? tags.join(', ') : '-'}`,
        `   ◦ *Help:* ${plugin.help || '-'}`,
        ''
      )
    })
    if (found.length > MAX_RESULTS) lines.push(`_Menampilkan ${MAX_RESULTS} dari ${found.length} hasil, persempit kata kunci._`)

    await m.reply(lines.join('\n').trim())
    await sock.sendReact(m.chat, '✅', m.id).catch(() => {})
  }
}