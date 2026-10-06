let handler = async (m, { conn, args, usedPrefix, command }) => {

  let nomor

  if (/add|tambah|\+/.test(command)) {
    if (args.length < 2) {
      let errTeks = `┌˚₊ ๑│ I N F O │๑˚₊\n` +
                    `┇ \n` +
                    `│ ⚠️ *Format Salah!*\n` +
                    `│ *Contoh:* ${usedPrefix + command} 30 628xxxx\n` +
                    `┇ \n` +
                    `└˚₊ ๑ ────────────── ๑˚₊\n` +
                    `> © ERINE-AI`
      return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
    }
    nomor = args[1].replace(/[^0-9]/g, '')
  }

  if (/del|hapus|-/.test(command)) {
    if (args.length < 1) {
      let errTeks = `┌˚₊ ๑│ I N F O │๑˚₊\n` +
                    `┇ \n` +
                    `│ ⚠️ *Format Salah!*\n` +
                    `│ *Contoh:* ${usedPrefix + command} 628xxxx\n` +
                    `┇ \n` +
                    `└˚₊ ๑ ────────────── ๑˚₊\n` +
                    `> © ERINE-AI`
      return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
    }
    nomor = args[0].replace(/[^0-9]/g, '')
  }

  if (!nomor || nomor.length < 10) {
    let errTeks = `┌˚₊ ๑│ E R R O R │๑˚₊\n` +
                  `┇ \n` +
                  `│ ❌ Nomor tidak valid!\n` +
                  `┇ \n` +
                  `└˚₊ ๑ ────────────── ๑˚₊\n` +
                  `> © ERINE-AI`
    return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
  }

  let who = nomor + '@s.whatsapp.net'

  if (!global.db.data.users[who]) {
    global.db.data.users[who] = {
      name: await conn.getName(who) || 'Unknown',
      limit: 10,
      exp: 0,
      level: 0,
      register: false,
      premium: false,
      premiumTime: 0
    }
  }

  let user = global.db.data.users[who]
  let now = Date.now()

  switch (true) {
    case /add|tambah|\+/.test(command): {
      let hari = args[0]

      if (hari.toLowerCase() === 'permanen') {
        user.premium = true
        user.premiumTime = Infinity

        let teks = `┌˚₊ ๑│ P R E M I U M │๑˚₊\n` +
                   `┇ \n` +
                   `│ ✅ *Sukses Add Premium*\n` +
                   `│ 👤 *User:* ${nomor}\n` +
                   `│ ⭐ *Status:* Permanen\n` +
                   `│ 📅 *Tanggal:* ${new Date().toLocaleDateString()}\n` +
                   `┇ \n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI`

        await conn.sendMessage(m.chat, { text: teks }, { quoted: m })
      } else {
        if (isNaN(hari)) {
          let errTeks = `┌˚₊ ๑│ E R R O R │๑˚₊\n` +
                        `┇ \n` +
                        `│ ❌ Durasi harus berupa angka atau 'permanen'!\n` +
                        `┇ \n` +
                        `└˚₊ ๑ ────────────── ๑˚₊\n` +
                        `> © ERINE-AI`
          return conn.sendMessage(m.chat, { text: errTeks }, { quoted: m })
        }

        let ms = 86400000 * parseInt(hari)

        if (user.premiumTime && user.premiumTime > now) {
          user.premiumTime += ms
        } else {
          user.premiumTime = now + ms
        }

        user.premium = true

        let teks = `┌˚₊ ๑│ P R E M I U M │๑˚₊\n` +
                   `┇ \n` +
                   `│ ✅ *Sukses Add Premium*\n` +
                   `│ 👤 *User:* ${nomor}\n` +
                   `│ 🕒 *Durasi:* ${hari} Hari\n` +
                   `│ 📅 *Berakhir:* ${new Date(user.premiumTime).toLocaleDateString()}\n` +
                   `┇ \n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI`

        await conn.sendMessage(m.chat, { text: teks }, { quoted: m })
      }
      break
    }

    case /del|hapus|-/.test(command): {
      user.premium = false
      user.premiumTime = 0

      let teks = `┌˚₊ ๑│ P R E M I U M │๑˚₊\n` +
                 `┇ \n` +
                 `│ ⚠️ *Sukses Hapus Premium*\n` +
                 `│ 👤 *User:* ${nomor}\n` +
                 `│ 📅 *Tanggal:* ${new Date().toLocaleDateString()}\n` +
                 `┇ \n` +
                 `└˚₊ ๑ ────────────── ๑˚₊\n` +
                 `> © ERINE-AI`

      await conn.sendMessage(m.chat, { text: teks }, { quoted: m })
      break
    }
  }
}

handler.help = ['addprem <hari> <nomor>', 'delprem <nomor>']
handler.tags = ['owner']
handler.command = /^(add|tambah|\+|del|hapus|-)p(rem)?$/i
handler.owner = true

export default handler
