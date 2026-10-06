process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1';

import './lib/quiet-signal.js'
import * as lidResolver from './lib/lid-resolver.js'
import { applyPrefix } from './lib/prefixControl.js'
import './config.js'

import path, { join } from 'path'
import { platform } from 'process'
import { fileURLToPath, pathToFileURL } from 'url'
import { createRequire } from 'module'
global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') { return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString() }; global.__dirname = function dirname(pathURL) { return path.dirname(global.__filename(pathURL, true)) }; global.__require = function require(dir = import.meta.url) { return createRequire(dir) }
import {
  readdirSync,
  statSync,
  unlinkSync,
  existsSync,
  readFileSync,
  watch
} from 'fs'

import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
const argv = yargs(hideBin(process.argv)).argv

import { spawn } from 'child_process'
import lodash from 'lodash'
import syntaxerror from 'syntax-error'
import chalk from 'chalk'
import { tmpdir } from 'os'
import readline from 'readline'
import { format } from 'util'
import { autoHealError } from './lib/selfheal-engine.js'

global.selfHeal = global.selfHeal || { active: true, cooldown: 30000, last: new Map() }
import pino from 'pino'
import ws from 'ws'

import * as baileys from '@whiskeysockets/baileys'
const {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
  Browsers
} = baileys

import useSQLiteAuthState from './lib/useSQLite.js'

import NodeCache from 'node-cache'
const msgRetryCounterCache = new NodeCache({ stdTTL: 10 * 60, checkperiod: 60 })
const groupCache = new NodeCache({ stdTTL: 10 * 60, useClones: false })
global.erineGroupCache = groupCache
const pendingGroupFetch = new Map()
async function fetchGroupMetadataDeduped(jid, conn) {
    if (pendingGroupFetch.has(jid)) return pendingGroupFetch.get(jid)
    const p = (async () => {
        try { return await conn.groupMetadata(jid) }
        catch (e) { return null }
        finally { pendingGroupFetch.delete(jid) }
    })()
    pendingGroupFetch.set(jid, p)
    return p
}
global.erineFetchGroupMetadata = fetchGroupMetadataDeduped

const lidMap = new Map();
const pnMap = new Map();
const pendingOnWa = new Map()
async function onWhatsAppDeduped(jid, conn) {
    if (pendingOnWa.has(jid)) return pendingOnWa.get(jid)
    const p = conn.onWhatsApp(jid).catch(() => [{}]).finally(() => pendingOnWa.delete(jid))
    pendingOnWa.set(jid, p)
    return p
}
const loggedLid = new Set()

async function resolvePhoneNumber(jid = '', conn = global.conn) {
    if (!jid) return ''
    jid = jidNormalizedUser(jid)
    if (pnMap.has(jid)) return pnMap.get(jid)
    if (/^\d+$/.test(jid)) return jid
    { const lk = lidResolver.lookup(jid); if (lk) { const pn = lk.split('@')[0]; pnMap.set(jid, pn); return pn } }
    if (jid.includes('@s.whatsapp.net')) {
        const pn = jid.split('@')[0]
        pnMap.set(jid, pn)
        return pn
    }

    if (conn?.chats) {
        for (const chat of Object.values(conn.chats)) {
            const p = chat?.metadata?.participants?.find(v => v.lid === jid || v.id === jid)
            if (p?.phoneNumber) {
                const pn = p.phoneNumber.replace(/[^0-9]/g, '')
                pnMap.set(jid, pn)
                return pn
            }
            if (p?.id && !p.id.endsWith('@lid')) {
                const pn = p.id.split('@')[0]
                pnMap.set(jid, pn)
                return pn
            }
        }
    }

    if (jid.endsWith('@lid')) { const rr = await lidResolver.resolve(conn || global.conn, jid).catch(() => ''); if (rr) { const pn = rr.split('@')[0]; pnMap.set(jid, pn); return pn } }
    try {
        const [res] = await onWhatsAppDeduped(jid, global.conn)
        if (res?.jid && !res.jid.endsWith('@lid')) {
            const pn = res.jid.split('@')[0]
            pnMap.set(jid, pn)
            return pn
        }
    } catch {}
    return jid.replace(/[^0-9]/g, '')
}

