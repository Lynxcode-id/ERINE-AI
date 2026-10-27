import os from 'node:os'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { generateVerificationMetadata } from '../../lib/jhrich.js'
import { buildQuoteContext } from '../../lib/utils.js'

const execPromise = promisify(exec)

const INTERVAL = 4000
const DURATION = 90_000
const HISTORY = 30
const PRIMITIVE = 'FOAHtmlPrimitiveDemoDONOTUSE'
const BOT_JID = '867051314767696@bot'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sessions = new Map()


function formatBytes(bytes) {
  if (!bytes || bytes < 0) bytes = 0
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  const mb = bytes / 1024 ** 2
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

const readNum = (p) => {
  try {
    const v = fs.readFileSync(p, 'utf8').trim()
    return /^\d+$/.test(v) ? Number(v) : null
  } catch {
    return null
  }
}

function memInfo() {
  const osTotal = os.totalmem()
  const limit = readNum('/sys/fs/cgroup/memory.max') ?? readNum('/sys/fs/cgroup/memory/memory.limit_in_bytes')
  const cur = readNum('/sys/fs/cgroup/memory.current') ?? readNum('/sys/fs/cgroup/memory/memory.usage_in_bytes')
  if (limit && cur != null && limit < osTotal) return { total: limit, used: cur, label: 'RAM PANEL' }
  return { total: osTotal, used: osTotal - os.freemem(), label: 'RAM' }
}

function swapUsed() {
  try {
    if (os.platform() !== 'linux') return 0
    const t = fs.readFileSync('/proc/meminfo', 'utf8')
    const get = (k) => Number(t.match(new RegExp(`${k}:\\s+(\\d+)\\s*kB`))?.[1] || 0) * 1024
    return get('SwapTotal') - get('SwapFree')
  } catch {
    return 0
  }
}

let diskCache = { at: 0, val: { pct: 0, used: 0, total: 0 } }
async function diskInfo() {
  if (Date.now() - diskCache.at < 30_000) return diskCache.val
  try {
    const { stdout } = await execPromise("df -k / | awk 'NR==2 {print $2,$3,$5}'")
    const [total, used, pct] = stdout.trim().split(/\s+/)
    diskCache = { at: Date.now(), val: { total: parseInt(total) * 1024, used: parseInt(used) * 1024, pct: parseFloat(pct) || 0 } }
  } catch {
    diskCache.at = Date.now()
  }
  return diskCache.val
}

function primaryIp() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const n of list || []) if (n.family === 'IPv4' && !n.internal) return n.address
  }
  return '127.0.0.1'
}

function createSampler() {
  let cpuPrev = os.cpus()
  let procPrev = process.cpuUsage()
  let tPrev = performance.now()

  return async function read() {
    const cpus = os.cpus()
    let idle = 0
    let total = 0
    for (let i = 0; i < cpus.length; i++) {
      const s = cpuPrev[i]?.times
      const e = cpus[i].times
      if (!s) continue
      total += e.user + e.nice + e.sys + e.idle + e.irq - (s.user + s.nice + s.sys + s.idle + s.irq)
      idle += e.idle - s.idle
    }
    const cpu = total > 0 ? Math.max(0, Math.min(100, 100 - (idle / total) * 100)) : 0

    const now = performance.now()
    const proc = process.cpuUsage(procPrev)
    const procCpu = Math.max(0, ((proc.user + proc.system) / ((now - tPrev) * 1000)) * 100)

    cpuPrev = cpus
    procPrev = process.cpuUsage()
    tPrev = now

    const t = performance.now()
    await new Promise((r) => setImmediate(r))
    const lag = performance.now() - t

    const mem = memInfo()
    const pm = process.memoryUsage()
    return {
      cpu,
      procCpu,
      lag,
      mem,
      ramPct: mem.total ? (mem.used / mem.total) * 100 : 0,
      rss: pm.rss,
      heap: pm.heapUsed,
      swap: swapUsed(),
      disk: await diskInfo(),
      cores: cpus.length,
    }
  }
}


