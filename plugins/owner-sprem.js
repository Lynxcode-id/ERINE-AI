import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (!/webp/.test(mime)) {
    return m.reply(
      `⭐ *sᴛɪᴄᴋᴇʀ ᴘʀᴇᴍɪᴜᴍ*\n\n` +
      `> Reply sticker yang mau dijadikan premium!\n\n` +
      `> Penggunaan: *${usedPrefix + command}*`
    )
  }

  try {
    const msg = q.msg || q

    const stickerMessage = proto.Message.StickerMessage.fromObject({
      url: msg.url,
      fileSha256: msg.fileSha256,
      fileEncSha256: msg.fileEncSha256,
      mediaKey: msg.mediaKey,
      mimetype: msg.mimetype || 'image/webp',
      height: msg.height || 512,
      width: msg.width || 512,
      directPath: msg.directPath,
      fileLength: msg.fileLength,
      mediaKeyTimestamp: msg.mediaKeyTimestamp,
      isAnimated: msg.isAnimated || false,
      stickerSentTs: Date.now(),
      isAvatar: false,
      isAiSticker: false,
      premium: 1,
      isLottie: false,
      accessibilityLabel: msg.accessibilityLabel || '',
      contextInfo: {
        stanzaId: m.key?.id,
        participant: m.key?.participant || m.sender,
        remoteJid: m.chat
      }
    })

    let targetJid = m.chat
    let num = args[0]?.replace(/[^0-9]/g, '')

    if (num) {
      targetJid = num + '@s.whatsapp.net'
    }

    const waMsg = generateWAMessageFromContent(
      targetJid,
      { stickerMessage },
      {
        userJid: conn.user.id,
        quoted: m
      }
    )

    await conn.relayMessage(targetJid, waMsg.message, {
      messageId: waMsg.key.id
    })

    await m.react('✅')

  } catch (e) {
    console.error(e)
    m.reply(`❌ Gagal:\n${e.message}`)
  }
}

handler.help = ['sprem']
handler.tags = ['owner']
handler.command = /^(sprem|stickerpremium|premiumsticker)$/i
handler.owner = true

export default handler
