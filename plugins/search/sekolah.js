const BASE = 'https://sekolah.data.kemendikdasmen.go.id'
const API = `${BASE}/v1/sekolah-service/sekolah/cari-sekolah`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const CACHE_TTL_MS = 10 * 60 * 1000
const SESSION_TTL_MS = 20 * 60 * 1000
const MIN_GAP_MS = 2000
const BLOCK_COOLDOWN_MS = 10 * 60 * 1000

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

const DEFAULT_PAGE_SIZE = 20
const DEFAULT_MAX_PAGES = 3
const DEFAULT_RESULTS = 3

const cache = new Map()
const cookieJar = new Map()

let sessionAt = 0
let queue = Promise.resolve()
let lastRunAt = 0
let blockedUntil = 0

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

const clean = value =>
  value == null
    ? null
    : String(value).trim() || null

const titleCase = value =>
  String(value || '')
    .toLowerCase()
    .replace(/\b\w/g, character => character.toUpperCase())


function enqueue(task) {
  const run = queue.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastRunAt)

    if (wait > 0) {
      await sleep(wait)
    }

    try {
      return await task()
    } finally {
      lastRunAt = Date.now()
    }
  })

  queue = run.catch(() => {})

  return run
}


function cookieHeader() {
  return [...cookieJar]
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

function storeCookies(response) {
  let cookies = []

  if (
    typeof response.headers.getSetCookie === 'function'
  ) {
    cookies = response.headers.getSetCookie()
  } else {
    const cookie = response.headers.get('set-cookie')

    if (cookie) {
      cookies = [cookie]
    }
  }

  for (const cookie of cookies) {
    const pair = cookie.split(';')[0]
    const index = pair.indexOf('=')

    if (index <= 0) continue

    const name = pair.slice(0, index).trim()
    const value = pair.slice(index + 1).trim()

    if (name) {
      cookieJar.set(name, value)
    }
  }
}

async function ensureSession() {
  if (Date.now() - sessionAt < SESSION_TTL_MS) {
    return
  }

  cookieJar.clear()

  const response = await enqueue(() =>
    fetch(`${BASE}/`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
      },

      redirect: 'follow',

      signal: AbortSignal.timeout(30000)
    })
  )

  storeCookies(response)

  if (!response.ok) {
    throw new Error(
      `Gagal membuat sesi portal: HTTP ${response.status}`
    )
  }

  sessionAt = Date.now()
}


function findArray(object, depth = 0) {
  if (!object || depth > 5) {
    return null
  }

  if (Array.isArray(object)) {
    return object
  }

  if (typeof object !== 'object') {
    return null
  }

  const keys = [
    'data',
    'content',
    'items',
    'results',
    'rows',
    'list',
    'sekolah',
    'result'
  ]

  for (const key of keys) {
    if (!(key in object)) continue

    const found = findArray(
      object[key],
      depth + 1
    )

    if (found !== null) {
      return found
    }
  }

  return null
}

function findTotal(object, depth = 0) {
  if (
    !object ||
    typeof object !== 'object' ||
    depth > 5
  ) {
    return null
  }

  const keys = [
    'totalElements',
    'total_elements',
    'total',
    'totalItems',
    'total_items',
    'count'
  ]

  for (const key of keys) {
    if (
      typeof object[key] === 'number' &&
      Number.isFinite(object[key])
    ) {
      return object[key]
    }
  }

  const nestedKeys = [
    'data',
    'meta',
    'pagination',
    'page',
    'result'
  ]

  for (const key of nestedKeys) {
    const value = object[key]

    if (
      value &&
      typeof value === 'object'
    ) {
      const total = findTotal(
        value,
        depth + 1
      )

      if (total !== null) {
        return total
      }
    }
  }

  return null
}


