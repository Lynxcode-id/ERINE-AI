let handler = async (m, { participants }) => {
    global.db.data.chats[m.chat].isBanned = true
    m.reply('Done! Grup ini berhasil dibanned. Member biasa gak bakal direspon bot.')
}

handler.help = ['banchat']
handler.tags = ['owner']
handler.command = /^(banchat|bnc)$/i
handler.owner = true

export default handler