async function normalizeMainJid(jid) {
    if (!jid) return ''
    jid = jidNormalizedUser(jid)
    if (!jid.endsWith('@lid')) return jid
    if (lidMap.has(jid)) return lidMap.get(jid)
    if (global.conn?.isLid?.[jid]) return global.conn.isLid[jid]
    { const lk = lidResolver.lookup(jid); if (lk) { lidMap.set(jid, lk); return lk } }
    if (global.conn?.chats) {
        for (const chat of Object.values(global.conn.chats)) {
            const p = chat?.metadata?.participants?.find(v => v.lid === jid)
            if (p?.id && !p.id.endsWith('@lid')) {
                lidMap.set(jid, p.id)
                if (!global.conn.isLid) global.conn.isLid = {}
                global.conn.isLid[jid] = p.id
                return p.id
            }
            if (p?.phoneNumber) {
                const pnJid = `${p.phoneNumber.replace(/[^0-9]/g, '')}@s.whatsapp.net`
                lidMap.set(jid, pnJid)
                if (!global.conn.isLid) global.conn.isLid = {}
                global.conn.isLid[jid] = pnJid
                return pnJid
            }
        }
    }

    { const rr = await lidResolver.resolve(global.conn, jid).catch(() => ''); if (rr) { lidMap.set(jid, rr); return rr } }

    try {
        const [res] = await onWhatsAppDeduped(jid, global.conn)
        if (res?.jid && !res.jid.endsWith('@lid')) {
            lidMap.set(jid, res.jid)
            if (!global.conn.isLid) global.conn.isLid = {}
            global.conn.isLid[jid] = res.jid
            return res.jid
        }
    } catch {}

    const pn = jid.replace(/[^0-9]/g, '')
    if (pn && pn.length < 15) return `${pn}@s.whatsapp.net`

    return jid
}

setInterval(() => {
    if (lidMap.size > 5000) lidMap.clear()
    if (pnMap.size > 5000) pnMap.clear()
}, 6 * 60 * 60 * 1000);

const setGroupCache = async (jid) => {
    const normalJid = await normalizeMainJid(jid);
    if (normalJid.endsWith('@g.us')) {
        const metadata = await fetchGroupMetadataDeduped(normalJid, global.conn);
        if (metadata) {
            groupCache.set(normalJid, metadata);
            lidResolver.learnParticipants(metadata.participants);
            for (let p of metadata.participants || []) {
                if (p.lid && p.id && !p.id.endsWith('@lid')) {
                    lidMap.set(p.lid, p.id)
                    if (!global.conn.isLid) global.conn.isLid = {}
                    global.conn.isLid[p.lid] = p.id
                }
                if (p.phoneNumber && p.lid) {
                    const pnJid = `${p.phoneNumber.replace(/[^0-9]/g, '')}@s.whatsapp.net`
                    lidMap.set(p.lid, pnJid)
                    if (!global.conn.isLid) global.conn.isLid = {}
                    global.conn.isLid[p.lid] = pnJid
                    pnMap.set(p.lid, p.phoneNumber.replace(/[^0-9]/g, ''))
                }
            }
        }
    }
}

import { Low } from 'lowdb'
import SafeJSONFile from './lib/safe-json-file.js'
import { makeWASocket, protoType, serialize } from './lib/simple.js'
import cloudDBAdapter from './lib/cloudDBAdapter.js'
import { bindAlbumCollector } from './lib/albumCollector.js'
import {
  mongoDB,
  mongoDBV2
} from './lib/mongoDB.js'

const { CONNECTING } = ws
const { chain } = lodash
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000

protoType()
serialize()

global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}) })) : '')
global.timestamp = {
  start: new Date
}

