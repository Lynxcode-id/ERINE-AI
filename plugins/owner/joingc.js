export default {
  command: 'joingc',
  category: 'owner',
  description: 'Bergabung ke grup melalui tautan undangan.',
  onlyOwner: true,
  typing: false,
  wait: false,

  async execute(m, { sock, args }) {
    try {
      const input = Array.isArray(args)
        ? args.join(' ').trim()
        : String(args || '').trim()

      if (!input) return

      let inviteCode = ''

      const linkMatch = input.match(
        /(?:https?:\/\/)?(?:www\.)?chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9_-]+)/i
      )

      if (linkMatch) {
        inviteCode = linkMatch[1]
      } else if (/^[A-Za-z0-9_-]{6,}$/.test(input)) {
        inviteCode = input
      } else {
        console.error('[JOINGC] Tautan undangan tidak valid.')
        return
      }

      const group = sock.group

      if (!group) {
        console.error('[JOINGC] Group coordinator tidak tersedia.')
        return
      }

      const methods = [
        'joinGroupViaInvite',
        'joinGroup',
        'joinByInvite',
        'joinInvite',
        'joinGroupWithInvite'
      ]

      const method = methods.find(
        name => typeof group[name] === 'function'
      )

      if (!method) {
        console.error('[JOINGC] Metode join grup tidak tersedia.')
        return
      }

      await group[method](inviteCode)

      console.info('[JOINGC] Berhasil bergabung ke grup.')
    } catch (error) {
      console.error(
        '[JOINGC] Gagal bergabung:',
        error?.message || error
      )
    }
  }
}