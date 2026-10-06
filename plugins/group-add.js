let handler = async (m, { conn, text, participants, usedPrefix, command }) => {
  if (!text) throw `⚠️ Masukkan nomor yang ingin ditambahkan!\n\n📌 Contoh:\n${usedPrefix + command} 628xxxx`

  await m.react('⏳')

  let input = text.split(',')
    .map(v => v.replace(/[^0-9]/g, ''))
    .filter(v => v.length > 4 && v.length < 20)

  if (input.length === 0) {
    await m.react('❌')
    return m.reply('❌ Nomor tidak valid.')
  }

  let _participants = participants.map(user => user.id)
  let usersToInvite = []

  for (let num of input) {
    let jid = num + '@s.whatsapp.net'
    let onWa = await conn.onWhatsApp(jid)
    if (onWa[0]?.exists && !_participants.includes(jid)) {
      usersToInvite.push(jid)
    }
  }

  if (usersToInvite.length === 0) {
    await m.react('❌')
    return m.reply('❌ Nomor tidak terdaftar di WhatsApp atau sudah ada di dalam grup.')
  }

  let successCount = 0
  let failedCount = 0
  let inviteList = []

  for (let jid of usersToInvite) {
    try {
      const response = await conn.groupParticipantsUpdate(m.chat, [jid], 'add')
      let status = response[0]?.status

      if (status === '403') {
        inviteList.push(jid)
      } else if (status === '408') {
        await conn.reply(m.chat, `⚠️ Tidak dapat menambahkan @${jid.split('@')[0]} karena dia baru saja keluar atau di-kick dari grup ini.`, m, { mentions: [jid] })
        failedCount++
      } else if (status === '200' || !status) {
        successCount++
      }
    } catch (e) {
      console.error(`Gagal menambahkan ${jid}:`, e)
      failedCount++
    }
  }

  if (inviteList.length > 0) {
    let txt = `📨 Mengundang ${inviteList.length} pengguna menggunakan link undangan karena privasi akun mereka...\n\n`
    for (let jid of inviteList) {
        txt += `• @${jid.split('@')[0]}\n`
    }
    await m.reply(txt, null, { mentions: inviteList })

    try {
        let code = await conn.groupInviteCode(m.chat)
        let link = `https://chat.whatsapp.com/${code}`

        for (let jid of inviteList) {
             await conn.sendMessage(jid, {
                text: `Halo!\nKamu diundang untuk bergabung ke grup *${await conn.getName(m.chat)}*.\n\nKlik link di bawah untuk bergabung:\n${link}`
             })
        }
        successCount += inviteList.length
    } catch (e) {
        console.log("Gagal bikin/kirim link invite:", e)
    }
  }

  await m.react('✅')
  m.reply(`🎯 *Selesai!*\n\n✔️ Berhasil diproses: ${successCount}\n❌ Gagal: ${failedCount}`)
}

handler.help = ['add', '+'].map(v => v + ' <nomor>')
handler.tags = ['group']
handler.command = /^(add|\+)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
