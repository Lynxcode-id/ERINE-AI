import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

async function sendInteractive(conn, jid, title, text, footer, buttonText, sections, quoted) {
    let msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                    body: { text },
                    footer: { text: footer },
                    header: { title, hasMediaAttachment: false },
                    nativeFlowMessage: {
                        buttons: [{
                            name: "single_select",
                            buttonParamsJson: JSON.stringify({ title: buttonText, sections })
                        }]
                    }
                })
            }
        }
    }, { quoted });
    return await conn.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

let handler = async (m, { conn, usedPrefix, command, args, isOwner, isAdmin, isROwner }) => {
    let isEnable = /^enable$/i.test(command)
    let chat = global.db.data.chats[m.chat] || {}
    let user = global.db.data.users[m.sender] || {}
    let type = (args[0] || '').toLowerCase()
    let isAll = false
    let isUser = false

    const getS = (v) => v ? '🌱' : '🌸'

    switch (type) {
        case 'welcome':
            if (m.isGroup && !isAdmin) return global.dfail('admin', m, conn)
            chat.welcome = isEnable
            break
        case 'detect':
            if (m.isGroup && !isAdmin) return global.dfail('admin', m, conn)
            chat.detect = isEnable
            break
        case 'delete':
            if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn)
            chat.delete = isEnable
            chat.antidelete = !isEnable
            break
        case 'antidelete':
            if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn)
            chat.antidelete = isEnable
            chat.delete = !isEnable
            break
        case 'autobio':
            if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn)
            chat.autoBio = isEnable
            break
        case 'antilink':
            if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn)
            chat.antiLink = isEnable
            break
        case 'antisticker':
            if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn)
            chat.antiSticker = isEnable
            break
        case 'autosticker':
            if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn)
            chat.stiker = isEnable
            break
        case 'antibadword':
            if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn)
            chat.antiBadword = isEnable
            break
        case 'nsfw':
            if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn)
            chat.nsfw = isEnable
            break
        case 'rpg':
            if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn)
            chat.rpgs = isEnable
            break
        case 'autolevelup': {
            if (!isOwner) return global.dfail('owner', m, conn)
            const botSettingsKey = String(conn?.user?.jid || conn?.user?.id || '')
            global.db.data.settings = global.db.data.settings && typeof global.db.data.settings === 'object'
                ? global.db.data.settings
                : {}
            if (!global.db.data.settings[botSettingsKey] || typeof global.db.data.settings[botSettingsKey] !== 'object') {
                global.db.data.settings[botSettingsKey] = {}
            }
            global.db.data.settings[botSettingsKey].autolevelup = isEnable
            isAll = true
            break
        }
        case 'public':
            isAll = true
            if (!isROwner) return global.dfail('rowner', m, conn)
            global.opts['self'] = !isEnable
            break
        case 'autoread':
            isAll = true
            if (!isROwner) return global.dfail('rowner', m, conn)
            global.opts['autoread'] = isEnable
            break
        case 'pconly':
            isAll = true
            if (!isROwner) return global.dfail('rowner', m, conn)
            global.opts['pconly'] = isEnable
            break
        case 'gconly':
            isAll = true
            if (!isROwner) return global.dfail('rowner', m, conn)
            global.opts['gconly'] = isEnable
            break
        case 'swonly':
            isAll = true
            if (!isROwner) return global.dfail('rowner', m, conn)
            global.opts['swonly'] = isEnable
            break

        default:
            let gOptions = [
                { n: 'welcome', s: chat.welcome },
                { n: 'detect', s: chat.detect },
                { n: 'delete', s: chat.delete },
                { n: 'antidelete', s: chat.antidelete },
                { n: 'antilink', s: chat.antiLink },
                { n: 'antisticker', s: chat.antiSticker },
                { n: 'autosticker', s: chat.stiker },
                { n: 'antibadword', s: chat.antiBadword },
                { n: 'nsfw', s: chat.nsfw },
                { n: 'rpg', s: chat.rpgs },
                { n: 'autobio', s: chat.autoBio }
            ].map(v => ({
                title: `${getS(v.s)} ${v.n.toUpperCase()}`,
                id: `${usedPrefix}${v.s ? 'disable' : 'enable'} ${v.n}`
            }));

            const botSettingsKey = String(conn?.user?.jid || conn?.user?.id || '')
            const botSettings = global.db.data.settings?.[botSettingsKey] || {}
            let uOptions = [
                { n: 'autolevelup', s: Boolean(botSettings.autolevelup) }
            ].map(v => ({
                title: `${getS(v.s)} ${v.n.toUpperCase()}`,
                id: `${usedPrefix}${v.s ? 'disable' : 'enable'} ${v.n}`
            }));

            let oOptions = [
                { n: 'public', s: !global.opts['self'] },
                { n: 'autoread', s: global.opts['autoread'] },
                { n: 'pconly', s: global.opts['pconly'] },
                { n: 'gconly', s: global.opts['gconly'] },
                { n: 'swonly', s: global.opts['swonly'] }
            ].map(v => ({
                title: `${getS(v.s)} ${v.n.toUpperCase()}`,
                id: `${usedPrefix}${v.s ? 'disable' : 'enable'} ${v.n}`
            }));

            let sections = [
                { title: "👥 SETELAN GRUP", rows: gOptions },
                { title: "👤 SETELAN USER", rows: uOptions },
                { title: "👑 SETELAN KHUSUS OWNER", rows: oOptions }
            ];

            return await sendInteractive(
                conn, m.chat, "⚙️ SETTINGS MANAGER",
                `Halo @${m.sender.split('@')[0]}\n\nBerikut status fitur saat ini:\n🌱 = *Aktif*\n🌸 = *Mati*\n\nKlik tombol di bawah untuk mengubah status fitur secara instan!`,
                "» ᴇʀɪɴᴇ ᴘʀᴏᴊᴇᴄᴛ ᴍᴀɴᴀɢᴇᴍᴇɴᴛ «",
                "PILIH OPSI 🔍",
                sections, m
            );
    }

    if (isAll) {
        if (!global.db.data.opts) global.db.data.opts = {}
        const optTypes = ['gconly', 'pconly', 'swonly', 'autoread']
        if (type === 'public') {
            global.db.data.opts['self'] = !isEnable
        } else if (optTypes.includes(type)) {
            global.db.data.opts[type] = isEnable
        }
    }

    m.reply(`*UPDATE INFORMATION*\n\n✨ *Fitur:* ${type}\n⚙️ *Status:* ${isEnable ? 'AKTIF' : 'NONAKTIF'}\n📊 *Scope:* ${isAll ? 'Global Bot' : isUser ? 'User' : 'Chat Group'}\n💡 *Indikator:* ${isEnable ? '🌱' : '🌸'}`)
}

handler.help = ['enable', 'disable']
handler.tags = ['group', 'owner']
handler.command = /^(enable|disable)$/i
handler.admin = true

export default handler
