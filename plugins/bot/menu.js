import axios from 'axios'
import zapoPkg from 'zapo-js/package.json' with { type: 'json' }
import { config } from '../../settings.js'
import { cmdId, sendList, withQuote, getMenuAudioInfo, useStarforge, convertToVoiceNote } from '../../lib/function.js'
import { getRandomThumb } from '../../db/thumbnails.js'

const zapoVersion = zapoPkg.version
const THUMB_URL = 'https://raw.githubusercontent.com/Lynxcode-id/picture/main/1792211096537.jpeg'
const MENU_URL = 'https://github.com/Lynxcode-id/ERINE-AI'
const BOT_CREATED_AT = new Date('2026-08-20T00:00:00')
const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const BT = String.fromCharCode(96)
const CODE_BLOCK = BT + BT + BT

let cachedThumbBuffer = null
const audioVnCache = new Map()

async function getMenuThumb() {
  if (cachedThumbBuffer) return cachedThumbBuffer
  try {
    const { data } = await axios.get(THUMB_URL, {
      responseType: 'arraybuffer',
      timeout: 15000
    })
    cachedThumbBuffer = Buffer.from(data)
    return cachedThumbBuffer
  } catch (err) {
    console.error('[MENU THUMB] Gagal unduh buffer thumb, pakai URL langsung:', err?.message || err)
    return THUMB_URL
  }
}

const CATEGORY_META = {
  ai: { label: 'AI' },
  downloader: { label: 'Downloader' },
  tools: { label: 'Tools' },
  grup: { label: 'Group' },
  group: { label: 'Group' },
  rpg: { label: 'RPG' },
  fun: { label: 'Fun' },
  bot: { label: 'Bot' },
  chanel: { label: 'Channel' },
  channel: { label: 'Channel' },
  konvert: { label: 'Convert' },
  search: { label: 'Search' },
  owner: { label: 'Owner' },
  jadibot: { label: 'Jadibot' }
}

const CATEGORY_ALIASES = new Map([
  ['ai', 'ai'],
  ['downloader', 'downloader'],
  ['download', 'downloader'],
  ['tools', 'tools'],
  ['tool', 'tools'],
  ['grup', 'grup'],
  ['group', 'grup'],
  ['chanel', 'chanel'],
  ['channel', 'chanel'],
  ['konvert', 'konvert'],
  ['convert', 'konvert'],
  ['owner', 'owner'],
  ['search', 'search'],
  ['rpg', 'rpg'],
  ['fun', 'fun'],
  ['bot', 'bot']
])

function getBotAge() {
  const now = new Date()
  let years = now.getFullYear() - BOT_CREATED_AT.getFullYear()
  let months = now.getMonth() - BOT_CREATED_AT.getMonth()
  let days = now.getDate() - BOT_CREATED_AT.getDate()

  if (days < 0) {
    months -= 1
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  const parts = []
  if (years > 0) parts.push(years + ' tahun')
  if (months > 0) parts.push(months + ' bulan')
  if (days > 0 || parts.length === 0) parts.push(days + ' hari')
  return parts.join(' ')
}

function buildDescription() {
  const d = BOT_CREATED_AT
  return 'ERINE AI hadir buat nemenin harimu: cepat, ringan, dan selalu siap bantu. Aktif sejak ' + d.getDate() + ' ' + BULAN_ID[d.getMonth()] + ' ' + d.getFullYear() + ', sudah online ' + getBotAge() + '.'
}

function getRuntime() {
  if (typeof Bun !== 'undefined') return 'Bun v' + Bun.version
  return 'Node v' + process.versions.node
}

function getWitaDateTime() {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date())
}

function getUserRole(m) {
  if (m?.isOwner) return 'Owner'

  const sender = String(m?.sender || '')
  const userKeys = [sender, sender.split('@')[0]].filter(Boolean)
  const containers = [
    globalThis.db?.data?.users,
    globalThis.db?.users,
    globalThis.users,
    globalThis.db?.data?.user
  ].filter(Boolean)

  for (const container of containers) {
    for (const key of userKeys) {
      const user = container?.[key]
      if (!user) continue
      const premiumTime = Number(user.premiumTime)
      const premiumExpiry = premiumTime > 0 && premiumTime < 1e12 ? premiumTime * 1000 : premiumTime
      if (user.premium || user.isPremium || user.prem === true || premiumExpiry > Date.now()) {
        return 'Premium'
      }
    }
  }

  const premiumLists = [globalThis.premiumUsers, globalThis.prems, globalThis.premium]
  for (const list of premiumLists) {
    if (!Array.isArray(list)) continue
    if (list.includes(sender) || list.includes(sender.split('@')[0])) return 'Premium'
  }

  return 'User'
}

