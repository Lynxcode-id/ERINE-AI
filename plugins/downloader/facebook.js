import axios from 'axios'
import { sendLinkPreview } from '../../lib/function.js'

const shown = m => m.prefix || '.'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

export default {
  command: 'fb',
  alias: ['facebook', 'fbdl'],
  category: 'downloader',
  tags: ['downloader', 'tools'],
  description: 'Mengunduh video atau media dari Facebook.',
  help: '<url_facebook>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const url = args[0]?.trim()
    if (!url || !url.includes('facebook.com')) {
      return sock.sendMessage(m.chat, {
        text: '🌷 *Elyra Facebook Downloader*\n\n' +
          'Unduh video dari Facebook dengan mudah.\n\n' +
          `♡ Contoh: \`${shown(m)}${m.command} https://www.facebook.com/share/v/...\`\n\n` +
          '© ELYRA-AI'
      }, { quoted: m.raw || m })
    }

    await sock.sendReact(m.chat, '⏳', m.id).catch(() => {})

    try {
      const apiUrl = `${global.theresav}/api/download/facebook?url=${encodeURIComponent(url)}`
      const { data: res } = await axios.get(apiUrl, {
        headers: {
          'x-apikey': global.apikey.theresav,
          'User-Agent': USER_AGENT,
          'Accept': 'application/json'
        },
        timeout: 20000
      })

      if (!res || !res.status) {
        await sock.sendReact(m.chat, '❌', m.id).catch(() => {})
        return sock.sendMessage(m.chat, { text: '❌ Gagal mengambil data dari Facebook. Pastikan link valid atau publik.' }, { quoted: m.raw || m })
      }

      const title = res.title || 'Facebook Video'
      const mediaUrl = res.download_url || res.image_url || res.images?.[0]?.image_url

      if (!mediaUrl) {
        await sock.sendReact(m.chat, '❌', m.id).catch(() => {})
        return sock.sendMessage(m.chat, { text: '❌ URL unduhan media tidak ditemukan dari server.' }, { quoted: m.raw || m })
      }

      const caption = '🌷 *Elyra Facebook Downloader*\n\n' +
        '♡ - *Judul* : ' + title + '\n' +
        '♡ - *Kreator* : ' + (res.creator || '-') + '\n\n' +
        '© ELYRA-AI'

      await sendLinkPreview(sock, m, {
        text: caption,
        title: title,
        description: `Kreator: ${res.creator || 'Facebook User'}`,
        thumbnail: res.image_url || res.images?.[0]?.image_url,
        url: url,
        largeThumbnail: true
      })

      let mediaPayload = null
      try {
        const { data: fileData } = await axios.get(mediaUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': USER_AGENT,
            'Referer': 'https://www.facebook.com/'
          },
          timeout: 60000,
          maxContentLength: 150 * 1024 * 1024,
          maxBodyLength: 150 * 1024 * 1024
        })
        mediaPayload = Buffer.from(fileData)
      } catch (dlErr) {
        console.warn('[FB] Gagal download buffer via Axios, mengirim direct URL:', dlErr?.message)
        mediaPayload = { url: mediaUrl }
      }

      const isVideo = res.type === 'image' ? false : true

      await sock.sendMessage(m.chat, {
        [isVideo ? 'video' : 'image']: mediaPayload,
        caption: `Nih videonya, bre! ✨`
      }, { quoted: m.raw || m })

      await sock.sendReact(m.chat, '✅', m.id).catch(() => {})
    } catch (err) {
      console.error('[FB DOWNLOADER]', err?.message || err)
      await sock.sendReact(m.chat, '❌', m.id).catch(() => {})
      await sock.sendMessage(m.chat, {
        text: '❌ Terjadi kesalahan saat memproses link Facebook.'
      }, { quoted: m.raw || m }).catch(() => {})
    }
  }
}