const __dirname = global.__dirname(import.meta.url)

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.prefix = new RegExp('^[' + (opts['prefix'] || '-.').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')

global.db = new Low(
  /https?:\/\//.test(opts['db'] || '') ?
    new cloudDBAdapter(opts['db']) : /mongodb(\+srv)?:\/\//i.test(opts['db']) ?
      (opts['mongodbv2'] ? new mongoDBV2(opts['db']) : new mongoDB(opts['db'])) :
      new SafeJSONFile('database.json')
)
global.DATABASE = global.db
global.loadDatabase = async function loadDatabase() {
  if (db.READ) return new Promise((resolve) => setInterval(async function () {
    if (!db.READ) {
      clearInterval(this)
      resolve(db.data == null ? global.loadDatabase() : db.data)
    }
  }, 1 * 1000))
  if (db.data !== null) return
  db.READ = true
  await db.read().catch(console.error)
  db.READ = null
  db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    sticker: {},
    settings: {},
    opts: {},
    ...(db.data || {})
  }
  global.db.chain = chain(db.data)

  if (global.db.data && global.db.data.opts) {
      for (let opt in global.db.data.opts) {
          global.opts[opt] = global.db.data.opts[opt]
      }
  }
}
await global.loadDatabase()

{
  const realWrite = global.db.write.bind(global.db)
  let timer = null, firstDirty = 0, running = null
  const flush = async () => {
    clearTimeout(timer); timer = null; firstDirty = 0
    if (!global.db.data) return
    if (running) await running.catch(() => {})
    running = realWrite().catch(console.error).finally(() => { running = null })
    return running
  }
  global.db.writeNow = flush
  global.db.write = () => {
    if (!firstDirty) firstDirty = Date.now()
    clearTimeout(timer)
    const wait = Math.max(300, Math.min(3000, 15000 - (Date.now() - firstDirty)))
    timer = setTimeout(flush, wait)
    return Promise.resolve()
  }
}
lidResolver.cleanupFakeUsers(global.db)
applyPrefix()
const usePairingCode = !process.argv.includes('--use-pairing-code')
const useMobile = process.argv.includes('--mobile')

var question = function (text) {
  return new Promise(function (resolve) {
    rl.question(text, resolve);
  });
};
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

const { version: waVersion, isLatest } = await fetchLatestBaileysVersion().catch(err => {
  console.error('Failed to fetch latest Baileys version:', err)
  return { version: undefined, isLatest: false }
})

const authHandle = await useSQLiteAuthState('./sessions')
const { state, saveCreds } = authHandle

process.on('message', async (msg) => {
    if (msg === 'prepare-shutdown') await gracefulExit('prepare-shutdown')
});

let shuttingDown = false
async function gracefulExit(why) {
    if (shuttingDown) return
    shuttingDown = true
    console.log(chalk.yellow(`[MAIN] Simpan session & database sebelum berhenti (${why})...`))
    global.isRestarting = true
    try { await saveCreds() } catch (e) { console.error('[MAIN] saveCreds gagal:', e.message) }
    try { if (global.db?.data) await global.db.writeNow() } catch (e) { console.error('[MAIN] simpan DB gagal:', e.message) }
    try { await authHandle.close?.() } catch {}
    process.exit(0)
}
process.on('SIGTERM', () => gracefulExit('SIGTERM'))
process.on('SIGINT', () => gracefulExit('SIGINT'))

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

