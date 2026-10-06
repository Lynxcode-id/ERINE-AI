import express from 'express'

const app = global.app = express()

function connect(PORT) {
    app.get('/', (req, res) => res.json({ ok: true, name: 'ERINE-MD', status: 'online' }))
    app.get('/ping', (req, res) => res.status(200).send('pong'))
    app.listen(PORT, () => console.log(`[SERVER] listening on ${PORT}`))
}

export default connect
