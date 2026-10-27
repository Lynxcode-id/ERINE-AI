export default {
  command: 'setdescgc',
  alias: ['setdesc', 'setdeskgc', 'setdeskripsi', 'setdescgrup'],
  category: 'grup',
  description: `> Ganti deskripsi grup.

contoh penggunaan:
> \`.setdescgc Aturan grup: sopan ya\`
> \`.setdescgc\` (reply teks)`,
  help: '<deskripsi/reply>',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,
  typing: true,

  async execute(m, { sock, args }) {
    const text = args.join(' ').trim() || m.quoted?.text || ''
    if (!text) return m.reply(`❌ Format salah.\n\n*Contoh:*\n> ${m.prefix}${m.command} Deskripsi baru`)
    const fn = sock.group.setDescription || sock.group.updateDescription
    if (!fn) return m.reply('❌ Library belum mendukung ganti deskripsi.')
    await fn.call(sock.group, m.chat, text)
    return m.reply('✅ Deskripsi grup berhasil diganti.')
  }
}
