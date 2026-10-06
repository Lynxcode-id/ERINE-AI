import got from 'got';
import fs from 'fs';
import path from 'path';
import pino from 'pino';

const logger = pino({ level: 'silent' });
const stringify = (obj) => JSON.stringify(obj);

const parse = (str) => {
    try {
        return JSON.parse(str, (_, v) => {
            if (v !== null && typeof v === 'object' && 'type' in v && v.type === 'Buffer' && 'data' in v && Array.isArray(v.data)) {
                return Buffer.from(v.data);
            }
            return v;
        });
    } catch (e) {
        return str;
    }
};

class CloudDBAdapter {
    constructor(url, {
        serialize = stringify,
        deserialize = parse,
        fetchOptions = {},
        localBackup = './database.json.backup',
        maxRetries = 3,
    } = {}) {
        if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
            throw new Error('Invalid URL provided.');
        }

        this.url = url;
        this.serialize = serialize;
        this.deserialize = deserialize;
        this.localBackup = localBackup;
        this.maxRetries = maxRetries;
        this.isWriting = false;
        this.writeQueue = [];
        this.fetchOptions = {
            timeout: { request: 30000 },
            retry: { limit: 0 },
            ...fetchOptions
        };

        const dir = path.dirname(this.localBackup);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    async read() {
        let lastErr;
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                const res = await got(this.url, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json;q=0.9,text/plain' },
                    ...this.fetchOptions,
                    responseType: 'text'
                });

                if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}: ${res.statusMessage}`);

                const data = this.deserialize(res.body);
                fs.writeFileSync(this.localBackup, this.serialize(data));
                return data;
            } catch (e) {
                lastErr = e;
                logger.error(`[CloudDB] Read attempt ${i + 1} failed: ${e.message}`);
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
        }

        logger.warn('[CloudDB] Read failed, using local backup');
        if (fs.existsSync(this.localBackup)) {
            try {
                return this.deserialize(fs.readFileSync(this.localBackup, 'utf-8'));
            } catch {}
        }

        console.error('[CloudDB] Read Error:', lastErr.message);
        return {};
    }

    async write(obj) {
        if (this.isWriting) {
            return new Promise((resolve, reject) => {
                this.writeQueue.push({ obj, resolve, reject });
            });
        }

        this.isWriting = true;
        try {
            await this._writeInternal(obj);
            while (this.writeQueue.length > 0) {
                const { obj, resolve, reject } = this.writeQueue.shift();
                try {
                    await this._writeInternal(obj);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            }
        } finally {
            this.isWriting = false;
        }
    }

    async _writeInternal(obj) {
        const body = this.serialize(obj);

        fs.writeFileSync(this.localBackup, body);

        let lastErr;
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                const res = await got(this.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    ...this.fetchOptions,
                    body,
                    responseType: 'text'
                });

                if (res.statusCode !== 200 && res.statusCode !== 201) {
                    throw new Error(`Status ${res.statusCode}: ${res.statusMessage}`);
                }
                return res.body;
            } catch (e) {
                lastErr = e;
                logger.error(`[CloudDB] Write attempt ${i + 1} failed: ${e.message}`);
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
        }
        throw new Error(`Write error after ${this.maxRetries} retries: ${lastErr.message}`);
    }
}

export default CloudDBAdapter;
