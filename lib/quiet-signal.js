const SIGNAL_NOISE = /Failed to decrypt message with any known session|Session error:.*Bad MAC|Bad MAC Error: Bad MAC|No matching sessions|No session found|Invalid PreKey/i
const SESSION_NOISE = /^(Closing session|Opening session|Removing old closed session|Migrating session|Session already (closed|open)|Decrypted message with closed session|V1 session storage migration)/

if (!global.__erineQuietSignal) {
    global.__erineQuietSignal = true
    let lastSignalLog = 0

    for (const method of ['info', 'log', 'warn', 'error']) {
        const orig = console[method].bind(console)
        console[method] = (...args) => {
            const first = args[0]
            const text = args.map(value => {
                if (typeof value === 'string') return value
                if (value?.message) return String(value.message)
                return ''
            }).join(' ')

            if (SESSION_NOISE.test(String(first || ''))) return

            if (SIGNAL_NOISE.test(text)) {
                const now = Date.now()
                if (now - lastSignalLog >= 60 * 1000) {
                    lastSignalLog = now
                    const compact = text.replace(/\s+/g, ' ').slice(0, 220)
                    console.warn(`[SIGNAL-DECRYPT] ${compact}`)
                }
                return
            }

            orig(...args)
        }
    }
}
