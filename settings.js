import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

export const settings = {
  usePairingCode: true, // Bawaan true kalo false nanti yang muncul QR
  customPairing: 'ERNSTARS', // Biarin aja, Ga usah diganti kalo ga mau error
  noprefix: false, // Set true kalo mau bawaan no prefix gtupun sebaliknya
  self: false, // Bawaan false
  eventMessage: false, // Bawaan false 
  eventAll: false, // Bawaan false
  ownerName: 'Lynx decode', // Ganti Nama owner
  owner: '6288258041396', // Ganti Nomor owner
  botName: 'Erine Stars • Erlynn', // Nama Bot
  botNumber: '6281362133135', // Nomor Bot
  jidGroup: '120363429790251223@g.us', // Grup khusus backup sc kau dan bot kau aja yah cukimay jangan gc yang rame biar sclu + datanya aman

  prefixes: ["."], // Prefix bawaan bot

// Quote botnya ganti aja kalau mau, Masih ada yang ga berfungsi..
  pesan: {
    wait: 'Sedang diproses, mohon tunggu sebentar ya kak... ⏳',
    error: 'Terjadi kesalahan 😥 Coba lagi nanti ya.',
    done: 'Berhasil dilakukan ✓',
    ownerOnly: 'Fitur ini khusus owner bot!',
    groupOnly: 'Fitur ini hanya bisa digunakan di grup!',
    privateOnly: 'Fitur ini hanya bisa digunakan di private chat!',
    adminOnly: 'Fitur ini hanya untuk Admin grup!',
    botAdmin: 'Bot harus menjadi Admin untuk menjalankan perintah ini!'
  }
}

export const config = settings

export function updateSetting(key, value) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    console.error(`[SETTINGS] Gagal mengedit "${key}": value berupa object tidak didukung. Edit manual di settings.js.`)
    return false
  }

  try {
    const lines = fs.readFileSync(__filename, 'utf8').split('\n')
    let depth = 0
    let targetIdx = -1
    let indent = ''

    for (let i = 0; i < lines.length; i++) {
      const bare = lines[i].replace(/(['"])(?:\\.|(?!\1).)*\1/g, '')
      depth += (bare.match(/[{[]/g) || []).length - (bare.match(/[}\]]/g) || []).length

      const match = bare.match(/^(\s*)([A-Za-z_$][\w$]*)\s*:/)
      if (depth === 1 && match && match[2] === key) {
        targetIdx = i
        indent = match[1]
        break
      }
    }

    if (targetIdx === -1) {
      console.error(`[SETTINGS] Properti "${key}" tidak ditemukan di settings.js`)
      return false
    }

    const hadComma = /,\s*$/.test(lines[targetIdx])
    lines[targetIdx] = `${indent}${key}: ${JSON.stringify(value)}${hadComma ? ',' : ''}`

    fs.writeFileSync(__filename, lines.join('\n'), 'utf8')
    settings[key] = value
    return true
  } catch (err) {
    console.error('[SETTINGS] Gagal mengedit file settings.js:', err?.message || err)
  }
  return false
}

export const updateConfig = updateSetting
