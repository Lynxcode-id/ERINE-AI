import fs from 'fs'
import path from 'path'

const databaseDir = './database'
const databaseFile = path.join(databaseDir, 'intro.json')

if (!fs.existsSync(databaseDir)) fs.mkdirSync(databaseDir, { recursive: true })
if (!fs.existsSync(databaseFile)) fs.writeFileSync(databaseFile, JSON.stringify({}))

const saveDatabase = (data) => fs.writeFileSync(databaseFile, JSON.stringify(data, null, 2))

const header = "┌˚₊ ๑│ ɢ ʀ ᴏ ᴜ ᴘ  ɪ ɴ ᴛ ʀ ᴏ │๑˚₊"
const hr = "└˚₊ ๑ ────────────── ๑˚₊"
const signature = "> © ERINE-MD"

let handler = async (m, { conn, text, usedPrefix, command, isAdmin, isOwner }) => {
    if (!m.isGroup) return

    let introDB = JSON.parse(fs.readFileSync(databaseFile))
    const isAuthorized = isAdmin || isOwner

    switch (command) {
        case 'setintro':
            if (!isAuthorized) return
            if (!text) return m.reply(`${header} ⚙️\n┇ \n│ ❌ *Format Salah!*\n│ Masukkan teks pengantar.\n│ \n│ 💡 *Contoh:*\n│ ${usedPrefix + command} Halo guys!\n${hr}\n${signature}`)
            if (introDB[m.chat]) return m.reply(`${header} ⚠️\n┇ \n│ ⚠️ *Intro Sudah Ada!*\n│ Hapus dulu dengan:\n│ *${usedPrefix}delintro*\n${hr}\n${signature}`)

            await m.react('⏳')
            introDB[m.chat] = text
            saveDatabase(introDB)
            await m.reply(`${header} ✅\n┇ \n│ ✨ *Intro Berhasil Diset!*\n│ Ketik *${usedPrefix}intro* untuk melihat.\n${hr}\n${signature}`)
            await m.react('✅')
            break

        case 'delintro':
            if (!isAuthorized) return
            if (!introDB[m.chat]) return m.reply(`${header} ❌\n┇ \n│ ❌ *Gagal Hapus!*\n│ Belum ada intro.\n${hr}\n${signature}`)

            await m.react('⏳')
            delete introDB[m.chat]
            saveDatabase(introDB)
            await m.reply(`${header} ✅\n┇ \n│ 🗑️ *Intro Berhasil Dihapus!*\n${hr}\n${signature}`)
            await m.react('✅')
            break

        case 'intro':
            if (!introDB[m.chat]) return m.reply(`${header} ❓\n┇ \n│ ❓ *Intro Belum Ada!*\n│ Minta admin set intro.\n${hr}\n${signature}`)

            await m.react('💬')
            await conn.reply(m.chat, `${header} 💬\n┇ \n${introDB[m.chat]}\n┇ \n${hr}\n${signature}`, m)
            break
    }
}

handler.help = ['setintro <teks>', 'delintro', 'intro']
handler.tags = ['group']
handler.command = ['setintro', 'delintro', 'intro']
handler.group = true

export default handler
