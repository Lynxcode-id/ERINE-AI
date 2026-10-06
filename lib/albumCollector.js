
if (!global.albumCollector) global.albumCollector = new Map()

const ALBUM_TTL_MS = 5 * 60 * 1000

export function bindAlbumCollector(conn) {
    if (conn.__albumCollectorBound) return
    conn.__albumCollectorBound = true

    conn.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages || []) {
            try {
                if (!msg?.message || !msg.key) continue

                const chatJid = msg.key.remoteJid
                const sender = chatJid?.endsWith('@g.us')
                    ? (msg.key.participant || msg.key.remoteJid)
                    : chatJid

                if (msg.message.albumMessage) {
                    const albumId = msg.key.id
                    const entry = {
                        chatJid,
                        sender,
                        expectedImageCount: msg.message.albumMessage.expectedImageCount || 0,
                        expectedVideoCount: msg.message.albumMessage.expectedVideoCount || 0,
                        items: [],
                        createdAt: Date.now()
                    }
                    global.albumCollector.set(albumId, entry)
                    setTimeout(() => {
                        const cur = global.albumCollector.get(albumId)
                        if (cur === entry) global.albumCollector.delete(albumId)
                    }, ALBUM_TTL_MS)
                    continue
                }

                const type = Object.keys(msg.message)[0]
                if (type !== 'imageMessage' && type !== 'videoMessage') continue

                let target = null
                for (const entry of global.albumCollector.values()) {
                    if (entry.chatJid !== chatJid || entry.sender !== sender) continue
                    const total = entry.expectedImageCount + entry.expectedVideoCount
                    if (entry.items.length >= total) continue
                    if (!target || entry.createdAt > target.createdAt) target = entry
                }
                if (!target) continue

                target.items.push({
                    type: type === 'imageMessage' ? 'image' : 'video',
                    message: msg.message[type]
                })
            } catch (e) {
                console.error('albumCollector error:', e)
            }
        }
    })
}

export function getAlbum(albumId) {
    return global.albumCollector.get(albumId) || null
}

export function consumeAlbum(albumId) {
    const entry = global.albumCollector.get(albumId)
    global.albumCollector.delete(albumId)
    return entry || null
}
