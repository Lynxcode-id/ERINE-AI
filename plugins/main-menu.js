/**
 * ───「 FEATURE AUTHOR 」───
 * 👤 Author     : Lynx Decode
 * 📞 Contact    : +62 882-5804-1396
 * 📢 Channel    : https://whatsapp.com/channel/0029VbAnuii6GcGCu73oep1i
 * ⚠️ Note       : Keep credit to respect the creator!
 * ─────────────────────────
 * 📝 Plugin: Multi Menu ERINE-MD (Stable Audio Like Menu 1 + Nixcode Special Menu 7 + Executive Takina Menu 8)
 */

import moment from 'moment-timezone'
import fetch from 'node-fetch'
import fs from 'fs'
import os from 'os'
import { createRequire } from 'module'
import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from '@whiskeysockets/baileys'
import { ButtonV2 } from '../lib/nixcode.js'

const require = createRequire(import.meta.url)
moment.locale('id')

const MENU_THUMB = global.menuThumb || 'https://telegra.ph/file/.jpg'
const MENU3_THUMB = global.menu3Thumb || 'https://raw.githubusercontent.com/Lynxcode-id/picture/main/1781631050538.jpeg'
const MENU7_THUMB = 'https://raw.githubusercontent.com/Lynxcode-id/picture/main/1785943995542.jpeg'
const MENU7_AUDIO = 'https://c.termai.cc/a158/IIPkiKo.mp3'
const VID_ALL_MENU = 'https://raw.githubusercontent.com/Lynxcode-id/picture/main/1781636630629.mp4'

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

// Format size diupdate agar lebih robust
function formatSize(size) {
    let round = (value, precision) => {
        let multiplier = Math.pow(10, precision || 0)
        return Math.round(value * multiplier) / multiplier
    }
    let KB = 1024, MB = KB * 1024, GB = MB * 1024, TB = GB * 1024
    if (size < KB) return size + ' B'
    if (size < MB) return round(size / KB, 2) + ' KB'
    if (size < GB) return round(size / MB, 2) + ' MB'
    if (size < TB) return round(size / GB, 2) + ' GB'
    return round(size / TB, 2) + ' TB'
}

const delayAnim = ms => new Promise(resolve => setTimeout(resolve, ms))

function formatTag(tag) {
  return String(tag || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function ucapan() {
  const jam = moment.tz('Asia/Makassar').hour()
  if (jam >= 4 && jam < 11) return 'Selamat Pagi 🌤️'
  if (jam >= 11 && jam < 15) return 'Selamat Siang ☀️'
  if (jam >= 15 && jam < 18) return 'Selamat Sore 🌇'
  return 'Selamat Malam 🌙'
}

function getOwnerJidList() {
  if (!Array.isArray(global.owner)) return []
  return global.owner.map(v => (Array.isArray(v) ? v[0] : v)).filter(Boolean).map(v => String(v))
}

function makeContactFallback(name, sender) {
  return {
    key: {
      fromMe: false,
      participant: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast'
    },
    message: {
      contactMessage: {
        displayName: name,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${name}\nitem1.TEL;waid=${sender.split('@')[0]}:${sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
      }
    }
  }
}

function buildCategories() {
  const plugins = Object.values(global.plugins || {}).filter(p => !p.disabled)
  const categories = {}
  let totalCommands = 0

  for (const plugin of plugins) {
    const helps = Array.isArray(plugin.help) ? plugin.help : plugin.help ? [plugin.help] : []
    const tags = Array.isArray(plugin.tags) ? plugin.tags : plugin.tags ? [plugin.tags] : []

    totalCommands += helps.filter(Boolean).length

    for (let tag of tags) {
      if (!tag) continue
      tag = String(tag).toLowerCase().trim()
      if (!categories[tag]) categories[tag] = []
      categories[tag].push({
        helps: helps.filter(Boolean),
        limit: !!plugin.limit,
        premium: !!plugin.premium,
        owner: !!plugin.owner,
        admin: !!plugin.admin,
        prefix: !plugin.customPrefix
      })
    }
  }

  return { categories, totalCommands }
}

async function sendMainMenuV1(m, conn, usedPrefix, headerCaption, categories, arrayMenu, botname) {
  const media = await prepareWAMessageMedia({ image: { url: MENU_THUMB } }, { upload: conn.waUploadToServer })

  const sections = []
  let currentSection = { title: '🌟 Kategori Utama', highlight_label: 'Hot', rows: [] }

  for (const tag of arrayMenu) {
    currentSection.rows.push({
      header: '✨ Menu',
      title: tag.toUpperCase(),
      description: `Menampilkan fitur kategori ${tag}`,
      id: `${usedPrefix}menu ${tag}`
    })

    if (currentSection.rows.length >= 10) {
      sections.push(currentSection)
      currentSection = { title: '🌟 Kategori Lainnya', rows: [] }
    }
  }
  if (currentSection.rows.length > 0) sections.push(currentSection)

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2
        },
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body: { text: headerCaption },
          footer: { text: '© ᴇʀɪɴᴇ ᴍᴅ x ᴊᴋᴛ ᴠɪʙᴇ' },
          header: { hasMediaAttachment: true, ...media },
          contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363400612665352@newsletter',
              newsletterName: '🌟 ᴇʀɪɴᴇ-ᴍᴅ ɪɴғᴏʀᴍᴀᴛɪᴏɴ',
              serverMessageId: -1
            }
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                  title: '📋 Daftar List',
                  sections: sections
                })
              },
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: '📄 Semua Menu',
                  id: `${usedPrefix}menu all`
                })
              },
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: '💬 Chat Owner',
                  id: `${usedPrefix}owner`
                })
              }
            ]
          }
        })
      }
    }
  }, { quoted: global.fkontak || makeContactFallback('Erine', m.sender) })

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