function normalizeSchool(source = {}) {
  const jalan = clean(
    source.alamat_jalan ??
    source.alamatJalan ??
    source.alamat
  )

  const dusun = clean(
    source.nama_dusun ??
    source.namaDusun
  )

  const rt = Number(source.rt) || 0
  const rw = Number(source.rw) || 0

  const kecamatan = clean(
    source.kecamatan ??
    source.nama_kecamatan
  )

  const kabupaten = clean(
    source.kabupaten ??
    source.kabupaten_kota ??
    source.nama_kabupaten
  )

  const provinsi = clean(
    source.provinsi ??
    source.nama_provinsi
  )

  const kodePos = clean(
    source.kode_pos ??
    source.kodePos
  )

  const parts = []

  if (jalan) {
    parts.push(jalan)
  }

  if (
    dusun &&
    !(jalan || '')
      .toLowerCase()
      .includes(dusun.toLowerCase())
  ) {
    parts.push(dusun)
  }

  if (
    (rt > 0 || rw > 0) &&
    !/\bRT\b/i.test(jalan || '')
  ) {
    parts.push(`RT ${rt}/RW ${rw}`)
  }

  const alamatLengkap = [
    ...parts,
    kecamatan,
    kabupaten,
    provinsi
  ]
    .filter(Boolean)
    .join(', ')

  const nama = clean(
    source.nama ??
    source.nama_sekolah ??
    source.namaSekolah
  )

  const npsn = clean(source.npsn)

  const bentukPendidikan = clean(
    source.bentuk_pendidikan ??
    source.bentukPendidikan ??
    source.jenjang
  )

  const statusSekolah = clean(
    source.status_sekolah ??
    source.statusSekolah ??
    source.status
  )

  const akreditasi = clean(source.akreditasi)

  const id = clean(
    source.sekolah_id ??
    source.sekolahId ??
    source.id
  )

  const foto = clean(
    source.path_file ??
    source.foto ??
    source.thumbnail
  )

  return {
    id,
    npsn,
    nama: nama || '-',
    bentuk_pendidikan: bentukPendidikan || '-',
    status_sekolah: statusSekolah || '-',
    akreditasi: akreditasi || 'Belum ada data',

    alamat: {
      jalan,
      dusun,
      rt: rt || null,
      rw: rw || null,
      kecamatan,
      kabupaten,
      provinsi,
      kode_pos: kodePos,
      lengkap: alamatLengkap || null
    },

    foto
  }
}

function normalizeSchools(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .filter(item =>
      item &&
      typeof item === 'object' &&
      !Array.isArray(item)
    )
    .map(normalizeSchool)
}


const LEVEL_MAP = {
  sd: 'SD',
  sdn: 'SD',
  sds: 'SD',

  smp: 'SMP',
  smpn: 'SMP',
  smps: 'SMP',

  sma: 'SMA',
  sman: 'SMA',
  smas: 'SMA',

  smk: 'SMK',
  smkn: 'SMK',
  smks: 'SMK',

  tk: 'TK',
  paud: 'PAUD',

  mi: 'MI',
  min: 'MI',

  mts: 'MTS',
  mtsn: 'MTS',

  ma: 'MA',
  man: 'MA',

  slb: 'SLB',
  kb: 'KB'
}

const STOP_WORDS = new Set([
  ...Object.keys(LEVEL_MAP),
  'sekolah',
  'negeri',
  'swasta',
  'dasar',
  'menengah',
  'pertama',
  'atas',
  'kejuruan'
])

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSearchIntent(keyword) {
  const words = normalizeText(keyword)
    .split(' ')
    .filter(Boolean)

  let wantedLevel = null
  let wantedStatus = null

  const tokens = []

  for (const word of words) {
    if (LEVEL_MAP[word]) {
      wantedLevel ||= LEVEL_MAP[word]

      if (
        ['sdn', 'smpn', 'sman', 'smkn', 'mtsn', 'man', 'min']
          .includes(word)
      ) {
        wantedStatus ||= 'NEGERI'
      }

      if (
        ['sds', 'smps', 'smas', 'smks']
          .includes(word)
      ) {
        wantedStatus ||= 'SWASTA'
      }

      continue
    }

    if (word === 'negeri') {
      wantedStatus = 'NEGERI'
      continue
    }

    if (word === 'swasta') {
      wantedStatus = 'SWASTA'
      continue
    }

    if (STOP_WORDS.has(word)) {
      continue
    }

    tokens.push(word)
  }

  return {
    tokens,
    wantedLevel,
    wantedStatus
  }
}

