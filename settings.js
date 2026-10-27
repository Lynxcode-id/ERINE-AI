import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

global.theresav = 'https://api.theresav.eu'
global.lynxapis = 'https://lynxapis.my.id'
global.xrina = 'https://apiii-xrina.my.id'
global.nexray = 'https://api.nexray.eu.cc'
global.nexrayweb = 'https://api.nexray.web.id'
global.jerexd = 'https://api.jerexd.my.id'
global.snowping = 'https://api.snowping.cfd'
global.cmnty = 'https://api.cmnty.eu.cc'
global.faa = 'https://api-faa.my.id'
global.izuka = 'https://my.izuka-api.xyz'
global.vamx = 'https://vamxapi.my.id'
global.jagoan = 'https://api.jagoanproject.com'
global.azbry = 'https://api.azbry.com'
global.bintang = 'https://bintangapi.my.id'
global.starlabs = 'https://starlabs.biz.id'
global.siputzx = 'https://brat.siputzx.my.id'
global.wolep = 'https://wolep.dev'
global.qwa = 'https://qwa.eeq.my.id'
global.termai = 'https://c.termai.cc'
global.dhanypedia = 'https://bmkg-api.dhanypedia.com'
global.bmkg = 'https://api.bmkg.go.id'
global.raytinte = 'https://ray.tinte.dev'
global.ocrspace = 'https://api.ocr.space'

// CARA AMBIL APIKEY - SALIN LINK DI ATAS YANG REST APINYA MAKE APIKEY
// LOGIN PAKE GOOGLE MASING MASING TERUS AMBIL PASANG APIKEY DI BAWAH
// TANPA APIKEY FITUR FITUR BOT INI TIDAK AKAN BERFUNGSI SEBAGAIMANA MESTINYA
// MODAL DONG UDH GEDE HOBYNYA MASIH MAKE APIKEY ORG 😂
// MAU JADI PENYUMBANG APIKEY ? INFO AJA KE SALURAN INF 

global.apikey = Object.create(null)
global.apikey.theresav = process.env.APIKEY_THERESAV || '-' // apikeymu
global.apikey.jerexd   = process.env.APIKEY_JEREXD   || '-' // apikeymu
global.apikey.vamx     = process.env.APIKEY_VAMX     || '-' // apikeymu
global.apikey.cmnty    = process.env.APIKEY_CMNTY    || '-' // apikeymu
global.apikey.jagoan   = process.env.APIKEY_JAGOAN   || '-' // apikeymu
global.apikey.ocrspace = process.env.APIKEY_OCRSPACE || 'helloworld' // apikeymu
global.apikey.termai   = process.env.TERMAI_KEY      || 'AIzaBj7z2z3xBjsk' // apikeymu
global.apikey.catbox   = process.env.CATBOX_USERHASH || '-' // userhashmi

export const settings = {
  usePairingCode: true,
  customPairing: 'ERNSTARS', // ga usah diapa apain ntr error mampus
  noprefix: false, // bawaan false
  self: false, // bawaan false
  eventMessage: false, // bawaan false
  eventAll: false, // bawaan false
  ownerName: 'Lynx decode', // nama owner
  owner: '628', // nomer owner
  botName: 'Elyra Multi Decive', // namabot
  botNumber: '628', // nomor botnya
  stickerPack: 'elyra multi device', // wm sticker
  stickerAuthor: 'whatsapp bot fasted by inf project x lynx decode build with zapojs library.. Whatsapp bot 628', // wm sticker
  jidGroup: '---@g.us', // idgrup utamamu tujuannya info error & backup dikirim digrup ini

  prefixes: ["!","."], // prefix botnya

// Quote botnya ganti aja kalo mau
  pesan: {
    wait: '🌱 Request sedang diproses, Tunggu sampai proses ini selesai!',
    error: '🍂 Terjadi kesalahan, coba lagi nanti.',
    done: '💐 Task selesai..',
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
