import { setTimeout as delay } from 'node:timers/promises'
import { Button, ButtonV2, Carousel, AIRich } from '../../lib/message-builder2.js'
import { cmdId } from '../../lib/function.js'

const FOOTER = 'with love, elyra !!'

async function dummyImage(color) {
  const { default: sharp } = await import('sharp')
  return sharp({
    create: { width: 400, height: 400, channels: 3, background: color }
  }).jpeg().toBuffer()
}

const TESTS = {
  async button({ m, sock }) {
    const msg = new Button(sock)
      .setTitle('Test Button')
      .setBody('Button native flow: header gambar, reply, url, copy, call, dan daftar pilihan.')
      .setFooter(FOOTER)
      .setImage(await dummyImage('#e91e63'))
      .addReply('Ping', cmdId('ping'))
      .addReply('Runtime', cmdId('runtime'))
      .addUrl('Buka GitHub', 'https://github.com')
      .addCopy('Salin Kode', 'ELYRA-MB-123')
      .addCall('Telepon', 'call_1', { phone_number: '+6281234567890' })
      .addSelection('Pilih Menu')
      .makeSection('Perintah', 'Populer')
      .makeRow('', 'Ping', 'Cek latency bot', cmdId('ping'))
      .makeRow('', 'Menu', 'Buka menu bot', cmdId('menu'))
      .setParams({ bottom_sheet: { in_thread_buttons_limit: 2, list_title: 'Pilihan Test', button_title: 'Buka Opsi' } })
      .quote(m)
    return msg.send(m.chat)
  },

  async buttonv2({ m, sock }) {
    const msg = new ButtonV2(sock)
      .setTitle('Test ButtonV2')
      .setSubtitle('buttonsMessage klasik')
      .setBody('ButtonV2: tombol klasik dengan thumbnail.')
      .setFooter(FOOTER)
      .setThumbnail(await dummyImage('#3f51b5'))
      .addButton('Ping', cmdId('ping'))
      .addButton('Runtime', cmdId('runtime'))
      .addButton('Menu', cmdId('menu'))
      .quote(m)
    return msg.send(m.chat)
  },

  async carousel({ m, sock }) {
    const colors = ['#e91e63', '#3f51b5', '#009688']
    const carousel = new Carousel(sock)
      .setBody('Test Carousel Elyra')
      .setFooter(FOOTER)
      .quote(m)

    for (const [i, color] of colors.entries()) {
      const card = await new Button(sock)
        .setTitle(`Kartu ${i + 1}`)
        .setBody(`Deskripsi kartu nomor ${i + 1}`)
        .setFooter(FOOTER)
        .setImage(await dummyImage(color))
        .addReply('Ping', cmdId('ping'))
        .addUrl('Buka', 'https://github.com')
        .toCard()
      carousel.addCard(card)
    }

    return carousel.send(m.chat)
  },

  async airich({ m, sock }) {
    const rich = new AIRich(sock)
      .setTitle('Test AIRich Elyra')
      .addText('*Test AIRich Elyra*\nHyperlink: [Buka GitHub](https://github.com)\nCitation: [](https://example.com/sumber-1)')
      .addCode('javascript', "function greet(name) {\n  return `Halo, ${name}!`\n}\n\ngreet('Elyra')")
      .addTable([
        ['Nama', 'Peran'],
        ['[Elyra](https://github.com)', 'Bot'],
        ['Kamu', 'Owner']
      ])
      .addTip('Ini tip dari AIRich.')
      .addSuggest(['Ping', 'Menu', 'Runtime'])
      .setFooter(FOOTER)
    return rich.send(m.chat, { quote: m.raw })
  },

  async tour({ m, sock }) {
    const rich = new AIRich(sock)
      .setTitle('MessageBuilderV4.7')
      .addText('Hey! Welcome to [MessageBuilderV4.7](https://gist.github.com/ValdazGT) 👋', { id: 'intro' })
      .setFooter('Built with MessageBuilderV4.7')

    await rich.send(m.chat, { quote: m.raw })
    await delay(1500)

    rich.addText('This is a live tour of MessageBuilderV4.7. Everything below will be built directly into this message.', { insertAt: 'intro', id: 'welcome' })
    rich.addSuggest(['MessageBuilderV4.7', 'Dynamic AIRich', 'NIXCODE'])
    await rich.sendEdit()
    await delay(1800)

    rich.addText('First, loading states. The item appears first, then gets replaced when the content is ready.', { insertAt: 'welcome', id: 'loading_intro' })
    await rich.sendEdit()
    await delay(1500)

    rich.addImage('', { status: 'GENERATING', update_text: 'Generating image...', insertAt: 'loading_intro', id: 'image1' })
    await rich.sendEdit()
    await delay(3000)

    rich.addImage('https://cdn.ornzora.eu.cc/2a639cd2-5c33-49e3-982f-77f471c9313f-FIORA.jpg', { replace: 'image1' })
    await rich.sendEdit()
    await delay(2000)

    rich.addText('Video supports the same loading → replace flow.', { insertAt: 'image1', id: 'video_intro' })
    await rich.sendEdit()
    await delay(1500)

    rich.addVideo('', { status: 'GENERATING', estimatedTime: 3000, insertAt: 'video_intro', id: 'video1' })
    await rich.sendEdit()
    await delay(4000)

    rich.addVideo('https://cdn.ornzora.eu.cc/3bb12237-2365-4a76-a4e2-635faea6d54c-FIORA.mp4', { replace: 'video1' })
    await rich.sendEdit()
    await delay(2000)

    rich.addText('Now for code blocks with syntax highlighting.', { insertAt: 'video1', id: 'code_intro' })
    await rich.sendEdit()
    await delay(1200)

    rich.addCode('javascript', "function greet(name) {\n  return `Hello, ${name}!`\n}\n\ngreet('Nixel')", { insertAt: 'code_intro', id: 'code1' })
    await rich.sendEdit()
    await delay(2500)

    rich.addText('Tables are supported too.', { insertAt: 'code1', id: 'table_intro' })
    await rich.sendEdit()
    await delay(1200)

    rich.addTable(
      [
        ['Name', 'Role'],
        ['[Nixel](https://nixel.dev/)', 'Developer'],
        ['Fiora Sylvie', 'Assistant']
      ],
      { insertAt: 'table_intro', id: 'table1' }
    )
    await rich.sendEdit()
    await delay(2500)

    rich.addText('You can also build content in another AIRich instance and reuse its items.', { insertAt: 'table1', id: 'mix_intro' })
    await rich.sendEdit()
    await delay(1800)

    const items = new AIRich(sock)
      .addProduct({
        title: 'NIXCODE',
        brand: 'Nixel',
        price: 'MessageBuilderV4.7',
        product_url: 'https://gist.github.com/ValdazGT',
        image_url: 'https://cdn.ornzora.eu.cc/2a639cd2-5c33-49e3-982f-77f471c9313f-FIORA.jpg'
      })
      .addPost({
        profile: 'https://cdn.ornzora.eu.cc/bd0d65c6-8a44-4418-8d40-ae0ac00a2386-FIORA.jpg',
        title: 'Behind the build',
        username: 'nixel.dev',
        verified: true,
        caption: 'Built separately, then mixed into another AIRich message.',
        thumbnail: 'https://cdn.ornzora.eu.cc/69551181-48c0-4466-b22d-235a93db8a63-FIORA.jpg',
        url: 'https://nixel.dev/',
        source_app: 'INSTAGRAM'
      })
      .addReels({
        profile: 'https://cdn.ornzora.eu.cc/bd0d65c6-8a44-4418-8d40-ae0ac00a2386-FIORA.jpg',
        username: 'nixel.dev',
        thumbnail: 'https://cdn.ornzora.eu.cc/6b1c1b29-9b80-4cfa-9c57-d008d60e18bc-FIORA.jpg',
        url: 'https://nixel.dev/',
        verified: true
      }).items

    rich.addText('These cards came from a completely separate AIRich instance.', { insertAt: 'mix_intro', id: 'mix_note' })
    await rich.sendEdit()
    await delay(1500)

    rich.addSection(AIRich.newLayout('HScroll', items), { insertAt: 'mix_note', id: 'mixed_items' })
    await rich.sendEdit()
    await delay(3000)

    rich.addTip('The Product and Post above were created separately, extracted with .items, then inserted here using .addSection().', { insertAt: 'mixed_items', id: 'mix_explain' })
    await rich.sendEdit()
    await delay(2500)

    rich.addText('You can continue building underneath the mixed section normally.', { insertAt: 'mix_explain', id: 'after_mix' })
    await rich.sendEdit()
    await delay(1800)

    rich.addSource(
      [
        {
          icon: 'https://cdn.ornzora.eu.cc/bd0d65c6-8a44-4418-8d40-ae0ac00a2386-FIORA.jpg',
          url: 'https://gist.github.com/ValdazGT/',
          title: 'MessageBuilderV4.7',
          subtitle: 'GitHub Gist · MessageBuilder'
        }
      ],
      { insertAt: 'after_mix', id: 'source1' }
    )
    await rich.sendEdit()
    await delay(1800)

    const profile = 'https://cdn.ornzora.eu.cc/bd0d65c6-8a44-4418-8d40-ae0ac00a2386-FIORA.jpg'
    const thumbs = [
      'https://cdn.ornzora.eu.cc/2a639cd2-5c33-49e3-982f-77f471c9313f-FIORA.jpg',
      'https://cdn.ornzora.eu.cc/69551181-48c0-4466-b22d-235a93db8a63-FIORA.jpg',
      'https://cdn.ornzora.eu.cc/6b1c1b29-9b80-4cfa-9c57-d008d60e18bc-FIORA.jpg',
      'https://cdn.ornzora.eu.cc/6b07d572-8aeb-4bbe-9faa-f226bacd5c99-FIORA.jpg'
    ]
    rich.addReels(
      thumbs.map(thumbnail => ({ profile, username: 'nixel.dev', thumbnail, url: 'https://nixel.dev/', verified: true })),
      { insertAt: 'source1', id: 'reels1' }
    )
    await rich.sendEdit()
    await delay(2200)

    rich.addWidget(
      {
        title: 'Quick Actions',
        sections: [],
        actions: [{ label: 'Join Channel', kind: 'OTHER', state: 'PENDING', id: 'channel' }]
      },
      { insertAt: 'reels1', id: 'widget1' }
    )
    await rich.sendEdit()
    await delay(2000)

    rich.addFooterAction(
      { text: 'Visit Channel', url: 'https://whatsapp.com/channel/0029VbCV1ck8fewpdNb2TY2k' },
      { id: 'footer1' }
    )
    await rich.sendEdit()
    await delay(2500)

    rich.addMetadata('That is the basic workflow: create, insert, replace, mix, and continue building downward in the same editable message.', { id: 'cleanup_intro', insertAt: 'reels1' })
    await rich.sendEdit()
    await delay(3000)

    rich.delete('cleanup_intro')
    await rich.sendEdit()
    await delay(400)

    rich.addText(
      'That’s the full MessageBuilderV4.7 tour — built live, edited live, and mixed from separate AIRich instances. 🚀\n\nFor more example code, check it out [here](https://gist.githubusercontent.com/ValdazGT/ce6532c1d4ff192bb718f1acb392d460/raw/9683ebc0ac47280c8729680ad074c3cb309d7ab5/MessageBuilderV4.6_Example-Code.js).',
      { insertAt: 'widget1', id: 'final' }
    )
    await rich.sendEdit()
  }
}

