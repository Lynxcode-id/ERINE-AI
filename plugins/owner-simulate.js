
import { participantsUpdate } from '../handler.js';

let handler = async (m, { conn, usedPrefix, command, args: [event], text }) => {
    if (!event) {
        return await conn.reply(m.chat, `contoh:
${usedPrefix + command} welcome @user
${usedPrefix + command} bye @user
${usedPrefix + command} promote @user
${usedPrefix + command} demote @user`.trim(), m, null, [['Welcome', '#simulate welcome'], ['Bye', '#simulate bye']])
    }

    let mentions = text.replace(event, '').trimStart()
    let who = mentions ? conn.parseMention(mentions) : []
    let part = who.length ? who : [m.sender]

    part = part.map(user => {
        let normalized = String(user || '').trim();
        if (normalized.endsWith('@lid')) {
            if (conn.isLid?.[normalized]) {
                return conn.isLid[normalized];
            }
            let num = normalized.split('@')[0];
            return `${num}@s.whatsapp.net`;
        }
        return normalized;
    });

    let act = false
    let prefixSign = typeof htjava !== 'undefined' ? htjava : '✧'

    m.reply(`*${prefixSign} Simulating ${event}...*`)

    switch (event.toLowerCase()) {
        case 'add':
        case 'invite':
        case 'welcome':
            act = 'add'
            break
        case 'bye':
        case 'kick':
        case 'leave':
        case 'remove':
            act = 'remove'
            break
        case 'promote':
            act = 'promote'
            break
        case 'demote':
            act = 'demote'
            break
        default:
            throw '❌ Pilihan event tidak valid!\n*Pilih:* welcome, bye, promote, atau demote'
    }

    if (act) {
        return await participantsUpdate.call(conn, {
            id: m.chat,
            participants: part,
            action: act
        })
    }
}

handler.help = ['simulate <event> [@mention]']
handler.tags = ['owner']
handler.rowner = true
handler.command = /^(simulate|simulasi)$/i;

export default handler;
