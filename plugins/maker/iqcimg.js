import { createCanvas, loadImage } from '@napi-rs/canvas'
import axios from 'axios'
import { config } from '../../settings.js'
import { pickMedia } from '../../lib/album.js'

const makeUI = (title, content) => {
    return `╭── ⋆ ✧ ꒰ 🎀 *${title}* 🎀 ꒱ ✧ ⋆ ──\n` +
           content.split('\n').map(line => `┊ ${line}`).join('\n') + `\n` +
           `╰────────────────────── ⋆ ✧\n` +
           `> © ${config.botName}`
}

async function execRun(m, { sock, usedPrefix, command, text, args }) {
    let q = pickMedia(m, sock, { types: ['image'] })
    let mime = (q.mime || (q.mediaType === 'image' ? 'image/jpeg' : q.mediaType === 'video' ? 'video/mp4' : ''))

    if (!/image\/(jpe?g|png)/.test(mime)) {
        let helpText = `⚠️ *Format Salah!*\n\nKirim atau balas gambar dengan caption *${usedPrefix + command}*`
        return m.reply(makeUI('INFO', helpText))
    }

    try {
        let media = Buffer.from(await q.download())
        if (!media) throw new Error("Gagal mengunduh media dari pesan.")

        const templateURL = "https://raw.githubusercontent.com/Lynxcode-id/picture/main/1790759486170.jpeg"
        const templateBuffer = await axios.get(templateURL, { responseType: "arraybuffer" }).then(r => r.data)

        const userImg = await loadImage(media)
        const template = await loadImage(Buffer.from(templateBuffer))

        const canvas = createCanvas(template.width, template.height)
        const ctx = canvas.getContext("2d")
        
        ctx.drawImage(template, 0, 0)

        const bubbleX = 36
        const bubbleY = 363
        const bubbleW = 616
        const bubbleH = 860
        const radius = 21

        const imgRatio = userImg.width / userImg.height
        const bubbleRatio = bubbleW / bubbleH
        let drawW, drawH

        if (imgRatio > bubbleRatio) {
            drawH = bubbleH
            drawW = drawH * imgRatio
        } else {
            drawW = bubbleW
            drawH = drawW / imgRatio
        }

        const offsetX = bubbleX - (drawW - bubbleW) / 2
        const offsetY = bubbleY - (drawH - bubbleH) / 2

        ctx.save()
        ctx.beginPath()
        ctx.moveTo(bubbleX + radius, bubbleY)
        ctx.lineTo(bubbleX + bubbleW - radius, bubbleY)
        ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + radius)
        ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - radius)
        ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - radius, bubbleY + bubbleH)
        ctx.lineTo(bubbleX + radius, bubbleY + bubbleH)
        ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - radius)
        ctx.lineTo(bubbleX, bubbleY + radius)
        ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY)
        ctx.closePath()
        ctx.clip()

        ctx.drawImage(userImg, offsetX, offsetY, drawW, drawH)
        ctx.restore()

        const buffer = await canvas.encode("png")

        await m.reply({
            type: 'image',
            media: buffer,
            caption: makeUI('SUCCESS', '📱 *iOS Style Applied!* ✨')
        })
        await sock.sendReact(m.chat, '🌸', m.id).catch(() => {})

    } catch (err) {
        console.error(err)
        await sock.sendReact(m.chat, '🍂', m.id).catch(() => {})
        await m.reply(makeUI('ERROR', `Gagal memproses gambar.\nDetail: ${err.message || 'Terjadi kesalahan pada sistem processing.'}`))
    }
}
export default {
  command: 'iqcimg',
  category: 'maker',
  tags: ['maker'],
  description: `> iqcimg\n\ncontoh:\n> \`.iqcimg\``,
  help: '',
  typing: true,
  wait: true,
  async execute(m, { sock, args }) {
    const text = m.text.slice((m.prefix || '').length + m.command.length).trim()
    return execRun(m, { sock, usedPrefix: m.prefix || '.', command: m.command, text, args })
  }
}
