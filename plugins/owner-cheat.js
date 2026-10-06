import { getRpgUser } from '../lib/rpg-db.js'

let handler = async (m, { conn }) => {
    let user = getRpgUser(m.sender)
    if (!user) return

    user.money = 99999999999
    user.level = 232
    user.exp = 99999999
    user.sampah = 999999
    user.potion = 999999
    user.common = 999999
    user.uncommon = 999999
    user.mythic = 999999
    user.legendary = 999999
    user.diamond = 999999
    user.poinxp = 999999
    user.bank = 999999999

    if (global.db?.data?.users?.[m.sender]) {
        global.db.data.users[m.sender].limit = 9999
    }

    await conn.reply(
        m.chat,
        `*Succes Cheat !*`,
        m
    )
}

handler.help = ['own-cheat']
handler.tags = ['owner']
handler.command = /^(own-cheat|cheat-own|o-cheat|cit)$/i
handler.limit = false
handler.owner = true
handler.group = true

export default handler
