
import fs from 'fs/promises'
import path from 'path'
import chatgot from '../scrape/chatgot.js'

const MAX_ERROR_LENGTH = 5000
const REPORT_TIMEOUT = 45000

const withTimeout = (promise, ms = REPORT_TIMEOUT) => Promise.race([
  Promise.resolve(promise),
  new Promise((_, reject) => setTimeout(() => reject(new Error(`Self-Heal timeout (${ms}ms)`)), ms))
])

function localDiagnosis(errorText = '') {
  const err = String(errorText).toLowerCase()

  if (/syntaxerror|unexpected token|missing catch|missing \)/i.test(err)) {
    return 'Syntax error: periksa kurung, tanda kutip, template literal, koma, atau struktur blok yang belum ditutup.'
  }

  if (/is not defined|cannot find name|referenceerror/i.test(err)) {
    return 'ReferenceError: ada variable/fungsi yang belum didefinisikan, typo, atau import/export yang belum benar.'
  }

  if (/is not a function|cannot read properties of undefined.*function/i.test(err)) {
    return 'TypeError: method yang dipanggil tidak tersedia pada object tersebut; cek bentuk response API, optional chaining, dan nama method.'
  }

  if (/cannot read properties of undefined|null/i.test(err)) {
    return 'Null/undefined access: salah satu object belum tersedia. Tambahkan guard, optional chaining, atau validasi response sebelum mengakses property.'
  }

  if (/econnrefused|fetch failed|enotfound|network|socket hang up|etimedout/i.test(err)) {
    return 'Network/API failure: endpoint mungkin down, DNS bermasalah, timeout terlalu pendek, atau koneksi server bermasalah.'
  }

  if (/401|403|forbidden|unauthorized/i.test(err)) {
    return 'Authorization/permission failure: token, session, cookie, API key, atau permission WhatsApp perlu diperiksa.'
  }

  if (/429|rate.?limit|too many requests/i.test(err)) {
    return 'Rate limit: endpoint menerima request terlalu banyak. Gunakan timeout/backoff dan provider fallback.'
  }

  if (/module not found|cannot find module/i.test(err)) {
    return 'Dependency/import failure: module belum terpasang, path import salah, atau nama file berbeda casing.'
  }

  return 'Penyebab spesifik tidak bisa dipastikan secara lokal; log lengkap dan file sumber perlu dianalisa AI.'
}

function extractCodeBlocks(text = '') {
  const blocks = []
  const regex = /```(?:javascript|js|mjs|esm)?\s*([\s\S]*?)```/gi
  let match

  while ((match = regex.exec(String(text)))) {
    const code = match[1].trim()
    if (code) blocks.push(code)
  }

  return blocks
}

function sanitizeLog(text = '') {
  const raw = String(text || '')
  return raw.length > MAX_ERROR_LENGTH
    ? `${raw.slice(0, MAX_ERROR_LENGTH)}\n...[log dipotong]`
    : raw
}

async function loadSourceContext(fileName = '') {
  if (!fileName) return ''

  const candidates = [
    path.resolve(process.cwd(), fileName),
    path.resolve(process.cwd(), 'plugins', path.basename(fileName)),
    path.resolve(process.cwd(), 'lib', path.basename(fileName)),
    path.resolve(process.cwd(), 'scrape', path.basename(fileName))
  ]

  for (const file of candidates) {
    try {
      const source = await fs.readFile(file, 'utf8')
      return source.length > 14000
        ? `${source.slice(0, 14000)}\n...[source dipotong]`
        : source
    } catch {}
  }

  return ''
}

export async function selfHeal(errorText, fileName = 'unknown', context = {}) {
  const safeError = sanitizeLog(errorText)
  const sourceContext = await loadSourceContext(fileName)

  const prompt = `
Kamu adalah Senior System Administrator dan Developer Node.js ESM + Baileys untuk proyek ERINE-AI.

Analisa error berikut secara teknis dan jangan mengarang API yang tidak terlihat.
Berikan output dengan struktur:
1. ROOT_CAUSE: penyebab paling mungkin
2. WHY: kenapa error terjadi
3. FIX_PLAN: langkah perbaikan
4. FIXED_CODE: kode yang sudah diperbaiki, siap paste
5. EXTRA_CHECKS: hal lain yang perlu dicek

PENTING:
- Jangan menghapus fitur yang tidak berhubungan dengan error.
- Pertahankan ESM.
- Pertahankan kompatibilitas Baileys dan struktur plugin ERINE.
- Jika informasi tidak cukup, katakan bagian mana yang belum bisa dipastikan.
- Utamakan solusi konkret.

File:
${fileName}

Command:
${context.command || '-'}

Message:
${context.message || '-'}

Error:
${safeError}

Source file yang ditemukan:
${sourceContext || '[source tidak ditemukan; analisa berdasarkan stack/error log saja]'}
`.trim()

  let result = ''
  try {
    result = await withTimeout(
      chatgot(prompt, {
        provider: 'gpt',
        chain: ['gpt', 'claude', 'gemini', 'gpt4omini', 'deepseek', 'gemini-remote']
      })
    )
  } catch (error) {
    const diagnosis = localDiagnosis(safeError)
    return {
      ok: false,
      provider: 'local',
      error: String(errorText),
      file: fileName,
      rootCause: diagnosis,
      fix: `Fallback lokal:\n${diagnosis}`,
      code: [],
      raw: ''
    }
  }

  const code = extractCodeBlocks(result)
  return {
    ok: true,
    provider: 'chatgot',
    error: String(errorText),
    file: fileName,
    rootCause: result,
    fix: result,
    code,
    raw: result
  }
}

export async function autoHealError(error, {
  fileName = 'unknown',
  command = '',
  message = '',
  conn = null,
  chat = null,
  notifyJid = null
} = {}) {
  const text = error?.stack || error?.message || String(error)
  const report = await selfHeal(text, fileName, {
    command,
    message
  })

  const ownerJid = notifyJid || global.nomorown
    ? `${String(notifyJid || global.nomorown).replace(/[^0-9]/g, '')}@s.whatsapp.net`
    : null

  const destination = ownerJid || chat
  if (conn && destination) {
    const title = report.ok ? '✅ SELF-HEAL ANALYSIS' : '⚠️ SELF-HEAL FALLBACK'
    const body = String(report.fix || report.rootCause || 'Tidak ada laporan.')
    const compact = body.length > 12000 ? `${body.slice(0, 12000)}\n...[potong]` : body

    await conn.sendMessage(destination, {
      text:
        `┌˚₊ ๑│ ${title} │๑˚₊\n` +
        `┇\n` +
        `│ File: *${fileName}*\n` +
        `│ Command: *${command || '-'}*\n` +
        `┇\n` +
        `${compact}\n` +
        `┇\n` +
        `└˚₊ ๑ ────────────── ๑˚₊\n` +
        `> © ERINE-AI | SELF-HEAL`
    }).catch(() => {})
  }

  return report
}

export default selfHeal