async function sendMainMenuCarousel(m, conn, usedPrefix, categories, catKeys, botname, name, limit, role, level) {
  const thumb = await fetch(MENU_THUMB).then(r => r.buffer()).catch(() => null)
  const mediaHeader = thumb
    ? await prepareWAMessageMedia({ image: thumb }, { upload: conn.waUploadToServer })
    : await prepareWAMessageMedia({ image: { url: MENU_THUMB } }, { upload: conn.waUploadToServer })

  const bodyText = `💠 ─── [ *ERINE CYBER-MENU* ] ─── 💠\n\n` + 
                   `> 🌐 *Welcome to Mainframe, ${name}!*\n` +
                   `> Sistem pusat kendali Erine-MD siap\n` +
                   `> menerima perintah dari Anda.\n\n` +
                   `Geser panel di bawah untuk mengakses\n` +
                   `seluruh direktori fitur kami. ⚡`
  
  const cards = []

  cards.push({
    header: { hasMediaAttachment: true, imageMessage: mediaHeader.imageMessage },
    body: { text: `╭━━━ [ *S Y S T E M  I N F O* ] ━━━💠\n` +
                  `┣ 👤 *ID:* ${name}\n` +
                  `┣ 💳 *Role:* ${role}\n` +
                  `┣ 🎟️ *Limit:* ${limit}\n` +
                  `┣ 📊 *Level:* ${level}\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━💠\n\n` +
                  `*Link Akses Cepat:* Gabung ke markas untuk update terbaru Erine MD! 🚀` },
    nativeFlowMessage: { 
        buttons: [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📋 Gelar Semua Menu", id: `${usedPrefix}menu all` }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "👥 Group Official", url: "https://chat.whatsapp.com/CNd6pGYGPCL8V1y9bBt4zK" }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "🌏 Channel Pusat", url: "https://whatsapp.com/channel/0029VbAnuii6GcGCu73oep1i" }) }
        ] 
    }
  })

  for (const tag of catKeys) {
    let cardText = `╭━━━ [ *${formatTag(tag).toUpperCase()} DIRECTORY* ] ━━━💠\n`
    
    for (const item of categories[tag]) {
      for (const cmd of item.helps) {
        cardText += `┣ ⚡ ${item.prefix ? usedPrefix : ''}${cmd}\n`
      }
    }
    
    cardText += `╰━━━━━━━━━━━━━━━━━━━━━━💠`

    cards.push({
      header: { hasMediaAttachment: true, imageMessage: mediaHeader.imageMessage },
      body: { text: cardText },
      nativeFlowMessage: { buttons: [{ name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: `📂 Buka Panel ${formatTag(tag)}`, id: `${usedPrefix}menu ${tag}` }) }] }
    })
  }

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: {
          body: { text: bodyText },
          carouselMessage: {
            cards: cards,
            messageVersion: 1
          }
        }
      }
    }
  }, { quoted: global.fkontak || makeContactFallback('Erine', m.sender) })

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

