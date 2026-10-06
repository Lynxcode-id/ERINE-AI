import fetch from 'node-fetch'
import axios from 'axios'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'

const fakeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

async function litterbox(buffer) {
  const { ext, mime } = (await fileTypeFromBuffer(buffer)) || { ext: 'bin', mime: 'application/octet-stream' }
  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('time', '1h')
  form.append('fileToUpload', buffer, `ERINE_${Date.now()}.${ext}`)

  const res = await axios.post('https://litterbox.catbox.moe/resources/internals/api.php', form, {
    headers: {
      ...form.getHeaders(),
      'User-Agent': fakeUserAgent
    },
    timeout: 60000
  })

  if (!res.data || !res.data.startsWith('http')) throw new Error('Litterbox upload gagal')
  return res.data.trim()
}

async function catbox(buffer) {
  const { ext, mime } = (await fileTypeFromBuffer(buffer)) || { ext: 'bin', mime: 'application/octet-stream' }
  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('userhash', 'd6acaac8bad1ae93ddffe0dac')
  form.append('fileToUpload', buffer, `file.${ext === 'jpeg' ? 'jpg' : ext}`)

  const res = await axios.post('https://catbox.moe/user/api.php', form, {
    headers: {
      ...form.getHeaders(),
      'User-Agent': fakeUserAgent
    },
    timeout: 60000
  })

  if (!res.data || typeof res.data !== 'string' || !res.data.includes('catbox.moe')) throw new Error('Catbox upload gagal')
  return res.data.trim()
}

async function termai(buffer) {
  const { ext, mime } = (await fileTypeFromBuffer(buffer)) || { ext: 'bin', mime: 'application/octet-stream' }
  const form = new FormData()
  form.append('file', buffer, { filename: `file.${ext}`, contentType: mime })

  const res = await axios.post('https://c.termai.cc/api/upload?key=AIzaBj7z2z3xBjsk', form, {
    headers: {
        ...form.getHeaders(),
        'User-Agent': fakeUserAgent
    },
    timeout: 60000
  })

  if (!res.data || !res.data.path) throw new Error('Termai upload gagal')
  return res.data.path
}

async function uguu(buffer) {
  const { ext } = (await fileTypeFromBuffer(buffer)) || { ext: 'bin' }
  const form = new FormData()
  form.append('files[]', buffer, `file.${ext}`)

  const res = await axios.post('https://uguu.se/upload', form, {
    headers: {
        ...form.getHeaders(),
        'User-Agent': fakeUserAgent
    },
    timeout: 60000
  })
  return res.data.files[0].url
}

async function nexray(buffer) {
  const { ext, mime } = (await fileTypeFromBuffer(buffer)) || { ext: 'bin', mime: 'application/octet-stream' }
  const form = new FormData()
  form.append('file', buffer, { filename: `file.${ext}`, contentType: mime })

  const res = await axios.post('https://api.nexray.web.id/upload?ttl=86400', form, {
    headers: {
        ...form.getHeaders(),
        'User-Agent': fakeUserAgent
    },
    timeout: 60000
  })
  return res.data.result.url
}

async function tmpfiles(buffer) {
  const { ext } = (await fileTypeFromBuffer(buffer)) || {}
  const form = new FormData()
  form.append('file', buffer, `upload-${Date.now()}.${ext || 'bin'}`)

  const res = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    body: form,
    headers: {
      ...form.getHeaders(),
      'User-Agent': fakeUserAgent
    }
  })

  const json = await res.json()
  const match = /https?:\/\/tmpfiles\.org\/(.*)/.exec(json?.data?.url)

  if (!match) throw new Error('Tmpfiles upload gagal')
  return `https://tmpfiles.org/dl/${match[1]}`
}

async function uploadImage(buffer) {
  const uploaders = [litterbox, catbox, termai, uguu, nexray]
  let lastError = ''

  for (let upload of uploaders) {
    try {
      const url = await upload(buffer)
      if (url && typeof url === 'string' && url.startsWith('http')) return url
    } catch (err) {
      lastError = err.response ? JSON.stringify(err.response.data) : err.message
      console.log(`[ ⚠️ UPLOADER FALLBACK ] ${upload.name} gagal. Pindah ke backup...`)
      continue
    }
  }
  throw new Error(`Semua server image uploader mati. Error terakhir: ${lastError}`)
}

async function uploadFile(buffer) {
  const uploaders = [tmpfiles, uguu, termai, catbox, nexray]
  let lastError = ''

  for (let upload of uploaders) {
    try {
      const url = await upload(buffer)
      if (url && typeof url === 'string' && url.startsWith('http')) return url
    } catch (err) {
      lastError = err.response ? JSON.stringify(err.response.data) : err.message
      console.log(`[ ⚠️ FILE FALLBACK ] ${upload.name} gagal. Pindah ke backup...`)
      continue
    }
  }
  throw new Error(`Semua server file uploader mati. Error terakhir: ${lastError}`)
}

const uploadPomf = uploadFile

export default uploadImage
export { uploadFile, uploadPomf }
