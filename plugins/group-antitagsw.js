function isStatusTagMention(m) {
  return Boolean(m.message?.groupStatusMentionMessage)
}

const handler = async (m, { text, command, usedPrefix, isAdmin, isOwner }) => {
  const chat = global.db.data.chats[m.chat] || {}
  const action = text?.toLowerCase()?.trim() || 'status'
  const canManage = isAdmin || isOwner

  if (!canManage && action !== 'status') {
    return m.reply('❌ Perintah ini hanya untuk admin grup.')
  }

  if (['on', 'enable', 'aktif'].includes(action)) {
    chat.antiTagSw = true
    return m.reply('✅ AntiTagSW berhasil diaktifkan.\nPesan tag Status WA di grup ini bakal dihapus otomatis, warning 1x lalu kick di pelanggaran ke-2.')
  }
  if (['off', 'disable', 'mati'].includes(action)) {
    chat.antiTagSw = false
    return m.reply('⛔ AntiTagSW dimatikan.')
  }
  if (['reset', 'resetwarn'].includes(action)) {
    chat.tagSwWarn = {}
    return m.reply('🔄 Semua warning AntiTagSW di grup ini direset.')
  }

  return m.reply(
    `📌 *STATUS ANTITAGSW*\n\n` +
    `👤 AntiTagSW : ${chat.antiTagSw ? 'ON ✅' : 'OFF ❌'}\n\n` +
    `*Perintah:*\n` +
    `• ${usedPrefix}antitagsw on/off\n` +
    `• ${usedPrefix}antitagsw reset  (reset semua warning)`
  )
}

handler.help = ['antitagsw <on/off>']
handler.tags = ['group']
handler.command = /^(antitagsw)$/i
handler.group = true

handler.before = async function (m, { isBotAdmin, isAdmin, isOwner }) {
  if (m.isBaileys && m.fromMe) return
  if (!m.isGroup) return
  if (isAdmin || isOwner) return
  if (!isStatusTagMention(m)) return

  const DB = this.db || global.db
  let chat = DB?.data?.chats?.[m.chat] || {}
  if (!chat.antiTagSw || !isBotAdmin) return

  const sender = m.sender

  try {
    await this.sendMessage(m.chat, { delete: m.key })
  } catch (e) {
    console.error('[AntiTagSW Delete Error]', e)
  }

  if (!chat.tagSwWarn) chat.tagSwWarn = {}
  const warnCount = (chat.tagSwWarn[sender] || 0) + 1
  chat.tagSwWarn[sender] = warnCount

  try {
    if (warnCount >= 2) {
      await this.sendMessage(m.chat, {
        text: `🚫 @${sender.split('@')[0]} dikeluarkan dari grup karena udah 2x kena tag Status WA di grup ini setelah diperingatkan.`,
        mentions: [sender]
      })
      await this.groupParticipantsUpdate(m.chat, [sender], 'remove')
      delete chat.tagSwWarn[sender]
    } else {
      await this.sendMessage(m.chat, {
        text: `⚠️ @${sender.split('@')[0]}, jangan nge-tag lewat Status WA di grup ini!\nPeringatan *${warnCount}/2*. Sekali lagi bakal langsung dikeluarkan.`,
        mentions: [sender]
      })
    }
  } catch (e) {
    console.error('[AntiTagSW Warn/Kick Error]', e)
  }

  return true
}

export default handler