const connectionOptions = {
  ...(waVersion ? { version: waVersion } : {}),
  logger: pino({ level: 'silent' }),
  printQRInTerminal: !usePairingCode,
  browser: Browsers.ubuntu('Chrome'),
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino().child({
      level: 'silent',
      stream: 'store'
    })),
  },
  msgRetryCounterCache,
  cachedGroupMetadata: async (jid) => {
    const j = await normalizeMainJid(jid)
    return groupCache.get(j) || global.conn?.chats?.[j]?.metadata || undefined
  },
  getMessage: async key => {
    const jid = await normalizeMainJid(key.remoteJid);
    const messageData = await store.loadMessage(jid, key.id);
    return messageData?.message || undefined;
  },
  generateHighQualityLinkPreview: true,
  patchMessageBeforeSending: (message) => {
    const requiresPatch = !!(
      message.buttonsMessage
      || message.templateMessage
      || message.listMessage
    );
    if (requiresPatch) {
      message = {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadataVersion: 2,
              deviceListMetadata: {},
            },
            ...message,
          },
        },
      };
    }

    return message;
  },
  connectTimeoutMs: 60000,
  defaultQueryTimeoutMs: 0,
  syncFullHistory: false,
  markOnlineOnConnect: true,
  transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 1500 },
  retryRequestDelayMs: 3000,
  maxMsgRetryCount: 5,
  keepAliveIntervalMs: 15000
}

const healCooldown = new Map()
const signalFailureState = new Map()
async function healBrokenSession(conn, m) {
    try {
        let jid = m.key?.participant || m.key?.remoteJid
        const alternate = m.key?.participantAlt || m.key?.remoteJidAlt
        if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') return

        const users = new Set([
            String(jid).split('@')[0].split(':')[0],
            String(await normalizeMainJid(jid).catch(() => jid)).split('@')[0].split(':')[0]
        ])
        const key = [...users].sort().join('|')
        const now = Date.now()
        const previous = signalFailureState.get(key)
        if (!previous || now - previous.first > 45 * 1000) {
            signalFailureState.set(key, { first: now, count: 1 })
            return
        }
        previous.count += 1
        if (previous.count < 3) return
        signalFailureState.delete(key)
        if (alternate && alternate !== jid) return
        if (now - (healCooldown.get(key) || 0) < 10 * 60 * 1000) return

        const ids = new Set()
        for (const user of users) {
            if (!user) continue
            for (const id of authHandle.helpers.findSessionIds(user)) ids.add(id)
        }
        if (!ids.size) return
        healCooldown.set(key, now)

        const patch = {}
        for (const id of ids) patch[id] = null
        await conn.authState.keys.set({ session: patch })
        console.warn(chalk.yellow(`[SESSION-HEAL] ${ids.size} session Signal dibersihkan setelah 3 kegagalan dekripsi beruntun`))
    } catch (e) { console.error('[SESSION-HEAL]', e.message) }
}

const TRANSIENT_SEND = /rate-overlimit|No sessions|no session|Connection Closed|Connection Terminated|ECONNRESET|EPIPE|Bad MAC/i
function hardenSend(conn) {
    if (conn.__sendHardened || typeof conn.sendMessage !== 'function') return
    const orig = conn.sendMessage.bind(conn)
    try {
        conn.sendMessage = async (jid, content, ...rest) => {
            try { content = await lidResolver.fixMentions(conn, content, jid) } catch { }
            let lastErr
            for (let i = 0; i < 3; i++) {
                try { return await orig(jid, content, ...rest) }
                catch (e) {
                    lastErr = e
                    if (!TRANSIENT_SEND.test(String(e?.message || e)) || i === 2) throw e
                    await new Promise(r => setTimeout(r, 1000 * (i + 1) * 1.5))
                }
            }
            throw lastErr
        }
        conn.__sendHardened = true
    } catch (e) { console.error('[SEND-HARDEN]', e.message) }
}

