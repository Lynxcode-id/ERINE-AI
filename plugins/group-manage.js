
const handler = async (m, { conn, text, command, participants }) => {
    let prtps = participants;
    if (!prtps || prtps.length === 0) {
        const meta = await conn.groupMetadata(m.chat).catch(e => {}) || {};
        prtps = meta.participants || [];
    }


    let target = m.quoted ? m.quoted.sender : m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null;
    if (target === '@s.whatsapp.net') target = null;

    const cmdWithTarget = ['add', 'kick', 'promote', 'demote'];

    if (cmdWithTarget.includes(command) && !target) return m.reply('❌ Reply/tag siapa yang ingin diproses.');

    const inGc = target ? prtps.some((v) => {
        let targetNum = target.split('@')[0].split(':')[0];
        let pId = v.id || v.jid || '';

        if (pId.includes(targetNum)) return true;

        if (typeof conn.getJid === 'function') {
            let resolved = conn.getJid(pId);
            if (resolved && resolved.includes(targetNum)) return true;
        }

        return false;
    }) : false;

    let botJid = conn.user?.id?.split(':')[0] || conn.user?.jid?.split(':')[0] || conn.user?.id?.split('@')[0] || '';
    botJid = botJid.replace(/[^0-9]/g, '');

    try {
        switch (command) {
            case 'add':
                {
                    if (inGc) return m.reply('❌ User sudah ada didalam grup!');
                    const response = await conn.groupParticipantsUpdate(m.chat, [target], 'add');
                    const jpegThumbnail = await conn.profilePictureUrl(m.chat, 'image').catch(_ => null);

                    for (const participant of response) {
                        const jid = participant.content?.attrs?.phone_number || participant.content?.attrs?.jid || target;
                        const status = participant.status;

                        if (status === '408') {
                            m.reply(`❌ Tidak dapat menambahkan @${jid.split('@')[0]}!\nMungkin dia baru keluar dari grup ini atau dikick.`);
                        } else if (status === '403') {
                            const inviteCode = participant.content?.content?.[0]?.attrs?.code;
                            const inviteExp = participant.content?.content?.[0]?.attrs?.expiration;
                            if (inviteCode) {
                                await m.reply(`⏳ Mengundang @${jid.split('@')[0]} menggunakan link invite...`);
                                await conn.sendGroupV4Invite(m.chat, jid, inviteCode, inviteExp, 'Grup', 'Undangan untuk bergabung ke grup WhatsApp', jpegThumbnail);
                            }
                        } else {
                            m.reply(`✅ Berhasil menambahkan @${jid.split('@')[0]}`);
                        }
                    }
                }
                break;

            case 'kick':
                if (!inGc) return m.reply('❌ User tidak ada dalam grup.');
                if (target.includes(botJid)) return m.reply('❌ Gak bisa kick bot sendiri anjir!');
                await conn.groupParticipantsUpdate(m.chat, [target], 'remove');
                m.reply(`✅ Berhasil kick: @${target.split('@')[0]}`);
                break;

            case 'promote':
                if (!inGc) return m.reply('❌ User tidak berada dalam grup!');
                await conn.groupParticipantsUpdate(m.chat, [target], 'promote');
                m.reply(`✅ Promote: @${target.split('@')[0]}`);
                break;

            case 'demote':
                if (!inGc) return m.reply('❌ User tidak berada dalam grup!');
                await conn.groupParticipantsUpdate(m.chat, [target], 'demote');
                m.reply(`✅ Demote: @${target.split('@')[0]}`);
                break;

            case 'closegc':
                await conn.groupSettingUpdate(m.chat, 'announcement');
                m.reply('✅ Grup berhasil ditutup (hanya admin yang bisa chat).');
                break;

            case 'opengc':
                await conn.groupSettingUpdate(m.chat, 'not_announcement');
                m.reply('✅ Grup berhasil dibuka (semua member bisa chat).');
                break;

            default:
                return m.reply('Perintah tidak dikenal.');
        }
    } catch (error) {
        console.error(error);
        m.reply('❌ Gagal mengeksekusi perintah!\n\n_Pastikan bot sudah diangkat menjadi Admin Grup._');
    }
};

handler.help = ['add', 'kick', 'promote', 'demote', 'closegc', 'opengc'];
handler.tags = ['group'];
handler.command = /^(add|kick|promote|demote|closegc|opengc)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
