import cp, { exec as _exec } from 'child_process'
import { promisify } from 'util'
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

const exec = promisify(_exec).bind(cp)

let handler = async (m, { conn, isROwner, usedPrefix, command, text }) => {
    if (!isROwner) return

    if (!text) {
        let errTeks = `┌˚₊ ๑│ G E T  P L U G I N │๑˚₊ ❌\n` +
                      `┇ \n` +
                      `│ Masukkan nama plugin!\n` +
                      `│ *Contoh:* ${usedPrefix + command} menu\n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
    }

    let loadTeks = `┌˚₊ ๑│ G E T  P L U G I N │๑˚₊ ⏳\n` +
                   `┇ \n` +
                   `│ _Membaca file script..._\n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI`
    await conn.sendMessage(m.chat, { text: loadTeks }, { quoted: m })

    let ar = Object.keys(global.plugins)
    let ar1 = ar.map(v => v.replace('.js', ''))

    if (!ar1.includes(text)) {
        let list = ar1.slice(0, 15).map(v => `│ • ${v}`).join('\n')
        let notFound = `┌˚₊ ๑│ G E T  P L U G I N │๑˚₊ ❌\n` +
                       `┇ \n` +
                       `│ Plugin *${text}* tidak ditemukan.\n` +
                       `┇ \n` +
                       `│ 📦 *Beberapa Plugin Tersedia:*\n` +
                       list + `\n` +
                       `│ ... (dan lainnya)\n` +
                       `└˚₊ ๑ ────────────── ๑˚₊\n` +
                       `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: notFound }, { quoted: m })
    }

    let o
    try {
        o = await exec(`cat plugins/${text}.js`)
    } catch (e) {
        o = e
    }

    let { stdout, stderr } = o

    if (stdout) {
        let pluginCode = stdout.trim()

        let msgText = `┌˚₊ ๑│ G E T  P L U G I N │๑˚₊ 📄\n` +
                      `┇ \n` +
                      `│ ✅ *File:* ${text}.js\n` +
                      `┇ \n` +
                      `│ _Silakan gunakan tombol di bawah_\n` +
                      `│ _untuk menyalin kode._\n` +
                      `└˚₊ ๑ ────────────── ๑˚₊\n` +
                      `\n\`\`\`javascript\n${pluginCode}\n\`\`\``

        let msg = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text: msgText }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: "© ERINE-AI" }),
                        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: [
                                {
                                    name: "cta_copy",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "📋 Copy Code",
                                        id: "copy_plugin_code",
                                        copy_code: pluginCode
                                    })
                                }
                            ]
                        })
                    })
                }
            }
        }, { quoted: m })

        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    }

    if (stderr) {
        let errSystem = `┌˚₊ ๑│ S Y S T E M  E R R O R │๑˚₊ ⚠️\n` +
                        `┇ \n` +
                        `│ Gagal membaca script!\n` +
                        `└˚₊ ๑ ────────────── ๑˚₊\n` +
                        `> © ERINE-AI\n\n` +
                        `\`\`\`bash\n${stderr.trim()}\n\`\`\``
        await conn.sendMessage(m.chat, { text: errSystem }, { quoted: m })
    }
}

handler.help = ['getplugin']
handler.tags = ['owner']
handler.command = /^(getplugin|gp)$/i
handler.rowner = true

export default handler
