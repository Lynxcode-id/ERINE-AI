import fs from 'fs'
import path from 'path'

const dbPath = path.resolve(process.cwd(), 'database/absen.json')

function loadDb() {
    if (!fs.existsSync(dbPath)) return {}
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    } catch {
        return {}
    }
}

function saveDb(data) {
    let dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
}

let handler = async (m, { conn, text, usedPrefix, command, isAdmin }) => {
    let id = m.chat
    let db = loadDb()

    if (command === 'mulaiabsen') {
        if (!isAdmin) {
            let errTeks = `┌˚₊ ๑│ A B S E N S I │๑˚₊\n` +
                          `┇ \n` +
                          `│ Fitur ini khusus Admin grup!\n` +
                          `┇ \n` +
                          `└˚₊ ๑ ────────────── ๑˚₊\n` +
                          `> © ERINE-AI`
            return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
        }

        if (db[id]) {
            let errTeks = `┌˚₊ ๑│ A B S E N S I │๑˚₊\n` +
                          `┇ \n` +
                          `│ Masih ada sesi absen yang berjalan!\n` +
                          `│ Ketik *${usedPrefix}tutupabsen* untuk mengakhiri.\n` +
                          `┇ \n` +
                          `└˚₊ ๑ ────────────── ๑˚₊\n` +
                          `> © ERINE-AI`
            return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
        }

        db[id] = {
            keterangan: text || '-',
            list: []
        }
        saveDb(db)

        let startTeks = `┌˚₊ ๑│ A B S E N S I  D I M U L A I │๑˚₊\n` +
                        `┇ \n` +
                        `│ Silakan ketik *${usedPrefix}hadir* atau *${usedPrefix}absen*\n` +
                        `│ untuk mengisi daftar hadir.\n` +
                        `│ \n` +
                        `│ 📝 *Keterangan:* ${db[id].keterangan}\n` +
                        `┇ \n` +
                        `└˚₊ ๑ ────────────── ๑˚₊\n` +
                        `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: startTeks }, { quoted: m })
    }

    else if (/^(hadir|absen)$/i.test(command)) {
        if (!db[id]) {
            let errTeks = `┌˚₊ ๑│ A B S E N S I │๑˚₊\n` +
                          `┇ \n` +
                          `│ Tidak ada sesi absen yang aktif.\n` +
                          `│ Admin harus mengetik *${usedPrefix}mulaiabsen* terlebih dahulu.\n` +
                          `┇ \n` +
                          `└˚₊ ๑ ────────────── ๑˚₊\n` +
                          `> © ERINE-AI`
            return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
        }

        let senderJid = m.sender.split(':')[0] + '@s.whatsapp.net'
        if (db[id].list.includes(senderJid)) {
            let errTeks = `┌˚₊ ๑│ A B S E N S I │๑˚₊\n` +
                          `┇ \n` +
                          `│ Kamu sudah melakukan absen sebelumnya!\n` +
                          `┇ \n` +
                          `└˚₊ ๑ ────────────── ๑˚₊\n` +
                          `> © ERINE-AI`
            return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
        }

        db[id].list.push(senderJid)
        saveDb(db)

        let succTeks = `┌˚₊ ๑│ A B S E N S I │๑˚₊\n` +
                       `┇ \n` +
                       `│ ✅ Berhasil absen!\n` +
                       `│ 👥 *Total Hadir:* ${db[id].list.length} orang\n` +
                       `┇ \n` +
                       `└˚₊ ๑ ────────────── ๑˚₊\n` +
                       `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: succTeks }, { quoted: m })
    }

    else if (command === 'cekabsen') {
        if (!db[id]) {
            let errTeks = `┌˚₊ ๑│ A B S E N S I │๑˚₊\n` +
                          `┇ \n` +
                          `│ Tidak ada sesi absen yang aktif.\n` +
                          `┇ \n` +
                          `└˚₊ ๑ ────────────── ๑˚₊\n` +
                          `> © ERINE-AI`
            return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
        }

        let list = db[id].list
        let teks = `┌˚₊ ๑│ D A F T A R  H A D I R │๑˚₊\n` +
                   `┇ \n` +
                   `│ 📝 *Keterangan:* ${db[id].keterangan}\n` +
                   `│ 👥 *Total:* ${list.length} orang\n` +
                   `┇ \n`

        if (list.length === 0) {
            teks += `│ _Belum ada yang absen..._\n`
        } else {
            list.forEach((v, i) => {
                teks += `│ ${i + 1}. @${v.split('@')[0]}\n`
            })
        }

        teks += `┇ \n` +
                `└˚₊ ๑ ────────────── ๑˚₊\n` +
                `> © ERINE-AI`

        return conn.sendMessage(m.chat, { text: teks, mentions: list }, { quoted: m })
    }

    else if (command === 'tutupabsen') {
        if (!isAdmin) {
            let errTeks = `┌˚₊ ๑│ A B S E N S I │๑˚₊\n` +
                          `┇ \n` +
                          `│ Fitur ini khusus Admin grup!\n` +
                          `┇ \n` +
                          `└˚₊ ๑ ────────────── ๑˚₊\n` +
                          `> © ERINE-AI`
            return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
        }

        if (!db[id]) {
            let errTeks = `┌˚₊ ๑│ A B S E N S I │๑˚₊\n` +
                          `┇ \n` +
                          `│ Tidak ada sesi absen yang aktif.\n` +
                          `┇ \n` +
                          `└˚₊ ๑ ────────────── ๑˚₊\n` +
                          `> © ERINE-AI`
            return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
        }

        let total = db[id].list.length
        delete db[id]
        saveDb(db)

        let closeTeks = `┌˚₊ ๑│ A B S E N S I  D I T U T U P │๑˚₊\n` +
                        `┇ \n` +
                        `│ Sesi absen telah diakhiri.\n` +
                        `│ 👥 *Total Hadir:* ${total} orang\n` +
                        `┇ \n` +
                        `└˚₊ ๑ ────────────── ๑˚₊\n` +
                        `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: closeTeks }, { quoted: m })
    }
}

handler.help = ['mulaiabsen', 'hadir', 'cekabsen', 'tutupabsen']
handler.tags = ['group']
handler.command = /^(mulaiabsen|hadir|absen|cekabsen|tutupabsen)$/i
handler.group = true

export default handler
