let handler = async (m, { conn, args }) => {
	let list = Object.entries(global.db.data.users)
	let lim = !args || !args[0] ? 15 : isNumber(args[0]) ? parseInt(args[0]) : 15
	lim = Math.max(1, lim)

	list.forEach(([user, data]) => {
        data.limit = lim
    })

    conn.reply(m.chat, `*Berhasil direset ${lim} limit / user*`, m)
}
handler.help = ['limit'].map(v => 'reset' + v)
handler.tags = ['owner']
handler.command = /^(resetlimit)$/i

handler.owner = true
export default handler

function isNumber(x = 0) {
  x = parseInt(x)
  return !isNaN(x) && typeof x == 'number'
}
