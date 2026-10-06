import fs from 'fs'
import path from 'path'

const dbPath = path.resolve(process.cwd(), 'database/dschat_all.json')

function loadDb() {
    if (!fs.existsSync(dbPath)) return { year: '', groups: {} }
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    } catch {
        return { year: '', groups: {} }
    }
}

function saveDb(data) {
    let dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
}

let handler = async (m, { conn, participants }) => {
    let db = loadDb()
    let groupId = m.chat
    let groupData = db.groups[groupId] || {}

    let users = Object.entries(groupData).map(([jid, stats]) => ({ jid, yearly: stats.yearly, alltime: stats.alltime }))
    let totalAllTimeGroup = users.reduce((acc, curr) => acc + curr.alltime, 0)
    let totalYearlyGroup = users.reduce((acc, curr) => acc + curr.yearly, 0)

    let myJid = m.sender || ''
    if (myJid.endsWith('@lid')) {
        if (m.senderPn) {
            myJid = m.senderPn.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        } else {
            let found = (participants || []).find(p => p.lid === myJid)
            if (found && found.id && !found.id.endsWith('@lid')) myJid = found.id
        }
    }
    myJid = myJid.split(':')[0] + '@s.whatsapp.net'

    let myStats = users.find(u => u.jid === myJid) || { yearly: 0, alltime: 0 }
    let topAllTime = [...users].sort((a, b) => b.alltime - a.alltime).slice(0, 5)
    let currentYear = new Date().getFullYear()

    let mentions = topAllTime.map(u => u.jid)
    if (!mentions.includes(myJid)) mentions.push(myJid)

    let teks = `┌˚₊ ๑│ ɢ ʀ ᴏ ᴜ ᴘ  s ᴛ ᴀ ᴛ s │๑˚₊ 📊\n` +
               `┇ \n` +
               `│ 📅 *Tahun:* ${currentYear}\n` +
               `│ 💬 *Total Keseluruhan:* ${totalAllTimeGroup} pesan\n` +
               `│ 💬 *Total Tahun Ini:* ${totalYearlyGroup} pesan\n` +
               `┇ \n` +
               `│ 🏆 *T O P  5  A L L - T I M E*\n`

    if (topAllTime.length === 0 || topAllTime.every(u => u.alltime === 0)) {
        teks += `│ _Belum ada histori yapping..._\n`
    } else {
        let rank = 1
        topAllTime.forEach((u) => {
            if (u.alltime > 0) {
                teks += `│ ${rank}. @${u.jid.split('@')[0]} (${u.alltime} pesan)\n`
                rank++
            }
        })
    }

    teks += `┇ \n` +
            `│ 👤 *Statistik Lu:*\n` +
            `│ • Tahun Ini: ${myStats.yearly} pesan\n` +
            `│ • Keseluruhan: ${myStats.alltime} pesan\n` +
            `┇ \n` +
            `│ _Data ini disimpan permanen_\n` +
            `│ _dan tidak akan dihapus._\n` +
            `└˚₊ ๑ ────────────── ๑˚₊\n` +
            `> © ERINE-AI`

    await conn.sendMessage(m.chat, {
        text: teks,
        mentions: mentions
    }, { quoted: m })
}

handler.before = async function (m, { participants }) {
    if (!m.chat || !m.isGroup || m.isBaileys) return false

    let type = m.mtype || (m.message ? Object.keys(m.message)[0] : '')
    if (type !== 'conversation' && type !== 'extendedTextMessage') return false
    if (!m.text) return false

    let sender = m.sender || ''
    if (!sender) return false

    if (sender.endsWith('@lid')) {
        if (m.senderPn) {
            sender = m.senderPn.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        } else if (participants && participants.length > 0) {
            let found = participants.find(p => p.lid === sender)
            if (found && found.id && !found.id.endsWith('@lid')) {
                sender = found.id
            } else {
                return false
            }
        } else {
            return false
        }
    }

    sender = sender.split(':')[0] + '@s.whatsapp.net'

    if (sender.endsWith('@lid')) return false

    let db = loadDb()
    let now = new Date()
    let currentYear = now.getFullYear().toString()

    if (db.year !== currentYear) {
        db.year = currentYear
        for (let jid in db.groups) {
            for (let participant in db.groups[jid]) {
                db.groups[jid][participant].yearly = 0
            }
        }
    }

    let groupId = m.chat

    if (!db.groups[groupId]) db.groups[groupId] = {}
    if (!db.groups[groupId][sender]) db.groups[groupId][sender] = { yearly: 0, alltime: 0 }

    db.groups[groupId][sender].yearly += 1
    db.groups[groupId][sender].alltime += 1

    saveDb(db)

    return false
}

handler.help = ['totalchatall', 'dschatall']
handler.tags = ['group']
handler.command = /^(totalchatall|dschatall|topchatall)$/i
handler.group = true

export default handler
