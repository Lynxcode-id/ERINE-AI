export default {
  command: 'revoke',
  alias: [
    'resetlinkgc',
  ],
  category: 'grup',
  tags: ['grup'],
  description: '> Mereset link undangan grup. Link lama akan kedaluwarsa dan diganti dengan link baru.',
  help: '',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,
  typing: true,

  async execute(m, { sock }) {
    try {
      const group = sock.group

      if (!group) {
        throw new Error('API grup tidak tersedia.')
      }

      let groupName = 'Grup WhatsApp'

      try {
        const metadata = await group.queryGroupMetadata(m.chat)
        groupName = metadata?.subject || groupName
      } catch {}

      const methods = [
        'revokeInviteCode',
        'revokeInvite',
        'resetInviteCode',
        'groupRevokeInvite'
      ]

      const method = methods.find(
        name => typeof group[name] === 'function'
      )

      if (!method) {
        throw new Error(
          'Metode reset link tidak tersedia pada library Zapo-JS.'
        )
      }

      const result = await group[method](m.chat)

      const extractCode = value => {
        if (typeof value === 'string') {
          const match = value.match(
            /(?:https?:\/\/)?chat\.whatsapp\.com\/([a-zA-Z0-9]+)/i
          )

          return match ? match[1] : value.trim()
        }

        if (value && typeof value === 'object') {
          return extractCode(
            value.inviteCode ??
            value.invite_code ??
            value.code ??
            value.data ??
            value.result
          )
        }

        return null
      }

      let code = extractCode(result)

      if (!code && typeof group.queryInviteCode === 'function') {
        try {
          code = extractCode(
            await group.queryInviteCode(m.chat)
          )
        } catch (err) {
          console.error(
            '[REVOKE] Gagal mengambil link baru:',
            err?.message || err
          )
        }
      }

      const link = code
        ? `https://chat.whatsapp.com/${code}`
        : null

      let message =
        '୨ৎ *GROUP LINK RESET*\n\n' +
        `› Grup: ${groupName}\n` +
        '› Status: Berhasil\n' +
        '› Link lama: Tidak berlaku lagi\n'

      if (link) {
        message +=
          `› Link baru: ${link}\n`
      } else {
        message +=
          '› Link baru berhasil direset, tetapi kodenya tidak dapat ditampilkan.\n'
      }

      message += '\n© ERINE-AI'

      return m.reply(message)
    } catch (err) {
      console.error(
        '[REVOKE] Gagal mereset link grup:',
        err?.stack || err
      )

      return m.reply(
        '❌ *Gagal Mereset Link Grup*\n\n' +
        `› Detail: ${err?.message || 'Terjadi kesalahan.'}\n\n` +
        'Pastikan bot merupakan admin grup dan library mendukung fitur reset link.'
      )
    }
  }
}