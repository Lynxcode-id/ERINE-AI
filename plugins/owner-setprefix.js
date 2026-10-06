import { getPrefixConfig, applyPrefix, DEFAULT_PREFIXES } from '../lib/prefixControl.js'

const ui = (title, lines) =>
    `╭── ⋆ ✧ ꒰ 🎀 *${title}* 🎀 ꒱ ✧ ⋆ ──\n${lines.map((l) => `┊ ${l}`).join('\n')}\n╰────────────────────── ⋆ ✧\n> © ERINE-MD BY LYNX`

const MODE = { off: 'MATI', owner: 'HANYA OWNER', all: 'SEMUA USER' }
const isSymbol = (s) => {
    const n = [...s].length
    return n >= 1 && n <= 3 && !/[\p{L}\p{N}\s]/u.test(s)
}
const status = (cfg) => [
    `🌸 *Prefix aktif:* ${cfg.list.length ? cfg.list.map((p) => `[ ${p} ]`).join(' ') : '-'}`,
    `☁️ *No prefix:* ${MODE[cfg.noprefix]}`,
]

let handler = async (m, { args, usedPrefix, command }) => {
    const cfg = getPrefixConfig()
    const arg = (args[0] || '').trim()
    command = command.toLowerCase()
    const p = usedPrefix || '.'

    if (command === 'listprefix') return m.reply(ui('PREFIX', status(cfg)))

    if (command === 'resetprefix') {
        cfg.list = [...DEFAULT_PREFIXES]
        cfg.noprefix = 'off'
        applyPrefix()
        return m.reply(ui('PREFIX', ['✅ Prefix dikembalikan ke default.', ...status(cfg)]))
    }

    if (command === 'addprefix') {
        if (!arg) return m.reply(ui('ADD PREFIX', ['🌸 Masukkan simbol prefix-nya!', `☁️ Contoh: *${p}addprefix !*`, '☁️ Simbol/emoji, maksimal 3 karakter']))
        if (!isSymbol(arg)) return m.reply('⚠️ Prefix harus simbol/emoji (1-3 karakter), bukan huruf/angka.\nUntuk tanpa prefix pakai *noprefix*.')
        if (cfg.list.includes(arg)) return m.reply(`⚠️ Prefix *${arg}* sudah ada.`)
        cfg.list.push(arg)
        applyPrefix()
        return m.reply(ui('ADD PREFIX', [`✅ Prefix *${arg}* ditambahkan.`, ...status(cfg)]))
    }

    if (command === 'delprefix') {
        if (!arg) return m.reply(ui('DEL PREFIX', ['🌸 Masukkan prefix yang mau dihapus!', `☁️ Contoh: *${p}delprefix !*`, ...status(cfg)]))
        if (!cfg.list.includes(arg)) return m.reply(`⚠️ Prefix *${arg}* tidak ada di daftar.`)
        if (cfg.list.length === 1 && cfg.noprefix === 'off') return m.reply('⚠️ Minimal harus ada 1 prefix (atau aktifkan *noprefix* dulu).')
        cfg.list = cfg.list.filter((x) => x !== arg)
        applyPrefix()
        return m.reply(ui('DEL PREFIX', [`✅ Prefix *${arg}* dihapus.`, ...status(cfg)]))
    }

    const map = { on: 'all', all: 'all', owner: 'owner', off: 'off' }
    const mode = map[arg.toLowerCase()]
    if (!mode) {
        return m.reply(ui('NO PREFIX', [
            ...status(cfg), '',
            `☁️ *${p}noprefix on* → semua user`,
            `☁️ *${p}noprefix owner* → hanya owner`,
            `☁️ *${p}noprefix off* → mati`,
        ]))
    }
    cfg.noprefix = mode
    if (mode === 'off' && !cfg.list.length) cfg.list = [...DEFAULT_PREFIXES]
    applyPrefix()
    const effect = mode === 'off'
        ? `Prefix *WAJIB* dipakai (${cfg.list.map((x) => `[ ${x} ]`).join(' ')}). Command tanpa prefix TIDAK akan jalan.`
        : mode === 'all'
            ? 'SEMUA user bisa ketik command tanpa prefix sama sekali.'
            : 'HANYA Owner yang bisa ketik command tanpa prefix. User lain tetap wajib pakai prefix.'
    return m.reply(ui('NO PREFIX', [
        `✅ No prefix: *${MODE[mode]}*`, `👉 ${effect}`, ...status(cfg),
        ...(mode === 'all' ? ['', '⚠️ Kata biasa di chat yang sama dengan nama command akan ikut menjalankan command.'] : []),
    ]))
}

handler.help = ['addprefix <simbol>', 'delprefix <simbol>', 'listprefix', 'resetprefix', 'noprefix <on|owner|off>']
handler.tags = ['owner']
handler.command = /^(addprefix|delprefix|listprefix|resetprefix|noprefix)$/i
handler.owner = true

export default handler
