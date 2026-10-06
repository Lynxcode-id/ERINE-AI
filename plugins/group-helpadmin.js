let handler = async (m, { conn, participants }) => {
    let admins = participants.filter(v => v.admin !== null).map(v => v.id);
    let msg = `📢 *PERMINTAAN BANTUAN!* \nAda member @${m.sender.split('@')[0]} butuh bantuan admin di grup ini. Segera cek!`;
    conn.sendMessage(m.chat, { text: msg, mentions: [...admins, m.sender] });
}
handler.help = ['helpadmin'];
handler.tags = ['group'];
handler.command = /^(helpadmin|panggiladmin)$/i;
handler.group = true;
export default handler;
