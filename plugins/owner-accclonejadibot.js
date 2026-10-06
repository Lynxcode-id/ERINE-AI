import { startJadibot, consumeCloneRequest } from '../lib/jadibot.js'

function onlyNumber(text = '') {
    return String(text || '').replace(/[^0-9]/g, '')
}

let handler = async (m, { conn, text }) => {
    const target = onlyNumber(text || m.quoted?.text || '')
    if (!target) {
        return m.reply('❌ Masukkan nomor target clone.\nContoh: `.accjadibotclone 6281234567890`')
    }

    const req = consumeCloneRequest(target)
    if (!req) {
        return m.reply(`❌ Request clone untuk ${target} tidak ditemukan atau sudah pernah diproses.`)
    }

    await m.react('⏳')
    try {
        await startJadibot(conn, m, `${target}@s.whatsapp.net`, false, 'clone')
        await m.react('✅')
        await m.reply(
            `✅ Clone jadibot untuk *${target}* telah di-ACC dan diaktifkan.\n` +
            `Mode: *CLONE*`
        )
    } catch (e) {
        await m.react('❌')
        return m.reply(`❌ Gagal menyetujui clone: ${e.message || String(e)}`)
    }
}

handler.help = ['accjadibotclone']
handler.tags = ['owner']
handler.command = /^(accjadibotclone)$/i
handler.owner = true

export default handler