function scoreSchool(
  school,
  tokens,
  wantedLevel,
  wantedStatus
) {
  const nameWords = normalizeText(
    school.nama
  )
    .split(' ')
    .filter(Boolean)

  const locationWords = normalizeText([
    school.alamat.kecamatan,
    school.alamat.kabupaten,
    school.alamat.provinsi
  ].filter(Boolean).join(' '))
    .split(' ')
    .filter(Boolean)

  const nameSet = new Set(nameWords)
  const locationSet = new Set(locationWords)

  let inName = 0
  let inLocation = 0

  for (const token of tokens) {
    if (nameSet.has(token)) {
      inName++
    } else if (locationSet.has(token)) {
      inLocation++
    }
  }

  const coverage = tokens.length
    ? (inName + inLocation) / tokens.length
    : 0

  const extraWords = nameWords.filter(word =>
    !STOP_WORDS.has(word) &&
    !tokens.includes(word)
  ).length

  const schoolLevel = normalizeText(
    school.bentuk_pendidikan
  ).toUpperCase()

  const schoolStatus = normalizeText(
    school.status_sekolah
  ).toUpperCase()

  const levelOK = wantedLevel
    ? schoolLevel === wantedLevel
    : null

  const statusOK = wantedStatus
    ? schoolStatus === wantedStatus
    : null

  const exact =
    tokens.length > 0 &&
    inName + inLocation === tokens.length &&
    inName > 0 &&
    extraWords === 0 &&
    levelOK !== false &&
    statusOK !== false

  const score =
    coverage * 10 +
    inName * 0.5 +
    inLocation * 0.3 +
    (levelOK ? 3 : 0) -
    (levelOK === false ? 3 : 0) +
    (statusOK ? 2 : 0) -
    (statusOK === false ? 2 : 0) -
    extraWords * 0.3 +
    (exact ? 5 : 0)

  return {
    score: Math.round(score * 10) / 10,
    exact
  }
}


function getBlockedResult() {
  if (Date.now() >= blockedUntil) {
    return null
  }

  const retryAfter = Math.ceil(
    (blockedUntil - Date.now()) / 1000
  )

  return {
    success: false,
    error: 'RATE_LIMITED',
    message:
      'Portal sedang membatasi akses. ' +
      `Coba lagi dalam sekitar ${Math.ceil(retryAfter / 60)} menit.`,
    retry_after: retryAfter
  }
}


async function sekolahCari(keyword, options = {}) {
  try {
    const kw = String(keyword || '').trim()

    if (!kw) {
      return {
        success: false,
        error: 'INVALID_KEYWORD',
        message: 'Kata kunci tidak boleh kosong.'
      }
    }

    if (kw.length > 100) {
      return {
        success: false,
        error: 'KEYWORD_TOO_LONG',
        message: 'Kata kunci maksimal 100 karakter.'
      }
    }

    const page = Math.max(
      parseInt(options.page, 10) || 0,
      0
    )

    const size = Math.min(
      Math.max(
        parseInt(options.pageSize, 10) || DEFAULT_PAGE_SIZE,
        1
      ),
      50
    )

    const body = {
      page,
      size,
      keyword: kw,

      kabupaten_kota:
        options.kabupatenKota || '',

      bentuk_pendidikan:
        options.bentukPendidikan || '',

      status_sekolah:
        options.statusSekolah || ''
    }

    const key = JSON.stringify(body)

    const cached = cache.get(key)

    if (
      cached &&
      Date.now() - cached.at < CACHE_TTL_MS
    ) {
      return {
        ...cached.result,
        cached: true
      }
    }

    const blocked = getBlockedResult()

    if (blocked) {
      return blocked
    }

    await ensureSession()

    const params = new URLSearchParams({
      keyword: kw,
      kabupaten_kota: body.kabupaten_kota,
      bentuk_pendidikan: body.bentuk_pendidikan,
      status_sekolah: body.status_sekolah,
      page: String(page),
      size: String(size)
    })

    const response = await enqueue(() =>
      fetch(API, {
        method: 'POST',

        headers: {
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
          'Content-Type': 'application/json',
          Origin: BASE,

          Referer: `${BASE}/sekolah?${params.toString()}`,

          'User-Agent': USER_AGENT,
          Cookie: cookieHeader()
        },

        body: JSON.stringify(body),

        signal: AbortSignal.timeout(30000)
      })
    )

    storeCookies(response)

    if (
      response.status === 403 ||
      response.status === 429
    ) {
      blockedUntil =
        Date.now() + BLOCK_COOLDOWN_MS

      return {
        success: false,

        error:
          response.status === 429
            ? 'RATE_LIMITED'
            : 'BLOCKED',

        status: response.status,

        message:
          'Portal membatasi akses. ' +
          'Pencarian dihentikan sementara.'
      }
    }

    const text = await response.text()

    if (
      Buffer.byteLength(text, 'utf8') >
      MAX_RESPONSE_BYTES
    ) {
      return {
        success: false,
        error: 'RESPONSE_TOO_LARGE',
        message: 'Respons portal terlalu besar.'
      }
    }

    let json

    try {
      json = JSON.parse(text)
    } catch {
      return {
        success: false,
        error: 'INVALID_RESPONSE',
        message: 'Portal tidak mengembalikan JSON yang valid.',
        status: response.status
      }
    }

    if (!response.ok) {
      return {
        success: false,
        error: 'API_ERROR',
        status: response.status,

        message: String(
          json?.message ||
          json?.error ||
          `HTTP ${response.status}`
        ).slice(0, 250)
      }
    }

    const items = findArray(json) || []

    let schools = normalizeSchools(items)

    const total = findTotal(json)

    const hasMore = total !== null
      ? (page + 1) * size < total
      : schools.length >= size

    const result = {
      success: true,
      keyword: kw,
      page,
      size,
      count: schools.length,
      total,
      has_more: hasMore,
      schools,
      cached: false
    }

    cache.set(key, {
      at: Date.now(),
      result
    })

    if (cache.size > 200) {
      const oldest = cache.keys().next().value

      if (oldest) {
        cache.delete(oldest)
      }
    }

    return result
  } catch (error) {
    const message = error?.message || String(error)

    console.error(
      '[SEKOLAH] Request gagal:',
      message
    )

    return {
      success: false,

      error:
        error?.name === 'TimeoutError' ||
        error?.name === 'AbortError'
          ? 'TIMEOUT'
          : 'EXCEPTION',

      message:
        error?.name === 'TimeoutError' ||
        error?.name === 'AbortError'
          ? 'Request portal terlalu lama.'
          : message
    }
  }
}


