import {
  MAX_WELCOME_LENGTH,
  WELCOME_FOOTER,
  buildWelcomeUsage,
  extractWelcomeText,
  getWelcome,
  setWelcome
} from '../../lib/welcome.js'

const shown = m => m.prefix || '.'

export default {
  command: 'setwelcome',
  alias: ['setwlc', 'welcomeset'],
  category: 'grup',
  tags: ['grup'],
  description: `> Mengatur sambutan otomatis untuk member yang baru join grup (dikirim 4-8 detik setelah join).

*Kata kunci:*
> \`@user\` = tag member baru.
> \`@namegc\` = nama grup.
> \`@desk\` = deskripsi grup.

contoh penggunaan:
> \`.setwelcome selamat datang @user 🫵😈, di @namegc semoga betah\`

Sudah pernah diatur? Pakai \`.changewelcome\`.`,
  help: '<teks welcome>',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m) {
    const text = extractWelcomeText(m)

    if (!text) {
      return m.reply(buildWelcomeUsage(m, {
        title: 'Set Welcome',
        intro: ['Atur sambutan otomatis untuk', 'member yang baru join grup.'],
        command: m.command
      }))
    }

    const current = getWelcome(m.chat)
    if (current) {
      return m.reply([
        '⚠️ Welcome grup ini sudah diatur.',
        '',
        'Teks saat ini:',
        current.text,
        '',
        `Untuk menggantinya pakai ${shown(m)}changewelcome <teks baru>`,
        `Untuk menghapus pakai ${shown(m)}delwelcome`
      ].join('\n'))
    }

    if (text.length > MAX_WELCOME_LENGTH) {
      return m.reply(`Teks welcome terlalu panjang (${text.length}/${MAX_WELCOME_LENGTH} karakter).`)
    }

    setWelcome(m.chat, text, m.sender)

    return m.reply([
      '✅ *Welcome berhasil diatur*',
      '',
      text,
      '',
      `♡ Coba tampilannya: ${shown(m)}welcome test`,
      '♡ Dikirim otomatis 4-8 detik setelah member join.',
      '',
      WELCOME_FOOTER
    ].join('\n'))
  }
}
