let handler = async (m, { conn, command, args }) => {
  if (!m.isGroup) return m.reply('Fitur ini hanya bisa digunakan di grup.')

  await m.react('⏳')
  try {
    if (!global.db.data.chats) global.db.data.chats = {}
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
    let chat = global.db.data.chats[m.chat]

    let mode = args[0]?.toLowerCase()

    if (!mode) {
      let statusText = `┌˚₊ ๑│ A N T I   S C A M │๑˚₊
┇
│ Status Anti Scam: *${chat.antiscam ? 'ON (Aktif)' : 'OFF (Mati)'}*
│
│ Gunakan:
│ ⊙ .antiscam on
│ ⊙ .antiscam off
┇
└˚₊ ๑ ────────────── ๑˚₊
> © ERINE-AI`
      await m.reply(statusText)
      await m.react('✅')
      return
    }

    if (mode === 'on') {
      chat.antiscam = true
      let onText = `┌˚₊ ๑│ A N T I   S C A M │๑˚₊
┇
│ Anti Scam berhasil diaktifkan di grup ini.
│ Sistem akan otomatis menghapus tautan dan pesan scam.
┇
└˚₊ ๑ ────────────── ๑˚₊
> © ERINE-AI`
      await m.reply(onText)
      await m.react('✅')
      return
    }

    if (mode === 'off') {
      chat.antiscam = false
      let offText = `┌˚₊ ๑│ A N T I   S C A M │๑˚₊
┇
│ Anti Scam berhasil dimatikan di grup ini.
┇
└˚₊ ๑ ────────────── ๑˚₊
> © ERINE-AI`
      await m.reply(offText)
      await m.react('✅')
      return
    }

    let invalidText = `┌˚₊ ๑│ A N T I   S C A M │๑˚₊
┇
│ Perintah salah! Gunakan:
│ ⊙ .antiscam on
│ ⊙ .antiscam off
┇
└˚₊ ๑ ────────────── ๑˚₊
> © ERINE-AI`
    await m.reply(invalidText)
    await m.react('❌')
  } catch (e) {
    await m.react('❌')
    console.error(e)
  }
}

handler.before = async function (m, { conn }) {
  if (!m.isGroup) return
  if (!m.message) return
  if (m.key.fromMe) return

  if (!global.db.data.chats) global.db.data.chats = {}
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
  let chat = global.db.data.chats[m.chat]

  if (!chat.antiscam) return

  let raw = JSON.stringify(m.message).toLowerCase()

  let scamDomains = [
    'bbcsk.top',
    'kuota-gratis-81gb4.bbcsk.top',
    'kuota-gratis',
    'gratis-kuota'
  ]

  let scamPatterns = [
    /kuota.{0,40}gratis.{0,40}81\s*gb/i,
    /81\s*gb.{0,50}hut\s*ri/i,
    /hut\s*ri.{0,50}81\s*gb/i,
    /klaim.{0,50}kuota.{0,30}gratis/i
  ]

  let detected =
    scamDomains.some(x => raw.includes(x)) ||
    scamPatterns.some(x => x.test(raw))

  if (!detected) return

  try {
    await conn.sendMessage(m.chat, {
      delete: m.key
    })

    let alertText = `┌˚₊ ๑│ A N T I   S C A M │๑˚₊
┇
│ Peringatan! Link atau pola pesan terindikasi Scam/Hoax.
│ Pesan telah dihapus oleh sistem ERINE-AI.
┇
└˚₊ ๑ ────────────── ๑˚₊
> © ERINE-AI`

    await conn.sendMessage(m.chat, { text: alertText })
    console.log(`[ANTI-SCAM] Pesan berhasil dihapus: ${m.key.id}`)
    return true
  } catch (e) {
    console.error('[ANTI-SCAM]', e)
  }
}

handler.command = ['antiscam']
handler.tags = ['group']
handler.help = ['antiscam on', 'antiscam off']
handler.admin = true
handler.botAdmin = true

export default handler
