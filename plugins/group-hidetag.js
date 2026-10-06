let handler = async (m, { conn, text, participants }) => {
  const resolveJid = (jid = '') => {
    jid = String(jid || '')
    if (!jid) return ''
    jid = typeof conn?.decodeJid === 'function' ? conn.decodeJid(jid) : (jid.decodeJid?.() || jid)

    if (jid.endsWith('@lid') && typeof conn?.getJid === 'function') {
      const resolved = conn.getJid(jid)
      if (resolved && !resolved.endsWith('@lid')) jid = resolved
    }

    if (/^\d+$/.test(jid)) jid = `${jid}@s.whatsapp.net`
    return jid
  }

  const fallbackText = (
    m.quoted?.text ||
    m.quoted?.caption ||
    m.quoted?.message?.extendedTextMessage?.text ||
    m.quoted?.message?.conversation ||
    ''
  ).trim()

  const msgText = (text || '').trim() || fallbackText
  if (!msgText) throw 'Masukkan teks setelah perintah atau balas pesan berteks lalu ketik .hidetag'

  const fkontak = {
    key: {
      participants: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast',
      fromMe: false,
      id: 'Halo'
    },
    message: {
      contactMessage: {
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
      }
    },
    participant: '0@s.whatsapp.net'
  }

  const mentions = [...new Set((participants || []).map(a => resolveJid(a.id || a.jid || a.lid)).filter(Boolean))]

  await conn.sendMessage(
    m.chat,
    { text: msgText, mentions },
    { quoted: fkontak }
  )
}

handler.help = ['hidetag', 'h']
handler.tags = ['group']
handler.command = /^(hidetag|h)$/i

handler.group = true
handler.admin = true

export default handler
