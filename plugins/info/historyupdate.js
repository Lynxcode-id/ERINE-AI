import fs from 'node:fs'
import path from 'node:path'

const FOOTER = '© ELYRA-AI'
const MAX_DAYS = 10
const MAX_MESSAGE_LENGTH = 60000
const TIME_ZONE = 'Asia/Makassar'

const ROOTS = [
  { dir: 'plugins', prefix: '' },
  { dir: 'scrape', prefix: 'scrape/' },
  { dir: 'lib', prefix: 'lib/' },
  { dir: 'src', prefix: 'src/' }
]

const SKIP = new Set([
  'node_modules',
  'store',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next'
])

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

function getDateKey(timestamp) {
  const parts = dateKeyFormatter.formatToParts(new Date(timestamp))
  const values = Object.fromEntries(
    parts.map(part => [part.type, part.value])
  )

  return `${values.year}-${values.month}-${values.day}`
}

function formatDate(timestamp) {
  return dateFormatter.format(new Date(timestamp))
}

function formatTime(timestamp) {
  return timeFormatter
    .format(new Date(timestamp))
    .replace(':', '.')
}

function walk(dir, base, prefix, output = [], visited = new Set()) {
  let entries

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return output
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') || SKIP.has(entry.name)) {
      continue
    }

    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      walk(fullPath, base, prefix, output, visited)
      continue
    }

    if (
      !entry.isFile() ||
      !entry.name.toLowerCase().endsWith('.js')
    ) {
      continue
    }

    const normalizedPath = path.resolve(fullPath)

    if (visited.has(normalizedPath)) continue
    visited.add(normalizedPath)

    try {
      const stats = fs.statSync(normalizedPath)

      if (!stats.isFile()) continue

      const relativePath = path
        .relative(base, normalizedPath)
        .split(path.sep)
        .join('/')

      output.push({
        path: `${prefix}${relativePath}`,
        mtime: stats.mtimeMs
      })
    } catch (error) {
      console.error(
        '[LISTUPDATE FILE]',
        normalizedPath,
        error?.message || error
      )
    }
  }

  return output
}

function collectFiles() {
  const cwd = process.cwd()
  const visited = new Set()
  const files = []

  for (const root of ROOTS) {
    const base = path.resolve(cwd, root.dir)

    try {
      if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) {
        continue
      }
    } catch {
      continue
    }

    walk(base, base, root.prefix, files, visited)
  }

  return files.sort((a, b) => b.mtime - a.mtime)
}

function groupFilesByDay(files) {
  const grouped = new Map()

  for (const file of files) {
    const key = getDateKey(file.mtime)

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        label: formatDate(file.mtime),
        files: []
      })
    }

    grouped.get(key).files.push(file)
  }

  return [...grouped.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .slice(0, MAX_DAYS)
}

function buildMessage(groups, truncated = false) {
  const totalFiles = groups.reduce(
    (total, group) => total + group.files.length,
    0
  )

  const lines = [
    '୨ৎ *ELYRA UPDATE HISTORY*',
    '',
    `› Total: ${totalFiles} file`,
    `› Riwayat: ${groups.length} hari`,
    '› Zona waktu: WITA',
    '',
    'Pembaruan file berdasarkan waktu modifikasi:',
    ''
  ]

  for (const group of groups) {
    lines.push(
      `📅 *${group.label}*`,
      ''
    )

    for (const file of group.files) {
      lines.push(
        `♡ \`${file.path}\` _(${formatTime(file.mtime)} WITA)_`
      )
    }

    lines.push('')
  }

  if (truncated) {
    lines.push(
      '_Sebagian riwayat lama disembunyikan agar semua data tetap dalam satu pesan._',
      ''
    )
  }

  lines.push(FOOTER)

  return lines.join('\n')
}

function fitSingleMessage(groups) {
  let message = buildMessage(groups)

  if (message.length <= MAX_MESSAGE_LENGTH) {
    return message
  }

  while (message.length > MAX_MESSAGE_LENGTH) {
    const lastGroup = groups[groups.length - 1]

    if (!lastGroup) break

    if (lastGroup.files.length > 0) {
      lastGroup.files.pop()
    }

    if (lastGroup.files.length === 0) {
      groups.pop()
    }

    message = buildMessage(groups, true)
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return [
      '୨ৎ *ELYRA UPDATE HISTORY*',
      '',
      '› Daftar riwayat terlalu panjang untuk satu pesan.',
      '› Coba kurangi jumlah hari yang ditampilkan.',
      '',
      FOOTER
    ].join('\n')
  }

  return message
}

export default {
  command: 'listupdate',
  aliases: [
    'updatehistory',
    'riwayatupdate'
  ],
  category: 'info',
  tags: ['info'],
  description: 'Menampilkan riwayat perubahan file JavaScript berdasarkan hari.',
  help: 'listupdate',
  onlyOwner: true,
  limit: false,

  async execute(m) {
    try {
      const files = collectFiles()

      if (!files.length) {
        return m.reply([
          '୨ৎ *ELYRA UPDATE HISTORY*',
          '',
          '› Belum ditemukan file JavaScript.',
          '› Periksa direktori project.',
          '',
          FOOTER
        ].join('\n'))
      }

      const groups = groupFilesByDay(files)

      if (!groups.length) {
        return m.reply([
          '୨ৎ *ELYRA UPDATE HISTORY*',
          '',
          '› Tidak ada riwayat pembaruan yang ditemukan.',
          '',
          FOOTER
        ].join('\n'))
      }

      const message = fitSingleMessage(groups)

      return m.reply(message)
    } catch (error) {
      console.error(
        '[LISTUPDATE]',
        error?.stack || error?.message || error
      )

      return m.reply([
        '୨ৎ *ELYRA UPDATE HISTORY*',
        '',
        '› Gagal memuat riwayat pembaruan.',
        '› Periksa akses direktori project.',
        '',
        FOOTER
      ].join('\n'))
    }
  }
}