function spark(arr, color, max = 100) {
  if (arr.length < 2) return ''
  const w = 300
  const h = 36
  const pts = arr.map((v, i) => `${((i / (arr.length - 1)) * w).toFixed(1)},${(h - 2 - (Math.min(v, max) / max) * (h - 4)).toFixed(1)}`).join(' ')
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block;margin-top:6px"><polyline fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" points="${pts}"/></svg>`
}

function buildHtml({ s, hist, ping, n, live, remain }) {
  const pingTxt = ping == null ? '...' : `${ping.toFixed(0)} ms`
  const pingMax = Math.max(100, ...hist.ping)
  const pct = (v) => Math.max(0, Math.min(100, v)).toFixed(1)
  const badge = live
    ? '<div class="live-badge"><div class="dot"></div> REALTIME MONITOR</div>'
    : '<div class="live-badge off"><div class="dot off"></div> LIVE BERAKHIR</div>'

  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;margin:0;padding:0}
body{background:#0d1117;color:#c9d1d9;padding:15px}
.card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:14px;margin-bottom:12px}
.head{display:flex;align-items:center;justify-content:space-between}
.live-badge{display:flex;align-items:center;gap:6px;font-size:11px;color:#3fb950;font-weight:600;letter-spacing:.5px}
.live-badge.off{color:#8b949e}
.dot{width:8px;height:8px;background:#3fb950;border-radius:50%;box-shadow:0 0 8px #3fb950;animation:blink 1.2s infinite}
.dot.off{background:#8b949e;box-shadow:none;animation:none}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes shimmer{0%{background-position:0 0}100%{background-position:40px 0}}
.ping{font-size:20px;font-weight:800;color:#58a6ff;text-align:right}
.sub{font-size:10px;color:#8b949e}
.up{background:rgba(63,185,80,.05);border:1px solid rgba(63,185,80,.2);text-align:center}
.up-t{font-size:10px;color:#8b949e;font-weight:700;letter-spacing:1px;margin-bottom:8px}
.bot-up{font-size:24px;font-weight:800;color:#3fb950;text-shadow:0 0 10px rgba(63,185,80,.3);margin-bottom:4px}
.row{margin-bottom:14px}.row:last-child{margin-bottom:0}
.lab{display:flex;justify-content:space-between;font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:6px}
.bar{width:100%;height:10px;background:#21262d;border-radius:5px;overflow:hidden}
.fill{height:100%;border-radius:5px;background-size:40px 10px;animation:shimmer 1s linear infinite}
.cpu{background-image:linear-gradient(45deg,rgba(255,255,255,.18) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.18) 75%,transparent 75%),linear-gradient(90deg,#1f6feb,#58a6ff)}
.bot{background-image:linear-gradient(45deg,rgba(255,255,255,.18) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.18) 75%,transparent 75%),linear-gradient(90deg,#238636,#3fb950)}
.ram{background-image:linear-gradient(45deg,rgba(255,255,255,.18) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.18) 75%,transparent 75%),linear-gradient(90deg,#da3633,#ff7b72)}
.disk{background-image:linear-gradient(45deg,rgba(255,255,255,.18) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.18) 75%,transparent 75%),linear-gradient(90deg,#8957e5,#d2a8ff)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.gi{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px 10px}
.gt{font-size:9px;color:#8b949e;text-transform:uppercase;font-weight:700;margin-bottom:6px;letter-spacing:.5px}
.gv{font-size:12px;color:#e6edf3;font-weight:600;word-break:break-all}
.foot{text-align:center;font-size:10px;color:#8b949e;margin-top:15px;padding-bottom:10px;line-height:1.6}
</style></head><body>

<div class="card head">
  <div style="display:flex;align-items:center;gap:10px">
    <div style="font-size:22px">📡</div>
    <div><div style="font-size:15px;font-weight:800;color:#e6edf3">SERVER LIVE</div>${badge}</div>
  </div>
  <div><div class="ping">${pingTxt}</div><div class="sub" style="text-align:right">ping kirim · update #${n}</div></div>
</div>

<div class="card up">
  <div class="up-t">⏱ BOT UPTIME - BERJALAN REALTIME</div>
  <div class="bot-up" id="botUp">...</div>
  <div class="sub" id="sysUp">...</div>
</div>

<div class="card">
  <div class="row">
    <div class="lab"><span style="color:#58a6ff">CPU SISTEM</span><span>${pct(s.cpu)}%</span></div>
    <div class="bar"><div class="fill cpu" style="width:${pct(s.cpu)}%"></div></div>
    ${spark(hist.cpu, '#58a6ff')}
  </div>
  <div class="row">
    <div class="lab"><span style="color:#3fb950">CPU BOT</span><span>${s.procCpu.toFixed(1)}%</span></div>
    <div class="bar"><div class="fill bot" style="width:${pct(s.procCpu)}%"></div></div>
    ${spark(hist.proc, '#3fb950')}
  </div>
  <div class="row">
    <div class="lab"><span style="color:#ff7b72">${s.mem.label}</span><span>${formatBytes(s.mem.used)} / ${formatBytes(s.mem.total)} · ${pct(s.ramPct)}%</span></div>
    <div class="bar"><div class="fill ram" style="width:${pct(s.ramPct)}%"></div></div>
    ${spark(hist.ram, '#ff7b72')}
  </div>
  <div class="row">
    <div class="lab"><span style="color:#d2a8ff">DISK</span><span>${pct(s.disk.pct)}%</span></div>
    <div class="bar"><div class="fill disk" style="width:${pct(s.disk.pct)}%"></div></div>
  </div>
  <div class="row">
    <div class="lab"><span style="color:#e3b341">PING KIRIM (ms)</span><span>${pingTxt}</span></div>
    ${spark(hist.ping, '#e3b341', pingMax)}
  </div>
</div>

<div class="grid">
  <div class="gi"><div class="gt">RSS</div><div class="gv">${formatBytes(s.rss)}</div></div>
  <div class="gi"><div class="gt">HEAP</div><div class="gv">${formatBytes(s.heap)}</div></div>
  <div class="gi"><div class="gt">EVENT LOOP LAG</div><div class="gv">${s.lag.toFixed(1)} ms</div></div>
  <div class="gi"><div class="gt">SWAP</div><div class="gv">${s.swap > 0 ? formatBytes(s.swap) : 'tidak ada'}</div></div>
  <div class="gi"><div class="gt">OS</div><div class="gv">${os.type()} ${os.release().split('-')[0]}</div></div>
  <div class="gi"><div class="gt">ARCH / CPU</div><div class="gv">${os.arch()} · ${s.cores} core</div></div>
  <div class="gi"><div class="gt">IP PRIMER</div><div class="gv">${primaryIp()}</div></div>
  <div class="gi"><div class="gt">RUNTIME</div><div class="gv">Node ${process.versions.node}</div></div>
</div>

<div class="foot" id="foot">...<br>ELYRA SERVER INSPECTOR</div>

<script>
var b=${Math.floor(process.uptime())},s=${Math.floor(os.uptime())},age=0,left=${Math.max(0, Math.floor(remain / 1000))},live=${live ? 'true' : 'false'};
function fmt(x){var d=Math.floor(x/86400),h=Math.floor(x%86400/3600),m=Math.floor(x%3600/60),r=Math.floor(x%60),o='';if(d>0)o+=d+'h ';if(h>0)o+=h+'j ';if(m>0)o+=m+'m ';return o+r+'s'}
function draw(){
  document.getElementById('botUp').innerText=fmt(b);
  document.getElementById('sysUp').innerText='system: '+fmt(s);
  document.getElementById('foot').innerHTML=(live?('diperbarui '+age+' detik lalu · live berakhir dalam '+Math.max(left,0)+'s'):'live sudah berakhir, kirim .pinglive lagi')+'<br>ELYRA SERVER INSPECTOR';
}
setInterval(function(){b++;s++;age++;left--;draw()},1000);
draw();
</script>
</body></html>`
}


