import { getMenuAudio, listMenuAudio, menuAudioLabel, normalizeMenuAudioKey, saveMenuAudio } from '../../lib/function.js'

export default {
  command: 'setaudiomenu',
  alias: ['setaudio', 'setmenuaudio', 'menuaudio'],
  category: 'owner',
  description: 'Atur audio VN yang dikirim bareng menu (menu utama, menu all, atau per kategori).',
  help: '[all|kategori|list] (reply audio)',
  onlyOwner: true,
  wait: true,

  async execute(m) {
    const p = m.prefix || ''
    let arg = String(m.args?.[0] || '').toLowerCase()
    if (arg === 'on' || arg === 'set') arg = ''

    if (arg === 'list') {
      const keys = listMenuAudio()
      return m.reply(keys.length
        ? `Audio menu aktif:\n${keys.map(k => `› ${menuAudioLabel(k)}`).join('\n')}`
        : 'Belum ada audio menu yang disetel.')
    }

    const key = normalizeMenuAudioKey(arg)
    if (!key) return m.reply('Nama kategori tidak valid.')
    const label = menuAudioLabel(key)

    if (!m.quoted) {
      return m.reply([
        `Audio ${label}: ${getMenuAudio(key) ? 'aktif' : 'belum disetel'}`,
        '',
        'Cara pakai (reply audio):',
        `› ${p}setaudiomenu  — menu utama`,
        `› ${p}setaudiomenu all  — menu all`,
        `› ${p}setaudiomenu <kategori>  — menu kategori`,
        `› ${p}setaudiomenu list  — daftar audio aktif`,
        `Hapus: ${p}delaudiomenu [all|kategori]`
      ].join('\n'))
    }

    if (!m.quoted.isMedia || m.quoted.mediaType !== 'audio') {
      return m.reply('Reply pesan audio untuk dijadikan audio menu.')
    }

    let buffer
    try {
      buffer = await m.quoted.download()
    } catch (err) {
      console.error('[SETAUDIOMENU] download error:', err?.message || err)
      return m.reply('Gagal mengunduh audio.')
    }

    if (!buffer || buffer.length < 1024) {
      return m.reply('Audio terlalu kecil atau tidak valid.')
    }

    try {
      const { converted } = await saveMenuAudio(buffer, key)
      return m.reply(`Audio ${label} berhasil disetel${converted ? ' (sudah di-convert ke VN)' : ''}.`)
    } catch (err) {
      console.error('[SETAUDIOMENU] save error:', err?.stack || err?.message || err)
      return m.reply(`Gagal menyimpan audio menu: ${err?.message || 'unknown'}`)
    }
  }
}
