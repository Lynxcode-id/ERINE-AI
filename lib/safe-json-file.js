import fs from 'fs'
import path from 'path'

const BAK_EVERY = 10 * 60 * 1000
const BAK2_EVERY = 6 * 60 * 60 * 1000

function tryParse(file) {
    try {
        if (!fs.existsSync(file)) return { ok: false, empty: true }
        const raw = fs.readFileSync(file, 'utf8')
        if (!raw.trim()) return { ok: false, empty: true }
        return { ok: true, data: JSON.parse(raw) }
    } catch (e) {
        return { ok: false, error: e }
    }
}

export default class SafeJSONFile {
    constructor(filename) {
        this.file = path.resolve(filename)
        this.lastBak = 0
        this.lastBak2 = 0
        this.lastSize = 0
        this.writing = Promise.resolve()
    }

    async read() {
        const main = tryParse(this.file)
        if (main.ok) { this.lastSize = fs.statSync(this.file).size; return main.data }

        for (const suffix of ['.tmp', '.bak', '.bak2']) {
            const alt = tryParse(this.file + suffix)
            if (alt.ok) {
                console.error(`[DB] ${path.basename(this.file)} ${main.empty ? 'kosong/tidak ada' : 'rusak'} -> dipulihkan dari ${suffix}`)
                if (!main.empty) {
                    try { fs.renameSync(this.file, `${this.file}.corrupt-${Date.now()}`) } catch {}
                }
                fs.writeFileSync(this.file, JSON.stringify(alt.data))
                this.lastSize = fs.statSync(this.file).size
                return alt.data
            }
        }

        if (!main.empty) {
            const keep = `${this.file}.corrupt-${Date.now()}`
            try { fs.renameSync(this.file, keep) } catch {}
            console.error(`[DB] ${path.basename(this.file)} RUSAK & tidak ada backup valid. File disimpan di ${path.basename(keep)} (bisa dipulihkan manual).`)
        }
        return null
    }

    write(data) {
        this.writing = this.writing.then(() => this._write(data)).catch((e) => {
            console.error('[DB] Gagal menyimpan:', e.message)
        })
        return this.writing
    }

    async _write(data) {
        const json = JSON.stringify(data)
        if (!json || json.length < 2) return

        if (this.lastSize > 200 * 1024 && json.length < this.lastSize * 0.15) {
            console.error(`[DB] Penyimpanan DITOLAK: data baru (${json.length}B) jauh lebih kecil dari file sekarang (${this.lastSize}B). Dicurigai DB kebaca kosong.`)
            try { fs.writeFileSync(`${this.file}.suspect`, json) } catch {}
            return
        }

        const tmp = `${this.file}.tmp`
        const fd = fs.openSync(tmp, 'w')
        try {
            fs.writeSync(fd, json)
            fs.fsyncSync(fd)
        } finally {
            fs.closeSync(fd)
        }

        const now = Date.now()
        if (fs.existsSync(this.file)) {
            try {
                if (now - this.lastBak2 > BAK2_EVERY) { fs.copyFileSync(this.file, this.file + '.bak2'); this.lastBak2 = now }
                if (now - this.lastBak > BAK_EVERY) { fs.copyFileSync(this.file, this.file + '.bak'); this.lastBak = now }
            } catch (e) { console.error('[DB] Backup gagal:', e.message) }
        }

        fs.renameSync(tmp, this.file)
        this.lastSize = json.length
    }
}
