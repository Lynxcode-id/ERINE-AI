function bind(conn) {
    if (!conn.chats) conn.chats = {}

    const lidToJidMap = global.lidMap ||= new Map()
    const pnMap = global.pnMap ||= new Map()
    if (!conn.isLid) conn.isLid = global.isLid || {}

    async function normalizeStoreJid(jid) {
        if (!jid) return ''
        jid = conn.decodeJid ? conn.decodeJid(jid) : jid
        if (!jid.endsWith('@lid')) return jid
        if (lidToJidMap.has(jid)) return lidToJidMap.get(jid)
        if (conn.isLid?.[jid]) return conn.isLid[jid]
        if (global.isLid?.[jid]) return global.isLid[jid]

        try {
            const [res] = await conn.onWhatsApp(jid).catch(() => [{}])
            if (res?.jid && !res.jid.endsWith('@lid')) {
                lidToJidMap.set(jid, res.jid)
                conn.isLid[jid] = res.jid
                global.isLid[jid] = res.jid
                return res.jid
            }
        } catch {}
        return jid
    }

    async function resolveStorePn(jid) {
        if (!jid) return ''
        if (pnMap.has(jid)) return pnMap.get(jid)
        if (/^\d+$/.test(jid)) return jid
        if (jid.includes('@s.whatsapp.net')) {
            const pn = jid.split('@')[0]
            pnMap.set(jid, pn)
            return pn
        }
        return jid.replace(/[^0-9]/g, '')
    }

    async function fixGroupMeta(meta) {
        if (!meta?.participants) return meta
        meta.participants = await Promise.all(meta.participants.map(async p => {
            if (p.phoneNumber) {
                const pn = String(p.phoneNumber).replace(/[^0-9]/g, '')
                const pnJid = `${pn}@s.whatsapp.net`
                if (p.lid) {
                    lidToJidMap.set(p.lid, pnJid)
                    conn.isLid[p.lid] = pnJid
                    global.isLid[p.lid] = pnJid
                }
                pnMap.set(p.lid || p.id, pn)
            }

            if (p.id?.endsWith('@lid')) {
                p.id = await normalizeStoreJid(p.id)
            }
            if (p.lid?.endsWith('@lid')) {
                p.lid = await normalizeStoreJid(p.lid)
            }
            return p
        }))
        return meta
    }

    async function updateNameToDb(contacts) {
        if (!contacts) return
        try {
            contacts = contacts.contacts || contacts
            for (const contact of contacts) {
                if (!contact.id) continue
                let id = conn.decodeJid(contact.id)
                if (id.endsWith('@lid')) {
                    id = await normalizeStoreJid(id)
                }
                if (!id || id === 'status@broadcast') continue

                let chats = conn.chats[id]
                if (!chats) chats = conn.chats[id] = { ...contact, id }
                conn.chats[id] = {
                  ...chats,
                  ...({
                      ...contact, id, ...(id.endsWith('@g.us') ?
                            { subject: contact.subject || contact.name || chats.subject || '' } :
                            { name: contact.notify || contact.name || chats.name || chats.notify || '' })
                    } || {})
                }
            }
        } catch (e) {
            console.error('[STORE] Error updateNameToDb:', e)
        }
    }

    conn.ev.on('contacts.upsert', updateNameToDb)
    conn.ev.on('groups.update', updateNameToDb)
    conn.ev.on('contacts.set', updateNameToDb)

    conn.ev.on('chats.set', async ({ chats }) => {
        try {
            for (let { id, name, readOnly } of chats) {
                id = await normalizeStoreJid(id)
                if (!id || id === 'status@broadcast') continue
                const isGroup = id.endsWith('@g.us')
                let chatsDb = conn.chats[id]
                if (!chatsDb) chatsDb = conn.chats[id] = { id }
                chatsDb.isChats = !readOnly
                if (name) chatsDb[isGroup ? 'subject' : 'name'] = name

                if (isGroup && typeof conn.groupMetadata === 'function') {
                    const metadata = await conn.groupMetadata(id).catch(_ => null)
                    if (name || metadata?.subject) chatsDb.subject = name || metadata.subject
                    if (!metadata) continue
                    chatsDb.metadata = await fixGroupMeta(metadata)
                }
            }
        } catch (e) {
            console.error('[STORE] Error chats.set:', e)
        }
    })

    conn.ev.on('group-participants.update', async function updateParticipantsToDb({ id, participants, action }) {
        try {
            if (!id) return
            id = await normalizeStoreJid(id)
            if (id === 'status@broadcast') return
            if (!(id in conn.chats)) conn.chats[id] = { id }

            let chats = conn.chats[id]
            chats.isChats = true

            if (participants) {
                for (let p of participants) {
                    let participantId = typeof p === 'string' ? p : (p?.id || '');

                    if (participantId && typeof participantId === 'string' && participantId.endsWith('@lid')) {
                        await normalizeStoreJid(participantId)
                    }
                }
            }

            if (typeof conn.groupMetadata === 'function') {
                const groupMetadata = await conn.groupMetadata(id).catch(_ => null)
                if (!groupMetadata) return
                chats.subject = groupMetadata.subject
                chats.metadata = await fixGroupMeta(groupMetadata)
            }
        } catch (e) {
            console.error('[STORE] Error group-participants.update:', e)
        }
    })

    conn.ev.on('groups.update', async function groupUpdatePushToDb(groupsUpdates) {
        try {
            for (const update of groupsUpdates) {
                if (!update.id) continue
                const id = await normalizeStoreJid(update.id)
                if (!id || id === 'status@broadcast') continue
                const isGroup = id.endsWith('@g.us')
                if (!isGroup) continue

                let chats = conn.chats[id]
                if (!chats) chats = conn.chats[id] = { id }
                chats.isChats = true

                if (typeof conn.groupMetadata === 'function') {
                    const metadata = await conn.groupMetadata(id).catch(_ => null)
                    if (metadata) chats.metadata = await fixGroupMeta(metadata)
                    if (update.subject || metadata?.subject) chats.subject = update.subject || metadata.subject
                }
            }
        } catch (e) {
            console.error('[STORE] Error groups.update:', e)
        }
    })

    conn.ev.on('chats.upsert', async function chatsUpsertPushToDb(chatsUpsert) {
        try {
            let chats = Array.isArray(chatsUpsert) ? chatsUpsert : [chatsUpsert]
            for (const chat of chats) {
                const { id, name } = chat
                if (!id || id === 'status@broadcast') continue
                const decodedId = await normalizeStoreJid(id)
                conn.chats[decodedId] = { ...(conn.chats[decodedId] || {}), ...chat, isChats: true }
                const isGroup = decodedId.endsWith('@g.us')

                if (isGroup && typeof conn.insertAllGroup === 'function') {
                    conn.insertAllGroup().catch(() => {})
                }
            }
        } catch (e) {
            console.error('[STORE] Error chats.upsert:', e)
        }
    })

    conn.ev.on('presence.update', async function presenceUpdatePushToDb({ id, presences }) {
        try {
            const sender = Object.keys(presences)[0] || id
            const _sender = await normalizeStoreJid(sender)
            const presence = presences[sender]?.lastKnownPresence || 'composing'

            let chats = conn.chats[_sender]
            if (!chats) chats = conn.chats[_sender] = { id: _sender }
            chats.presences = presence

            if (id.endsWith('@g.us')) {
                const decodedGroup = await normalizeStoreJid(id)
                let groupChats = conn.chats[decodedGroup]
                if (!groupChats && typeof conn.groupMetadata === 'function') {
                    const metadata = await conn.groupMetadata(decodedGroup).catch(_ => null)
                    if (metadata) conn.chats[decodedGroup] = { id: decodedGroup, subject: metadata.subject, metadata: await fixGroupMeta(metadata), isChats: true }
                }
            }
        } catch (e) {
            console.error('[STORE] Error presence.update:', e)
        }
    })
}

export default {
    bind
}