async function sekolahTemukan(keyword, options = {}) {
  const kw = String(keyword || '').trim()

  if (!kw) {
    return {
      success: false,
      error: 'INVALID_KEYWORD',
      message: 'Kata kunci tidak boleh kosong.'
    }
  }

  const isNpsn = /^\d{8}$/.test(kw)

  const maxPages = isNpsn
    ? 1
    : Math.min(
        Math.max(
          parseInt(options.maxPages, 10) || DEFAULT_MAX_PAGES,
          1
        ),
        6
      )

  const top = Math.min(
    Math.max(
      parseInt(options.results, 10) || DEFAULT_RESULTS,
      1
    ),
    5
  )

  const intent = parseSearchIntent(kw)

  const all = new Map()

  let total = null
  let scannedPages = 0

  let ranked = []

  for (
    let page = options.page || 0;
    page < (options.page || 0) + maxPages;
    page++
  ) {
    const response = await sekolahCari(
      kw,
      {
        ...options,
        page,
        pageSize: isNpsn ? 5 : DEFAULT_PAGE_SIZE
      }
    )

    if (!response.success) {
      if (scannedPages === 0) {
        return response
      }

      break
    }

    scannedPages++

    total = response.total

    for (const school of response.schools) {
      const key =
        school.npsn ||
        school.id ||
        `${school.nama}:${school.alamat.lengkap}`

      if (!all.has(key)) {
        all.set(key, school)
      }
    }

    ranked = [...all.values()]
      .map((school, index) => {
        let match

        if (isNpsn) {
          match = {
            score: school.npsn === kw ? 100 : 0,
            exact: school.npsn === kw
          }
        } else {
          match = scoreSchool(
            school,
            intent.tokens,
            intent.wantedLevel ||
              options.bentukPendidikan?.toUpperCase() ||
              null,
            intent.wantedStatus ||
              options.statusSekolah?.toUpperCase() ||
              null
          )
        }

        return {
          school,
          index,
          match
        }
      })
      .sort((a, b) =>
        b.match.score - a.match.score ||
        a.index - b.index
      )

    if (
      isNpsn &&
      ranked.some(item => item.match.exact)
    ) {
      break
    }

    if (
      ranked[0]?.match.exact &&
      ranked[0].match.score >= 15
    ) {
      break
    }

    if (!response.has_more) {
      break
    }
  }

  if (!ranked.length) {
    return {
      success: false,
      error: 'NO_RESULTS',
      message: `Tidak ada sekolah yang ditemukan untuk "${kw}".`
    }
  }

  const results = ranked
    .slice(0, top)
    .map(item => ({
      ...item.school,
      match: item.match,
      has_photo: Boolean(item.school.foto)
    }))

  return {
    success: true,
    keyword: kw,

    exact_match:
      results.some(item => item.match.exact),

    scanned_pages: scannedPages,
    scanned: all.size,
    total,

    count: results.length,

    best: results[0],
    results
  }
}


