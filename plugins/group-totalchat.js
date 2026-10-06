import fs from 'fs'
import path from 'path'

const dbPath = path.resolve(process.cwd(), 'database/dschat.json')

function loadDb() {
    if (!fs.existsSync(dbPath)) return { month: '', date: '', groups: {} }
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    } catch {
        return { month: '', date: '', groups: {} }
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

    let users = Object.entries(groupData).map(([jid, stats]) => ({ jid, daily: stats.daily, monthly: stats.monthly }))
    let totalMonthlyGroup = users.reduce((acc, curr) => acc + curr.monthly, 0)

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

    let myStats = users.find(u => u.jid === myJid) || { daily: 0, monthly: 0 }
    let topDaily = [...users].sort((a, b) => b.daily - a.daily).slice(0, 5)
    let monthName = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })

    let mentions = topDaily.map(u => u.jid)
    if (!mentions.includes(myJid)) mentions.push(myJid)

    let teks = `┌˚₊ ๑│ ɢ ʀ ᴏ ᴜ ᴘ  s ᴛ ᴀ ᴛ s │๑˚₊ 📊\n` +
               `┇ \n` +
               `│ 📅 *Bulan:* ${monthName}\n` +
               `│ 💬 *Total Pesan Grup:* ${totalMonthlyGroup} pesan\n` +
               `┇ \n` +
               `│ 🏆 *T O P  5  H A R I  I N I*\n`

    if (topDaily.length === 0 || topDaily.every(u => u.daily === 0)) {
        teks += `│ _Belum ada yang yapping hari ini..._\n`
    } else {
        let rank = 1
        topDaily.forEach((u) => {
            if (u.daily > 0) {
                teks += `│ ${rank}. @${u.jid.split('@')[0]} (${u.daily} pesan)\n`
                rank++
            }
        })
    }

    teks += `┇ \n` +
            `│ 👤 *Statistik Lu:*\n` +
            `│ • Hari Ini: ${myStats.daily} pesan\n` +
            `│ • Bulan Ini: ${myStats.monthly} pesan\n` +
            `┇ \n` +
            `│ _Data yapping direset otomatis_\n` +
            `│ _setiap pergantian bulan._\n` +
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
    let currentMonth = now.getFullYear() + '-' + (now.getMonth() + 1)
    let currentDate = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate()

    if (db.month !== currentMonth) {
        db.month = currentMonth
        db.groups = {}
    }

    if (db.date !== currentDate) {
        db.date = currentDate
        for (let jid in db.groups) {
            for (let participant in db.groups[jid]) {
                db.groups[jid][participant].daily = 0
            }
        }
    }

    let groupId = m.chat

    if (!db.groups[groupId]) db.groups[groupId] = {}
    if (!db.groups[groupId][sender]) db.groups[groupId][sender] = { monthly: 0, daily: 0 }

    db.groups[groupId][sender].monthly += 1
    db.groups[groupId][sender].daily += 1

    saveDb(db)

    return false
}

handler.help = ['topchat', 'dschat', 'totalchat']
handler.tags = ['group']
handler.command = /^(topchat|dschat|totalchat|topchatgroup)$/i
handler.group = true

export default handler
