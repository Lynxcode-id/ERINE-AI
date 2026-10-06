let handler = async (m, { conn, args, usedPrefix, command }) => {
    let chat = global.db.data.chats[m.chat]
    if (!chat) chat = global.db.data.chats[m.chat] = {}

    if (args[0] === 'on') {
        if (chat.antibot) return m.reply('✅ AntiBot sudah aktif di grup ini.')
        chat.antibot = true
        let teks = `┌˚₊ ๑│ A N T I  B O T │๑˚₊ 🤖\n` +
                   `┇ \n` +
                   `│ ✅ *AntiBot berhasil diaktifkan!*\n` +
                   `│ Sistem cerdas Erine (Smart Heuristic) akan memantau dan menendang bot yang mencoba menyusup ke grup ini.\n` +
                   `┇ \n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: teks }, { quoted: m })
    }

    if (args[0] === 'off') {
        if (!chat.antibot) return m.reply('❌ AntiBot sudah nonaktif di grup ini.')
        chat.antibot = false
        let teks = `┌˚₊ ๑│ A N T I  B O T │๑˚₊ 🤖\n` +
                   `┇ \n` +
                   `│ ❌ *AntiBot dinonaktifkan!*\n` +
                   `┇ \n` +
                   `└˚₊ ๑ ────────────── ๑˚₊\n` +
                   `> © ERINE-AI`
        return conn.sendMessage(m.chat, { text: teks }, { quoted: m })
    }

    let teks = `🤖 *AntiBot System*\n\n` +
               `> Status: ${chat.antibot ? "✅ Aktif" : "❌ Nonaktif"}\n\n` +
               `> Deteksi: *Smart Heuristic Full*\n\n` +
               `> Gunakan: \`${usedPrefix + command} on/off\``
    return conn.sendMessage(m.chat, { text: teks }, { quoted: m })
}

handler.before = async function (m, { conn, isAdmin, isBotAdmin }) {
    if (!m.isGroup) return
    let chat = global.db.data.chats[m.chat]
    if (!chat || !chat.antibot) return

    if (m.fromMe) return
    if (isAdmin) return
    if (!isBotAdmin) return

    function extractMessageId(msg) {
        return String(msg?.key?.id || msg?.id || "").trim();
    }

    function extractSenderDevice(msg) {
        const participant = String(msg?.key?.participant || msg?.sender || "");
        const match = participant.match(/:(\d+)@/);
        if (!match) return null;
        const value = Number.parseInt(match[1], 10);
        return Number.isNaN(value) ? null : value;
    }

    function isUnknownPushName(pushName) {
        const value = String(pushName || "").trim().toLowerCase();
        return !value || ["unknown", "undefined", "null"].includes(value);
    }

    const messageId = extractMessageId(m);
    if (!messageId || messageId.startsWith("WAMID.") || messageId.startsWith("false_") || messageId.startsWith("true_")) {
        return
    }

    let score = 0;
    const reasons = [];
    const idUpper = messageId.toUpperCase();

    if (idUpper.startsWith("BAE5")) { score += 5; reasons.push("id-BAE5"); }
    else if (idUpper.startsWith("3EB0") && idUpper.length === 22) { score += 4; reasons.push("id-3EB0"); }
    else if (idUpper.startsWith("B24E")) { score += 5; reasons.push("id-B24E"); }
    else if (idUpper.startsWith("94DD")) { score += 5; reasons.push("id-94DD"); }
    else if (idUpper.startsWith("B1E")) { score += 5; reasons.push("id-B1E"); }
    else if (/^[A-F0-9]{28,40}$/i.test(messageId)) { score += 2; reasons.push("id-upper-hex"); }
    else if (messageId.length === 16) { score += 3; reasons.push("id-length-16"); }
    else if (messageId.length < 20 && !messageId.includes("-")) { score += 2; reasons.push("id-length-suspicious"); }

    if (/[a-z]/.test(messageId) && !messageId.startsWith("3EB0") && !messageId.includes("-")) {
        score += 4; reasons.push("id-lowercase-signature");
    }

    const len = messageId.length;
    if (len !== 16 && len !== 20 && len !== 22 && len !== 32 && !messageId.includes("-")) {
        score += 3; reasons.push("id-length-unusual");
    }

    if (m.isBaileys === true) {
        score += 5; reasons.push("flag-isBaileys");
    }

    const msg = m.message || m.msg || {};
    const actualMsg = msg.ephemeralMessage?.message || msg.viewOnceMessage?.message || msg.viewOnceMessageV2?.message || msg;

    const textMsg = m.text || actualMsg?.conversation || actualMsg?.extendedTextMessage?.text || "";
    const contextInfo = actualMsg?.extendedTextMessage?.contextInfo || actualMsg?.imageMessage?.contextInfo || actualMsg?.videoMessage?.contextInfo || {};

    if (contextInfo.externalAdReply) { score += 6; reasons.push("custom-ad-reply"); }
    if (contextInfo.isForwarded && contextInfo.forwardingScore > 100) { score += 3; reasons.push("fake-forward-score"); }
    if (/[\u200B-\u200D\uFEFF]/.test(textMsg)) { score += 3; reasons.push("invisible-characters"); }

    const botMessageTypes = [
        'buttonsMessage', 'templateMessage', 'listMessage',
        'interactiveMessage', 'buttonsResponseMessage',
        'templateButtonReplyMessage', 'listResponseMessage',
        'interactiveResponseMessage'
    ];

    for (const type of botMessageTypes) {
        if (actualMsg[type]) { score += 6; reasons.push(`message-type-${type}`); break; }
    }

    if (msg.deviceSentMessage) {
        score += 1; reasons.push("message-deviceSent");
        if (msg.deviceSentMessage?.message) { score += 1; reasons.push("message-deviceWrapper"); }
    }

    const senderDevice = extractSenderDevice(m);
    if (Number.isInteger(senderDevice) && senderDevice > 20) { score += 2; reasons.push("participant-highDevice"); }

    const lowerPushName = String(m.pushName || "").toLowerCase();
    if (isUnknownPushName(m.pushName)) { score += 1; reasons.push("pushname-unknown"); }
    else if (/(bot|system|admin|owner|host|panel)/i.test(lowerPushName)) { score += 2; reasons.push("pushname-suspicious"); }

    if (score >= 5) {
        try {
            try { await conn.sendMessage(m.chat, { delete: m.key }) } catch (e) {}

            await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')

            let alertTeks = `┌˚₊ ๑│ A N T I  B O T  A L E R T │๑˚₊ 🚨\n` +
                            `┇ \n` +
                            `│ 🤖 *Penyusup Terdeteksi!*\n` +
                            `│ @${m.sender.split('@')[0]} dikeluarkan karena teridentifikasi sebagai bot.\n` +
                            `│ \n` +
                            `│ 📊 *Skor Deteksi:* ${score}\n` +
                            `│ 🔍 *Alasan:* ${reasons.join(', ')}\n` +
                            `┇ \n` +
                            `└˚₊ ๑ ────────────── ๑˚₊\n` +
                            `> © ERINE-AI SYSTEM`

            await conn.sendMessage(m.chat, { text: alertTeks, mentions: [m.sender] }, { quoted: null })
        } catch (e) {
            console.error('ANTIBOT ERROR:', e)
        }
    }

    return
}

handler.help = ['antibot <on/off>']
handler.tags = ['group']
handler.command = /^(antibot|botdetect)$/i
handler.admin = true
handler.botAdmin = true
handler.group = true

export default handler