const QUICK = ['button', 'buttonv2', 'carousel', 'airich']

export default {
  command: 'testmb2',
  alias: ['testmessagebuilder2'],
  category: 'bot',
  tags: ['bot'],
  description: '> Menguji semua fitur lib/message-builder2.js (Button, ButtonV2, Carousel, AIRich).\n\n*Keterangan Format:*\n> `button` | `buttonv2` | `carousel` | `airich` | `tour` | `all`\n> `all` menjalankan semua kecuali `tour` (tour lama dan butuh internet untuk gambar/video contoh).\n\ncontoh penggunaan:\n> `.testmb2 all`\n> `.testmb2 tour`',
  help: '<button|buttonv2|carousel|airich|tour|all>',
  onlyOwner: true,
  typing: true,

  async execute(m, { sock, args }) {
    const pick = String(args[0] || 'all').toLowerCase()
    const names = pick === 'all' ? QUICK : [pick]

    if (!names.every(n => TESTS[n])) {
      return m.reply([
        '🌷 *Test Message Builder*',
        '',
        `♡ Pilihan : ${Object.keys(TESTS).join(' | ')} | all`,
        `♡ Contoh : ${m.prefix || '.'}${m.command} all`,
        '',
        FOOTER
      ].join('\n'))
    }

    const report = []

    for (const name of names) {
      try {
        await TESTS[name]({ m, sock })
        report.push(`✅ ${name}`)
      } catch (err) {
        console.error(`[TESTMB:${name}]`, err?.stack || err?.message || err)
        report.push(`❌ ${name} : ${String(err?.message || err).slice(0, 120)}`)
      }
    }

    return m.reply(['🌷 *Hasil Test Message Builder*', '', ...report, '', FOOTER].join('\n'))
  }
}