async function sendMainMenuV3(m, conn, usedPrefix, botname, name, limit, role, level, wktuwib, date, runtime) {
  let thumbBuffer = null

  try {
    const jimpModule = require('jimp')
    const J = jimpModule.Jimp || jimpModule.default || jimpModule

    let imgBuffer = await fetch(MENU3_THUMB).then(r => r.buffer())
    const image = await J.read(imgBuffer)

    const width = image.bitmap?.width || image.width || 1000
    const height = image.bitmap?.height || image.height || 1000

    try {
        if (width > height) {
            image.resize(300, J.AUTO || -1)
        } else {
            image.resize(J.AUTO || -1, 300)
        }
    } catch (err) {
        if (width > height) {
            image.resize({ w: 300 })
        } else {
            image.resize({ h: 300 })
        }
    }

    try {
        thumbBuffer = await image.getBuffer('image/jpeg')
    } catch {
        try {
            thumbBuffer = await image.getBufferAsync(J.MIME_JPEG || 'image/jpeg')
        } catch {
            thumbBuffer = await image.getBufferAsync('image/png')
        }
    }
    
    thumbBuffer = Buffer.from(thumbBuffer)
    
  } catch (e) {
    console.log('Jimp error:', e)
    let prep = await prepareWAMessageMedia({ image: { url: MENU3_THUMB } }, { upload: conn.waUploadToServer })
    thumbBuffer = prep.imageMessage?.jpegThumbnail
  }

  const bodyText = `SYSTEM BINDING ESTABLISHED ⚡\n\n` +
    `Welcome to ${botname}, our mainframe is ready to assist you.\n\n` +
    `[ ⚙️ *BOT INFORMATION* ]\n` +
    `> 🤖 *Name:* ${botname}\n` +
    `> 🛠️ *Version:* ${global.version || '18.1.8'}\n` +
    `> 👨‍💻 *Developer:* Lynx\n` +
    `> 🔋 *Runtime:* ${runtime}\n\n` +
    `[ 👤 *USER INFORMATION* ]\n` +
    `> 🆔 *Name:* ${name}\n` +
    `> 💳 *Role:* ${role}\n` +
    `> 📊 *Level:* ${level}\n` +
    `> 🎟️ *Limit:* ${limit}\n\n` +
    `Select an operation from the panel below.`;

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        buttonsMessage: {
          contentText: bodyText,
          footerText: '© ERINE MD X INF PROJECT',
          headerType: 6,
          locationMessage: {
            degreesLatitude: 0,
            degreesLongitude: 0,
            name: botname,
            address: `Date: ${date} | Time: ${wktuwib}`,
            jpegThumbnail: thumbBuffer
          },
          buttons: [
            { buttonId: `${usedPrefix}owner`, buttonText: { displayText: '👤 ᴅᴇᴠᴇʟᴏᴇᴘᴇʀ' }, type: 1 },
            { buttonId: `${usedPrefix}menu all`, buttonText: { displayText: '📑 ʟɪsᴛ ᴍᴇɴᴜ' }, type: 1 },
            { buttonId: `${usedPrefix}gcbot`, buttonText: { displayText: '⚡ ᴄᴏᴍᴍᴜɴɪᴛʏ' }, type: 1 }
          ]
        }
      }
    }
  }, { quoted: global.fkontak || makeContactFallback('Erine', m.sender) })

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

async function sendMainMenuV4(m, conn, usedPrefix, categories, catKeys, botname, runtime) {
  const media = await prepareWAMessageMedia({ image: { url: MENU_THUMB } }, { upload: conn.waUploadToServer })
  const sections = []
  
  for (const tag of catKeys) {
    let rows = []
    for (const item of categories[tag]) {
      for (const cmd of item.helps) {
        rows.push({
          title: formatTag(cmd),
          description: `Execute ${cmd} command`,
          id: `${usedPrefix}${cmd}`
        })
      }
    }
    
    sections.push({
      title: formatTag(tag).toUpperCase(),
      highlight_label: "Erine MD",
      rows: rows
    })
  }

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            title: botname,
            hasMediaAttachment: false,
            productMessage: {
              product: {
                productImage: media.imageMessage,
                productId: "25015941284694382",
                title: botname,
                description: "Erine MD Ecosystem",
                currencyCode: "IDR",
                priceAmount1000: 404,
                retailerId: "INF PROJECT",
                url: "https://wa.me/p/25015941284694382/6283143663697",
                productImageCount: 1
              },
              businessOwnerJid: "113748182302861@lid"
            }
          },
          body: {
            text: "*© ERINE MD 2025 - 2026*"
          },
          footer: {
            text: `\`\`\`\n[ ${moment.tz('Asia/Makassar').format('HH:mm:ss')} ] ${botname}\n─────────────────────────\nName    : Erine\nVersion : ${global.version || '18.1.8'}\nLicense : INF-Project\nType    : Module\nRuntime : ${runtime}\n\nSocial  : https://whatsapp.com/channel/0029VbAnuii6GcGCu73oep1i\n─────────────────────────\nSelect category below\n\`\`\``
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: "Select Menu",
                  sections: sections
                })
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "Official Channel",
                  url: "https://whatsapp.com/channel/0029VbAnuii6GcGCu73oep1i"
                })
              }
            ]
          },
          contextInfo: {
            participant: "13135550002@s.whatsapp.net",
            quotedMessage: {
              interactiveMessage: {
                nativeFlowMessage: {
                  buttons: [
                    {
                      name: "payment_info",
                      buttonParamsJson: JSON.stringify({
                        currency: "IDR",
                        total_amount: { value: 404, offset: 0 },
                        reference_id: "ERINE",
                        type: "physical-goods",
                        order: {
                          status: "pending",
                          subtotal: { value: 404, offset: 0 },
                          order_type: "ORDER",
                          items: [
                            {
                              name: "Erine MD",
                              amount: { value: 404, offset: 0 },
                              quantity: 1,
                              sale_amount: { value: 404, offset: 0 }
                            }
                          ]
                        },
                        payment_settings: [
                          {
                            type: "pix_static_code",
                            pix_static_code: {
                              merchant_name: "Erine",
                              key: "INF PROJECT",
                              key_type: "EVP"
                            }
                          }
                        ],
                        share_payment_status: false
                      })
                    }
                  ]
                }
              }
            },
            remoteJid: "status@broadcast"
          }
        }
      }
    }
  }, { quoted: global.fkontak || makeContactFallback('Erine', m.sender) })

  msg.message.viewOnceMessage.message.interactiveMessage = {
    ...msg.message.viewOnceMessage.message.interactiveMessage,
    contextInfo: {
      ...msg.message.viewOnceMessage.message.interactiveMessage.contextInfo,
      forwardingScore: 1,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: '120363400612665352@newsletter',
        newsletterName: '🌟 ᴇʀɪɴᴇ-ᴍᴅ ɪɴғᴏʀᴍᴀᴛɪᴏɴ',
        serverMessageId: -1
      }
    }
  }

  await conn.relayMessage(m.chat, msg.message, {
    messageId: msg.key.id,
    additionalNodes: [
      {
        tag: "biz",
        attrs: {},
        content: [
          {
            tag: "interactive",
            attrs: { type: "native_flow", v: "1" },
            content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }]
          }
        ]
      }
    ]
  })
}

