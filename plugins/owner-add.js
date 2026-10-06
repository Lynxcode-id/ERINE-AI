
import fetch from 'node-fetch'
import pkg from '@whiskeysockets/baileys'
const { getBinaryNodeChild, getBinaryNodeChildren } = pkg

let handler = async (m, { conn, text, participants }) => {
    if (!text) return m.reply(`Contoh penggunaan:\n\n.oadd 628xxx`)

    await m.react('⏳')

    try {
        let _participants = participants.map(user => user.id)
        let users = (await Promise.all(
            text.split(',')
                .map(v => v.replace(/[^0-9]/g, ''))
                .filter(v => v.length > 4 && v.length < 20 && !_participants.includes(v + '@s.whatsapp.net'))
                .map(async v => [
                    v,
                    await conn.onWhatsApp(v + '@s.whatsapp.net')
                ])
        )).filter(v => v[1][0]?.exists).map(v => v[0] + '@c.us')

        if (users.length === 0) return m.reply('❌ Nomor tidak ditemukan di WhatsApp atau sudah ada di grup.')

        const response = await conn.query({
            tag: 'iq',
            attrs: {
                type: 'set',
                xmlns: 'w:g2',
                to: m.chat,
            },
            content: users.map(jid => ({
                tag: 'add',
                attrs: {},
                content: [{ tag: 'participant', attrs: { jid } }]
            }))
        })

        const pp = await conn.profilePictureUrl(m.chat).catch(_ => null)
        let jpegThumbnail = Buffer.alloc(0)
        if (pp) {
            try {
                const res = await fetch(pp)
                jpegThumbnail = Buffer.from(await res.arrayBuffer())
            } catch (e) {
                console.error('Gagal ambil PP grup:', e)
            }
        }

        const add = getBinaryNodeChild(response, 'add')
        const participant = getBinaryNodeChildren(add, 'participant')

        for (const user of participant.filter(item => item.attrs.error == 403)) {
            const jid = user.attrs.jid
            const content = getBinaryNodeChild(user, 'add_request')
            const invite_code = content.attrs.code
            const invite_code_exp = content.attrs.expiration

            let teks = `Mengundang @${jid.split('@')[0]} menggunakan invite karena akunnya privat...`
            await conn.sendMessage(m.chat, {
                text: teks,
                mentions: [jid]
            })

            await conn.sendGroupV4Invite(
                m.chat,
                jid,
                invite_code,
                invite_code_exp,
                await conn.getName(m.chat),
                'Invitation to join Erine-MD Project group',
                jpegThumbnail
            )
        }

        await m.react('✅')

    } catch (e) {
        console.error(e)
        await m.react('❌')
        m.reply('⚠️ Terjadi kesalahan saat mencoba menambahkan member.')
    }
}

handler.help = ['add', '+'].map(v => 'o' + v + ' @user')
handler.tags = ['owner']
handler.command = /^(oadd|o\+)$/i

handler.owner = true
handler.group = true
handler.botAdmin = true

export default handler
