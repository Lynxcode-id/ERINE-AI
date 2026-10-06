
import axios from 'axios'

const TIMEOUT = 25000

const isUsable = value => {
  if (value == null) return false
  const text = typeof value === 'string'
    ? value
    : value?.result || value?.data || value?.text || value?.message || value?.answer || ''
  if (!String(text).trim()) return false

  const low = String(text).trim().toLowerCase()
  return !(
    low.startsWith('terjadi kesalahan saat memproses ai:') ||
    low.startsWith('error in chatgot') ||
    low.includes('scraper timeout') ||
    low === '❌ gagal merespon.' ||
    low === '❌ gagal merespon'
  )
}

const unwrap = value => {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object') {
    const out = value.result ?? value.data ?? value.text ?? value.message ?? value.answer
    if (typeof out === 'object' && out !== null) {
      return String(out.text ?? out.result ?? out.answer ?? JSON.stringify(out)).trim()
    }
    return String(out ?? '').trim()
  }
  return String(value ?? '').trim()
}

const withTimeout = (promise, ms = TIMEOUT) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`AI timeout (${ms}ms)`)), ms))
])

async function localGPT(prompt) {
  const mod = await import('./gpt.js')
  return unwrap(await mod.default(prompt))
}

async function localClaude(prompt) {
  const mod = await import('./claude.js')
  return unwrap(await mod.default(prompt))
}

async function localGemini(prompt) {
  const mod = await import('./gemini.js')
  const client = new mod.GeminiClient()
  const res = await client.chat(prompt)
  return unwrap(res?.text || res)
}

async function remote(url) {
  const { data } = await axios.get(url, {
    timeout: TIMEOUT,
    headers: {
      'User-Agent': 'ERINE-AI/ChatGot'
    }
  })
  return unwrap(data)
}

const PROVIDERS = {
  gpt: localGPT,
  claude: localClaude,
  gemini: localGemini,

  'gpt4omini': prompt => remote(
    `https://api.zenzxz.my.id/api/ai/c-ai?message=${encodeURIComponent(prompt)}`
  ),
  deepseek: prompt => remote(
    `https://api.siputzx.my.id/api/ai/deepseek-r1?prompt=${encodeURIComponent(prompt)}`
  ),
  'gemini-remote': prompt => remote(
    `https://btch.us.kg/openai?text=${encodeURIComponent(prompt)}`
  )
}

const DEFAULT_CHAIN = [
  'gpt',
  'claude',
  'gemini',
  'gpt4omini',
  'deepseek',
  'gemini-remote'
]

async function chatgot(prompt, modelOrOptions = {}) {
  const text = String(prompt ?? '').trim()
  if (!text) throw new Error('Prompt AI kosong')

  const opts = typeof modelOrOptions === 'string'
    ? { provider: modelOrOptions }
    : (modelOrOptions || {})

  const preferred = opts.provider || null
  const timeout = Number(opts.timeout) > 0 ? Number(opts.timeout) : TIMEOUT

  let chain = Array.isArray(opts.chain) && opts.chain.length
    ? [...opts.chain]
    : DEFAULT_CHAIN.slice()

  if (preferred) {
    chain = [preferred, ...chain.filter(v => v !== preferred)]
  }

  chain = [...new Set(chain.filter(v => PROVIDERS[v]))]

  const errors = []
  for (const name of chain) {
    try {
      console.log(`[CHATGOT] Trying ${name}...`)
      const result = await withTimeout(PROMISE_SAFE(PROVIDERS[name](text)), timeout)
      const output = unwrap(result)
      if (isUsable(output)) {
        console.log(`[CHATGOT] ${name} OK`)
        return output
      }
      throw new Error('Response AI kosong/tidak valid')
    } catch (error) {
      const message = error?.message || String(error)
      errors.push(`${name}: ${message}`)
      console.log(`[CHATGOT] ${name} failed -> ${message}`)
    }
  }

  throw new Error(`Semua provider ChatGot gagal: ${errors.join(' | ')}`)
}

function PROMISE_SAFE(value) {
  return Promise.resolve(value)
}

chatgot.providers = Object.freeze(Object.keys(PROVIDERS))
chatgot.defaultChain = Object.freeze(DEFAULT_CHAIN.slice())

export { chatgot, PROVIDERS }
export default chatgot
