import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let handler = async (m, { conn }) => {
    let loadTeks = `┌˚₊ ๑│ C E K  U P D A T E │๑˚₊ 🔍\n` +
                   `┇ \n` +
                   `│ _Sedang mengecek versi terbaru..._\n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI`

    await conn.sendMessage(m.chat, { text: loadTeks }, { quoted: m })

    try {
        const pkgPath = path.join(__dirname, '..', 'package.json')
        const localPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

        const botName = global.namebot || localPkg.name || 'Unknown Bot'
        const localVersion = global.version || localPkg.version

        const url = 'https://raw.githubusercontent.com/Lynxcode-id/ERINE-MD/main/package.json'
        const { data: remotePkg } = await axios.get(url)

        const remoteVersion = remotePkg.version

        let teks = `┌˚₊ ๑│ C E K  U P D A T E │๑˚₊ 🔄\n` +
                   `┇ \n` +
                   `│ 🤖 *Bot:* ${botName}\n` +
                   `│ 📦 *Versi Lokal:* v${localVersion}\n` +
                   `│ 🌐 *Versi Github:* v${remoteVersion}\n` +
                   `┇ \n`

        if (remoteVersion !== localVersion) {
            teks += `│ ⚠️ *[ UPDATE TERSEDIA ]*\n` +
                    `│ Versi terbaru script Erine telah rilis!\n` +
                    `│ \n` +
                    `│ 🔗 *Group Update:*\n` +
                    `│ https://chat.whatsapp.com/EBuQKK91oSQ69rPrYL4Q33\n`
        } else {
            teks += `│ ✅ *[ UP TO DATE ]*\n` +
                    `│ Script bot sudah versi terbaru.\n`
        }

        teks += `└˚₊ ๑ ────────────── ๑˚₊\n` +
                `> © ERINE-AI`

        await conn.sendMessage(m.chat, { text: teks }, { quoted: m })

    } catch (err) {
        console.error(err)
        let errTeks = `┌˚₊ ๑│ E R R O R │๑˚₊ ❌\n` +
                      `┇ \n` +
                      `│ Gagal mengecek update.\n` +
                      `│ 💬 *Pesan:* ${err.message}\n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `> © ERINE-AI`

        await conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
    }
}

handler.help = ['cekupdate']
handler.tags = ['owner']
handler.command = /^(cekupdate)$/i
handler.owner = true

export default handler
