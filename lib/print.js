import { WAMessageStubType } from '@whiskeysockets/baileys'
import PhoneNumber from 'awesome-phonenumber'
import chalk from 'chalk'
import { watchFile } from 'fs'

function formatBytes(bytes = 0) {
  if (!bytes || isNaN(bytes)) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

function getTime(timestamp) {
  return new Date(
    timestamp ? 1000 * (timestamp.low || timestamp) : Date.now()
  ).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })
}

function gradientText(text, hexColors) {
  const step = Math.max(1, text.length / hexColors.length)
  return text.split('').map((char, i) => {
    const colorIndex = Math.min(Math.floor(i / step), hexColors.length - 1)
    return chalk.hex(hexColors[colorIndex])(char)
  }).join('')
}

export default async function (m, conn = { user: {} }) {
  if (!m.sender && !m.text && !m.mtype) return;

  try {
    const senderLid = m.senderLid || m.sender || ''
    const senderJid = conn.getJid ? conn.getJid(senderLid) : senderLid

    const senderPn = (await Promise.resolve(m.senderPn).catch(() => '')) || (conn.resolvePn ? await Promise.resolve(conn.resolvePn(senderLid)).catch(() => '') : '')

    const name = senderJid ? await Promise.resolve(conn.getName(senderJid)).catch(() => 'Unknown') : 'Unknown'

    const senderNum = senderPn || senderJid.split('@')[0]
    const sender = senderNum
        ? PhoneNumber('+' + senderNum).getNumber('international') + (name && name !== 'Unknown' ? ` ~ ${name}` : '')
        : '- System / Unknown -'

    if (!senderNum && !m.chat) return;

    const chatName = m.chat ? await Promise.resolve(conn.getName(m.chat)).catch(() => m.chat) : '-'

    const botNumberRaw = (conn.user?.jid || conn.user?.id || '').split('@')[0].split(':')[0]
    const botNumber = botNumberRaw ? PhoneNumber('+' + botNumberRaw).getNumber('international') : '-'
    const botName = conn.user?.name || 'ERINE-MD'

    const botId = (conn.user?.id && typeof conn.decodeJid === 'function') ? conn.decodeJid(conn.user.id) : (conn.user?.id || '')
    const mainBotId = (global.conn?.user?.id && typeof global.conn.decodeJid === 'function') ? global.conn.decodeJid(global.conn.user.id) : (global.conn?.user?.id || botId)
    const isJadibot = botId && mainBotId && botId !== mainBotId
    if (isJadibot && m.isGroup) {
        try {
            const metadata = await conn.groupMetadata(m.chat).catch(() => null)
            if (metadata?.participants?.some(p => (conn.decodeJid ? conn.decodeJid(p.id) : p.id) === mainBotId)) {
                return
            }
        } catch {}
    }

    const redYellowGlow = ['#FF0000', '#FF3300', '#FF6600', '#FF9900', '#FFCC00', '#FFFF00']
    const cyanBlueGlow = ['#00FFFF', '#00DDFF', '#00BBFF', '#0099FF', '#0077FF', '#0055FF']

    const themeColors = isJadibot ? cyanBlueGlow : redYellowGlow
    const titleStr = isJadibot ? '🤖 JADIBOT SESSION' : '🐣  ERINE-MD SYSTEM'
    const titleGradient = gradientText(titleStr, themeColors)

    const textWhite = chalk.hex('#FFFFFF')
    const labelColor = chalk.hex('#E0E0E0')

    const filesize =
      m.msg?.fileLength?.low ||
      m.msg?.fileLength ||
      m.msg?.vcard?.length ||
      m.msg?.axolotlSenderKeyDistributionMessage?.length ||
      m.text?.length ||
      0

    const user = (global.db?.data?.users && senderJid) ? (global.db.data.users[senderJid] || {}) : {}
    const time = getTime(m.messageTimestamp)

    const type = m.mtype
      ? m.mtype
          .replace(/message$/i, '')
          .replace('audio', m.msg?.ptt ? 'PTT' : 'Audio')
          .replace(/^./, v => v.toUpperCase())
      : '-'

    const stub = m.messageStubType
      ? WAMessageStubType[m.messageStubType]
      : '-'

    const barLength = 46
    const horizontalBar = '━'.repeat(barLength)

    if (senderNum) {
        const rawLines = [
            `┏${horizontalBar}`,
            `┃ ⬣ [ ${titleGradient} ] ⬣`,
            `┣${horizontalBar}`,
            `┃ ${chalk.bold.white('❖ BOT INFO')}`,
            `┃   ${labelColor('Name')}   : ${textWhite(botName)}`,
            `┃   ${labelColor('Number')} : ${textWhite(botNumber)}`,
            `┣${horizontalBar}`,
            `┃ ${chalk.bold.white('❖ USER & ROOM')}`,
            `┃   ${labelColor('Sender')} : ${textWhite(sender)}`,
            `┃   ${labelColor('Room')}   : ${textWhite(chatName || m.chat || '-')}`,
            `┃   ${labelColor('Status')} : ${textWhite(`Lv.${user.level || 0} | Exp ${user.exp || 0} | Limit ${user.limit || 0}`)}`,
            `┣${horizontalBar}`,
            `┃ ${chalk.bold.white('❖ MESSAGE DETAIL')}`,
            `┃   ${labelColor('Time')}   : ${textWhite(time)}`,
            `┃   ${labelColor('Type')}   : ${textWhite(type)}`,
            `┃   ${labelColor('Size')}   : ${textWhite(formatBytes(filesize))}`
        ]

        if (stub !== '-') rawLines.push(`┃   ${chalk.hex('#FF0033')('Event')}  : ${textWhite(stub)}`)
        rawLines.push(`┗${horizontalBar}`)

        const logOutput = rawLines.map((lineText, index) => {
            const colorIndex = Math.min(Math.floor((index / rawLines.length) * themeColors.length), themeColors.length - 1)
            const glowColor = chalk.hex(themeColors[colorIndex])

            return lineText.replace(/^[┏┃┣┗]━*/, match => glowColor(match))
        }).join('\n')

        console.log(logOutput)
    }

    if (typeof m.text === 'string' && m.text) {
      let logText = m.text.replace(/\u200e+/g, '')

      if (m.mentionedJid) {
        for (let jid of m.mentionedJid) {
          const realJid = conn.getJid ? conn.getJid(jid) : jid
          const taggedName = await Promise.resolve(conn.getName(realJid)).catch(() => realJid.split('@')[0])
          logText = logText.replace(
            '@' + jid.split('@')[0],
            chalk.bgHex(themeColors[2] || '#FF6600').black(` @${taggedName} `)
          )
        }
      }

      if (m.error) {
        console.log(chalk.bgHex('#FF0033').whiteBright(' [ ❌ ERROR ] ') + chalk.hex('#FF3333')(` ${logText}`))
      } else if (m.isCommand) {
        console.log(chalk.bgHex('#00FFCC').black(' [ ⚡ CMD ] ') + chalk.hex('#00FFCC')(` ${logText}`))
      } else {
        console.log(chalk.bgHex('#333333').whiteBright(' [ 💬 MSG ] ') + textWhite(` ${logText}`))
      }
    }

    if (/document/i.test(m.mtype)) {
      console.log(chalk.bgHex('#00A8FF').black(' [ 📄 FILE ] ') + chalk.hex('#00A8FF')(` ${m.msg?.fileName || m.msg?.displayName || '-'}`))
    } else if (/contact/i.test(m.mtype)) {
      console.log(chalk.bgHex('#FFCC00').black(' [ 👤 CONTACT ] ') + chalk.hex('#FFCC00')(` ${m.msg?.displayName || '-'}`))
    } else if (/audio/i.test(m.mtype)) {
      const duration = m.msg?.seconds || 0
      const fmtDuration = `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`
      console.log(chalk.bgHex('#FF007F').whiteBright(' [ 🎧 AUDIO ] ') + chalk.hex('#FF007F')(` ${fmtDuration}`))
    }

  } catch (e) {
    if (!String(e).includes('lid')) console.error('[PRINT ERROR]', e)
  }
}

let file = global.__filename(import.meta.url)
watchFile(file, () => {
  console.log(chalk.bgHex('#00FFFF').black(' 🔄 SYSTEM UPDATE '), chalk.white('Logger file has been updated.'))
})
