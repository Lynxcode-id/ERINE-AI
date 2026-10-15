import { clearMenuAudio, menuAudioLabel, normalizeMenuAudioKey, removeMenuAudio } from '../../lib/function.js'

export default {
  command: 'delaudiomenu',
  alias: ['delaudio', 'hapusaudiomenu'],
  category: 'owner',
  description: 'Hapus audio VN menu (menu utama, menu all, atau per kategori).',
  help: '[all|kategori|clear]',
  onlyOwner: true,

  async execute(m) {
    const arg = String(m.args?.[0] || '').toLowerCase()

    if (arg === 'clear') {
      const total = clearMenuAudio()
      return m.reply(total ? `${total} audio menu dihapus.` : 'Belum ada audio menu yang disetel.')
    }

    const key = normalizeMenuAudioKey(arg)
    if (!key) return m.reply('Nama kategori tidak valid.')

    const label = menuAudioLabel(key)
    return m.reply(removeMenuAudio(key) ? `Audio ${label} dihapus.` : `Audio ${label} belum disetel.`)
  }
}
