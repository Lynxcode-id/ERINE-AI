
import * as baileys from "@whiskeysockets/baileys"
import crypto from "node:crypto"
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let handler = async (m, { conn, text, usedPrefix, command, isAdmin, isOwner }) => {

    if (command === 'antiswgc') {
        let chat = global.db.data.chats[m.chat]
        if (!chat) chat = global.db.data.chats[m.chat] = {}

        if (text === 'on') {
            chat.antiswgc = true
            return m.reply(`┌˚₊ ๑│ ᴀ ɴ ᴛ ɪ  s ᴡ ɢ ᴄ │๑˚₊ 🛡️\n┇ ✅ Anti SWGC berhasil *DIAKTIFKAN*.\n┇ Bot akan otomatis menghapus SWGC dari member biasa.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)
        } else if (text === 'off') {
            chat.antiswgc = false
            return m.reply(`┌˚₊ ๑│ ᴀ ɴ ᴛ ɪ  s ᴡ ɢ ᴄ │๑˚₊ 🛡️\n┇ ❌ Anti SWGC berhasil *DIMATIKAN*.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)
        } else {
            return m.reply(`┌˚₊ ๑│ ᴀ ɴ ᴛ ɪ  s ᴡ ɢ ᴄ │๑˚₊ ⚠️\n┇ Format salah!\n┇ *Gunakan:* ${usedPrefix + command} on/off\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)
        }
    }

    if (command === 'listswgc') {
        try {
            const statusData = await conn.getStatus(m.sender)
            if (!statusData?.length) return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ʟ ɪ s ᴛ │๑˚₊ ❌\n┇ Lu ga ada status aktif wok\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)

            let list = `┌˚₊ ๑│ s ᴡ ɢ ᴄ  ʟ ɪ s ᴛ │๑˚₊ 📋\n`
            statusData.forEach((s, i) => {
                const type = s.message?.imageMessage ? 'Gambar' :
                             s.message?.videoMessage ? 'Video' :
                             s.message?.extendedTextMessage ? 'Teks' : 'Media'
                const time = new Date(s.messageTimestamp * 1000).toLocaleTimeString('id')
                list += `┇ ${i+1}. ${type} - ${time}\n`
            })
            list += `┇ \n┇ Hapus: ${usedPrefix}delswgc <nomor/all>\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`

            return m.reply(list)
        } catch (e) {
            return m.reply(`┌˚₊ ๑│ s ʏ s ᴛ ᴇ ᴍ  ᴇ ʀ ʀ ᴏ ʀ │๑˚₊ ❌\n┇ Gagal mengambil list status:\n┇ ${e.message}\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)
        }
    }

    if (command === 'delswgc' || command === 'swgcdel') {
        if (m.quoted) {
            try {
                await m.react('⏳')
                let key = m.quoted.vM ? m.quoted.vM.key : m.quoted.key
                await conn.sendMessage('status@broadcast', { delete: key })
                await m.react('✅')
                return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ᴅ ᴇ ʟ ᴇ ᴛ ᴇ │๑˚₊ 🗑️\n┇ ✅ SWGC berhasil dihapus secara manual.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)
            } catch (error) {
                await m.react('❌')
                return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ᴅ ᴇ ʟ ᴇ ᴛ ᴇ │๑˚₊ ❌\n┇ Gagal menghapus SWGC.\n┇ Pastikan bot menjadi admin grup.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)
            }
        } else if (text) {
            const type = text.trim().toLowerCase()
            try {
                const statusData = await conn.getStatus(m.sender)
                if (!statusData?.length) return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ᴅ ᴇ ʟ ᴇ ᴛ ᴇ │๑˚₊ ❌\n┇ Lu ga punya status aktif wok\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)

                await m.react('⏳')
                let deleted = 0

                if (type === 'all') {
                    for (let i = 0; i < statusData.length; i++) {
                        const statusMsg = statusData[i]
                        await conn.sendMessage('status@broadcast', { delete: statusMsg.key })
                        deleted++
                        await baileys.delay(1500)
                    }
                } else {
                    const index = parseInt(type) - 1
                    if (isNaN(index) || !statusData[index]) {
                        await m.react('❌')
                        return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ᴅ ᴇ ʟ ᴇ ᴛ ᴇ │๑˚₊ ❌\n┇ Status ke-${text} ga ada. Cek pake ${usedPrefix}listswgc\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)
                    }

                    await conn.sendMessage('status@broadcast', { delete: statusData[index].key })
                    deleted = 1
                }

                await m.react('✅')
                return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ᴅ ᴇ ʟ ᴇ ᴛ ᴇ │๑˚₊ 🗑️\n┇ ✅ Berhasil hapus ${deleted} status SWGC\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)

            } catch (e) {
                console.error(e)
                await m.react('❌')
                if (e.message?.includes('rate-overlimit')) {
                    return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ᴅ ᴇ ʟ ᴇ ᴛ ᴇ │๑˚₊ ❌\n┇ Kena limit WA. Tunggu 1 jam baru coba lagi.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)
                } else {
                    return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ᴅ ᴇ ʟ ᴇ ᴛ ᴇ │๑˚₊ ❌\n┇ Gagal: ${e.message}\n┇ Note: Cuma bisa hapus status yg lu kirim sendiri\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)
                }
            }
        } else {
            return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ᴅ ᴇ ʟ ᴇ ᴛ ᴇ │๑˚₊ ⚠️\n┇ Reply pesan SWGC yang ingin dihapus\n┇ ATAU gunakan: ${usedPrefix + command} <nomor/all>\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)
        }
    }

    if (command === 'swgc' || command === 'upswgc') {
        let [textInput, warna, url] = text.split('|').map(v => v?.trim() || '')

        let id;
        if (url) {
            try {
                const inviteCode = url.split('/').pop().split('?')[0]
                let geti = await conn.groupGetInviteInfo(inviteCode)
                id = geti.id
            } catch (e) {
                return m.reply(`┌˚₊ ๑│ s ʏ s ᴛ ᴇ ᴍ  ᴇ ʀ ʀ ᴏ ʀ │๑˚₊ ❌\n┇ Gagal mendapatkan info grup!\n┇ Pastikan tautan undangan valid.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)
            }
        } else {
            id = m.chat
        }

        let quoted = m.quoted || m
        let cap = quoted.caption || textInput
        let mime = quoted.mimetype || quoted.msg?.mimetype || ''

        await m.react('⏳')

        try {
            if (/image/.test(mime)) {
                const buffer = await quoted.download().catch(() => null)
                if (!buffer) throw new Error('Gagal mengunduh gambar.')

                await groupStatus(conn, id, { image: buffer, caption: cap })
                await m.react('✅')
                return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ᴜ ᴘ ʟ ᴏ ᴀ ᴅ ᴇ ʀ │๑˚₊ 🖼️\n┇ ✅ Status gambar berhasil diunggah.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)

            } else if (/video/.test(mime)) {
                const buffer = await quoted.download().catch(() => null)
                if (!buffer) throw new Error('Gagal mengunduh video.')

                await groupStatus(conn, id, { video: buffer, caption: cap })
                await m.react('✅')
                return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ᴜ ᴘ ʟ ᴏ ᴀ ᴅ ᴇ ʀ │๑˚₊ 🎥\n┇ ✅ Status video berhasil diunggah.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)

            } else if (/audio/.test(mime)) {
                m.reply(`┌˚₊ ๑│ ᴀ ᴜ ᴅ ɪ ᴏ  ᴘ ʀ ᴏ ᴄ ᴇ s s │๑˚₊ ⚡\n┇ Mengonversi VN ke Video...\n┇ Merender waveform visualizer...\n┇ _Tunggu sebentar, ini pasti work!_\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)

                const media = await quoted.download().catch(() => null)
                if (!media) throw new Error('Gagal mengekstrak audio.')

                let ext = 'ogg'
                if (mime) {
                    ext = mime.split('/')[1]?.split(';')[0] || 'ogg'
                    if (ext === 'mpeg') ext = 'mp3'
                    if (ext === 'mp4') ext = 'm4a'
                }

                let tmpIn = path.join(tmpdir(), `${Date.now()}_in.${ext}`)
                let tmpOut = path.join(tmpdir(), `${Date.now()}_out.mp4`)

                await fs.promises.writeFile(tmpIn, media)

                await execAsync(`ffmpeg -i "${tmpIn}" -filter_complex "[0:a]showwaves=s=720x1280:mode=cline:colors=#25D366[wv];color=black:s=720x1280[c];[c][wv]overlay=format=auto" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a  -shortest "${tmpOut}"`)

                let realDuration = 15;
                try {
                    const { stdout: dur } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tmpOut}"`)
                    realDuration = Math.max(1, Math.ceil(parseFloat(dur.trim())))
                } catch (err) {
                    console.log('[FFPROBE WARN] Gagal deteksi durasi real.')
                }

                let videoBuffer = await fs.promises.readFile(tmpOut)

                await groupStatus(conn, id, {
                    video: videoBuffer,
                    caption: cap || '🎤 Voice Note',
                    mimetype: 'video/mp4'
                })

                await m.react('✅')

                ;[tmpIn, tmpOut].forEach(f => fs.existsSync(f) && fs.unlinkSync(f))

                return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ᴜ ᴘ ʟ ᴏ ᴀ ᴅ ᴇ ʀ │๑˚₊ 🎥\n┇ ✅ Status VN as Video berhasil.\n┇ ⏱️ Durasi: ${realDuration}s\n┇ 📊 Waveform: Video Visualizer\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)

            } else if (warna) {
                if (!cap) throw new Error('Teks untuk status tidak boleh kosong!')

                const warnaStatusWA = new Map([
                    ['biru', '#34B7F1'], ['hijau', '#25D366'], ['kuning', '#FFD700'],
                    ['jingga', '#FF8C00'], ['merah', '#FF3B30'], ['ungu', '#9C27B0'],
                    ['abu', '#9E9E9E'], ['hitam', '#000000'], ['putih', '#FFFFFF'],
                    ['cyan', '#00BCD4']
                ])

                let color = null
                for (const [nama, kode] of warnaStatusWA.entries()) {
                    if (warna.toLowerCase().includes(nama)) {
                        color = kode
                        break
                    }
                }

                if (!color) throw new Error('Kode warna tidak ditemukan dalam database.')

                await groupStatus(conn, id, { text: cap, backgroundColor: color })
                await m.react('✅')
                return m.reply(`┌˚₊ ๑│ s ᴡ ɢ ᴄ  ᴜ ᴘ ʟ ᴏ ᴀ ᴅ ᴇ ʀ │๑˚₊ 📝\n┇ ✅ Status teks berwarna berhasil.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)

            } else {
                let guide = `┌˚₊ ๑│ ɢ ᴜ ɪ ᴅ ᴇ  ᴜ s ᴀ ɢ ᴇ │๑˚₊ 📌\n`
                guide += `┇ 1. Reply media (Gambar/Video/Audio)\n`
                guide += `┇ 2. Teks berwarna:\n`
                guide += `┇    *${usedPrefix + command} Teks | Warna | Link Grup*\n`
                guide += `└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`
                return m.reply(guide)
            }
        } catch (error) {
            console.error('[SWGC ERROR]', error)
            await m.react('❌')
            return m.reply(`┌˚₊ ๑│ s ʏ s ᴛ ᴇ ᴍ  ᴇ ʀ ʀ ᴏ ʀ │๑˚₊ ❌\n┇ Gagal mengunggah status:\n┇ ${error.message || error}\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-MD X LYNX DECODE`)
        }
    }
}

handler.before = async function (m, { conn, isAdmin, isBotAdmin }) {
    if (!m.isGroup) return
    if (m.isBaileys && m.fromMe) return

    let chat = global.db.data.chats[m.chat]
    if (!chat || !chat.antiswgc) return

    const isSWGC = m.mtype === 'groupStatusMessage' || m.mtype === 'groupStatusMessageV2' || m.mtype === 'statusMessage'

    if (isSWGC) {
        if (isAdmin) return
        if (!isBotAdmin) return

        try {
            await conn.sendMessage(m.chat, { delete: m.key })

            const warnText = `@${m.sender.split('@')[0]} jangan swgc sembarangan tanpa ijin admin bwang -_-`
            await conn.sendMessage(m.chat, { text: warnText, mentions: [m.sender] })
        } catch (e) {
            console.error('[ANTI SWGC ERROR] Gagal menghapus SWGC:', e)
        }
    }
}

async function groupStatus(conn, jid, content) {
    const { backgroundColor } = content
    delete content.backgroundColor

    const inside = await baileys.generateWAMessageContent(content, {
        upload: conn.waUploadToServer,
        backgroundColor
    })

    const messageSecret = crypto.randomBytes(32)
    const m = baileys.generateWAMessageFromContent(jid, {
        messageContextInfo: { messageSecret },
        groupStatusMessageV2: {
            message: {
                ...inside,
                messageContextInfo: { messageSecret }
            }
        }
    }, {})

    await conn.relayMessage(jid, m.message, { messageId: m.key.id })
    return m
}

handler.help = ["swgc", "upswgc", "listswgc", "delswgc", "antiswgc <on/off>"]
handler.command = /^(swgc|upswgc|antiswgc|delswgc|swgcdel|listswgc)$/i
handler.tags = ["tools", "group"]
handler.admin = true
handler.register = true

export default handler
