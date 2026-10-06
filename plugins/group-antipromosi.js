function getMessageText(m) {
  return String(
    m.text || m.body || m.caption || m.msg?.text ||
    m.message?.conversation || m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption || m.message?.videoMessage?.caption ||
    m.message?.documentMessage?.caption || ''
  ).trim()
}

function hasForwardedNewsletter(m) {
  const c = m.msg?.contextInfo || m.message?.extendedTextMessage?.contextInfo ||
    m.message?.imageMessage?.contextInfo || m.message?.videoMessage?.contextInfo ||
    m.message?.documentMessage?.contextInfo || m.message?.buttonsMessage?.contextInfo || {}

  return Boolean(
    c.forwardedNewsletterMessageInfo || c.isForwarded ||
    (typeof c.forwardingScore === 'number' && c.forwardingScore > 0)
  )
}

function detectRisk(m) {
  const text = getMessageText(m)
  const lower = text.toLowerCase()

  const channelLink = /(?:https?:\/\/)?(?:www\.)?(?:whatsapp\.com\/channel|wa\.me\/channel)\/[a-z0-9_-]+/i.test(text)
  const channelMention = /@newsletter/i.test(text)
  const groupInvite = /(?:https?:\/\/)?chat\.whatsapp\.com\/[a-z0-9]+/i.test(text)
  const forwardedChannel = hasForwardedNewsletter(m)

  const promoKeywords = [
    'promo', 'promosi', 'diskon', 'discount', 'sale', 'gratis', 'voucher',
    'cashback', 'cash back', 'limited offer', 'order now', 'preorder',
    'pre-order', 'subscribe', 'open order', 'po', 'ready stock',
    'reseller', 'affiliate'
  ]
  const hasPromoWords = promoKeywords.some(k => lower.includes(k))

  return {
    text,
    channelLike: channelLink || channelMention || forwardedChannel,
    groupLinkLike: groupInvite,
    promoLike: hasPromoWords
  }
}

const FLAGS = {
  antipromo: 'antiPromo',
  antipromosi: 'antiPromo',
  antichannel: 'antiChannel',
  antilinkch: 'antiChannel',
  antilinkgc: 'antiLinkGrup',
  antilinkgrup: 'antiLinkGrup',
  antigclink: 'antiLinkGrup',
}
const LABELS = {
  antiPromo: 'AntiPromo',
  antiChannel: 'AntiChannel (link/mention/forward channel)',
  antiLinkGrup: 'AntiLinkGrup (link invite grup lain)'
}

const handler = async (m, { text, command, usedPrefix, isAdmin, isOwner }) => {
  const chat = global.db.data.chats[m.chat] || {}
  const action = text?.toLowerCase()?.trim() || 'status'
  const canManage = isAdmin || isOwner
  const cmd = command.toLowerCase()

  if (!canManage && action !== 'status') {
    return m.reply('❌ Perintah ini hanya untuk admin grup.')
  }

  if (cmd === 'antiads') {
    if (['on', 'enable', 'aktif'].includes(action)) {
      chat.antiPromo = chat.antiChannel = chat.antiLinkGrup = true
      return m.reply('✅ AntiPromo + AntiChannel + AntiLinkGrup berhasil diaktifkan.')
    }
    if (['off', 'disable', 'mati'].includes(action)) {
      chat.antiPromo = chat.antiChannel = chat.antiLinkGrup = false
      return m.reply('⛔ AntiPromo + AntiChannel + AntiLinkGrup dimatikan.')
    }
  } else if (FLAGS[cmd]) {
    const flag = FLAGS[cmd]
    if (['on', 'enable', 'aktif'].includes(action)) {
      chat[flag] = true
      return m.reply(`✅ ${LABELS[flag]} berhasil diaktifkan.`)
    }
    if (['off', 'disable', 'mati'].includes(action)) {
      chat[flag] = false
      return m.reply(`⛔ ${LABELS[flag]} dimatikan.`)
    }
  }

  const status = `📌 *STATUS FILTER GRUP*\n\n` +
    `📢 AntiPromo    : ${chat.antiPromo ? 'ON ✅' : 'OFF ❌'}\n` +
    `🔗 AntiChannel  : ${chat.antiChannel ? 'ON ✅' : 'OFF ❌'}\n` +
    `👥 AntiLinkGrup : ${chat.antiLinkGrup ? 'ON ✅' : 'OFF ❌'}\n\n` +
    `*Perintah:*\n` +
    `• ${usedPrefix}antipromo on/off\n` +
    `• ${usedPrefix}antichannel on/off  (alias: antilinkch)\n` +
    `• ${usedPrefix}antilinkgc on/off   (alias: antilinkgrup)\n` +
    `• ${usedPrefix}antiads on/off      (aktifin/matiin semua sekaligus)`

  return m.reply(status)
}

handler.help = ['antipromo <on/off>', 'antichannel <on/off>', 'antilinkgc <on/off>']
handler.tags = ['group']
handler.command = /^(antipromo|antipromosi|antichannel|antilinkch|antilinkgc|antilinkgrup|antigclink|antiads)$/i
handler.group = true

handler.before = async function (m, { isBotAdmin, isAdmin, isOwner }) {
  if (m.isBaileys && m.fromMe) return
  if (!m.isGroup) return

  const DB = this.db || global.db
  let chat = DB?.data?.chats?.[m.chat] || {}
  if (isAdmin || isOwner) return

  const risk = detectRisk(m)
  const blockChannel = Boolean(chat.antiChannel && risk.channelLike)
  const blockLinkGrup = Boolean(chat.antiLinkGrup && risk.groupLinkLike)
  const blockPromo = Boolean(chat.antiPromo && risk.promoLike)

  if ((blockChannel || blockLinkGrup || blockPromo) && isBotAdmin) {
    try {
      await this.sendMessage(m.chat, { delete: m.key })
      return true
    } catch (e) {
      console.error('[AntiPromo/Channel/LinkGrup Error]', e)
    }
  }
}

export default handler
