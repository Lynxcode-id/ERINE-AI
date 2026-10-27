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
  command: 'changewelcome',
  alias: ['changewlc', 'gantiwelcome', 'editwelcome'],
  category: 'grup',
  tags: ['grup'],
  description: `> Mengganti teks welcome yang sudah diatur sebelumnya lewat setwelcome.

*Kata kunci:*
> \`@user\` = tag member baru.
> \`@namegc\` = nama grup.
> \`@desk\` = deskripsi grup.

contoh penggunaan:
> \`.changewelcome halo @user, selamat datang di @namegc\``,
  help: '<teks welcome baru>',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m) {
    const current = getWelcome(m.chat)

    if (!current) {
      return m.reply(`Welcome grup ini belum diatur. Pakai ${shown(m)}setwelcome <teks> dulu.`)
    }

    const text = extractWelcomeText(m)

    if (!text) {
      return m.reply([
        buildWelcomeUsage(m, {
          title: 'Change Welcome',
          intro: ['Ganti teks welcome yang sudah ada.'],
          command: m.command
        }),
        '',
        'Teks saat ini:',
        current.text
      ].join('\n'))
    }

    if (text.length > MAX_WELCOME_LENGTH) {
      return m.reply(`Teks welcome terlalu panjang (${text.length}/${MAX_WELCOME_LENGTH} karakter).`)
    }

    if (text === current.text) {
      return m.reply('Teks baru sama persis dengan yang sekarang, tidak ada yang diubah.')
    }

    setWelcome(m.chat, text, m.sender)

    return m.reply([
      '✅ *Welcome berhasil diganti*',
      '',
      text,
      '',
      `♡ Coba tampilannya: ${shown(m)}welcome test`,
      '',
      WELCOME_FOOTER
    ].join('\n'))
  }
}
