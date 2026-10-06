
const todData = {
    truth: [
        "Apa ketakutan terbesar kamu dalam sebuah hubungan?",
        "Kapan terakhir kali kamu berbohong dan untuk apa?",
        "Siapa orang yang paling kamu sukai diam-diam di grup ini?",
        "Apa rahasia paling memalukan yang pernah kamu sembunyikan dari orang tua?",
        "Pernahkah kamu menyukai pacar temanmu sendiri?",
        "Apa kebiasaan jorok yang sering kamu lakukan kalau lagi sendirian?",
        "Hal apa yang paling kamu sesali dalam hidup sampai sekarang?",
        "Apa mimpi teraneh yang pernah kamu alami?",
        "Kalau kamu bisa tukar nyawa sama satu orang di dunia, siapa itu?",
        "Apa hal paling ilegal yang pernah kamu lakukan?"
    ],
    dare: [
        "Chat mantan kamu dan bilang 'Aku kangen, balikan yuk'. Screenshot kirim sini.",
        "Telepon kontak ke-5 di WA kamu, nyanyikan lagu potong bebek angsa sampai selesai.",
        "Post foto paling aib kamu di status WA selama 1 jam.",
        "Kirim VN (Voice Note) teriak 'Woy bangun!' di grup ini.",
        "Ubah nama profil WA kamu jadi 'Aku Wibu Akut' selama 1 hari.",
        "Dm artis terkenal di IG/TikTok, bilang 'Halo sayang', screenshot kirim sini.",
        "Screenshot riwayat pencarian browser kamu, kirim di grup tanpa sensor.",
        "Tag admin grup yang menurutmu paling galak, bilang 'Lopyu bang'.",
        "Kirim stiker yang paling jarang kamu pake (paling bawah) di daftar stiker.",
        "Nyanyi lagu dangdut koplo sambil joget, kirim videonya (minimal 10 detik)."
    ]
};

let handler = async (m, { conn, command, usedPrefix }) => {
    await m.react('🎲');

    let isTruth = /^(truth|t)$/i.test(command);
    let list = isTruth ? todData.truth : todData.dare;
    let typeText = isTruth ? 'ᴛ ʀ ᴜ ᴛ ʜ' : 'ᴅ ᴀ ʀ ᴇ';
    let icon = isTruth ? '🤫' : '😈';

    let randomTod = list[Math.floor(Math.random() * list.length)];

    let caption = `┌˚₊ ๑│ ᴛ ᴏ ᴅ  ɢ ᴀ ᴍ ᴇ │๑˚₊ ${icon}\n┇ \n│ ${typeText} buat: @${m.sender.split('@')[0]}\n│ \n│ 📢 *Tantangan:* \n│ ${randomTod}\n┇ \n│ *Harus dilakukan cuy! Jan curang ya.*\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERINE-AI X LYNX DECODE`;

    await conn.sendMessage(m.chat, {
        text: caption,
        mentions: [m.sender]
    }, { quoted: m });
}

handler.help = ['truth', 'dare'];
handler.tags = ['fun', 'group'];
handler.command = /^(truth|dare|tod)$/i;
handler.group = true;

export default handler;