function buildContent(html, m) {
  return {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: '',
        verificationMetadata: generateVerificationMetadata(),
        botResponseId: crypto.randomUUID(),
      },
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [{ messageType: 2, messageText: '.pinglive' }],
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                __typename: 'GenAIUnifiedResponse',
                response_id: crypto.randomUUID(),
                sections: [
                  {
                    __typename: 'GenAIUnifiedResponseSection',
                    view_model: {
                      __typename: 'GenAISingleLayoutViewModel',
                      primitive: { __typename: PRIMITIVE, trusted_sources: [], payload: html },
                    },
                  },
                ],
              })
            ).toString('base64'),
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: BOT_JID },
            forwardOrigin: 4,
            ...buildQuoteContext(m),
          },
        },
      },
    },
  }
}

const TEXT_ATTR = { additionalAttributes: { type: 'text' } }

async function sendEdit(sock, chat, id, content) {
  return sock.message.send(
    chat,
    { botForwardedMessage: { message: { protocolMessage: { key: { remoteJid: chat, fromMe: true, id }, type: 14, editedMessage: content } } } },
    TEXT_ATTR
  )
}

async function startLive(m, sock) {
  const chat = m.chat
  sessions.get(chat)?.stop()

  let stopped = false
  const session = { stop: () => (stopped = true) }
  sessions.set(chat, session)

  const read = createSampler()
  await sleep(250)

  const hist = { cpu: [], proc: [], ram: [], ping: [] }
  const push = (arr, v) => {
    arr.push(v)
    if (arr.length > HISTORY) arr.shift()
  }
  const startAt = Date.now()
  let n = 0
  let ping = null
  let id = null

  const render = async (live) => {
    const s = await read()
    push(hist.cpu, s.cpu)
    push(hist.proc, Math.min(100, s.procCpu))
    push(hist.ram, s.ramPct)
    if (ping != null) push(hist.ping, ping)
    n++
    return buildHtml({ s, hist, ping, n, live, remain: DURATION - (Date.now() - startAt) })
  }

  let t0 = performance.now()
  const sent = await sock.message.send(chat, buildContent(await render(true), m), TEXT_ATTR)
  ping = performance.now() - t0
  id = sent?.id || sent?.key?.id
  if (!id) {
    sessions.delete(chat)
    return
  }

  ;(async () => {
    let fails = 0
    try {
      while (!stopped && Date.now() - startAt < DURATION) {
        t0 = performance.now()
        try {
          await sendEdit(sock, chat, id, buildContent(await render(true), m))
          ping = performance.now() - t0
          fails = 0
        } catch (err) {
          console.error('[PINGLIVE] edit gagal:', String(err?.message || err).slice(0, 120))
          if (++fails >= 2) break
        }
        await sleep(INTERVAL)
      }
      await sendEdit(sock, chat, id, buildContent(await render(false), m)).catch(() => {})
    } finally {
      if (sessions.get(chat) === session) sessions.delete(chat)
    }
  })()
}

export default {
  command: 'pinglive',
  alias: ['livestatus', 'serverlive'],
  category: 'info',
  tags: ['info'],
  description: 'Monitor server realtime (ping, CPU, RAM, RSS, disk) yang update otomatis.\n\ncontoh:\n> .pinglive\n> .pinglive stop',
  help: '[stop]',
  typing: true,

  async execute(m, { sock, args }) {
    if (String(args?.[0] || '').toLowerCase() === 'stop') {
      const ses = sessions.get(m.chat)
      if (!ses) return m.reply('🌷 Tidak ada pinglive yang sedang berjalan di chat ini.')
      ses.stop()
      return m.reply('🌷 Pinglive dihentikan.')
    }

    await sock.sendReact(m.chat, '⏳', m.id).catch(() => {})
    try {
      await startLive(m, sock)
      await sock.sendReact(m.chat, '✅', m.id).catch(() => {})
    } catch (err) {
      console.error('[PINGLIVE]', err?.stack || err?.message || err)
      await sock.sendReact(m.chat, '❌', m.id).catch(() => {})
      await m.reply(`❌ Gagal mengambil system info.\n> *Detail:* ${err?.message || err}`)
    }
  },
}