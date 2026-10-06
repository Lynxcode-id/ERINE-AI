let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!m.isGroup)
    return m.reply(`┌˚₊ ๑│ ᴇ ʀ ɪ ɴ ᴇ  ᴍ ᴀ ɴ ᴀ ɢ ᴇ ᴍ ᴇ ɴ ᴛ │๑˚₊ ⚠️\n┇ \n│ ❌ Perintah ini hanya bisa digunakan di grup.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`)

  let target = m.mentionedJid?.[0]
    ? m.mentionedJid[0]
    : m.quoted
      ? m.quoted.sender
      : text
        ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        : false

  if (!target) {
    return m.reply(`┌˚₊ ๑│ ᴇ ʀ ɪ ɴ ᴇ  ᴍ ᴀ ɴ ᴀ ɢ ᴇ ᴍ ᴇ ɴ ᴛ │๑˚₊ ⚙️\n┇ \n│ ❌ *Format Salah!*\n│ Tag, reply, atau ketik nomor target yang\n│ ingin dikeluarkan.\n│ \n│ 💡 *Contoh:*\n│ ${usedPrefix + command} @user\n│ ${usedPrefix + command} 628xxx\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`)
  }

  let botJid = conn.decodeJid(conn.user.id)
  if (target === botJid)
    return m.reply(`┌˚₊ ๑│ ᴇ ʀ ɪ ɴ ᴇ  ᴍ ᴀ ɴ ᴀ ɢ ᴇ ᴍ ᴇ ɴ ᴛ │๑˚₊ ⚠️\n┇ \n│ ❌ Bot tidak bisa mengeluarkan dirinya sendiri.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`)

  await m.react('⏳')

  try {
    await conn.groupParticipantsUpdate(
      m.chat,
      [target],
      'remove'
    )

    try {
      await conn.sendMessage(m.chat, {
        sticker: { url: 'https://files.catbox.moe/h4q4hq.webp' }
      }, { quoted: m })
    } catch (e) {
      m.reply(`┌˚₊ ๑│ ᴇ ʀ ɪ ɴ ᴇ  ᴍ ᴀ ɴ ᴀ ɢ ᴇ ᴍ ᴇ ɴ ᴛ │๑˚₊ ✅\n┇ \n│ 👋 Anggota berhasil dikeluarkan dari grup.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`)
    }
    await m.react('✅')

  } catch (err) {
    console.error('[KICK ERROR]', err)
    await m.react('❌')
    m.reply(`┌˚₊ ๑│ ᴇ ʀ ɪ ɴ ᴇ  ᴍ ᴀ ɴ ᴀ ɢ ᴇ ᴍ ᴇ ɴ ᴛ │๑˚₊ ❌\n┇ \n│ Gagal mengeluarkan anggota.\n│ Pastikan bot memiliki akses Admin yang sah.\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`)
  }
}

handler.help = ['kick @user', 'kick (reply)', 'kick <nomor>']
handler.tags = ['group']
handler.command = /^(kick|tendang)$/i

handler.admin = true
handler.botAdmin = true
handler.owner = false
handler.premium = false
handler.group = true

export default handler