function bindExtraFeatures(conn) {
    lidResolver.bindEvents(conn)
    hardenSend(conn)
    store.bind(conn.ev)
    conn.ev.on('messages.upsert', async ({ messages }) => {
        for (const m of messages || []) {
            if (m?.messageStubType !== 2) continue
            const params = (m.messageStubParameters || []).join(' ')
            if (/Bad MAC|No matching sessions|No session found|Invalid PreKey|Over 2000 messages/i.test(params)) healBrokenSession(conn, m)
        }
    })
    bindAlbumCollector(conn)
    conn.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const m = messages[0]
            if (!m || m.messageStubType == null) return
            if (m.messageStubType === 2) return
            let chat = global.db?.data?.chats?.[m.key.remoteJid] || {}
            if (chat.stubReact === false) return

            await conn.sendMessage(
                m.key.remoteJid,
                {
                    react: {
                        text: chat.stubEmoji || "🌱",
                        key: m.key
                    }
                }
            )
        } catch (e) {
            console.error(e)
        }
    })

    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m) return;
        if ([m.key.remoteJid, m.key.participant].some(jid => jid?.endsWith('@lid'))) {
            const targetId = m.key.participant || m.key.remoteJid;
            const normal = await normalizeMainJid(targetId)
            if (!loggedLid.has(targetId)) {
                loggedLid.add(targetId)
                console.log(chalk.bgRed.white(' [ LID MASUK ] '), targetId, '->', normal)
            }
        }
    });

}

global.conn = makeWASocket(connectionOptions)
conn.isInit = false
bindExtraFeatures(global.conn)

global.normalizeJid = normalizeMainJid
global.resolvePn = resolvePhoneNumber

if (usePairingCode && !conn.authState.creds.registered) {
  if (useMobile) throw new Error('Cannot use pairing code with mobile api')

  let phoneNumber = (argv._[0] || '').trim().replace(/[^0-9]/g, '')

  while (!phoneNumber) {
    phoneNumber = (await question(
      chalk.blueBright('Input nomor WhatsApp yang valid (awali dengan kode negara, contoh: 62812xxxxxx):\n')
    )).trim().replace(/[^0-9]/g, '')
  }

  rl.close()

console.log(chalk.green(`Nomor digunakan: ${phoneNumber}`))

  console.log(chalk.bgWhite(chalk.blue('Generating Pairing Code...')))
  setTimeout(async () => {
    try {
      const rawCode = await conn.requestPairingCode(phoneNumber)
      const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode

      const line = '─'.repeat(code.length + 4)
      console.log(chalk.green(`\n┌${line}┐`))
      console.log(chalk.green(`│  ${chalk.yellow.bold(code)}  │`))
      console.log(chalk.green(`└${line}┘`))
      console.log(chalk.cyan(`\nPairing Code: ${chalk.bold('ERINEPRJ')}`))
      console.log(chalk.magenta('📌 Masukkan pairing code ini ke WhatsApp segera!'))
    } catch (e) {
      console.error(chalk.red('❌ Gagal generate pairing code:'), e)
      process.exit(1)
    }
  }, 8000)
}

async function resetLimit() {
  try {
    if (!global.db?.data?.users) return;
    const lim = 15;

    for (const [, data] of Object.entries(global.db.data.users)) {
      if (!data || typeof data !== 'object') continue;
      if (typeof data.limit !== 'number' || data.limit < lim) {
        data.limit = lim;
      }
    }

    console.log(chalk.green('Success Auto Reset Limit ke 15'));
  } catch (e) {
    console.error('Reset limit error:', e);
  }
}

setTimeout(() => {
  resetLimit();
  setInterval(resetLimit, 1 * 86400000);
}, 10000);

if (!opts['test']) {
  (await import('./server.js')).default(PORT)
  setInterval(async () => {
    if (global.db.data) await global.db.writeNow().catch(console.error)
    clearTmp()
  }, 60 * 1000)
}