// MENU 5: iOS SAFE
async function sendMainMenuV5(m, conn, usedPrefix, headerCaption, categories, arrayMenu) {
  let menuText = headerCaption + '\n\n'
  menuText += `╭─── [ *KATEGORI MENU* ] ───✧\n`
  for (const tag of arrayMenu) {
    menuText += `│ 🎀 ${usedPrefix}menu ${tag}\n`
  }
  menuText += `╰━━━━━━━━━━━━━━━━━━━━━✧\n\n`
  menuText += `> 💡 *Tips:* Ketik *${usedPrefix}menu all* untuk melihat semua command.`

  await conn.sendMessage(m.chat, {
    video: { url: VID_ALL_MENU },
    gifPlayback: true,
    caption: menuText
  }, { quoted: m }) 
}

// MENU 6: OVERLAY MIXED LAYOUT
async function sendMainMenuV6(m, conn, usedPrefix, headerCaption, categories, arrayMenu) {
  let menuText = headerCaption + '\n\n'
  menuText += `╭─── [ *ERINE EXCLUSIVE SET 6* ] ───✧\n`
  for (const tag of arrayMenu) {
    menuText += `│ 🎵 ${usedPrefix}menu ${tag}\n`
  }
  menuText += `╰━━━━━━━━━━━━━━━━━━━━━✧\n\n`
  menuText += `> 💽 *Sistem audio kustom diaktifkan.*`

  const imageMedia = await prepareWAMessageMedia({ image: { url: MENU_THUMB } }, { upload: conn.waUploadToServer })
  const videoMedia = await prepareWAMessageMedia({ video: { url: VID_ALL_MENU } }, { upload: conn.waUploadToServer })

  const imgMsg = generateWAMessageFromContent(m.chat, {
      imageMessage: {
        ...imageMedia.imageMessage,
        caption: menuText,
        contextInfo: {
          pairedMediaType: 5,
          statusSourceType: 0,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363400612665352@newsletter',
            newsletterName: '🌟 ᴇʀɪɴᴇ-ᴍᴅ ɪɴғᴏʀᴍᴀᴛɪᴏɴ',
            serverMessageId: -1
          }
        }
      }
    }, {})

  await conn.relayMessage(m.chat, imgMsg.message, { messageId: imgMsg.key.id })

  await conn.relayMessage(m.chat, {
      videoMessage: {
        ...videoMedia.videoMessage,
        contextInfo: {
          pairedMediaType: 6,
          statusSourceType: 0
        }
      },
      messageContextInfo: {
        messageAssociation: {
          associationType: 12,
          parentMessageKey: imgMsg.key
        }
      }
    }, {})
}

// MENU 7: SPECIAL NIXCODE BUTTONV2
async function sendMainMenuV7(m, conn, usedPrefix, categories, arrayMenu) {
  const sections = []
  let rows = []

  for (const tag of arrayMenu) {
    rows.push({
      header: '🔥 Kategori',
      title: formatTag(tag).toUpperCase(),
      description: `Buka direktori fitur ${formatTag(tag)}`,
      id: `${usedPrefix}menu ${tag}`
    })
  }

  sections.push({
    title: 'Erine AI',
    highlight_label: 'SPECIAL MENU',
    rows: rows
  })

  await new ButtonV2(conn)
    .setTitle('🌱 ҽɾíղҽ s𝗍ᥲrs')
    .setSubtitle('ηєxᴛ ɢᴇɴᴇʀᴀᴛɪᴏɴ')
    .setBody('FAST STABLE AND 100% SAFE')
    .setFooter('2025-2026')
    .setThumbnail(MENU7_THUMB)
    .addRawButton({
      buttonText: { displayText: '🌟 List Menu' },
      buttonId: 'Nixel',
      type: 1,
      nativeFlowInfo: {
        name: 'single_select',
        paramsJson: JSON.stringify({
          title: 'all lists are here - erine ai',
          sections: sections
        })
      }
    })
    .addButton('👤 Dev', `${usedPrefix}owner`)
    .send(m.chat, { quoted: m })
}

