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
  command: 'changeleft',
  alias: ['changebye', 'gantileft', 'editleft'],
  category: 'grup',
  tags: ['grup'],
  description: `> Mengganti pesan left yang sudah diatur sebelumnya lewat setleft.

*Kata kunci:*
> \`@user\` = tag member yang keluar.
> \`@namegc\` = nama grup.
> \`@desk\` = deskripsi grup.

contoh penggunaan:
> \`.changeleft dadah @user, sampai ketemu lagi\``,
  help: '<teks left baru>',
  onlyGroup: true,
  onlyAdmin: true,

  async execute(m) {
    const current = getLeft(m.chat)

    if (!current) {
      return m.reply(`Pesan left grup ini belum diatur. Pakai ${shown(m)}setleft <teks> dulu.`)
    }

    const text = extractWelcomeText(m)

    if (!text) {
      return m.reply([
        buildWelcomeUsage(m, {
          title: 'Change Left',
          intro: ['Ganti pesan left yang sudah ada.'],
          command: m.command,
          example: 'dadah @user, sampai ketemu lagi'
        }),
        '',
        'Teks saat ini:',
        current.text
      ].join('\n'))
    }

    if (text.length > MAX_WELCOME_LENGTH) {
      return m.reply(`Teks left terlalu panjang (${text.length}/${MAX_WELCOME_LENGTH} karakter).`)
    }

    if (text === current.text) {
      return m.reply('Teks baru sama persis dengan yang sekarang, tidak ada yang diubah.')
    }

    setLeft(m.chat, text, m.sender)

    return m.reply([
      '✅ *Pesan left berhasil diganti*',
      '',
      text,
      '',
      `♡ Coba tampilannya: ${shown(m)}left test`,
      '',
      WELCOME_FOOTER
    ].join('\n'))
  }
}
