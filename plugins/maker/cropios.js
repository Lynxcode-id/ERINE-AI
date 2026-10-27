import fs from 'fs'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { pickMedia } from '../../lib/album.js'

const TEMPLATE = './media/greenscreen.png'
const QUAD = [[251.47, 81.05], [992.97, 157.54], [868.47, 1347.04], [125.96, 1270.55]]
const GREEN = [30, 217, 30]
const SS = 2
const solveHomography = (dst, src) => {
    const A = []
    for (let i = 0; i < 4; i++) {
        const [x, y] = dst[i], [u, v] = src[i]
        A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u])
        A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v])
    }
    for (let c = 0; c < 8; c++) {
        let p = c
        for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
        ;[A[c], A[p]] = [A[p], A[c]]
        for (let r = 0; r < 8; r++) {
            if (r === c) continue
            const f = A[r][c] / A[c][c]
            for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]
        }
    }
    return A.map((row, i) => row[8] / row[i])
}
let tpl = null
const loadTemplate = async () => {
    if (tpl) return tpl
    const img = await loadImage(fs.readFileSync(TEMPLATE))
    const w = img.width, h = img.height
    const c = createCanvas(w, h), ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, w, h).data
    const alpha = new Float32Array(w * h)
    const den = GREEN[1] - Math.max(GREEN[0], GREEN[2])
    for (let i = 0, p = 0; i < w * h; i++, p += 4) {
        const a = (data[p + 1] - Math.max(data[p], data[p + 2])) / den
        alpha[i] = a <= 0.01 ? 0 : a > 1 ? 1 : a
    }
    return (tpl = { w, h, data, alpha })
}

const render = async (buf) => {
    const { w, h, data, alpha } = await loadTemplate()
    const [TL, TR, BR, BL] = QUAD
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
    const RW = Math.round((dist(TL, TR) + dist(BL, BR)) / 2) * SS
    const RH = Math.round((dist(TL, BL) + dist(TR, BR)) / 2) * SS
    const img = await loadImage(buf)
    const pc = createCanvas(RW, RH), pctx = pc.getContext('2d')
    pctx.fillStyle = '#000'
    pctx.fillRect(0, 0, RW, RH)
    pctx.imageSmoothingEnabled = true
    pctx.imageSmoothingQuality = 'high'
    const s = Math.max(RW / img.width, RH / img.height)
    const dw = img.width * s, dh = img.height * s
    pctx.drawImage(img, (RW - dw) / 2, (RH - dh) / 2, dw, dh)
    const src = pctx.getImageData(0, 0, RW, RH).data
    const Hm = solveHomography(QUAD, [[0, 0], [RW, 0], [RW, RH], [0, RH]])
    const acc = [0, 0, 0]
    const bil = (u, v) => {
        let fx = u - 0.5, fy = v - 0.5
        fx = fx < 0 ? 0 : fx > RW - 1 ? RW - 1 : fx
        fy = fy < 0 ? 0 : fy > RH - 1 ? RH - 1 : fy
        const x0 = fx | 0, y0 = fy | 0
        const x1 = Math.min(x0 + 1, RW - 1), y1 = Math.min(y0 + 1, RH - 1)
        const tx = fx - x0, ty = fy - y0
        const p00 = (y0 * RW + x0) * 4, p10 = (y0 * RW + x1) * 4
        const p01 = (y1 * RW + x0) * 4, p11 = (y1 * RW + x1) * 4
        for (let k = 0; k < 3; k++) {
            acc[k] += (src[p00 + k] * (1 - tx) + src[p10 + k] * tx) * (1 - ty) +
                      (src[p01 + k] * (1 - tx) + src[p11 + k] * tx) * ty
        }
    }
    const M = 4
    const bx0 = Math.max(0, Math.floor(Math.min(...QUAD.map(p => p[0]))) - M)
    const bx1 = Math.min(w - 1, Math.ceil(Math.max(...QUAD.map(p => p[0]))) + M)
    const by0 = Math.max(0, Math.floor(Math.min(...QUAD.map(p => p[1]))) - M)
    const by1 = Math.min(h - 1, Math.ceil(Math.max(...QUAD.map(p => p[1]))) + M)
    const margin = M * SS
    const offs = SS === 1 ? [0.5] : Array.from({ length: SS }, (_, i) => (i + 0.5) / SS)

    const out = new Uint8ClampedArray(data)
    for (let y = by0; y <= by1; y++) {
        for (let x = bx0; x <= bx1; x++) {
            const a = alpha[y * w + x]
            if (!a) continue
            const cx = x + 0.5, cy = y + 0.5, cd = Hm[6] * cx + Hm[7] * cy + 1
            const cu = (Hm[0] * cx + Hm[1] * cy + Hm[2]) / cd
            const cv = (Hm[3] * cx + Hm[4] * cy + Hm[5]) / cd
            if (cu < -margin || cu > RW + margin || cv < -margin || cv > RH + margin) continue

            acc[0] = acc[1] = acc[2] = 0
            for (const oy of offs) for (const ox of offs) {
                const X = x + ox, Y = y + oy, d = Hm[6] * X + Hm[7] * Y + 1
                bil((Hm[0] * X + Hm[1] * Y + Hm[2]) / d, (Hm[3] * X + Hm[4] * Y + Hm[5]) / d)
            }
            const n = offs.length * offs.length, p = (y * w + x) * 4
            for (let k = 0; k < 3; k++) out[p + k] = data[p + k] + a * (acc[k] / n - GREEN[k])
        }
    }

    const oc = createCanvas(w, h), octx = oc.getContext('2d')
    const id = octx.createImageData(w, h)
    id.data.set(out)
    octx.putImageData(id, 0, 0)
    return oc.toBuffer('image/jpeg', 95)
}

async function execRun(m, { sock, usedPrefix, command, text, args }) {
    let q = pickMedia(m, sock, { types: ['image'] })
    let mime = (q.mime || (q.mediaType === 'image' ? 'image/jpeg' : q.mediaType === 'video' ? 'video/mp4' : ''))
    if (!/image\/(jpe?g|png|webp)/.test(mime)) {
        return m.reply(`⚠️ Reply foto dengan *${usedPrefix + command}*`)
    }
    if (!fs.existsSync(TEMPLATE)) {
        return m.reply('⚠️ Template belum ada. Simpan gambar template ke *media/greenscreen.png*')
    }
    try {
        const media = Buffer.from(await q.download())
        if (!media) throw new Error('Gagal mengunduh gambar dari pesan.')
        const result = await render(media)
        await m.reply({ type: 'image', media: result, caption: '✅ Selesai' })
        await sock.sendReact(m.chat, '✅', m.id).catch(() => {})
    } catch (err) {
        await sock.sendReact(m.chat, '❌', m.id).catch(() => {})
        await m.reply(`⚠️ Gagal memproses gambar.\n💬 ${err.message || 'Terjadi kesalahan sistem.'}`)
    }
}
export default {
  command: 'cropios',
  category: 'maker',
  tags: ['maker'],
  description: `> cropios\n\ncontoh:\n> \`.cropios\``,
  help: '',
  typing: true,
  wait: true,
  async execute(m, { sock, args }) {
    const text = m.text.slice((m.prefix || '').length + m.command.length).trim()
    return execRun(m, { sock, usedPrefix: m.prefix || '.', command: m.command, text, args })
  }
}