async function downloadPhoto(url) {
  if (!url) {
    return null
  }

  try {
    const photoUrl = new URL(url, BASE)

    if (
      !['https:', 'http:'].includes(photoUrl.protocol)
    ) {
      return null
    }

    const response = await fetch(
      photoUrl.toString(),
      {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: `${BASE}/`
        },

        redirect: 'follow',

        signal: AbortSignal.timeout(20000)
      }
    )

    if (!response.ok) {
      return null
    }

    const contentType = String(
      response.headers.get('content-type') || ''
    )
      .split(';')[0]
      .trim()
      .toLowerCase()

    if (!contentType.startsWith('image/')) {
      return null
    }

    const contentLength = Number(
      response.headers.get('content-length') || 0
    )

    if (contentLength > MAX_PHOTO_BYTES) {
      return null
    }

    const buffer = Buffer.from(
      await response.arrayBuffer()
    )

    if (
      !buffer.length ||
      buffer.length > MAX_PHOTO_BYTES
    ) {
      return null
    }

    return {
      buffer,
      mimetype: contentType
    }
  } catch (error) {
    console.warn(
      '[SEKOLAH] Download foto gagal:',
      error?.message || error
    )

    return null
  }
}


function profileUrl(school) {
  if (!school.id) {
    return null
  }

  return (
    `${BASE}/index.php/chome/profil/` +
    encodeURIComponent(school.id)
  )
}

function schoolCaption(school) {
  const address = school.alamat

  return [
    '🌷 *Elyra School Finder*',
    '',
    `🏫 *${school.nama}*`,
    '',
    `🆔 NPSN: ${school.npsn || '-'}`,
    `🎓 Jenjang: ${school.bentuk_pendidikan || '-'}`,
    `🏷️ Status: ${titleCase(school.status_sekolah) || '-'}`,
    `⭐ Akreditasi: ${school.akreditasi || '-'}`,
    '',
    '📍 *Alamat*',
    address.lengkap || '-',
    '',
    address.kode_pos
      ? `📮 Kode pos: ${address.kode_pos}`
      : null,
    profileUrl(school)
      ? `🔗 Profil: ${profileUrl(school)}`
      : null,
    '',
    '© ERINE-AI'
  ]
    .filter(line => line !== null)
    .join('\n')
}

function schoolSummary(school, index) {
  const address = school.alamat

  return [
    `*${index}. ${school.nama}*`,
    `› NPSN: ${school.npsn || '-'}`,
    `› Jenjang: ${school.bentuk_pendidikan || '-'}`,
    `› Status: ${titleCase(school.status_sekolah) || '-'}`,
    `› Akreditasi: ${school.akreditasi || '-'}`,
    `› Lokasi: ${address.lengkap || '-'}`,
    profileUrl(school)
      ? `› Profil: ${profileUrl(school)}`
      : null
  ]
    .filter(Boolean)
    .join('\n')
}


function parseInput(raw) {
  let keyword = String(raw || '').trim()

  const options = {
    page: 0,
    results: DEFAULT_RESULTS,
    maxPages: DEFAULT_MAX_PAGES,
    kabupatenKota: '',
    bentukPendidikan: '',
    statusSekolah: '',
    noPhoto: false
  }

  keyword = keyword.replace(
    /--(kabupaten|jenjang|status|halaman|hasil)(?:=|\s+)(?:"([^"]+)"|'([^']+)'|([^\s]+))/gi,
    (match, key, doubleQuoted, singleQuoted, plainValue) => {
      const value = String(
        doubleQuoted ??
        singleQuoted ??
        plainValue ??
        ''
      ).trim()

      switch (key.toLowerCase()) {
        case 'kabupaten':
          options.kabupatenKota = value
          break

        case 'jenjang':
          options.bentukPendidikan = value.toUpperCase()
          break

        case 'status':
          options.statusSekolah = titleCase(value)
          break

        case 'halaman':
          options.page = Math.max(
            parseInt(value, 10) || 0,
            0
          )
          break

        case 'hasil':
          options.results = Math.min(
            Math.max(parseInt(value, 10) || DEFAULT_RESULTS, 1),
            5
          )
          break
      }

      return ' '
    }
  )

  if (/\s--no-foto(?:\s|$)/i.test(` ${keyword} `)) {
    options.noPhoto = true

    keyword = keyword
      .replace(/(^|\s)--no-foto(?=\s|$)/gi, ' ')
  }

  keyword = keyword
    .replace(/\s+/g, ' ')
    .trim()

  return {
    keyword,
    options
  }
}