function formatCategoryName(category) {
  const key = String(category || 'root').toLowerCase()
  if (CATEGORY_META[key]) return CATEGORY_META[key].label
  if (key === 'root') return 'Other'
  return key
    .split(/[-_/]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function uniquePlugins(plugins) {
  const seen = new Set()
  const unique = []
  for (const plugin of plugins.values()) {
    if (!plugin || seen.has(plugin)) continue
    seen.add(plugin)
    unique.push(plugin)
  }
  return unique
}

function getPluginCategories(plugin) {
  for (const value of [plugin.tags, plugin.tag, plugin.declaredCategory, plugin.category]) {
    const list = (Array.isArray(value) ? value : [value])
      .map(v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean)
      .map(v => CATEGORY_ALIASES.get(v) || v)
    if (list.length) return [...new Set(list)]
  }
  return ['root']
}

function groupByCategory(pluginList) {
  const groups = new Map()
  for (const plugin of pluginList) {
    if (plugin.hidden) continue
    for (const category of getPluginCategories(plugin)) {
      if (!groups.has(category)) groups.set(category, [])
      groups.get(category).push(plugin)
    }
  }
  for (const list of groups.values()) {
    list.sort((a, b) => String(a.command).localeCompare(String(b.command)))
  }
  return groups
}

function sortedCategoryKeys(groups) {
  const priority = ['ai', 'downloader', 'tools', 'grup', 'group', 'rpg', 'fun', 'bot', 'chanel', 'channel', 'konvert', 'search', 'owner', 'root']
  const rank = new Map(priority.map((name, index) => [name, index]))

  return [...groups.keys()].sort((a, b) => {
    const ar = rank.has(a) ? rank.get(a) : 999
    const br = rank.has(b) ? rank.get(b) : 999
    return ar - br || a.localeCompare(b)
  })
}

function buildHeader(m) {
  const prefix = config.noprefix ? 'no prefix' : config.prefixes.join(' ')
  const userName = m?.sender?.split('@')[0] || m?.pushName || 'User'
  const rows = [
    ['Prefix', prefix],
    ['Node', getRuntime()],
    ['Library', 'zapo-js v' + zapoVersion],
    ['Role', getUserRole(m)],
    ['WITA', getWitaDateTime()]
  ]
  const pad = Math.max(...rows.map(([label]) => label.length))

  let res = 'Halo *@' + userName + '* ♡\n'
  for (const [label, value] of rows) {
    res += CODE_BLOCK + label.padEnd(pad) + ' : ' + value + CODE_BLOCK + '\n'
  }
  return res.trim()
}

function buildFooter(total) {
  return [
    '╭─「 *ELYRA MD* 」',
    '│ ♡ Dibuat dengan sepenuh hati',
    '│ ♫ Dikembangkan oleh Lynx decode',
    '│ ⚡ Zapo-js v' + zapoVersion + (total ? '  •  ' + total + ' fitur' : ''),
    '│ 💡 Ketik *menu all* untuk lihat alias command',
    '╰───────────────✧',
    '`© 2026 ERINE-AI • Elyra Labs` 🎖'
  ].join('\n')
}

function buildIntro() {
  return '୨୧ ERINE AI\nHi, I\'m Elyra ♡\n_Pilih kategori di bawah, atau ketik_ *menu all* _untuk lihat semua fitur._'
}

function buildCategoryListText(groups, usedPrefix, command) {
  const lines = ['୨୧ MENU', '']
  for (const category of sortedCategoryKeys(groups)) {
    lines.push('> ' + usedPrefix + command + ' ' + category + '  —  ' + formatCategoryName(category))
  }
  lines.push('> ' + usedPrefix + command + ' all  —  All Features')
  return lines.join('\n')
}

function getAliases(plugin) {
  const raw = plugin.alias || plugin.aliases
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
  return [...new Set(list.map(a => String(a).trim()).filter(Boolean))]
    .filter(a => a.toLowerCase() !== String(plugin.command).toLowerCase())
}

function formatCommandLine(plugin, usedPrefix) {
  const aliases = getAliases(plugin)
  let line = '> ' + usedPrefix + plugin.command
  if (aliases.length) line += '  ⟡ alias: ' + aliases.map(a => usedPrefix + a).join(', ')
  return line
}

function buildCategoryText(groups, categoryKey, usedPrefix) {
  const lines = ['୨୧ ' + formatCategoryName(categoryKey), '']
  for (const plugin of groups.get(categoryKey)) {
    lines.push(formatCommandLine(plugin, usedPrefix))
  }
  return lines.join('\n')
}

function buildAllText(groups, usedPrefix) {
  const lines = []
  for (const category of sortedCategoryKeys(groups)) {
    lines.push('୨୧ ' + formatCategoryName(category))
    for (const plugin of groups.get(category)) {
      lines.push(formatCommandLine(plugin, usedPrefix))
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

async function sendMenuAudio(sock, chat, quote, key) {
  const audio = getMenuAudioInfo(key)
  if (!audio) return false

  let vn = audioVnCache.get(key + ':' + audio.buffer.length)
  if (!vn) {
    try {
      const { buffer } = await convertToVoiceNote(audio.buffer)
      vn = buffer
      audioVnCache.set(key + ':' + audio.buffer.length, vn)
    } catch (err) {
      console.error('[MENU AUDIO] konversi VN gagal, kirim asli:', err?.message || err)
    }
  }
  const payload = vn
    ? { type: 'audio', media: vn, mimetype: 'audio/ogg; codecs=opus', ptt: true }
    : { type: 'audio', media: audio.buffer, mimetype: audio.mimetype, ptt: audio.ptt }

  try {
    if (typeof quote?.reply === 'function') await quote.reply(payload)
    else await sock.message.send(chat, payload, { quote: quote?.raw ?? quote })
    return true
  } catch (err) {
    console.error('[MENU AUDIO] kirim audio gagal:', err?.message || err)
  }

  try {
    await useStarforge(sock)
    if (typeof sock.sendMedia === 'function') {
      await sock.sendMedia(chat, audio.buffer, '', quote?.raw ?? quote, null, {
        audio: true,
        ptt: audio.ptt,
        mimetype: audio.mimetype
      })
      return true
    }
  } catch (err) {
    console.error('[MENU AUDIO] Starforge fallback gagal:', err?.message || err)
  }
  return false
}

export default {
  command: 'menu',
  category: 'bot',
  description: 'Menampilkan menu utama, seluruh fitur, atau fitur berdasarkan kategori.',
  help: '[kategori|all]',
  typing: true,

  async execute(m, { plugins, sock }) {
    const pluginList = uniquePlugins(plugins)
    const groups = groupByCategory(pluginList)
    const arg = String(m.args?.[0] || '').toLowerCase()
    
    const usedPrefix = m.prefix || ''
    const menuStyle = Number(globalThis.db?.data?.settings?.setmenu || 1)

    let body
    let audioKey = 'main'

    let isListMenu = false
    let listSections = []
    let listTitle = ''
    let buttonText = '📋 Pilih Kategori'

    if (menuStyle === 2) {
      if (!arg) {
        listTitle = '👋🏻 Halo, selamat datang!'
        buttonText = '📋 Kategori Menu'
        const rows = [
          { title: '🌟 All Features', description: 'Tampilkan daftar semua menu', command: ['menu', 'all'] }
        ]
        
        for (const cat of sortedCategoryKeys(groups)) {
          rows.push({
            title: '📁 ' + formatCategoryName(cat),
            description: 'Daftar perintah untuk kategori ' + formatCategoryName(cat),
            command: ['menu', cat]
          })
        }
        
        listSections = [{ title: 'PILIH KATEGORI', rows }]
        isListMenu = true
        body = '_Pilih kategori pada tombol di bawah untuk melihat fitur._'

      } else if (arg === 'all') {
        body = buildAllText(groups, usedPrefix)
        audioKey = 'all'
      } else {
        const requested = CATEGORY_ALIASES.get(arg) || arg
        const matchedKey = [...groups.keys()].find(key => key === requested || key.toLowerCase() === requested)

        if (!matchedKey) {
          return m.reply('Kategori ' + BT + arg + BT + ' tidak ditemukan.')
        }

        listTitle = '📁 ' + formatCategoryName(matchedKey)
        buttonText = '📋 Daftar Fitur'
        
        const rows = groups.get(matchedKey).map(cmd => {
          let desc = cmd.description ? cmd.description.split('\n')[0].replace(/>/g, '').trim() : ''
          const al = getAliases(cmd)
          if (al.length) desc = '[' + al.slice(0, 3).join(', ') + '] ' + desc
          return {
            title: usedPrefix + cmd.command,
            description: desc.substring(0, 65),
            command: cmd.command
          }
        })
        
        listSections = [{ title: 'FITUR ' + formatCategoryName(matchedKey).toUpperCase(), rows }]
        isListMenu = true
        audioKey = matchedKey
        body = '_Pilih fitur yang ingin digunakan pada tombol._'
      }
    } else {
      if (!arg) {
        body = buildCategoryListText(groups, usedPrefix, m.command)
      } else if (arg === 'all') {
        body = buildAllText(groups, usedPrefix)
        audioKey = 'all'
      } else {
        const requested = CATEGORY_ALIASES.get(arg) || arg
        const matchedKey = [...groups.keys()].find(key => key === requested || key.toLowerCase() === requested)

        if (!matchedKey) {
          return m.reply('Kategori ' + BT + arg + BT + ' tidak ditemukan.')
        }

        body = buildCategoryText(groups, matchedKey, usedPrefix)
        audioKey = matchedKey
      }
    }

    const footer = '𖤐 ERINE AI • Elyra Labs ♡ | Zapo-js v' + zapoVersion
    const text = buildHeader(m) + '\n\n' + buildIntro() + '\n\n' + body + '\n\n' + buildFooter(pluginList.filter(p => !p.hidden).length)

    try {
      if (menuStyle === 2) {
        await useStarforge(sock)
        const thumbMedia = await getMenuThumb()

        if (isListMenu) {
          const mainText = buildHeader(m) + '\n\n' + buildIntro() + '\n\n' + body
          const mappedSections = listSections.map(sec => ({
            title: sec.title,
            rows: (sec.rows || []).map(r => ({
              header: r.header || '',
              title: r.title,
              description: r.description || '',
              id: Array.isArray(r.command) ? cmdId(...r.command) : cmdId(r.command)
            }))
          }))

          const interactiveButtons = [{
            title: buttonText,
            text: buttonText,
            sections: mappedSections
          }]

          await withQuote(m, quote =>
            sock.sendInteractive(m.chat, interactiveButtons, quote, {
              media: thumbMedia,
              title: listTitle,
              text: mainText,
              footer: footer
            })
          )
        } else {
          await withQuote(m, quote =>
            sock.sendAdText(m.chat, text, quote, {
              title: m.pushName || 'ERINE AI',
              description: buildDescription(),
              thumbnail: thumbMedia,
              thumbnailUrl: MENU_URL,
              largeThumbnail: true,
              width: 1920,
              height: 1080
            })
          )
        }
      } else {
        const opts = {
          url: MENU_URL,
          title: m.pushName,
          body: buildDescription(),
          text: text,
          thumbnail: 'random',
          quote: m,
          mentions: [m.sender]
        }
        if (getRandomThumb('favicon')) opts.favicon = 'random'
        await sock.sendThumbnail(m.chat, opts)
      }
    } catch (err) {
      console.error('[MENU] Eksekusi menu gagal, fallback:', err?.message || err)
      try {
        await useStarforge(sock)
        const thumbMedia = await getMenuThumb()
        await withQuote(m, quote =>
          sock.sendAdText(m.chat, text, quote, {
            title: m.pushName || 'ERINE AI',
            description: buildDescription(),
            thumbnail: thumbMedia,
            thumbnailUrl: MENU_URL,
            largeThumbnail: true
          })
        )
      } catch {
        await m.reply(text)
      }
    }
    
    await sendMenuAudio(sock, m.chat, m, audioKey)
  }
}