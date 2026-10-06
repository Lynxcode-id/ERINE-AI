
import fs from 'fs'
import syntaxError from 'syntax-error'
import path from 'path'

const _fs = fs.promises

let handler = async (m, { conn, text, usedPrefix, command, __dirname }) => {
  if (!text) throw `Penggunaan: ${usedPrefix}${command} <nama file>\nContoh: ${usedPrefix}sp jadibot`

  if (!m.quoted) throw '❌ Reply Kodenya cuy!'

  let code = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.description || ''
  if (!code && m.quoted.msg) code = m.quoted.msg.text || m.quoted.msg.caption || m.quoted.msg.conversation || ''

  if (!code && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      let qm = m.message.extendedTextMessage.contextInfo.quotedMessage
      code = qm.conversation || qm.extendedTextMessage?.text || ''
  }

  if (!code) throw '❌ Teks kodenya tidak terbaca, pastikan lu me-reply pesan yang berisi teks code!'

  if (/p(lugin)?/i.test(command)) {
    let filename = text.replace(/plugin(s)\//i, '') + (/\.js$/i.test(text) ? '' : '.js')

    const error = syntaxError(code, filename, {
      sourceType: 'module',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true
    })
    if (error) throw error

    const pathFile = path.join(__dirname, filename)
    await _fs.writeFile(pathFile, code)

    await conn.sendMessage(m.chat, { text: `✅ Sukses Menyimpan Di *${filename}*` }, { quoted: global.fkontak || m })

  } else {
    const isJavascript = code && !m.quoted.mediaMessage && /\.js$/i.test(text)

    if (isJavascript) {
      const error = syntaxError(code, text, {
        sourceType: 'module',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true
      })
      if (error) throw error

      await _fs.writeFile(text, code)
      await conn.sendMessage(m.chat, { text: `✅ Sukses Menyimpan Di *${text}*` }, { quoted: global.fkontak || m })

    } else if (m.quoted.mediaMessage) {
      const media = await m.quoted.download()
      await _fs.writeFile(text, media)
      await conn.sendMessage(m.chat, { text: `✅ Sukses Menyimpan Media Di *${text}*` }, { quoted: global.fkontak || m })

    } else {
      throw '❌ Format tidak didukung!!'
    }
  }
}

handler.help = ['saveplugin']
handler.tags = ['owner']
handler.command = /^(sf|saveplugin|sp)$/i
handler.rowner = true

export default handler