// MENU 8: EXECUTIVE TAKINA STYLE (FULL DASHBOARD)
async function sendMainMenuV8(m, conn, usedPrefix, categories, catKeys, botname, name, limit, role, totalCommands, fkontak) {
    let dateNow = moment().tz('Asia/Makassar').format('YYYY-MM-DD')
    if (global.lastResetDate !== dateNow) {
        global.lastResetDate = dateNow
        global.hitHariIni = 0
    }
    global.hitHariIni = (global.hitHariIni || 0) + 1

    let statsObj = Object.entries(global.db.data.stats || {}).map(([key, val]) => {
        if (!val || typeof val !== 'object' || typeof val.total !== 'number') return null
        let help = global.plugins[key]?.help
        let cmdName = Array.isArray(help) ? help[0] : help || key
        if (/exec/.test(cmdName)) return null
        return { name: cmdName, ...val }
    }).filter(v => v)

    let totalHits = statsObj.reduce((a, b) => a + (b.total || 0), 0)
    let dailyHits = global.hitHariIni || 0

    statsObj.sort((a, b) => b.total - a.total)
    let top5 = statsObj.slice(0, 5)

    let topFiturList = top5.length > 0
        ? top5.map((v, i) => `│ 🌱 ${i + 1}. *${v.name}* (${Intl.NumberFormat('id-ID').format(v.total)} Hit)`).join('\n')
        : `│ Belum ada data`

    let freeRAM = formatSize(os.freemem())
    let totalRAM = formatSize(os.totalmem())
    let cpuModel = os.cpus()[0].model.replace(/CPU|Processor|@|GHz/g, '').trim()
    let coreCount = os.cpus().length
    let uptime = clockString(process.uptime() * 1000)
    let wktuwib = moment.tz('Asia/Makassar').format('HH:mm:ss')

    const categoryRows = catKeys.map(tag => ({
        header: 'Erine Directory',
        title: formatTag(tag).toUpperCase(),
        description: `Buka direktori fitur ${formatTag(tag)}`,
        id: `${usedPrefix}menu ${tag}`
    }))

    const media = await prepareWAMessageMedia({ image: { url: MENU_THUMB } }, { upload: conn.waUploadToServer })

    let menuBody = `Hallo Kack *${name}* 🌱\n\n` +
        `Selamat datang di Executive Dashboard ERINE-AI.\n\n` +
        `┌─𓊈 I N F O - K A M U 𓊉\n` +
        `│ 👤 Nama : ${name}\n` +
        `│ 💳 Role : ${role}\n` +
        `│ 🎟️ Limit : ${limit}\n` +
        `└───────────────╼\n\n` +
        `┌─𓊈 S T A T U S - S E R V E R 𓊉\n` +
        `│ 💽 INFO RAM : ${freeRAM} / ${totalRAM}\n` +
        `│ ⚙️ INFO CPU : ${cpuModel} (${coreCount} Core)\n` +
        `│ ⏱️ Runtime Info : ${uptime}\n` +
        `│ ⏰ Time : ${wktuwib} WITA\n` +
        `└───────────────╼\n\n` +
        `┌─𓊈 S T A T I S T I K - B O T 𓊉\n` +
        `│ 🤖 Bot Name : ${botname}\n` +
        `│ 🔖 Prefix : [ ${usedPrefix} ]\n` +
        `│ 🗂️ Total Fitur : ${totalCommands}\n` +
        `│ 📈 Global Hit : ${Intl.NumberFormat('id-ID').format(totalHits)}\n` +
        `│ 📊 Hit Hari Ini : ${Intl.NumberFormat('id-ID').format(dailyHits)}\n` +
        `└───────────────╼\n\n` +
        `┌─𓊈 T O P 5 - F I T U R 𓊉\n` +
        `${topFiturList}\n` +
        `└───────────────╼\n\n` +
        `> Silahkan tekan tombol di bawah untuk memilih menu.`

    let msg = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: proto.Message.InteractiveMessage.create({
                    body: proto.Message.InteractiveMessage.Body.create({ text: menuBody }),
                    footer: proto.Message.InteractiveMessage.Footer.create({ text: `© ${botname} - Executive Mode` }),
                    header: proto.Message.InteractiveMessage.Header.create({ 
                        hasMediaAttachment: true,
                        imageMessage: media.imageMessage 
                    }),
                    contextInfo: {
                        mentionedJid: [m.sender],
                        isForwarded: false,
                        forwardingScore: 777,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363400612665352@newsletter',
                            newsletterName: '🌟 ᴇʀɪɴᴇ-ᴍᴅ ɪɴғᴏʀᴍᴀᴛɪᴏɴ',
                            serverMessageId: -1
                        }
                    },
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                        messageParamsJson: JSON.stringify({
                            limited_time_offer: {
                                text: `ᴇʀɪɴᴇ-ᴀssɪsᴛᴀɴᴛ`,
                                url: 'https://lynxapis.my.id',
                                copy_code: botname,
                                expiration_time: Date.now() * 999
                            },
                            bottom_sheet: {
                                in_thread_buttons_limit: 2,
                                divider_indices: [1, 2, 3, 4, 5, 999],
                                list_title: "Pilih Menu",
                                button_title: "🌟 Pilih Menu Disini"
                            },
                            tap_target_configuration: {
                                title: " X ",
                                description: "Erine Menu",
                                canonical_url: "https://lynxapis.my.id",
                                domain: "Dibuat Dengan Sepenuh Hati",
                                button_index: 0
                            }
                        }),
                        buttons: [
                            {
                                name: "single_select",
                                buttonParamsJson: JSON.stringify({ has_multiple_buttons: true })
                            },
                            {
                                name: "call_permission_request",
                                buttonParamsJson: JSON.stringify({ has_multiple_buttons: true })
                            },
                            {
                                name: "single_select",
                                buttonParamsJson: JSON.stringify({
                                    title: "PILIHAN MENU",
                                    sections: [
                                        {
                                            title: "📄 Silahkan pilih menu",
                                            highlight_label: botname,
                                            rows: categoryRows
                                        }
                                    ],
                                    has_multiple_buttons: true
                                })
                            },
                            {
                                name: 'cta_url',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '🌟 Erine Information',
                                    url: 'https://whatsapp.com/channel/0029VbAnuii6GcGCu73oep1i'
                                })
                            },
                            {
                                name: 'cta_url',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '💬 Community Group',
                                    url: 'https://chat.whatsapp.com/DyF8W35dgjzIHcmTsPa6Jj'
                                })
                            },
                            {
                                name: 'cta_url',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '⚡ Rest Apis Information',
                                    url: 'https://whatsapp.com/channel/0029VbCMzVqE50UZAnV44u05'
                                })
                            },
                            {
                                name: 'cta_url',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '💻 Source & Plugins',
                                    url: 'https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X'
                                })
                            },
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '📑 Lihat Semua Menu',
                                    id: `${usedPrefix}menu all`
                                })
                            },
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '👤 Hubungi Developer',
                                    id: `${usedPrefix}owner`
                                })
                            }
                        ]
                    })
                })
            }
        }
    }, { quoted: fkontak })

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

