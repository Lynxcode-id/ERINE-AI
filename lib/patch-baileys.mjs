import fs from 'fs'
import path from 'path'

const marker = 'ERINE_LID_PN_DECRYPT_FIX_V2'

function patchFile(file) {
    if (!fs.existsSync(file)) return false
    let source = fs.readFileSync(file, 'utf8')
    if (source.includes(marker)) return true

    source = source.replace(
        "isHostedLidUser, isHostedPnUser, isJidBroadcast, isJidGroup, isJidMetaAI, isJidNewsletter, isJidStatusBroadcast, isLidUser, isPnUser\n//\ttransferDevice",
        "isHostedLidUser, isHostedPnUser, isJidBroadcast, isJidGroup, isJidMetaAI, isJidNewsletter, isJidStatusBroadcast, isLidUser, isPnUser\n//\ttransferDevice"
    )

    const mappingPattern = /const storeMappingFromEnvelope = async \(stanza, sender, repository, decryptionJid, logger\) => \{[\s\S]*?\n\};/
    const mappingReplacement = `const storeMappingFromEnvelope = async (stanza, sender, repository, decryptionJid, logger) => {
    const { senderAlt } = extractAddressingContext(stanza)
    if (!senderAlt) return
    const senderIsPn = isPnUser(sender)
    const senderIsLid = isLidUser(sender)
    const altIsPn = isPnUser(senderAlt)
    const altIsLid = isLidUser(senderAlt)
    if (!((senderIsPn && altIsLid) || (senderIsLid && altIsPn))) return
    const pn = senderIsPn ? sender : senderAlt
    const lid = senderIsLid ? sender : senderAlt
    if (decryptionJid !== sender && decryptionJid !== lid) return
    try {
        await repository.lidMapping.storeLIDPNMappings([{ lid, pn }])
        await repository.migrateSession?.(pn, lid)
        logger.debug({ sender, senderAlt }, 'LID/PN session mapping synchronized')
    } catch (error) {
        logger.warn({ sender, senderAlt, error }, 'LID/PN session mapping failed')
    }
};`

    if (!mappingPattern.test(source)) return false
    source = source.replace(mappingPattern, mappingReplacement)

    const directPattern = /case 'pkmsg':\n\s*case 'msg':\n\s*msgBuffer = await repository\.decryptMessage\(\{\n\s*jid: decryptionJid,\n\s*type: e2eType,\n\s*ciphertext: content\n\s*\}\)\n\s*break/
    const directReplacement = `case 'pkmsg':
                            case 'msg': {
                                const user = (isPnUser(sender) || isLidUser(sender)) ? sender : author
                                try {
                                    msgBuffer = await repository.decryptMessage({
                                        jid: user,
                                        type: e2eType,
                                        ciphertext: content
                                    })
                                } catch (err) {
                                    const altUser = isLidUser(user)
                                        ? stanza.attrs.participant_pn || stanza.attrs.sender_pn
                                        : stanza.attrs.participant_lid || stanza.attrs.sender_lid
                                    if (!altUser || altUser === user) throw err
                                    logger.debug(
                                        { key: fullMessage.key, primary: user, retryWith: altUser },
                                        'primary identity failed to decrypt, retrying with stanza-provided PN/LID pairing'
                                    )
                                    try {
                                        msgBuffer = await repository.decryptMessage({
                                            jid: altUser,
                                            type: e2eType,
                                            ciphertext: content
                                        })
                                    } catch {
                                        throw err
                                    }
                                }
                                break
                            }`

    if (!directPattern.test(source)) return false
    source = source.replace(directPattern, directReplacement)
    source = `// ${marker}\n${source}`
    fs.writeFileSync(file, source)
    return true
}

const root = process.cwd()
const candidates = [
    path.join(root, 'node_modules/@whiskeysockets/baileys/lib/Utils/decode-wa-message.js'),
    path.join(root, 'node_modules/@itsliaaa/baileys/lib/Utils/decode-wa-message.js')
]

const result = candidates.find(patchFile)
if (!result) {
    console.error('[BAILEYS-PATCH] decode-wa-message.js tidak ditemukan / format package berubah.')
    process.exitCode = 1
}