function clearTmp() {
  const tmp = [tmpdir(), join(__dirname, './tmp')]
  const filename = []
  tmp.forEach(dirname => {
    if(existsSync(dirname)) readdirSync(dirname).forEach(file => filename.push(join(dirname, file)))
  })
  return filename.map(file => {
    try {
      const stats = statSync(file)
      if (stats.isFile() && (Date.now() - stats.mtimeMs >= 1000 * 60 * 3)) return unlinkSync(file)
    } catch (e) {}
    return false
  })
}

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isOnline, receivedPendingNotifications } = update

  if (connection === 'connecting') {
    console.log(chalk.redBright('⚡ engine started...'))
  }

  if (connection === 'open') {
    global.reconnectFailStreak = 0
    global.isReconnectScheduled = false
    console.log(chalk.green('🔥 successfully connected..'))

    conn.ev.on('groups.update', async ([event]) => {
        if(event && event.id) {
            const normalId = await normalizeMainJid(event.id);
            if (normalId.endsWith('@g.us')) await setGroupCache(normalId);
        }
    })

    conn.ev.on('group-participants.update', async (event) => {
        if(event && event.id) {
            const normalId = await normalizeMainJid(event.id);
            if (event.action === 'add' && event.participants.includes(conn.user.id)) {
                await setGroupCache(normalId);
                console.log('Force fetch metadata grup baru:', normalId);
            } else if (normalId.endsWith('@g.us')) {
                await setGroupCache(normalId);
            }
        }
    })


  }

  if (isOnline === true) console.log(chalk.green('Status Aktif'))
  else if (isOnline === false) console.log(chalk.red('Status Mati'))
  if (receivedPendingNotifications) console.log(chalk.yellow('Menunggu Pesan Baru'))
  if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode

    console.log(chalk.red('connection closed', code))

    if (global.isRestarting) {
      console.log(chalk.yellow('skip reconnect karena sedang restart'))
      return
    }

    if (code === DisconnectReason.loggedOut) {
      console.log(chalk.red.bold('Logged out oleh WhatsApp. Session SQLite tetap disimpan untuk pengecekan.'))
      return
    }

    if (global.isReconnectScheduled) return
    global.isReconnectScheduled = true

    global.reconnectFailStreak = (global.reconnectFailStreak || 0) + 1
    const delay = Math.min(5000 * Math.pow(2, global.reconnectFailStreak - 1), 30000)

    setTimeout(async () => {
      global.isReconnectScheduled = false
      try {
        console.log(chalk.green(`reconnect attempt... (percobaan ke-${global.reconnectFailStreak}, delay ${delay}ms)`))
        await global.reloadHandler(true)
      } catch (e) {
        console.error(chalk.red('reconnect failed:'), e)
      }
    }, delay)
  }

  if (global.db.data == null) {
    await global.loadDatabase()
  }
}
process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]', error)
  const conn = global.conn
  const notifyJid = global.nomorown
    ? `${String(global.nomorown).replace(/[^0-9]/g, '')}@s.whatsapp.net`
    : null

  if (global.selfHeal?.active) {
    autoHealError(error, {
      fileName: 'runtime',
      command: '',
      message: '',
      conn,
      notifyJid
    }).catch(err => console.error('[SELF-HEAL RUNTIME]', err))
  }
})

const SIGNAL_DECRYPT_NOISE = /Failed to decrypt message with any known session|Bad MAC|No matching sessions|No session found|Invalid PreKey/i
const signalNoiseLog = new Map()
process.on('unhandledRejection', (reason) => {
  const text = String(reason?.message || reason || '')
  if (SIGNAL_DECRYPT_NOISE.test(text)) {
    const key = text.slice(0, 180)
    const now = Date.now()
    if (now - (signalNoiseLog.get(key) || 0) > 60 * 1000) {
      signalNoiseLog.set(key, now)
      console.warn(chalk.yellow(`[SIGNAL-DECRYPT] transient failure: ${key}`))
    }
    return
  }

  console.error('[UNHANDLED REJECTION]', reason)
  const conn = global.conn
  const notifyJid = global.nomorown
    ? `${String(global.nomorown).replace(/[^0-9]/g, '')}@s.whatsapp.net`
    : null

  if (global.selfHeal?.active) {
    autoHealError(reason, {
      fileName: 'runtime',
      command: '',
      message: '',
      conn,
      notifyJid
    }).catch(err => console.error('[SELF-HEAL REJECTION]', err))
  }
})

