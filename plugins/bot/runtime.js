
import os from 'os'
import fs from 'fs/promises'
import { formatBytes, formatDuration } from '../../lib/utils.js'

const FOOTER = 'with love, elyra !!'

const pct = (used, total) => (total > 0 ? ((used / total) * 100).toFixed(1) : '0.0')

async function readSwap() {
  try {
    const data = await fs.readFile('/proc/meminfo', 'utf8')
    const totalKB = parseInt(data.match(/SwapTotal:\s+(\d+)/)?.[1] || 0)
    const freeKB = parseInt(data.match(/SwapFree:\s+(\d+)/)?.[1] || 0)
    const usedKB = totalKB - freeKB
    return {
      total: formatBytes(totalKB * 1024),
      used: formatBytes(usedKB * 1024),
      free: formatBytes(freeKB * 1024),
      percent: pct(usedKB, totalKB)
    }
  } catch {
    return { total: 'N/A', used: 'N/A', free: 'N/A', percent: '0.0' }
  }
}

export default {
  command: 'runtime',
  alias: ['rt', 'uptime', 'status'],
  category: 'bot',
  description: `> Menampilkan status aktif bot (uptime), versi Node.js, platform, penggunaan memori, RAM, swap, dan info CPU.

contoh penggunaan:
> \`.runtime\`
> \`.uptime\``,
  help: '',
  typing: true,

  async execute(m) {
    const mem = process.memoryUsage()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const cpuCores = os.cpus().length
    const load = os.loadavg()
    const swap = await readSwap()

    return m.reply([
      '🌷 *Bot Status*',
      '',
      'Kondisi bot saat ini,',
      'masih aktif dan siap membantu.',
      '',
      `♡ Uptime : ${formatDuration(process.uptime() * 1000)}`,
      `♡ Node.js : ${process.version}`,
      `♡ Platform : ${os.platform()} (${os.arch()})`,
      `♡ PID : ${process.pid}`,
      '',
      '🌸 *Memory Node.js*',
      `♡ RSS : ${formatBytes(mem.rss)}`,
      `♡ Heap : ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}`,
      `♡ External : ${formatBytes(mem.external)}`,
      `♡ ArrayBuffers : ${formatBytes(mem.arrayBuffers)}`,
      '',
      '🌸 *System Memory*',
      `♡ RAM : ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${pct(usedMem, totalMem)}%)`,
      `♡ Free RAM : ${formatBytes(freeMem)}`,
      `♡ Swap : ${swap.used} / ${swap.total} (${swap.percent}%)`,
      `♡ Free Swap : ${swap.free}`,
      '',
      '🌸 *CPU*',
      `♡ Cores : ${cpuCores}`,
      `♡ Load : ${load.map(l => l.toFixed(2)).join(', ')}`,
      `♡ Usage (est.) : ${pct(load[0], cpuCores)}%`,
      '',
      FOOTER
    ].join('\n'))
  }
}