export default {
  command: 'sekolah',

  alias: [
    'carisekolah',
    'npsn',
    'infosekolah'
  ],

  category: 'search',

  tags: ['search'],

  description:
    '> Mencari informasi sekolah di Indonesia berdasarkan nama atau NPSN melalui portal resmi Sekolah Kita.\n\n' +
    'Contoh:\n' +
    '> `.sekolah sman 1 depok`\n' +
    '> `.sekolah 20219876`\n' +
    '> `.sekolah sd pemuda bangsa --kabupaten="Kota Depok"`',

  help: '<nama sekolah/NPSN> [filter]',

  typing: true,

  wait: true,

  async execute(m, { sock, args = [] }) {
    const raw = args.join(' ').trim()

    const {
      keyword,
      options
    } = parseInput(raw)

    if (!keyword) {
      return m.reply([
        '🌷 *Elyra School Finder*',
        '',
        'Cari informasi sekolah berdasarkan nama atau NPSN.',
        '',
        '♡ `.sekolah sman 1 depok`',
        '♡ `.sekolah 20219876`',
        '♡ `.sekolah sd negeri 1 bogor`',
        '',
        '*Filter opsional*',
        '› `--kabupaten="Kota Depok"`',
        '› `--jenjang=SD`',
        '› `--status=Negeri`',
        '› `--halaman=1`',
        '› `--hasil=5`',
        '› `--no-foto` untuk melewati pengiriman foto',
        '',
        '© ERINE-AI'
      ].join('\n'))
    }

    await sock.sendReact(
      m.chat,
      '🌱',
      m.id
    ).catch(() => {})

    try {
      const result = await sekolahTemukan(
        keyword,
        options
      )

      if (!result.success) {
        await sock.sendReact(
          m.chat,
          '☘️',
          m.id
        ).catch(() => {})

        return m.reply(
          '❌ *Pencarian Sekolah Gagal*\n\n' +
          `› ${result.message || 'Tidak dapat mengambil data sekolah.'}`
        )
      }

      const best = result.best


      let photoSent = false

      if (!options.noPhoto && best?.foto) {
        const photo = await downloadPhoto(
          best.foto
        )

        if (photo) {
          try {
            await sock.message.send(
              m.chat,
              {
                type: 'image',
                media: photo.buffer,
                mimetype: photo.mimetype,
                caption: schoolCaption(best)
              },
              {}
            )

            photoSent = true
          } catch (error) {
            console.error(
              '[SEKOLAH] Gagal mengirim foto:',
              error?.stack || error
            )
          }
        }
      }


      const summary = [
        '🌷 *Elyra School Finder*',
        '',
        `› Kata kunci: ${keyword}`,
        `› Hasil ditemukan: ${result.count}`,
        `› Halaman dipindai: ${result.scanned_pages}`,
        '',
        ...(photoSent
          ? [
              '*Kecocokan terbaik sudah dikirim beserta foto.*',
              ''
            ]
          : []),
        ...result.results
          .slice(photoSent ? 1 : 0)
          .map((school, index) =>
            schoolSummary(
              school,
              photoSent ? index + 2 : index + 1
            )
          ),
        '',
        `🔗 Sumber: ${BASE}`,
        '',
        '© ERINE-AI'
      ]


      if (
        photoSent &&
        result.results.length === 1
      ) {
        summary.splice(
          summary.indexOf(
            '*Kecocokan terbaik sudah dikirim beserta foto.*'
          ),
          1
        )
      }

      await m.reply(
        summary
          .filter((line, index, array) =>
            line !== '' ||
            array[index - 1] !== ''
          )
          .join('\n')
      )

      await sock.sendReact(
        m.chat,
        '💐',
        m.id
      ).catch(() => {})
    } catch (error) {
      console.error(
        '[SEKOLAH] Plugin gagal:',
        error?.stack || error
      )

      await sock.sendReact(
        m.chat,
        '☘️',
        m.id
      ).catch(() => {})

      return m.reply(
        '❌ Terjadi kesalahan saat mencari data sekolah.\n\n' +
        `› Detail: ${String(
          error?.message || error
        ).slice(0, 250)}`
      )
    }
  }
}