let handler = async (m, { conn, usedPrefix, command, text, args, isOwner }) => {
  if (!global.__menuLock) global.__menuLock = new Map()
  if (global.__menuLock.get(m.chat)) return
  global.__menuLock.set(m.chat, true)
  setTimeout(() => global.__menuLock.delete(m.chat), 3500)

  try {
    // Logika User Profile
    const who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
    const user = global.db.data.users[who] || {}
    let username = conn.getName(who)
    let name = user.registered ? user.name : username
    let role = user.role || 'Beginner'
    let level = user.level || 0
    
    const ownerList = getOwnerJidList()
    const isBotOwner = Boolean(isOwner) || ownerList.includes(who.split('@')[0])
    let limit = (isBotOwner || user?.premiumTime >= 1) ? 'UNLIMITED' : (user?.limit || 0)

    const botJid = conn.user?.jid || conn.user?.id || 'bot'
    global.db.data.settings[botJid] = global.db.data.settings[botJid] || {}
    const setting = global.db.data.settings[botJid]
    const setmenu = Number(setting.setmenu || 1)

    if (command === 'setmenu') {
      if (!isBotOwner) return m.reply('❌ Fitur ini khusus Owner!')
      const allowed = new Map([
        [1, 'Erine Default'],
        [2, 'Erine Carousel Categories'],
        [3, 'Erine Classic Buttons'],
        [4, 'Erine Product Layout'],
        [5, 'Erine Simple iOS (Anti-Bug)'],
        [6, 'Erine Exclusive Audio-Video Mix'],
        [7, 'Erine Special ButtonV2'],
        [8, 'Erine Executive Dashboard']
      ])
      const chosen = Number(args?.[0] || 0)
      if (!allowed.has(chosen)) {
        return m.reply(
          `*🎀 TEMA MENU ERINE 🎀*\n\n` +
          `*1.* Erine Default (Button List)\n` +
          `*2.* Carousel Categories\n` +
          `*3.* Classic Buttons\n` +
          `*4.* Product Layout\n` +
          `*5.* Simple iOS (Anti-Bug)\n` +
          `*6.* Exclusive Audio-Video Mix\n` +
          `*7.* Special ButtonV2\n` +
          `*8.* Executive Dashboard\n\n` +
          `*Contoh:* ${usedPrefix}setmenu 8`
        )
      }
      setting.setmenu = chosen
      return m.reply(`✅ Tampilan menu berhasil diubah ke *Tipe ${chosen} (${allowed.get(chosen)})*.`)
    }

    await m.react('⚡')

    let animMsg = await conn.sendMessage(m.chat, { text: '⚙️ *[ ERINE SYSTEM ]* : System Override Init...' }, { quoted: m })
    await delayAnim(1000)
    await conn.sendMessage(m.chat, { text: '🔓 *[ ERINE SYSTEM ]* : Override Mode Aktif!', edit: animMsg.key })
    await delayAnim(1000)
    await conn.sendMessage(m.chat, { text: '🔄 *[ ERINE SYSTEM ]* : Loading Data [ 10% ] ■□□□□□□□□□', edit: animMsg.key })
    await delayAnim(800)
    await conn.sendMessage(m.chat, { text: '🔄 *[ ERINE SYSTEM ]* : Loading Data [ 40% ] ■■■■□□□□□□', edit: animMsg.key })
    await delayAnim(800)
    await conn.sendMessage(m.chat, { text: '🔄 *[ ERINE SYSTEM ]* : Loading Data [ 70% ] ■■■■■■■□□□', edit: animMsg.key })
    await delayAnim(800)
    await conn.sendMessage(m.chat, { text: '🔄 *[ ERINE SYSTEM ]* : Loading Data [ 100% ] ■■■■■■■■■■', edit: animMsg.key })
    await delayAnim(1000)
    await conn.sendMessage(m.chat, { text: '✅ *[ ERINE SYSTEM ]* : Selesai! Menampilkan menu...', edit: animMsg.key })
    await delayAnim(920)

    const THUMB = global.menuThumb || MENU_THUMB
    let botname = global.namebot || conn.user?.name || 'ᴇʀɪɴᴇ ᴍᴅ'

    const { categories, totalCommands } = buildCategories()
    const catKeys = Object.keys(categories).sort()

    const menuType = String(text || '').toLowerCase().trim()
    const arrayMenu = catKeys

    let wktuwib = moment.tz('Asia/Makassar').format('HH:mm:ss')
    let date = moment.tz('Asia/Makassar').format('DD/MM/YYYY')
    let runtime = clockString(process.uptime() * 1000)
    let ramTerpakai = formatSize(os.totalmem() - os.freemem())
    let ramTotal = formatSize(os.totalmem())

    // FKontak Logic
    const fkontakLocal = {
        key: {
            fromMe: false,
            participant: `0@s.whatsapp.net`,
            ...(m.chat ? { remoteJid: "status@broadcast" } : {})
        },
        message: {
            contactMessage: {
                displayName: `${name}`,
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        }
    }

    // ==========================================
    // AUDIO SELECTION LOGIC
    // ==========================================
    let MENU_SOUND = ''

    if (setmenu === 8) {
        const allMenuAudios = ['https://files.catbox.moe/wp0ldk.mpeg', 'https://c.termai.cc/a183/JkHMr.mp3']
        MENU_SOUND = allMenuAudios[Math.floor(Math.random() * allMenuAudios.length)]
    } else if (setmenu === 7) {
        MENU_SOUND = MENU7_AUDIO
    } else {
        let audios = (setmenu === 6) ? (global.menuaudio || []) : (global.menuAudio || [])
        if (Array.isArray(audios) && audios.length > 0) {
            MENU_SOUND = audios[Math.floor(Math.random() * audios.length)]
        } else if (typeof audios === 'string' && audios.trim() !== '') {
            MENU_SOUND = audios
        }
    }

    let headerCaption = `┌˚₊ ๑│ ᴇ ʀ ɪ ɴ ᴇ  ᴍ ᴅ │๑˚₊ 🎀
┇ ✨ › ᴇʀɪɴᴇ sɪᴀᴘ ʙᴀɴᴛᴜ ᴋᴇʙᴜᴛᴜʜᴀɴᴍᴜ
┇ 🌸 › sᴀꜰᴇ & ᴛʀᴜsᴛᴇᴅ ᴀssɪsᴛᴀɴᴛ
┇ 🩰 › sᴇᴍᴀɴɢᴀᴛ sᴇᴘᴇʀᴛɪ ᴏsʜɪ-ᴍᴜ!
└˚₊ ๑ ᴛʜᴇᴀᴛᴇ r ɪɴꜰᴏ ๑˚₊ 🍓

୨ 𖤐 ୧ ${ucapan()}, ${name} 🦢
*Jangan lupa tersenyum hari ini yaa~* (๑ ˃̵ᴗ˂̵) ♡

┌˚ · ๑୧ ᴍ ᴇ ᴍ ʙ ᴇ ʀ  s ᴛ ᴀ ᴛ s
┇ 👤 ⁞ ᴜsᴇʀɴᴀᴍᴇ : ${name}
┇ 💳 ⁞ ʟɪᴍɪᴛ    : ${limit}
┇ ⏳ ⁞ ʀᴜɴᴛɪᴍᴇ  : ${runtime}
┇ 💾 ⁞ ʀᴀᴍ ᴜsᴇ  : ${ramTerpakai} / ${ramTotal}
┇ ⏰ ⁞ ᴛɪᴍᴇ     : ${wktuwib} ᴡɪᴛᴀ
┇ 📅 ⁞ ᴅᴀᴛᴇ     : ${date}
┇ 🎀 ⁞ ᴠᴇʀsɪᴏɴ  : v${global.version || '18.1.8'}
└˚₊ ๑୧

૮꒰ 🍓 ꒱ა ₊˚ s ᴇ ᴛ ʟ ɪ s ᴛ  ᴍ ᴇ ɴ ᴜ ✧
♡ .menu all — keseluruhan fitur
♡ .download menu — menu downloader
♡ .ai menu — AI chat
♡ .group menu — fitur khusus grup
♡ .owner menu — akses khusus owner`.trim()

    if (!menuType || (!categories[menuType] && menuType !== 'all')) {
      if (setmenu === 8) {
        await sendMainMenuV8(m, conn, usedPrefix, categories, catKeys, botname, name, limit, role, totalCommands, fkontakLocal)
      } else if (setmenu === 7) {
        await sendMainMenuV7(m, conn, usedPrefix, categories, arrayMenu)
      } else if (setmenu === 6) {
        await sendMainMenuV6(m, conn, usedPrefix, headerCaption, categories, arrayMenu)
      } else if (setmenu === 5) {
        await sendMainMenuV5(m, conn, usedPrefix, headerCaption, categories, arrayMenu)
      } else if (setmenu === 4) {
        await sendMainMenuV4(m, conn, usedPrefix, categories, catKeys, botname, runtime)
      } else if (setmenu === 3) {
        await sendMainMenuV3(m, conn, usedPrefix, botname, name, limit, role, level, wktuwib, date, runtime)
      } else if (setmenu === 2) {
        await sendMainMenuCarousel(m, conn, usedPrefix, categories, catKeys, botname, name, limit, role, level)
      } else {
        await sendMainMenuV1(m, conn, usedPrefix, headerCaption, categories, arrayMenu, botname)
      }
    } else {
      let quoteOpt = (setmenu >= 5) ? m : fkontakLocal
      let extraOpt = (setmenu >= 5) ? {} : {
        contextInfo: {
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363400612665352@newsletter',
            newsletterName: '🌟 ᴇʀɪɴᴇ-ᴍᴅ ɪɴғᴏʀᴍᴀᴛɪᴏɴ',
            serverMessageId: -1
          }
        }
      }

      // CUSTOM ALL MENU SET 8
      if (setmenu === 8 && menuType === 'all') {
          let menuTextAll = `> ⚡ *E X E C U T I V E  A L L  M E N U*\n\nMenampilkan seluruh fitur yang tersedia di *${botname}*.\n\n`
          for (const tag of arrayMenu) {
              menuTextAll += `╭─ 𓊈 *${formatTag(tag).toUpperCase()}* 𓊉 ───╼\n`
              for (const item of categories[tag] || []) {
                  for (const cmd of item.helps || []) {
                      const prefix = item.prefix ? usedPrefix : ''
                      menuTextAll += `│ ⚡ ${prefix}${cmd}\n`
                  }
              }
              menuTextAll += `╰───────────────╼\n\n`
          }

          await conn.sendMessage(m.chat, {
              video: { url: 'https://c.termai.cc/v115/PlQCkI.mp4' },
              gifPlayback: true,
              caption: menuTextAll.trim(),
              contextInfo: {
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: '120363400612665352@newsletter',
                  newsletterName: '🌟 ᴇʀɪɴᴇ-ᴍᴅ ɪɴғᴏʀᴍᴀᴛɪᴏɴ',
                  serverMessageId: -1
                }
              }
          }, { quoted: quoteOpt })
          
      } else {
          // Default styling for other menus
          let menuText = [`૮꒰ 🍓 ꒱ა ₊˚ ᴍ ᴇ ɴ ᴜ : ${menuType.toUpperCase()} 𖤐\n`]
          let targets = menuType === 'all' ? arrayMenu : [menuType]

          for (const tag of targets) {
            menuText.push("┌˚ · ๑୧ " + tag.toUpperCase())
            for (const item of categories[tag] || []) {
              for (const cmd of item.helps || []) {
                const prefix = item.prefix ? usedPrefix : ''
                menuText.push(`┇ ❦ ${prefix}${cmd}`)
              }
            }
            menuText.push(`└˚₊ ๑୧\n`)
          }

          if (menuType === 'all' || setmenu >= 5) {
              await conn.sendMessage(m.chat, {
                  video: { url: VID_ALL_MENU },
                  gifPlayback: true,
                  caption: menuText.join('\n').trim(),
                  ...extraOpt
              }, { quoted: quoteOpt })
          } else {
              await conn.sendMessage(m.chat, {
                image: { url: THUMB },
                caption: menuText.join('\n').trim(),
                ...extraOpt
              }, { quoted: quoteOpt })
          }
      }
    }

    // ==========================================
    // AUDIO EXECUTION
    // ==========================================
    if (MENU_SOUND !== '') {
      await conn.sendFile(m.chat, MENU_SOUND, 'menu.mp3', null, m, true, { type: 'audioMessage', ptt: true })
    }

    await m.react('✨')
  } catch (e) {
    console.error(e)
    m.reply('Menu error: ' + e.message)
  }
}

handler.command = /^(menu|allmenu|menu all|help|setmenu)$/i
handler.tags = ['main']
handler.help = ['menu', 'allmenu', 'help', 'setmenu <1|2|3|4|5|6|7|8>']

export default handler