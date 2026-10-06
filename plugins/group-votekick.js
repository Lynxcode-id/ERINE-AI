
let handler = async (m, { conn, text, usedPrefix, command, isBotAdmin }) => {
    if (!isBotAdmin) return m.reply('❌ Bot harus jadi Admin dulu buat bisa eksekusi Votekick!');

    conn.votekick = conn.votekick ? conn.votekick : {};
    let id = m.chat;

    if (command === 'votekick') {
        let target = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : null);
        if (!target) return m.reply(`❌ Tag atau balas pesan orang yang mau di-votekick!\n\n*Contoh:*\n${usedPrefix + command} @user`);
        if (target === conn.user.jid) return m.reply('❌ Masa lu mau nge-vote bot sendiri cuy!');

        if (id in conn.votekick) return m.reply(`❌ Masih ada sesi votekick yang berjalan di grup ini! Ketik ${usedPrefix}hapusvote untuk membatalkan.`);

        conn.votekick[id] = {
            target: target,
            voters: [m.sender],
            limit: 5
        };

        m.reply(`┌˚₊ ๑│ ᴠ ᴏ ᴛ ᴇ ᴋ ɪ ᴄ ᴋ  ᴍ ᴜ ʟ ᴀ ɪ │๑˚₊ ⚖️\n┇ \n│ Target: @${target.split('@')[0]}\n│ Pemilih: 1/${conn.votekick[id].limit}\n┇ \n│ Ketik *${usedPrefix}upvote* untuk setuju mengeluarkan target!\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`, null, { mentions: [target] });
    }

    else if (command === 'upvote') {
        if (!(id in conn.votekick)) return m.reply(`❌ Tidak ada sesi votekick yang aktif.`);

        let vote = conn.votekick[id];
        if (vote.voters.includes(m.sender)) return m.reply('❌ Lu udah nge-vote cuy!');

        vote.voters.push(m.sender);

        if (vote.voters.length >= vote.limit) {
            await m.reply(`┌˚₊ ๑│ ᴠ ᴏ ᴛ ᴇ ᴋ ɪ ᴄ ᴋ  s ᴜ ᴋ s ᴇ s │๑˚₊ 🔨\n┇ \n│ Target telah mencapai ${vote.limit} vote!\n│ Mengeksekusi target...\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`);
            await conn.groupParticipantsUpdate(m.chat, [vote.target], 'remove');
            delete conn.votekick[id];
        } else {
            m.reply(`✅ *Vote diterima!* (${vote.voters.length}/${vote.limit})\nKetik ${usedPrefix}upvote untuk setuju.`);
        }
    }

    else if (command === 'hapusvote') {
        if (!(id in conn.votekick)) return m.reply('❌ Tidak ada votekick yang sedang berjalan.');
        delete conn.votekick[id];
        m.reply('✅ Sesi votekick berhasil dibatalkan.');
    }
}

handler.help = ['votekick @user', 'upvotekick', 'hapusvotekick'];
handler.tags = ['group'];
handler.command = /^(votekick|upvotekick|hapusvotekick)$/i;
handler.group = true;

export default handler;
