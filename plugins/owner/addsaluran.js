import {
  addChannel,
  adminStatusLine,
  inspectChannel,
  isNewsletterJid,
  listChannels,
  normalizeChannelJid
} from '../../lib/saluran.js'

const FOOTER = 'with love, elyra !!'
const shown = m => m.prefix || '.'

export default {
  command: 'addsaluran',
  alias: ['addch', 'addchannel'],
  category: 'owner',
  description: `> Menambahkan saluran (channel) agar bot merespon di saluran itu. Saluran yang belum di-add diabaikan. Bot harus jadi admin saluran supaya bisa membalas.

*Keterangan Format:*
> \`<idch>\` = ID saluran (angka, dengan atau tanpa @newsletter).
> \`owner\` = opsional, jadikan saluran ini owner (semua pesan dari saluran dianggap owner).
> Tanpa ID (dikirim dari dalam saluran) = saluran itu sendiri.

contoh penggunaan:
> \`.addsaluran 120363400612665352\`
> \`.addsaluran 120363400612665352 owner\``,
  help: '[idch] [owner]',
  onlyOwner: true,

  async execute(m, { sock, args }) {
    const p = `${shown(m)}${m.command}`
    const owner = args.some(a => a.toLowerCase() === 'owner')
    const idToken = args.find(a => a.toLowerCase() !== 'owner')

    let jid = idToken ? normalizeChannelJid(idToken) : (isNewsletterJid(m.chat) ? m.chat : null)

    if (!jid) {
      return m.reply([
        '🌷 *Add Saluran*',
        '',
        'Daftarkan saluran agar bot merespon di sana.',
        'Bot harus jadi admin saluran.',
        '',
        `♡ ${p} <idch>`,
        `♡ ${p} <idch> owner`,
        '',
        idToken ? '⚠️ Format ID saluran tidak valid (angka panjang, contoh 120363400612665352).' : '',
        FOOTER
      ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'))
    }

    const info = await inspectChannel(sock, jid)
    const { added, entry } = addChannel(jid, { name: info.name, owner, by: m.sender })

    return m.reply([
      added ? '✅ *Saluran ditambahkan*' : 'ℹ️ *Saluran sudah ada (diperbarui)*',
      '',
      `♡ Nama : ${entry.name || '-'}`,
      `♡ ID : ${jid}`,
      `♡ Mode : ${entry.owner ? 'owner' : 'biasa'}`,
      adminStatusLine(info),
      `♡ Total saluran : ${listChannels().length}`,
      '',
      FOOTER
    ].join('\n'))
  }
}
