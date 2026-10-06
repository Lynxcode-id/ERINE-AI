import fs from 'fs'
import path from 'path'

const clearTmpFolder = () => {
    const tmpDir = path.resolve(process.cwd(), 'tmp')

    if (!fs.existsSync(tmpDir)) return 0

    const files = fs.readdirSync(tmpDir)
    let count = 0

    for (const file of files) {
        const filePath = path.join(tmpDir, file)
        try {
            const stats = fs.statSync(filePath)
            if (stats.isFile()) {
                fs.unlinkSync(filePath)
                count++
            } else if (stats.isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true })
                count++
            }
        } catch (e) {
            console.error(`[CLEAR TMP] Gagal menghapus file: ${filePath}`, e)
        }
    }
    return count
}

const AUTO_CLEAR_INTERVAL = 1 * 60 * 60 * 1000

if (!global.autoClearTmpStarted) {
    global.autoClearTmpStarted = true

    setInterval(() => {
        try {
            let deletedCount = clearTmpFolder()
            if (deletedCount > 0) {
                console.log(`[AUTO CLEAR TMP] ✅ Berhasil menghapus ${deletedCount} file/folder dari folder tmp.`)
            }
        } catch (error) {
            console.error('[AUTO CLEAR TMP ERROR] Terjadi kesalahan:', error)
        }
    }, AUTO_CLEAR_INTERVAL)

    console.log(`[SYSTEM] Auto-Clear Tmp diaktifkan (Setiap ${AUTO_CLEAR_INTERVAL / 3600000} Jam).`)
}

let handler = async (m, { conn }) => {
    const makeUI = (title, content) => {
        return `┌˚₊ ๑│ ${title} │๑˚₊\n` +
               `┇ \n` +
               content.split('\n').map(line => `│ ${line}`).join('\n') + `\n` +
               `┇ \n` +
               `└˚₊ ๑ ────────────── ๑˚₊\n` +
               `> © ERINE-AI`
    }

    await m.react('⏳')
    let msg = await conn.sendMessage(m.chat, { text: makeUI('C L E A R  T M P', '⏳ _Sedang membersihkan folder tmp..._') }, { quoted: m })

    try {
        let deletedCount = clearTmpFolder()

        let teksHasil = deletedCount > 0
            ? `✅ Berhasil menghapus *${deletedCount} file/folder* dari penyimpanan sementara (tmp).`
            : `ℹ️ Folder tmp sudah dalam keadaan bersih. Tidak ada file yang dihapus.`

        await conn.sendMessage(m.chat, { text: makeUI('C L E A R  T M P', teksHasil), edit: msg.key })
        await m.react('✅')

    } catch (e) {
        await m.react('❌')
        let errTeks = makeUI('E R R O R', `⚠️ Gagal membersihkan folder tmp.\n💬 *Pesan:* ${e.message}`)
        await conn.sendMessage(m.chat, { text: errTeks, edit: msg.key })
    }
}

handler.help = ['cleartmp']
handler.tags = ['owner']
handler.command = /^(cleartmp|cleartemp|deltmp)$/i
handler.rowner = true

export default handler