const MAX_CONCURRENT = Number(process.env.HANDLER_CONCURRENCY || 12)
let activeHandlers = 0
const waiting = []
function queueHandler(job) {
  return new Promise((resolve) => {
    const run = async () => {
      activeHandlers++
      try { await job() } catch (e) { console.error('[HANDLER]', e) }
      finally {
        activeHandlers--
        const next = waiting.shift()
        if (next) next()
        resolve()
      }
    }
    if (activeHandlers < MAX_CONCURRENT) run()
    else {
      if (waiting.length >= 300) { waiting.shift()?.(); console.warn('[HANDLER] antrian penuh, request paling lama dilepas') }
      waiting.push(run)
    }
  })
}

let isInit = true
let handler = await import('./handler.js')
global.reloadHandler = async function (restatConn) {
  try {
    const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error)
    if (Object.keys(Handler || {}).length) handler = Handler
  } catch (e) {
    console.error(e)
  }
  if (restatConn) {
    const oldChats = global.conn.chats
    try { global.conn.ws.close() } catch { }
    conn.ev.removeAllListeners()
    global.conn = makeWASocket(connectionOptions, { chats: oldChats })

    bindExtraFeatures(global.conn)

    isInit = true
  }
  if (!isInit) {
    conn.ev.off('messages.upsert', conn.handler)
    conn.ev.off('group-participants.update', conn.participantsUpdate)
    conn.ev.off('groups.update', conn.groupsUpdate)
    conn.ev.off('message.delete', conn.onDelete)
    conn.ev.off('connection.update', conn.connectionUpdate)
    conn.ev.off('creds.update', conn.credsUpdate)
  }

  conn.welcome = '👋 Halo @user!\n\nSelamat datang cuy di *@subject* 🎉'
  conn.bye = 'Sampai jumpa lagi, @user 👋'
  conn.spromote = '@user Sekarang jadi admin!'
  conn.sdemote = '@user Sekarang bukan lagi admin!'
  conn.sDesc = 'Deskripsi telah diubah menjadi \n@desc'
  conn.sSubject = 'Judul grup telah diubah menjadi \n@subject'
  conn.sIcon = 'Icon grup telah diubah!'
  conn.sRevoke = 'Link group telah diubah ke \n@revoke'
  conn.sAnnounceOn = 'Group telah di tutup!\nsekarang hanya admin yang dapat mengirim pesan.'
  conn.sAnnounceOff = 'Group telah di buka!\nsekarang semua peserta dapat mengirim pesan.'
  conn.sRestrictOn = 'Edit Info Grup di ubah ke hanya admin!'
  conn.sRestrictOff = 'Edit Info Grup di ubah ke semua peserta!'

  const runHandler = handler.handler.bind(global.conn)
  conn.handler = (upsert) => {
    const list = upsert?.messages || []
    if (list.length <= 1) return queueHandler(() => runHandler(upsert))
    for (const msg of list) {
      const ts = Number(msg?.messageTimestamp?.low ?? msg?.messageTimestamp ?? 0)
      if (upsert.type !== 'notify' && ts && Date.now() / 1000 - ts > 120) continue
      queueHandler(() => runHandler({ ...upsert, messages: [msg] }))
    }
  }
  conn.participantsUpdate = handler.participantsUpdate.bind(global.conn)
  conn.groupsUpdate = handler.groupsUpdate.bind(global.conn)
  conn.onDelete = handler.deleteUpdate.bind(global.conn)
  conn.connectionUpdate = connectionUpdate.bind(global.conn)
  conn.credsUpdate = saveCreds.bind(global.conn)

  conn.ev.on('call', async (call) => {
    console.log('Panggilan diterima:', call);
    if (call.status === 'ringing') {
      await conn.rejectCall(call.id);
      console.log('Panggilan ditolak');
    }
  })
  conn.ev.on('messages.upsert', conn.handler)
  conn.ev.on('group-participants.update', conn.participantsUpdate)
  conn.ev.on('groups.update', conn.groupsUpdate)
  conn.ev.on('message.delete', conn.onDelete)
  conn.ev.on('connection.update', conn.connectionUpdate)
  conn.ev.on('creds.update', conn.credsUpdate)
  isInit = false
  return true

}

