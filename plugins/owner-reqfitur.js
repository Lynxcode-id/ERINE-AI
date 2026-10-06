import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

let dir = './database'
let file = path.join(dir, 'requests.json')

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([]))

const readData = () => JSON.parse(fs.readFileSync(file))
const writeData = (data) => fs.writeFileSync(file, JSON.stringify(data, null, 2))

let handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
    let dataReq = readData()
    let cmd = command.toLowerCase()

    if (cmd === 'reqfitur' || cmd === 'repairfitur') {
        if (!text || !text.includes('|')) {
            let errText = `┌˚₊ ๑│ I N P U T  S A L A H │๑˚₊\n` +
                          `┇ \n` +
                          `│ Format penggunaan salah!\n` +
                          `│ *Contoh Request:* ${usedPrefix}reqfitur nama fitur | fungsi fiturnya\n` +
                          `│ *Contoh Repair:* ${usedPrefix}repairfitur nama fitur | pesan errornya\n` +
                          `┇ \n` +
                          `└˚₊ ๑ ────────────── ๑˚₊\n` +
                          `| © ERINE-AI`
            return conn.sendMessage(m.chat, { text: errText }, { quoted: m })
        }

        let [nama, deskripsi] = text.split('|').map(v => v.trim())
        if (!nama || !deskripsi) return m.reply('Pastikan nama dan deskripsi diisi dengan benar setelah tanda |')

        let idReq = crypto.randomBytes(3).toString('hex').toUpperCase()
        let type = cmd === 'reqfitur' ? '✨ Request' : '🔧 Repair'

        dataReq.push({
            id: idReq,
            type: type,
            user: m.sender,
            name: nama,
            desc: deskripsi,
            status: '⏳ Pending'
        })
        writeData(dataReq)

        let successText = `┌˚₊ ๑│ S U K S E S │๑˚₊\n` +
                          `┇ \n` +
                          `│ Laporan berhasil dikirim ke Owner!\n` +
                          `│ 📌 *ID:* ${idReq}\n` +
                          `│ 🏷️ *Tipe:* ${type}\n` +
                          `│ 📝 *Fitur:* ${nama}\n` +
                          `┇ \n` +
                          `└˚₊ ๑ ────────────── ๑˚₊\n` +
                          `| © ERINE-AI`
        return conn.sendMessage(m.chat, { text: successText }, { quoted: m })
    }

    if (['listreq', 'accreq', 'rejectreq', 'delreq', 'clearreq'].includes(cmd)) {
        if (!isOwner) {
            let errOwner = `┌˚₊ ๑│ A K S E S  D I T O L A K │๑˚₊\n` +
                           `┇ \n` +
                           `│ Maaf, perintah ini khusus Owner!\n` +
                           `┇ \n` +
                           `└˚₊ ๑ ────────────── ๑˚₊\n` +
                           `| © ERINE-AI`
            return conn.sendMessage(m.chat, { text: errOwner }, { quoted: m })
        }
    }

    if (cmd === 'listreq') {
        if (dataReq.length === 0) {
            let emptyText = `┌˚₊ ๑│ L I S T  K O S O N G │๑˚₊\n` +
                            `┇ \n` +
                            `│ Belum ada data request atau repair.\n` +
                            `┇ \n` +
                            `└˚₊ ๑ ────────────── ๑˚₊\n` +
                            `| © ERINE-AI`
            return conn.sendMessage(m.chat, { text: emptyText }, { quoted: m })
        }

        let listText = `┌˚₊ ๑│ D A T A  R E Q U E S T │๑˚₊\n┇ \n`
        for (let req of dataReq) {
            listText += `│ 📌 *ID:* ${req.id}\n`
            listText += `│ 🏷️ *Tipe:* ${req.type}\n`
            listText += `│ 📝 *Fitur:* ${req.name}\n`
            listText += `│ 💬 *Ket:* ${req.desc}\n`
            listText += `│ 📊 *Status:* ${req.status}\n`
            listText += `┇ \n`
        }
        listText += `└˚₊ ๑ ────────────── ๑˚₊\n| © ERINE-AI`
        return conn.sendMessage(m.chat, { text: listText }, { quoted: m })
    }

    if (cmd === 'accreq' || cmd === 'rejectreq') {
        if (!text) return m.reply(`Masukkan ID! Contoh: ${usedPrefix + command} A1B2C`)

        let idIndex = dataReq.findIndex(v => v.id === text.toUpperCase())
        if (idIndex === -1) return m.reply('ID tidak ditemukan di database!')

        let newStatus = cmd === 'accreq' ? '✅ Diterima (ACC)' : '❌ Ditolak (Reject)'
        dataReq[idIndex].status = newStatus
        writeData(dataReq)

        let resText = `┌˚₊ ๑│ S T A T U S  U P D A T E │๑˚₊\n` +
                      `┇ \n` +
                      `│ Berhasil mengubah status!\n` +
                      `│ 📌 *ID:* ${dataReq[idIndex].id}\n` +
                      `│ 📝 *Fitur:* ${dataReq[idIndex].name}\n` +
                      `│ 📊 *Status Baru:* ${newStatus}\n` +
                      `┇ \n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `| © ERINE-AI`
        return conn.sendMessage(m.chat, { text: resText }, { quoted: m })
    }

    if (cmd === 'delreq') {
        if (!text) return m.reply(`Masukkan ID yang mau dihapus! Contoh: ${usedPrefix + command} A1B2C`)

        let idIndex = dataReq.findIndex(v => v.id === text.toUpperCase())
        if (idIndex === -1) return m.reply('ID tidak ditemukan di database!')

        dataReq.splice(idIndex, 1)
        writeData(dataReq)

        let delText = `┌˚₊ ๑│ D E L E T E  S U K S E S │๑˚₊\n` +
                      `┇ \n` +
                      `│ Data request dengan ID *${text.toUpperCase()}* berhasil dihapus.\n` +
                      `┇ \n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `| © ERINE-AI`
        return conn.sendMessage(m.chat, { text: delText }, { quoted: m })
    }

    if (cmd === 'clearreq') {
        writeData([])
        let clearText = `┌˚₊ ๑│ C L E A R  S U K S E S │๑˚₊\n` +
                        `┇ \n` +
                        `│ Semua data request & repair berhasil dibersihkan dari database.\n` +
                        `┇ \n` +
                        `└˚₊ ๑ ────────────── ๑˚₊\n` +
                        `| © ERINE-AI`
        return conn.sendMessage(m.chat, { text: clearText }, { quoted: m })
    }
}

handler.help = ['reqfitur', 'repairfitur', 'listreq', 'accreq', 'rejectreq', 'delreq', 'clearreq']
handler.tags = ['main', 'owner']
handler.command = /^(reqfitur|repairfitur|listreq|accreq|rejectreq|delreq|clearreq)$/i
handler.limit = false
handler.register = true

export default handler
