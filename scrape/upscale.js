import axios from 'axios'
import FormData from 'form-data'
import crypto from 'crypto'

export async function imgUpscaler(input) {
  let imageBuffer
  let contentType = 'image/jpeg'

  if (Buffer.isBuffer(input)) {
    imageBuffer = input
  } else {
    const image = await axios.get(input, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })
    imageBuffer = Buffer.from(image.data)
    contentType = image.headers['content-type'] || 'image/jpeg'
  }

  const productSerial = crypto.randomUUID()
  const form = new FormData()

  form.append('original_image_file', imageBuffer, {
    filename: `${crypto.randomBytes(16).toString('hex')}.jpg`,
    contentType: contentType
  })

  form.append('scene', 'normal')
  form.append('output_format', 'jpg')

  const headers = {
    ...form.getHeaders(),
    accept: '*/*',
    'product-code': 'Imgupscaler',
    'product-serial': productSerial,
    'router-key': 'iu_home_image_enhancer_v1',
    timezone: 'Asia/Jakarta',
    origin: 'https://imgupscaler.ai',
    referer: 'https://imgupscaler.ai/',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36'
  }

  const create = await axios.post(
    'https://api-v2.imgupscaler.ai/api/runtime/jobs/create-job',
    form,
    {
      headers,
      timeout: 60000
    }
  )

  const jobId = create.data?.result?.job_id

  if (!jobId) {
    throw new Error(`Job ID tidak ditemukan:\n${JSON.stringify(create.data, null, 2)}`)
  }

  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000))

    const check = await axios.get(
      `https://api-v2.imgupscaler.ai/api/runtime/jobs/get-job/${jobId}`,
      {
        headers: {
          accept: '*/*',
          'product-serial': productSerial,
          'router-key': 'iu_home_image_enhancer_v1',
          timezone: 'Asia/Jakarta',
          origin: 'https://imgupscaler.ai',
          referer: 'https://imgupscaler.ai/',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36'
        },
        timeout: 30000
      }
    )

    const data = check.data

    const output =
      data?.result?.output_image_url ||
      data?.result?.outputUrl ||
      data?.result?.output_url ||
      data?.data?.output_image_url ||
      data?.data?.outputUrl ||
      data?.data?.output_url ||
      data?.output_image_url ||
      data?.outputUrl ||
      data?.output_url

    if (output) {
      return output
    }

    const status =
      data?.result?.status ??
      data?.data?.status ??
      data?.status

    if (
      status === 'failed' ||
      status === 'error' ||
      status === 'FAILURE' ||
      status === 3
    ) {
      throw new Error(`Upscale gagal:\n${JSON.stringify(data, null, 2)}`)
    }
  }

  throw new Error(`Timeout menunggu hasil upscale. Job ID: ${jobId}`)
}