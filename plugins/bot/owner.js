
import { config } from '../../settings.js'
import { useStarforge } from '../../lib/function.js'

const BODY = '✨ *Informasi Pengembang - Team - Komunitas, Bot kami, ERINE-AI 2ND*'
const FOOTER = '👉 Geser untuk melihat lebih lanjut'
const CARD_FOOTER = '© ERINE-AI'

const CARDS = [
  {
    media: 'https://raw.githubusercontent.com/Lynxcode-id/picture/main/1787632987010.jpeg',
    title: '👤 Profil Developer',
    text: '• *Owner:* +62 882-5804-1396\n• *Bot:* +62 882-4222-3382\n• *Support:* +62 813-6213-3135',
    footer: CARD_FOOTER,
    buttons: [
      { text: '💬 Chat Owner', url: 'https://wa.me/6288258041396' },
      { text: '🎧 Hubungi Support', url: 'https://wa.me/6281362133135' }
    ]
  },
  {
    media: 'https://raw.githubusercontent.com/Lynxcode-id/picture/main/1787633008694.jpeg',
    title: '👩‍💻 Lead Dev & Partner',
    text: '• *Nama:* Dinda\n• *Inisial WA:* @noveliyn\n• *Role:* 2nd Developer & Admin ke-3 INF Project\n• *Join Date:* 6 Maret 2024\n\n_*) Nomor kontak disembunyikan untuk alasan privasi._',
    footer: CARD_FOOTER,
    buttons: [
      { text: '🌐 INF Project', url: 'https://whatsapp.com/channel/0029VbAnuii6GcGCu73oep1i' }
    ]
  },
  {
    media: 'https://raw.githubusercontent.com/Lynxcode-id/picture/main/1787632993697.jpeg',
    title: '📢 Channel Informasi',
    text: 'Dapatkan info update terbaru dan share code bot di channel WhatsApp resmi kami.',
    footer: CARD_FOOTER,
    buttons: [
      { text: '🌐 Channel Utama', url: 'https://whatsapp.com/channel/0029VbAnuii6GcGCu73oep1i' },
      { text: '📂 Backup / Share Code', url: 'https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X' }
    ]
  },
  {
    media: 'https://raw.githubusercontent.com/Lynxcode-id/picture/main/1787633002650.jpeg',
    title: '👥 Komunitas & API',
    text: 'Gabung ke grup diskusi komunitas dan pantau info seputar Rest API Lynx.',
    footer: CARD_FOOTER,
    buttons: [
      { text: '⚡ Rest API Lynx', url: 'https://chat.whatsapp.com/JSpJwqF0FptGvIJ6w3mdOh?s=cl&p=a&mlu=0&ilr=0' },
      { text: '💬 Join Grup Chat', url: 'https://chat.whatsapp.com/DyF8W35dgjzIHcmTsPa6Jj' }
    ]
  }
]

async function sendCarouselWithFallback(sock, m) {
  let lastErr
  for (const q of [m.raw, m, null]) {
    try {
      return await sock.sendCarousel(m.chat, CARDS, q, { text: BODY, footer: FOOTER })
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}

async function sendOwnerVcard(m) {
  const number = String(config.owner).replace(/\D/g, '')
  const name = config.ownerName
  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    `TEL;type=CELL;type=VOICE;waid=${number}:+${number}`,
    'END:VCARD'
  ].join('\n')

  await m.reply({ contactMessage: { displayName: name, vcard } })
}

export default {
  command: 'owner',
  alias: ['creator'],
  category: 'bot',
  description: `> Menampilkan informasi pengembang, tim, channel, dan komunitas dalam bentuk carousel.

contoh penggunaan:
> \`.owner\``,
  help: '',
  typing: true,

  async execute(m, { sock }) {
    await sock.sendReact(m.chat, '😽', m.id).catch(() => {})

    try {
      await useStarforge(sock)
      await sendCarouselWithFallback(sock, m)
      await sock.sendReact(m.chat, '😈', m.id).catch(() => {})
    } catch (err) {
      console.error('[OWNER] Gagal memuat carousel:', err?.stack || err?.message || err)
      await sock.sendReact(m.chat, '❌', m.id).catch(() => {})
      try {
        await sendOwnerVcard(m)
      } catch (e) {
        console.error('[OWNER] vCard cadangan gagal:', e?.message || e)
        await m.reply(`Gagal memuat UI Carousel.\n› Pesan: ${err?.message || err}\n\n> © ERINE-AI`)
      }
    }
  }
}