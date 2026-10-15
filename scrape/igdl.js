import axios from 'axios'

export async function getMedia(url) {
  try {
    const { data } = await axios.get(`https://api.snowping.cfd/api/downloader/instagram?url=${encodeURIComponent(url)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    })
    
    if (!data || !data.result) {
      throw new Error('API tidak mengembalikan data yang valid.')
    }
    
    return data.result
  } catch (err) {
    throw new Error(`Scraper API Error: ${err.message}`)
  }
}