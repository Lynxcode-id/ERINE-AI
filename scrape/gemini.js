
import https from 'https';
import crypto from 'crypto';

const BASE_URL = 'https://gemini.google.com';
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';
const BL = 'boq_assistant-bard-web-server_20260603.11_p0';

class GeminiError extends Error {
    constructor(message, code = 'UNKNOWN', data = null) {
        super(message);
        this.name = 'GeminiError';
        this.code = code;
        this.data = data;
    }
}

function generateAtToken() {
    const random = crypto.randomBytes(16).toString('base64url').slice(0, 22);
    const ts = Date.now() * 1000;
    return `AOOh${random}:${ts}`;
}

function generateFSid() {
    return '-' + String(Math.floor(Math.random() * 9e18) + 1e18);
}

function generateTokenBlob() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const random = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return '!' + random(24) + 'NAAa-PB6hnjxC' + random(18) + 'AEABE' + random(12) +
           'Z1IzrYRasYCYYnM4bZXAlvfpPcJe2g2Ye8XDL3Ck5BCikk5IYm5xZrnIsIkA0SEgfgSLBh-eSq-mq5McSAgAA' +
           random(8) + 'SAAAC' + random(8) + 'BB34ARK' + random(1100);
}

class GeminiClient {
    constructor(opts = {}) {
        this.atToken   = opts.atToken   || generateAtToken();
        this.fSid      = opts.fSid      || generateFSid();
        this.cookie    = opts.cookie    || '';
        this.tokenBlob = opts.tokenBlob || generateTokenBlob();
        this.deviceId  = opts.deviceId  || crypto.randomUUID();
        this.hl        = opts.hl        || 'id';

        this._conversationId = null;
        this._responseId     = null;
        this._reqid          = Math.floor(Math.random() * 10000000);
        this._sessionId      = crypto.randomBytes(16).toString('hex');
    }

    _headers(extra = {}) {
        const h = {
            'authority': 'gemini.google.com',
            'accept': '*/*',
            'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'origin': BASE_URL,
            'referer': `${BASE_URL}/`,
            'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
            'sec-ch-ua-arch': '""',
            'sec-ch-ua-bitness': '""',
            'sec-ch-ua-full-version': '"137.0.7337.0"',
            'sec-ch-ua-full-version-list': '"Chromium";v="137.0.7337.0", "Not/A)Brand";v="24.0.0.0"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-model': '"23108RN04Y"',
            'sec-ch-ua-platform': '"Android"',
            'sec-ch-ua-platform-version': '"15.0.0"',
            'sec-ch-ua-wow64': '?0',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': UA,
            'x-same-domain': '1',
            'x-goog-ext-525001261-jspb': `[1,null,null,null,"fbb127bbb056c959",null,null,0,[4],null,null,1,null,null,1,null,"${this.deviceId}"]`,
            'x-goog-ext-525005358-jspb': `["${this.deviceId}",1]`,
            'x-goog-ext-73010989-jspb': '[0]',
            'x-goog-ext-73010990-jspb': '[0,0,0]',
        };
        if (this.cookie) h['cookie'] = this.cookie;
        return Object.assign(h, extra);
    }

    _buildPayload(message) {
        const inner = [
            [message, 0, null, null, null, null, 0],
            ['id'],
            ['', '', '', null, null, null, null, null, null, ''],
            this.tokenBlob,
            this._sessionId,
            null,
            [0],
            1,
            null, null,
            1,
            0,
            null, null, null, null, null,
            [[0]],
            0,
            null, null, null, null, null, null, null, null,
            1,
            null, null,
            [4],
            null, null, null, null, null, null, null, null, null, null,
            [2],
            null, null, null, null, null, null, null, null, null, null, null,
            0,
            null, null, null, null, null,
            this.deviceId,
            null,
            [],
            null, null, null, null, null, null,
            1,
            null, null, null, null, null, null, null, null, null, null,
            1,
        ];

        const outer = [null, JSON.stringify(inner)];
        const params = new URLSearchParams();
        params.append('f.req', JSON.stringify(outer));
        params.append('at', this.atToken);
        return params.toString();
    }

    _parseStream(res, onChunk) {
        return new Promise((resolve, reject) => {
            let buf = '';
            let fullText = '';
            let metadata = {};

            res.on('data', chunk => {
                buf += chunk.toString('utf8');
                const lines = buf.split('\n');
                buf = lines.pop();

                for (const line of lines) {
                    let cleaned = line;
                    if (cleaned.startsWith(")]}'")) cleaned = cleaned.slice(4);
                    if (/^\d+$/.test(cleaned.trim())) continue;
                    if (!cleaned.trim()) continue;

                    let parsed;
                    try { parsed = JSON.parse(cleaned); } catch { continue; }
                    if (!Array.isArray(parsed) || !parsed[0]) continue;

                    const encoded = parsed[0]?.[2];
                    if (!encoded) continue;

                    let inner;
                    try { inner = JSON.parse(encoded); } catch { continue; }

                    if (Array.isArray(inner[1])) {
                        const [convId, respId] = inner[1];
                        if (convId) this._conversationId = convId;
                        if (respId) this._responseId = respId;
                    }

                    if (inner[2] && typeof inner[2] === 'object') {
                        Object.assign(metadata, inner[2]);
                        if (inner[2]['11']) metadata.title = inner[2]['11'];
                    }

                    const messages = inner[4];
                    if (Array.isArray(messages)) {
                        for (const block of messages) {
                            if (!Array.isArray(block)) continue;
                            const textArr = block[1];
                            if (Array.isArray(textArr) && textArr.length > 0 && typeof textArr[0] === 'string') {
                                const text = textArr[0];
                                if (text.length >= fullText.length) {
                                    fullText = text;
                                    if (onChunk) onChunk(text);
                                }
                            }
                        }
                    }
                }
            });

            res.on('end', () => resolve({
                text: fullText,
                conversationId: this._conversationId,
                responseId: this._responseId,
                metadata,
            }));

            res.on('error', err => reject(new GeminiError(err.message, 'STREAM_ERROR')));
        });
    }

    async sendMessage(message, options = {}) {
        const { onChunk } = options;
        this._reqid++;
        const payload = this._buildPayload(message);

        const url = new URL(`${BASE_URL}/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate`);
        url.searchParams.set('bl', BL);
        url.searchParams.set('f.sid', this.fSid);
        url.searchParams.set('hl', this.hl);
        url.searchParams.set('_reqid', String(this._reqid));
        url.searchParams.set('rt', 'c');

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: 'POST',
                headers: this._headers({ 'content-length': String(Buffer.byteLength(payload)) }),
                timeout: 120000,
            }, async res => {
                if (res.statusCode >= 400) {
                    let errData = '';
                    res.on('data', c => errData += c);
                    res.on('end', () => reject(new GeminiError(`HTTP ${res.statusCode}: ${errData.slice(0, 300)}`, `HTTP_${res.statusCode}`)));
                    return;
                }
                try {
                    const result = await this._parseStream(res, onChunk);
                    resolve(result);
                } catch (e) { reject(e); }
            });

            req.on('error', err => reject(new GeminiError(err.message, err.code)));
            req.on('timeout', () => { req.destroy(); reject(new GeminiError('Timeout', 'TIMEOUT')); });
            req.write(payload);
            req.end();
        });
    }

    async chat(message, options = {}) {
        this._conversationId = null;
        this._responseId = null;
        return this.sendMessage(message, options);
    }
}

export { GeminiClient, GeminiError };
