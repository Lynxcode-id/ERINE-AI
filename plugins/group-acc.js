
let handler = async (m, { conn, args, usedPrefix, command }) => {
    let chat = global.db.data.chats[m.chat]
    if (!chat) {
        global.db.data.chats[m.chat] = {}
        chat = global.db.data.chats[m.chat]
    }
    if (!chat.leftMembers) chat.leftMembers = []

    const cmd = command.toLowerCase()
    const sub = args[0]?.toLowerCase()
    const option = args.slice(1).join(' ')?.trim()

    const makeUI = (title, content) => {
        return `┌˚₊ ๑│ ${title} │๑˚₊\n` +
               `┇ \n` +
               content.split('\n').map(line => `│ ${line}`).join('\n') + `\n` +
               `┇ \n` +
               `└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`
    }

    if (cmd === 'autokutu') {
        if (['on', 'enable', 'aktif', '1'].includes(sub)) {
            chat.kutuLoncat = true
            return m.reply(makeUI('A U T O  R E J E C T', '✅ *Auto Reject Kutu Loncat* berhasil diaktifkan!\nMember yang pernah keluar grup akan ditolak otomatis saat meminta bergabung kembali.'))
        }
        if (['off', 'disable', 'mati', '0'].includes(sub)) {
            chat.kutuLoncat = false
            return m.reply(makeUI('A U T O  R E J E C T', '❌ *Auto Reject Kutu Loncat* telah dimatikan.'))
        }
        return m.reply(makeUI('S E T T I N G S', `ℹ️ Status saat ini: *${chat.kutuLoncat ? 'AKTIF ✅' : 'MATI ❌'}*\n\n*Gunakan:*\n${usedPrefix + command} on\n${usedPrefix + command} off`))
    }

    function formatDate(timestamp) {
        return new Intl.DateTimeFormat('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }).format(new Date(timestamp * 1000));
    }

    if (!sub || !['list', 'approve', 'reject'].includes(sub)) {
        return m.reply(
            `┌˚₊ ๑│ ʀ ᴇ ǫ ᴜ ᴇ s ᴛ  ᴍ ᴀ ɴ ᴀ ɢ ᴇ ʀ │๑˚₊ 👥\n` +
            `┇ \n` +
            `│ • ${usedPrefix}acc list\n` +
            `│ • ${usedPrefix}acc approve all\n` +
            `│ • ${usedPrefix}acc reject all\n` +
            `│ • ${usedPrefix}acc approve 1|2|3\n` +
            `│ • ${usedPrefix}acc reject 1|2|3\n` +
            `│ • ${usedPrefix}autokutu on/off\n` +
            `┇ \n` +
            `└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`
        );
    }

    await m.react('⏳');

    try {
        const pendingList = await conn.groupRequestParticipantsList(m.chat);

        if (!pendingList || pendingList.length === 0) {
            await m.react('📭');
            return m.reply(`┌˚₊ ๑│ ʀ ᴇ ǫ ᴜ ᴇ s ᴛ  ᴍ ᴀ ɴ ᴀ ɢ ᴇ ʀ │๑˚₊ 📭\n┇ \n│ Tidak ada request masuk yang tertunda di grup ini.\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`);
        }

        if (sub === 'list') {
            let text = `┌˚₊ ๑│ ᴅ ᴀ ғ ᴛ ᴀ ʀ  ʀ ᴇ ǫ ᴜ ᴇ s ᴛ │๑˚₊ 📋\n┇ \n│ 👥 *Total:* ${pendingList.length} orang\n┇ \n`;

            const mentions = [];
            for (let i = 0; i < pendingList.length; i++) {
                const req = pendingList[i];
                const jid = conn.decodeJid(req.jid);
                const number = jid.split('@')[0];
                const method = req.request_method || '-';
                const time = req.request_time ? formatDate(req.request_time) : '-';

                let isKutu = chat.leftMembers.includes(jid) ? ' ⚠️ *(Kutu Loncat)*' : '';

                text += `│ *${i + 1}.* @${number}${isKutu}\n`;
                text += `│ 📨 *Metode:* ${method}\n`;
                text += `│ 🕐 *Waktu:* ${time}\n┇ \n`;
                mentions.push(jid);
            }

            text += `└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`;

            return conn.sendMessage(m.chat, {
                text: text.trim(),
                mentions
            }, { quoted: m });
        }

        const action = sub === 'approve' ? 'approve' : 'reject';

        if (option === 'all') {
            const jids = pendingList.map(v => conn.decodeJid(v.jid));
            const res = await conn.groupRequestParticipantsUpdate(m.chat, jids, action);

            const success = res.filter(r => r.status == 200 || r.status == '200' || !r.status).length;
            const failed = res.length - success;

            await m.react('✅');
            return m.reply(
                `┌˚₊ ๑│ ᴇ ᴋ s ᴇ ᴋ ᴜ s ɪ  ᴀ ʟ ʟ │๑˚₊ ✅\n` +
                `┇ \n` +
                `│ ⚙️ *Aksi:* ${action.toUpperCase()}\n` +
                `│ ✔️ *Berhasil:* ${success}\n` +
                `│ ❌ *Gagal:* ${failed}\n` +
                `┇ \n` +
                `└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`
            );
        }

        const index = option.split('|')
            .map(v => parseInt(v.trim()) - 1)
            .filter(v => !isNaN(v) && v >= 0 && v < pendingList.length);

        if (index.length === 0) {
            return m.reply(
                `┌˚₊ ๑│ ʀ ᴇ ǫ ᴜ ᴇ s ᴛ  ᴍ ᴀ ɴ ᴀ ɢ ᴇ ʀ │๑˚₊ ❌\n` +
                `┇ \n` +
                `│ Format salah!\n` +
                `│ Contoh: ${usedPrefix + command} ${sub} 1|2|5\n` +
                `┇ \n` +
                `└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`
            );
        }

        let resultText = '';
        let ok = 0;

        for (let i of index) {
            const target = pendingList[i];
            const jid = conn.decodeJid(target.jid);
            try {
                const res = await conn.groupRequestParticipantsUpdate(m.chat, [jid], action);
                const success = res[0]?.status == 200 || res[0]?.status == '200' || !res[0]?.status;

                resultText += `│ ${success ? '✅' : '❌'} @${jid.split('@')[0]}\n`;
                if (success) ok++;
            } catch {
                resultText += `│ ❌ @${jid.split('@')[0]}\n`;
            }
        }

        await m.react('✅');
        await conn.sendMessage(m.chat, {
            text: `┌˚₊ ๑│ ʜ ᴀ s ɪ ʟ  ${action.toUpperCase()} │๑˚₊ 📋\n┇ \n${resultText}┇ \n│ ✔️ *Berhasil:* ${ok}/${index.length} orang\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`,
            mentions: index.map(i => conn.decodeJid(pendingList[i].jid))
        }, { quoted: m });

    } catch (e) {
        console.error("[Acc Error]:", e);
        await m.react('❌');
        m.reply(`┌˚₊ ๑│ s ʏ s ᴛ ᴇ ᴍ  ᴇ ʀ ʀ ᴏ ʀ │๑˚₊ ❌\n┇ Gagal memproses request:\n┇ ${e.message || String(e)}\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`);
    }
};

handler.help = ['acc list', 'acc approve', 'acc reject', 'autokutu <on/off>'];
handler.tags = ['group'];
handler.command = /^(acc|approve|reject|autokutu)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

handler.before = async function (m, { isBotAdmin }) {
    if (!m.isGroup || !isBotAdmin) return false
    if (m.isBaileys || m.fromMe) return false

    const DB = this.db || global.db
    let chat = DB?.data?.chats?.[m.chat] || {}

    if (!chat.kutuLoncat || !chat.leftMembers || chat.leftMembers.length === 0) return false

    if (chat.lastKutuCheck && (Date.now() - chat.lastKutuCheck) < 60000) return false
    chat.lastKutuCheck = Date.now()

    try {
        const pendingList = await this.groupRequestParticipantsList(m.chat)
        if (!pendingList || pendingList.length === 0) return false

        let rejected = []
        for (let req of pendingList) {
            let reqJid = this.decodeJid(req.jid)
            if (chat.leftMembers.includes(reqJid)) {
                await this.groupRequestParticipantsUpdate(m.chat, [reqJid], 'reject')
                rejected.push(reqJid)
            }
        }

        if (rejected.length > 0) {
            let text = `┌˚₊ ๑│ ᴀ ᴜ ᴛ ᴏ  ʀ ᴇ ᴊ ᴇ ᴄ ᴛ │๑˚₊ 🚫\n┇ \n│ ⚠️ *Kutu Loncat Terdeteksi!*\n│ User terdeteksi telah pernah memasuki grup, permintaan bergabung otomatis Erine tolak!\n┇ \n`
            rejected.forEach(jid => {
                text += `│ 👤 @${jid.split('@')[0]}\n`
            })
            text += `└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI`

            await this.sendMessage(m.chat, { text, mentions: rejected })
        }
    } catch (e) {
        console.error('[Auto Reject Kutu Loncat Error]', e)
    }
    return false // Biarin message diterusin normal
}

handler.participantsUpdate = async function ({ id, participants, action }) {
    const DB = this.db || global.db
    let chat = DB?.data?.chats?.[id]
    if (!chat) return
    if (!chat.leftMembers) chat.leftMembers = []

    if (action === 'remove' || action === 'leave') {
        for (let jid of participants) {
            if (!chat.leftMembers.includes(jid)) {
                chat.leftMembers.push(jid)
            }
        }
    }
}

export default handler
