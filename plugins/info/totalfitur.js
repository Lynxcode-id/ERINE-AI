
import { CATEGORY_ALIASES, groupByCategory, normalizeTag, uniquePlugins } from '../../lib/pluginTags.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

const toList = v => (Array.isArray(v) ? v : v ? [v] : []).map(x => String(x).trim()).filter(Boolean)
const flag = (p, ...names) => names.some(n => p[n])
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0)

function collect(plugins) {
  const all = uniquePlugins(plugins)
  return { all, groups: groupByCategory(all, { includeHidden: true }) }
}

function buildSummary(m, plugins) {
  const { all, groups } = collect(plugins)

  const aliasTotal = all.reduce((n, p) => n + toList(p.alias ?? p.aliases).length, 0)
  const hidden = all.filter(p => p.hidden).length
  const count = (...names) => all.filter(p => flag(p, ...names)).length

  const ranked = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  const widest = Math.max(...ranked.map(([, list]) => list.length), 1)

  const lines = [
    '🌷 *Total Fitur*',
    '',
    'Ringkasan fitur ERINE-STARS',
    'yang sedang termuat.',
    '',
    `♡ Total fitur : ${all.length}`,
    `♡ Total alias : ${aliasTotal}`,
    `♡ Total trigger : ${all.length + aliasTotal} (command + alias)`,
    `♡ Tampil di menu : ${all.length - hidden}`,
    `♡ Tersembunyi : ${hidden}`,
    `♡ Kategori / tags : ${groups.size}`,
    '',
    '🌸 *Hak Akses*',
    `♡ Khusus owner : ${count('onlyOwner', 'ownerOnly')}`,
    `♡ Khusus grup : ${count('onlyGroup', 'groupOnly')}`,
    `♡ Khusus private : ${count('onlyPrivate', 'privateOnly')}`,
    `♡ Khusus admin : ${count('onlyAdmin', 'adminOnly')}`,
    `♡ Bot harus admin : ${count('onlyBotAdmin', 'botAdminOnly')}`,
    '',
    '🌸 *Per Kategori / Tags*'
  ]

  ranked.forEach(([name, list], i) => {
    const bar = '▰'.repeat(Math.max(1, Math.round((list.length / widest) * 8)))
    const hid = list.filter(p => p.hidden).length
    lines.push(`${i + 1}. *${name}* — ${list.length} (${pct(list.length, all.length)}%) ${bar}${hid ? ` _${hid} hidden_` : ''}`)
  })

  lines.push(
    '',
    '_Plugin dengan lebih dari satu tag dihitung di tiap tag-nya._',
    '',
    `♡ ${shown(m)}${m.command} <nama tag> untuk lihat isinya`,
    '',
    FOOTER
  )

  return lines.join('\n')
}

function buildDetail(m, plugins, tag) {
  const { all, groups } = collect(plugins)
  const key = CATEGORY_ALIASES.get(tag) || tag
  const list = groups.get(key)

  if (!list) {
    const names = [...groups.keys()].sort().map(k => `> ${k}`).join('\n')
    return `Tag \`${tag}\` tidak ditemukan.\n\n*Tag tersedia:*\n${names}`
  }

  const flags = (p) => [
    flag(p, 'onlyOwner', 'ownerOnly') ? '🔒' : '',
    flag(p, 'onlyGroup', 'groupOnly') ? '👥' : '',
    p.hidden ? '🙈' : ''
  ].join('')

  const lines = [
    `🌷 *Tag ${key}*`,
    '',
    `♡ Total fitur : ${list.length}`,
    `♡ Porsi : ${pct(list.length, all.length)}% dari ${all.length} fitur`,
    `♡ Total alias : ${list.reduce((n, p) => n + toList(p.alias ?? p.aliases).length, 0)}`,
    ''
  ]

  list.forEach((p, i) => {
    const alias = toList(p.alias ?? p.aliases)
    lines.push(`${i + 1}. ${p.command}${flags(p) ? ` ${flags(p)}` : ''}${alias.length ? ` _(${alias.length} alias)_` : ''}`)
  })

  lines.push('', '🔒 owner  👥 grup  🙈 hidden', '', FOOTER)
  return lines.join('\n')
}

export default {
  command: 'totalfitur',
  alias: ['totalplugin', 'cekfitur', 'statfitur', 'totalcmd'],
  category: 'info',
  tags: ['info'],
  description: `> Menampilkan total fitur, alias, hak akses, dan jumlah fitur di tiap kategori / tags.

*Keterangan Format:*
> \`[tag]\` = opsional, lihat daftar fitur dalam satu tag.

contoh penggunaan:
> \`.totalfitur\`
> \`.totalfitur downloader\``,
  help: '[tag]',
  typing: true,

  async execute(m, { args, plugins }) {
    const tag = normalizeTag(args.join(' '))
    return m.reply(tag ? buildDetail(m, plugins, tag) : buildSummary(m, plugins))
  }
}