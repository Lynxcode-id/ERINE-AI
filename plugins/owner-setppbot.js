
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

let handler = async (m, { conn, command, usedPrefix }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || q.mediaType || ''

    if (!/image/g.test(mime)) {
        return m.reply(`📸 Kirim/tag gambar dengan caption *${usedPrefix + command}*`)
    }

    await m.react('⏳')
    try {
        let media = await q.download()
        if (!media) throw new Error('Gagal mendownload gambar.')

        let { img } = await generateProfilePicture(media)

        await conn.query({
            tag: 'iq',
            attrs: {
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

        await m.react('✅')
        m.reply(`✅ *Sukses!* Foto profil bot berhasil diganti.`)
    } catch (e) {
        console.error('[SETPPBOT ERROR]', e)
        await m.react('❌')
        m.reply(`❌ Terjadi kesalahan saat mengganti PP Bot:\n> ${e.message}`)
    }
}

handler.help = ['setbotpp']
handler.tags = ['owner']
handler.command = /^(set(botpp|ppbot))$/i
handler.owner = true

export default handler
