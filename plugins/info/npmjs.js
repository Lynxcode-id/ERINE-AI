import axios from 'axios'

export default {
  command: 'npmjs',
  category: 'info',
  tags: ['info'],
  description: '> Mencari informasi package di NPM.\n\ncontoh:\n> .npmjs @elyra-labs/baileys',
  help: '<nama_package>',
  typing: true,
  wait: false,

  async execute(m, { sock, args, usedPrefix, command }) {
    const query = args.join(' ').trim()

    if (!query) {
      return m.reply(
        '🌷 *Elyra NPM Stalker*\n' +
        '- Masukkan nama package NPM yang ingin dicari.\n\n' +
        '♡ - Contoh: ' + (usedPrefix || '.') + (command || 'npmjs') + ' @elyra-labs/baileys'
      )
    }

    await sock.sendReact(m.chat, '🌱', m.id).catch(() => {})

    try {
      const apiUrl = `${global.nexray}/stalker/npmjs?name=` + encodeURIComponent(query)
      const { data } = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 15000
      })

      if (!data || !data.status || !data.result) {
        await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
        return m.reply('❌ Package tidak ditemukan untuk pencarian: ' + query)
      }

      const res = data.result
      const name = res.name || '-'
      const version = res.version_latest || '-'
      const description = res.description || '-'
      const author = res.author || '-'
      const license = res.license || '-'
      const homepage = res.homepage || '-'
      const repository = res.repository || '-'
      const publishTime = res.publish_time || '-'

      let caption = '🌷 *Elyra NPM Stalker*\n\n'
      caption += '♡ - *Nama* : ' + name + '\n'
      caption += '♡ - *Versi* : ' + version + '\n'
      caption += '♡ - *Deskripsi* : ' + description + '\n'
      caption += '♡ - *Author* : ' + author + '\n'
      caption += '♡ - *Lisensi* : ' + license + '\n'
      caption += '♡ - *Homepage* : ' + homepage + '\n'
      caption += '♡ - *Repository* : ' + repository + '\n'
      caption += '♡ - *Dipublish* : ' + publishTime + '\n\n'
      caption += '© ELYRA-AI'

      await m.reply(caption)
      await sock.sendReact(m.chat, '💐', m.id).catch(() => {})
    } catch (err) {
      console.error('[NPM STALKER]', err?.message || err)
      await sock.sendReact(m.chat, '☘️', m.id).catch(() => {})
      await m.reply('❌ Terjadi kesalahan saat mencari data ke server.')
    }
  }
}