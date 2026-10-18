<div align="center">

<img src="https://raw.githubusercontent.com/Lynxcode-id/picture/main/1792366518548.jpeg" width="100%" alt="ELYRA — ERINE-AI WhatsApp Automation" />

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0b1220,50:164e63,100:22d3ee&height=170&section=header&text=ELYRA&fontSize=54&fontColor=ffffff&fontAlignY=40&desc=ERINE-AI%20%7C%20WhatsApp%20Automation%20System&descSize=16&descAlignY=64&animation=fadeIn" width="100%" alt="ELYRA header" />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=500&size=15&duration=2800&pause=800&color=22D3EE&center=true&vCenter=true&repeat=true&width=650&height=35&lines=WhatsApp+Automation;Modular+Plugin+System;Built+to+Grow;Powered+by+INF+PROJECT" alt="ELYRA animated tagline" />

**Sistem automasi WhatsApp yang terus tumbuh dan dikembangkan.**  
JavaScript · Zapo-JS · Plugin System · Continuous Development

[Repository](https://github.com/Lynxcode-id/ERINE-AI) · [INF PROJECT](https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X) · [Portfolio](https://www.lynxdev.my.id/) · [Dukung Pengembangan](https://saweria.co/LynxPreset)

[![Status](https://img.shields.io/badge/status-active%20development-16a34a?style=for-the-badge)](https://github.com/Lynxcode-id/ERINE-AI)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-f7df1e?style=for-the-badge&logo=javascript&logoColor=111827)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Zapo-JS](https://img.shields.io/badge/Library-Zapo--JS-0891b2?style=for-the-badge)](https://github.com/vinikjkkj/zapo)

</div>

---

## Tentang ELYRA

**ERINE-AI • ELYRA** adalah script bot WhatsApp berbasis [Zapo-JS](https://github.com/vinikjkkj/zapo) untuk automasi pesan, pengelolaan fitur berbasis plugin, dan integrasi layanan eksternal.

ELYRA bukan lagi sekadar base bot. Project ini terus dibangun sebagai script dengan struktur, sistem, dan arah pengembangan sendiri. Pengembangan utama saat ini dikerjakan secara mandiri oleh **Lynx decode — Arman Maulana**, sebagai bagian dari ekosistem **INF PROJECT TEAM**, **INF PROJECT'S**, dan **GENERAL DISTRICT**.

Fokusnya bukan sekadar menambah banyak command, tetapi menjaga struktur tetap dapat dipelihara, memperbaiki masalah yang ditemukan, dan mengembangkan fitur sesuai kebutuhan serta sumber daya yang tersedia.

> **Status:** Active Development. Fitur, konfigurasi, dependensi, dan struktur internal dapat berubah sewaktu-waktu.

## Ringkasan Project

| Detail | Informasi |
| --- | --- |
| Nama | ERINE-AI • ELYRA |
| Repository | [Lynxcode-id/ERINE-AI](https://github.com/Lynxcode-id/ERINE-AI) |
| Developer | Lynx decode — Arman Maulana |
| Tim dan komunitas | INF PROJECT TEAM |
| Ekosistem | INF PROJECT'S & GENERAL DISTRICT |
| Bahasa | JavaScript · ES Modules |
| Runtime | Node.js |
| Library WhatsApp | Zapo-JS |
| Status | Active Development |

## Kelebihan Utama

- **Plugin modular** — fitur dikelompokkan agar lebih mudah ditambah, diperbaiki, dan dipelihara.
- **Pengelolaan plugin** — mendukung alur pemuatan dan reload plugin sesuai implementasi loader.
- **Penyimpanan SQLite** — digunakan untuk sesi atau data tertentu tanpa server database terpisah pada penggunaan lokal yang sesuai.
- **Penanganan error** — membantu mengisolasi sebagian kegagalan plugin agar lebih mudah ditelusuri.
- **Dukungan pesan dan media** — kemampuan pesan, reaction, media, voice note, thumbnail, dan fitur lain mengikuti API wrapper.
- **Struktur yang dapat dikembangkan** — handler, helper, database, konfigurasi, dan plugin dipisahkan sesuai peran.
- **Integrasi layanan eksternal** — tersedia ruang pengembangan untuk API dan layanan yang dibutuhkan fitur bot.
- **Efisiensi yang diperhatikan** — alur kerja dirancang untuk menghindari proses berulang yang tidak diperlukan; penggunaan aktual bergantung pada fitur, trafik, dan server.
- **Pemeliharaan berkelanjutan** — perbaikan bug, penyesuaian dependensi, stabilitas, dan fitur baru dilakukan bertahap.

> Performa dan ketersediaan fitur bergantung pada versi library, sistem operasi, konfigurasi, dan beban server. Daftar ini menjelaskan arah desain, bukan jaminan bahwa semua kondisi selalu bebas gangguan.

## Navigasi Dokumentasi

Pilih bagian yang ingin dibaca. Panel dapat dibuka dan ditutup agar README tetap ringkas di GitHub.

<details>
<summary><strong>01 · Instalasi dan menjalankan bot</strong></summary>

**Persyaratan:** Node.js 20 atau versi yang kompatibel dengan dependensi, npm, koneksi internet, serta FFmpeg dan FFprobe untuk fitur media yang memerlukannya.

```bash
git clone https://github.com/Lynxcode-id/ERINE-AI.git
cd ERINE-AI
npm install
npm start
```

Jika `package.json` mengatur `postinstall` untuk menjalankan `patch.js`, patch berjalan sesuai konfigurasi package. Ikuti instruksi autentikasi yang muncul di terminal. Entry point dan perintah start mengikuti `package.json` versi repository yang digunakan.

</details>

<details>
<summary><strong>02 · Konfigurasi dan keamanan</strong></summary>

Periksa file konfigurasi yang disediakan versi project, termasuk `settings.js` apabila digunakan. Atur nomor owner, prefix, pengaturan bot, API key, dan endpoint berdasarkan format yang didukung script.

Jangan mengunggah kredensial, sesi, token, API key privat, file `.env`, atau database yang berisi data sensitif.

Contoh `.gitignore` yang dapat disesuaikan:

```gitignore
node_modules/
session/
auth/
.env
.env.*
*.db
*.sqlite
*.sqlite3
npm-debug.log*
```

Sesuaikan aturan dengan kebutuhan project. Jangan mengecualikan source code atau data contoh yang memang diperlukan.

</details>

<details>
<summary><strong>03 · Sistem plugin</strong></summary>

Jika loader versi yang digunakan menerima format berikut, contoh plugin sederhana:

```js
export default {
  command: 'halo',
  alias: ['hi'],
  category: 'bot',
  description: 'Menyapa pengguna',

  async execute(m) {
    await m.reply(`Halo ${m.pushName || 'kak'}!`)
  }
}
```

Contoh susunan plugin:

```text
plugins/
├── bot/
├── chanel/
├── grup/
├── konvert/
├── owner/
└── tools/
```

Ikuti format ekspor dan context yang dikenali loader. Pastikan properti wajib tersedia, tangani error, hindari pekerjaan berat yang tidak diperlukan pada setiap pesan, dan jangan menaruh kredensial privat di source code. Struktur folder dapat berubah selama pengembangan.

</details>

<details>
<summary><strong>04 · Contoh API dasar</strong></summary>

**Reply pesan**
```js
await m.reply('Halo dunia!')
```

**Mengirim pesan**
```js
await sock.message.send(m.chat, 'Halo dunia!')
```

**Mengirim reaction**
```js
await sock.sendReact(m.chat, '👍', m.id)
```

Contoh mengikuti pola API yang digunakan dalam script. Periksa [dokumentasi Zapo-JS](https://zapo.to) dan wrapper versi terpasang apabila API berubah.

</details>

<details>
<summary><strong>05 · Source code dan obfuscation</strong></summary>

Sebagian source code ELYRA di-obfuscate, sedangkan sebagian lainnya tetap dapat dibaca. Keputusan ini merupakan bagian dari pengelolaan project yang saat ini dikembangkan oleh satu developer utama.

Obfuscation bertujuan mempersulit pembacaan langsung pada bagian tertentu. Teknik ini bukan jaminan bahwa kode tidak dapat dianalisis dan bukan pengganti pengamanan kredensial atau praktik keamanan yang benar. Tingkat obfuscation dan struktur internal dapat berubah sesuai kebutuhan pemeliharaan.

</details>

<details>
<summary><strong>06 · API key dan dukungan project</strong></summary>

ELYRA dapat menggunakan API atau layanan eksternal. Ketersediaannya dipengaruhi konfigurasi, kuota, status penyedia, endpoint, dan kebijakan layanan terkait.

Kami berupaya menjaga integrasi tetap berfungsi selama memungkinkan. Dukungan biaya operasional membantu pemeliharaan dan pengembangan.

<div align="center">

[![Dukung Pengembangan ELYRA](https://img.shields.io/badge/SUPPORT%20ELYRA-Saweria-FFB000?style=for-the-badge)](https://saweria.co/LynxPreset)

**[saweria.co/LynxPreset](https://saweria.co/LynxPreset)**

</div>

Donasi bersifat sukarela dan tidak menjamin API key aktif selamanya, kuota tidak akan habis, atau layanan pihak ketiga selalu tersedia. Jangan bagikan API key privat melalui issue, grup publik, atau tangkapan layar.

</details>

<details>
<summary><strong>07 · Troubleshooting</strong></summary>

- **Plugin tidak terbaca:** periksa lokasi file, ekstensi `.js`, sintaks, format ekspor, dan properti yang diwajibkan loader.
- **Autentikasi berulang:** pastikan sesi tidak terhapus dan proses memiliki izin baca/tulis; periksa log koneksi.
- **FFmpeg tidak ditemukan:** jalankan `ffmpeg -version` dan `ffprobe -version`, lalu pastikan tersedia melalui `PATH`.
- **API gagal:** periksa key, endpoint, parameter, koneksi, kuota, dan status penyedia. Hapus informasi sensitif dari log.
- **Bot berhenti:** periksa log terminal, Node.js, dependensi, konfigurasi, dan plugin terakhir. Buat cadangan sebelum menghapus sesi atau database.

</details>

<details>
<summary><strong>08 · Project sebelumnya</strong></summary>

Project berikut telah berhenti dikembangkan. Terima kasih kepada semua pengguna yang menjadi bagian dari perjalanannya.

- **ERINE-MD:** [github.com/Lynxcode-id/ERINE-MD](https://github.com/Lynxcode-id/ERINE-MD)
- **Li-Shiya MD:** [github.com/Lynxcode-id/Li-Shiya-MD](https://github.com/Lynxcode-id/Li-Shiya-MD)

Penghentian pengembangan tidak menghapus pengalaman dan kontribusi yang telah menjadi bagian dari perjalanan project.

</details>

<details>
<summary><strong>09 · Ekosistem Lynx</strong></summary>

| Layanan | Tautan |
| --- | --- |
| Portfolio | [lynxdev.my.id](https://www.lynxdev.my.id/) |
| Lynx Snippets | [lynxsnippets.web.id](https://lynxsnippets.web.id) |
| Lynx Snippets V2 | [lynxsnippets2.web.id](https://lynxsnippets2.web.id) |
| Lynx REST API | [lynxapis.my.id](https://lynxapis.my.id) |

</details>

<details>
<summary><strong>10 · Channel dan komunitas</strong></summary>

- **API's:** [Channel WhatsApp](https://whatsapp.com/channel/0029VbCMzVqE50UZAnV44u05)
- **INF Code:** [Channel WhatsApp](https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X)
- **L-Store:** [Channel WhatsApp](https://whatsapp.com/channel/0029Vb6eyvOJUM2caRIktb2L)
- **GC Erine:** [Grup WhatsApp](https://chat.whatsapp.com/JlUNKqeRT8tAK4Nnqxxc51?s=cl&p=a&mlu=4&ilr=4)
- **GC Shiya:** [Grup WhatsApp](https://chat.whatsapp.com/CAT03E3YJNJ1RaLsUo1X80)

**Informasi grup:** Grup chat ERINE AI saat ini ditutup dan tidak menerima permintaan masuk secara terbuka. Grup Li Shiya ESM merupakan ruang diskusi publik yang tersedia melalui tautan di atas. Status akses dapat berubah.

</details>

<details>
<summary><strong>11 · Kontak, sosial media, dan dukungan</strong></summary>

**Kontak**
- Bisnis — [WhatsApp](https://wa.me/6285143688664)
- Support — [WhatsApp](https://wa.me/6281362133135)
- Bot Telegram — [Lynx CPanel Bot](https://t.me/Lynxcpanel_bot)
- Telegram — `@Lynxmanuelz4`

**Sosial media**
- Instagram — `@lynxdecode_`
- YouTube — `@lynxdecode_`
- TikTok — `@olineonlyy_`

**Dukungan**
- Saweria — [saweria.co/LynxPreset](https://saweria.co/LynxPreset)
- NGL — [ngl.link/lynxdsinii](https://ngl.link/lynxdsinii)

</details>

<details>
<summary><strong>12 · Jadibot gratis</strong></summary>

1. Bergabung dengan grup komunitas yang menerima anggota baru.
2. Baca dan ikuti aturan komunitas.
3. Ketik `.jadibot` jika fitur tersedia pada grup terkait.

Layanan mengikuti kapasitas dan ketentuan komunitas. Jangan gunakan untuk spam atau aktivitas yang melanggar aturan platform.

</details>

<details>
<summary><strong>13 · Credits dan disclaimer</strong></summary>

**Teknologi dan dependensi**
- [Zapo-JS](https://github.com/vinikjkkj/zapo)
- [@zapo-js/media-utils](https://www.npmjs.com/package/@zapo-js/media-utils)
- [@zapo-js/store-sqlite](https://www.npmjs.com/package/@zapo-js/store-sqlite)
- [better-sqlite3](https://www.npmjs.com/package/better-sqlite3)
- [sharp](https://www.npmjs.com/package/sharp)
- FFmpeg dan FFprobe

Terima kasih kepada pengguna, penguji, dan komunitas yang memberi masukan. Lisensi tiap dependensi tetap mengikuti ketentuan pemiliknya.

**Disclaimer:** ERINE-AI • ELYRA adalah project independen untuk automasi dan pengembangan sistem bot. Project ini tidak berafiliasi dengan, disponsori oleh, atau didukung secara resmi oleh WhatsApp. Zapo-JS merupakan dependensi terpisah. Pengguna bertanggung jawab atas konfigurasi, keamanan kredensial, penggunaan API, dan aktivitas yang dijalankan melalui script.

</details>

## Arah Pengembangan

ELYRA akan terus dikembangkan secara bertahap. Prioritasnya adalah merawat fondasi yang ada, memperbaiki masalah yang ditemukan, meningkatkan kompatibilitas, dan menambahkan fitur yang memberi manfaat nyata.

Pengembangan oleh satu developer berarti waktu pengerjaan dan jadwal rilis dapat bervariasi. Tidak semua permintaan dapat dikerjakan langsung dan tidak ada jadwal rilis tetap yang dijanjikan. Laporan bug yang jelas, langkah reproduksi, ide fitur yang terarah, dan dukungan komunitas akan sangat membantu.

### Berkontribusi pada project

- Laporkan bug dengan detail yang cukup dan hilangkan informasi sensitif dari log.
- Sertakan langkah untuk mereproduksi masalah.
- Ajukan ide fitur beserta tujuan dan contoh penggunaannya.
- Ikuti pembaruan melalui repository dan channel INF PROJECT.
- Dukung biaya operasional dan pengembangan jika berkenan.

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=500&size=14&duration=3000&pause=900&color=22D3EE&center=true&vCenter=true&repeat=true&width=600&height=30&lines=Build+Smart+Systems;Automate+with+Purpose;Keep+Learning.+Keep+Building." alt="Development principles" />

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:22d3ee,50:164e63,100:0b1220&height=135&section=footer&animation=fadeIn" width="100%" alt="ELYRA footer" />

**ERINE-AI • ELYRA**  
Developed by **Lynx decode — Arman Maulana**  
INF PROJECT TEAM · INF PROJECT'S · GENERAL DISTRICT

[Repository](https://github.com/Lynxcode-id/ERINE-AI) · [INF PROJECT](https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X) · [Support Project](https://saweria.co/LynxPreset)

*Build Smart System | Automate Everything*

</div>
