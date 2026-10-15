import axios from 'axios'

export default {
  command: 'fakebankjago',
  alias: ['fakejago'],
  category: 'maker',
  tags: ['maker'],
  description: `> Membuat gambar tangkapan layar saldo palsu Bank Jago.\n\ncontoh:\n> \`.bankjago Lynx decode | 100000000\``,
  help: '<nama> | <saldo>',
  typing: true,
  wait: true,

  async execute(m, { args }) {
    const text = args.join(' ').trim()
    if (!text) return m.reply('Masukkan nama dan jumlah saldo.\nContoh: `.bankjago Lynx decode | 100000000`')

    let nama = ''
    let saldo = ''

    if (text.includes('|')) {
      const parts = text.split('|')
      nama = parts[0].trim()
      saldo = parts[1].trim()
    } else if (args.length >= 2) {
      saldo = args[args.length - 1]
      nama = args.slice(0, -1).join(' ')
    }

    if (!nama || !saldo) {
      return m.reply('Format salah. Pisahkan nama dan saldo dengan tanda `|`.\nContoh: `.bankjago Lynx decode | 100000000`')
    }

    try {
      const url = `https://lynxapis.my.id/api/maker/fakebank-jago?nama=${encodeURIComponent(nama)}&saldo=${encodeURIComponent(saldo)}`
      const { data } = await axios.get(url, { responseType: 'arraybuffer' })

      const media = Buffer.from(data)
      const caption = `🌷 *Elyra Fake Bank Jago*\n- Your fake bank screenshot is ready.\n\n♡ - Nama : ${nama}\n♡ - Saldo : ${saldo}`

      await m.reply({
        type: 'image',
        media,
        caption
      })
    } catch (err) {
      console.error('[BANKJAGO]', err?.message || err)
      await m.reply('Terjadi kesalahan saat membuat gambar.')
    }
  }
}