import {
  MAX_WELCOME_LENGTH,
  WELCOME_FOOTER,
  buildWelcomeUsage,
  extractWelcomeText,
  getLeft,
  setLeft
} from '../../lib/welcome.js'

const shown = m => m.prefix || '.'

export default {
  command: 'setleft',
  alias: ['setbye', 'setgoodbye', 'leftset'],
  category: 'grup',
  tags: ['grup'],
  description: `> Mengatur pesan perpisahan otomatis untuk member yang keluar dari grup (dikirim 4-8 detik setelah keluar).

*Kata kunci:*
> \`@user\` = tag member yang keluar.
> \`@namegc\` = nama grup.
> \`@desk\` = deskripsi grup.

contoh penggunaan:
> \`.setleft sampai jumpa @user 👋, semoga sukses di luar @namegc\`

Sudah pernah diatur? Pakai \`.changeleft\`.`,
  help: '<teks left>',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m) {
    const text = extractWelcomeText(m)

    if (!text) {
      return m.reply(buildWelcomeUsage(m, {
        title: 'Set Left',
        intro: ['Atur pesan perpisahan otomatis untuk', 'member yang keluar dari grup.'],
        command: m.command,
        example: 'sampai jumpa @user 👋, semoga sukses di luar @namegc'
      }))
    }

    const current = getLeft(m.chat)
    if (current) {
      return m.reply([
        '⚠️ Pesan left grup ini sudah diatur.',
        '',
        'Teks saat ini:',
        current.text,
        '',
        `Untuk menggantinya pakai ${shown(m)}changeleft <teks baru>`,
        `Untuk menghapus pakai ${shown(m)}delleft`
      ].join('\n'))
    }

    if (text.length > MAX_WELCOME_LENGTH) {
      return m.reply(`Teks left terlalu panjang (${text.length}/${MAX_WELCOME_LENGTH} karakter).`)
    }

    setLeft(m.chat, text, m.sender)

    return m.reply([
      '✅ *Pesan left berhasil diatur*',
      '',
      text,
      '',
      `♡ Coba tampilannya: ${shown(m)}left test`,
      '♡ Dikirim otomatis 4-8 detik setelah member keluar.',
      '',
      WELCOME_FOOTER
    ].join('\n'))
  }
}
