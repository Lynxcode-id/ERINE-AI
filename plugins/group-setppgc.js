import { S_WHATSAPP_NET } from '@whiskeysockets/baileys'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

async function generateProfilePicture(buffer) {
    const jimpModule = require('jimp')
    const J = jimpModule.Jimp || jimpModule.default || jimpModule
    const image = await J.read(buffer)
    const width = image.bitmap?.width || image.width || 1000
    const height = image.bitmap?.height || image.height || 1000

    try {
        if (width > height) {
            image.resize(720, J.AUTO || -1)
        } else {
            image.resize(J.AUTO || -1, 720)
        }
    } catch (err) {
        if (width > height) {
            image.resize({ w: 720 })
        } else {
            image.resize({ h: 720 })
        }
    }

    let imgBuffer
    try {
        imgBuffer = await image.getBuffer('image/jpeg')
    } catch {
        try {
            imgBuffer = await image.getBufferAsync(J.MIME_JPEG || 'image/jpeg')
        } catch {
            imgBuffer = await image.getBufferAsync('image/png')
        }
    }
    return { img: Buffer.from(imgBuffer) }
}

let handler = async (m, { conn, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || q.mediaType || ''

    if (!/image/g.test(mime)) {
        return m.reply(`⚠️ *Format Salah!*\n\nKirim gambar dengan caption *${usedPrefix + command}* atau reply gambarnya.`)
    }

    await m.react('⏳')

    try {
        let media = await q.download()
        if (!media) throw new Error('Gagal ngedownload gambar dari chat.')

        let { img } = await generateProfilePicture(media)

        await conn.query({
            tag: 'iq',
            attrs: {
                target: m.chat,
                to: S_WHATSAPP_NET,
                type: 'set',
                xmlns: 'w:profile:picture'
            },
            content: [
                {
                    tag: 'picture',
                    attrs: { type: 'image' },
                    content: img
                }
            ]
        })

        await m.reply('✅ *Update Profile Group Sukses!*\n\n> © INF PROJECT')
        await m.react('✅')
    } catch (e) {
        console.error(e)
        await m.react('❌')
        m.reply(`❌ *[ERROR]* Gagal mengganti profile group!\n\nDetail: ${e.message}`)
    }
}

handler.help = ['setppgc']
handler.tags = ['group']
handler.command = /^(setppgc|setppgrup|setppgroup|setpp)$/i

handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