const pluginFolder = global.__dirname(join(__dirname, './plugins'))
const pluginFilter = filename => /\.js$/.test(filename)
global.plugins = {}

async function filesInit() {
  console.log(chalk.bgBlue.white('\n 🌟 sedang memuat plugins, harap menunggu beberapa saat... '));
  const files = readdirSync(pluginFolder).filter(pluginFilter);
  const chunkSize = 250;
  let loaded = 0;

  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);

    await Promise.all(chunk.map(async (filename) => {
      try {
        let file = global.__filename(join(pluginFolder, filename))
        const module = await import(file)
        global.plugins[filename] = module.default || module
      } catch (e) {
        conn.logger.error(`Error load ${filename}:`, e)
        delete global.plugins[filename]
      }
    }));

    loaded += chunk.length;
    console.log(chalk.yellow(`⚡ plugins yang termuat: ${loaded} / ${files.length}...`));

    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  console.log(chalk.bgGreen.white(`\n 🔥 semua plugins sudah termuat total ${loaded} plugins! Bot sekarang siap menerima protokol perintah... `));
}
filesInit().catch(console.error)

global.reload = async (_ev, filename) => {
  if (pluginFilter(filename)) {
    let dir = global.__filename(join(pluginFolder, filename), true)
    if (filename in global.plugins) {
      if (existsSync(dir)) conn.logger.info(`re - require plugin '${filename}'`)
      else {
        conn.logger.warn(`deleted plugin '${filename}'`)
        return delete global.plugins[filename]
      }
    } else conn.logger.info(`requiring new plugin '${filename}'`)
    let err = syntaxerror(readFileSync(dir), filename, {
      sourceType: 'module',
      allowAwaitOutsideFunction: true
    })
    if (err) conn.logger.error(`syntax error while loading '${filename}'\n${format(err)}`)
    else try {
      const module = (await import(`${global.__filename(dir)}?update=${Date.now()}`))
      global.plugins[filename] = module.default || module
    } catch (e) {
      conn.logger.error(`error require plugin '${filename}\n${format(e)}'`)
    } finally {
      global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
    }
  }
}
Object.freeze(global.reload)
watch(pluginFolder, global.reload)
await global.reloadHandler()

async function _quickTest() {
  let test = await Promise.all([
    spawn('ffmpeg'),
    spawn('ffprobe'),
    spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
    spawn('convert'),
    spawn('magick'),
    spawn('gm'),
    spawn('find', ['--version'])
  ].map(p => {
    return Promise.race([
      new Promise(resolve => {
        p.on('close', code => {
          resolve(code !== 127);
        });
      }),
      new Promise(resolve => {
        p.on('error', _ => resolve(false));
      })
    ]);
  }));

  let [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test;

  let s = global.support = {
    ffmpeg,
    ffprobe,
    ffmpegWebp,
    convert,
    magick,
    gm,
    find
  };

  Object.freeze(global.support);

  if (!s.ffmpeg) {
    conn.logger.warn(`Silahkan install ffmpeg terlebih dahulu agar bisa mengirim video`);
  }

  if (s.ffmpeg && !s.ffmpegWebp) {
    conn.logger.warn('Sticker Mungkin Tidak Beranimasi tanpa libwebp di ffmpeg (--enable-libwebp while compiling ffmpeg)');
  }

  if (!s.convert && !s.magick && !s.gm) {
    conn.logger.warn('Fitur Stiker Mungkin Tidak Bekerja Tanpa imagemagick dan libwebp di ffmpeg belum terinstall (pkg install imagemagick)');
  }
}

_quickTest()
  .then(() => conn.logger.info('☑️ Quick Test Done , DB terload aman!'))
  .catch(console.error);
