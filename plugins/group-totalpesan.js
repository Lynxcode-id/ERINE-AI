import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let chatDbPath = path.join(__dirname, './lib/chat.json');

const loadChatData = () => {
    try {
        if (!fs.existsSync(chatDbPath)) {
            fs.writeFileSync(chatDbPath, JSON.stringify({}));
        }
        let rawData = fs.readFileSync(chatDbPath);
        return JSON.parse(rawData);
    } catch (err) {
        console.error(err);
        return {};
    }
};

const saveChatData = (data) => {
    try {
        fs.writeFileSync(chatDbPath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
};

const getDayName = (date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
};

const getFormattedDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

let handler = async (m, { conn }) => {
    let chatData = loadChatData();
    const messages = conn.chats[m.chat]?.messages || {};
    const participants = (await conn.groupMetadata(m.chat)).participants;
    const participantCounts = chatData[m.chat] || {};

    Object.values(messages).forEach(({ key }) => {
        const sender = key.participant || key.remoteJid;
        participantCounts[sender] = (participantCounts[sender] || 0) + 1;
    });

    participants.forEach(({ id }) => {
        if (!participantCounts[id]) {
            participantCounts[id] = 0;
        }
    });

    chatData[m.chat] = participantCounts;
    saveChatData(chatData);

    const sortedData = Object.entries(participantCounts).sort((a, b) => b[1] - a[1]);
    const totalMessages = sortedData.reduce((acc, [, total]) => acc + total, 0);

    const pesan = sortedData
        .map(([jid, total], index) => `*${index + 1}.* ${jid.replace(/(\d+)@.+/, '@$1')}: *${total}* pesan`)
        .join('\n');

    const currentDate = new Date();
    const dayName = getDayName(currentDate);
    const formattedDate = getFormattedDate(currentDate);

    await m.reply(
        `*Total Pesan*: *${totalMessages}* pesan dari *${participants.length}* anggota\n` +
        `*Tanggal*: ${dayName}, ${formattedDate}\n\n${pesan}`,
        null,
        {
            contextInfo: {
                mentionedJid: sortedData.map(([jid]) => jid),
            },
        }
    );
};

handler.help = ['totalpesan'];
handler.tags = ['group'];
handler.command = /^(totalpesan)$/i;
handler.group = true;

export default handler;
