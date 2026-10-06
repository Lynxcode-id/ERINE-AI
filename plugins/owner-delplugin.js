import fs from 'fs'

let handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
  if (!isOwner) return m.reply('❌ Khusus owner.')
  if (!text) return m.reply(`📦 Contoh:\n${usedPrefix + command} namaplugin.js`)
  if (!text.endsWith('.js')) text += '.js'
  const filePath = `./plugins/${text}`
  if (!fs.existsSync(filePath)) return m.reply('❌ Plugin tidak ditemukan.')

  try {
    fs.unlinkSync(filePath)
    await m.reply(`✅ Plugin *${text}* berhasil dihapus.`)
  } catch (e) {
    console.error(e)
    await m.reply('❌ Gagal menghapus plugin.')
  }
}

handler.help = ['deleteplugin <namafile>']
handler.tags = ['owner']
handler.command = /^(deleteplugin|delplugin|df)$/i
handler.owner = true

export default handler
