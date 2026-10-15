<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:111827,55:164e63,100:22d3ee&height=190&section=header&text=ERINE-AI%20%E2%80%A2%20ELYRA&fontSize=36&fontColor=ffffff&fontAlignY=36&desc=WhatsApp%20Automation%20System&descSize=16&descAlignY=57&animation=fadeIn" width="100%" alt="ERINE-AI ELYRA" />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=500&size=16&duration=3200&pause=900&color=22D3EE&center=true&vCenter=true&repeat=true&width=520&height=32&lines=Automation+%E2%80%A2+Plugin+System;Built+to+Grow;Powered+by+INF+PROJECT" alt="Project tagline" />

**Script bot WhatsApp yang terus dikembangkan.**  
Dibangun dengan JavaScript dan Zapo-JS.

[Repository](https://github.com/Lynxcode-id/ERINE-AI) · [INF PROJECT](https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X) · [Portfolio](https://www.lynxdev.my.id/) · [Dukung Project](https://saweria.co/LynxPreset)

<br />

[![Development](https://img.shields.io/badge/status-active%20development-16a34a?style=flat-square)](https://github.com/Lynxcode-id/ERINE-AI)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ESM-f7df1e?style=flat-square&logo=javascript&logoColor=111827)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Zapo-JS](https://img.shields.io/badge/WhatsApp-Zapo--JS-22c55e?style=flat-square)](https://github.com/vinikjkkj/zapo)

</div>

---

## Tentang ELYRA

**ERINE-AI • ELYRA** adalah script bot WhatsApp berbasis [Zapo-JS](https://github.com/vinikjkkj/zapo) untuk automasi pesan, pengembangan fitur berbasis plugin, dan integrasi layanan eksternal.

ELYRA bukan lagi sekadar base bot. Script ini memiliki sistem dan struktur pengembangan sendiri, dan masih terus diperbarui oleh **Lynx decode — Arman Maulana** sebagai developer tunggal saat ini. Pengembangan dilakukan secara bertahap berdasarkan kebutuhan, evaluasi, serta waktu dan sumber daya yang tersedia.

> **Status project:** aktif dikembangkan. Fitur, konfigurasi, dependensi, dan struktur internal dapat berubah pada pembaruan berikutnya.

### Informasi Project

| Detail | Informasi |
| --- | --- |
| Nama | ERINE-AI • ELYRA |
| Developer | Lynx decode — Arman Maulana |
| Tim dan komunitas | INF PROJECT TEAM |
| Ekosistem | INF PROJECT'S & GENERAL DISTRICT |
| Bahasa | JavaScript (ES Modules) |
| Runtime | Node.js |
| Base Script by | bangsul |
| Library WhatsApp | Zapo-JS |
| Repository | [Lynxcode-id/ERINE-AI](https://github.com/Lynxcode-id/ERINE-AI) |

## Kelebihan Utama

- **Plugin modular.** Fitur dipisah ke dalam plugin agar lebih mudah ditambah, diperbaiki, dan dirawat.
- **Reload plugin.** Mendukung pemuatan ulang plugin tanpa selalu mengharuskan restart penuh.
- **Penggunaan resource yang terukur.** Struktur dibuat untuk mengurangi pekerjaan berulang yang tidak diperlukan. Pemakaian aktual tetap bergantung pada fitur aktif dan beban server.
- **Penyimpanan SQLite.** Digunakan untuk sesi dan kebutuhan data tertentu tanpa memerlukan server database terpisah untuk penggunaan lokal yang sesuai.
- **Penanganan error plugin.** Membantu membatasi dampak kesalahan pada satu plugin, meskipun tidak semua jenis error dapat dicegah.
- **Dukungan pesan dan media.** Dapat menggunakan kemampuan kirim pesan, reaction, media, voice note, thumbnail, dan fitur lain sesuai implementasi wrapper.
- **Mudah diperluas.** Struktur handler, database, helper, dan plugin memberi ruang untuk integrasi serta pengembangan fitur berikutnya.
- **Pengembangan berkelanjutan.** Fokus pengembangan mencakup perbaikan bug, pemeliharaan, stabilitas, dan penambahan fitur secara bertahap.

> Poin di atas menjelaskan desain dan kemampuan sistem yang digunakan. Performa serta ketersediaan setiap fitur tidak dijamin sama pada semua perangkat, versi library, dan konfigurasi.

## Navigasi Dokumentasi

Bagian teknis dan informasi tambahan di bawah dapat dibuka sesuai kebutuhan.

<details>
<summary><strong>1. Instalasi dan menjalankan bot</strong></summary>

### Persyaratan

- Node.js 20 atau lebih baru, dengan tetap memperhatikan kompatibilitas dependensi.
- npm.
- FFmpeg dan FFprobe untuk fitur media yang memerlukannya.
- Koneksi internet dan terminal untuk proses autentikasi.

### Clone repository

```bash
git clone https://github.com/Lynxcode-id/ERINE-AI.git
cd ERINE-AI
```

### Pasang dependensi

```bash
npm install
```

Jika `package.json` mengatur script `postinstall` untuk menjalankan `patch.js`, proses tersebut akan mengikuti konfigurasi package.

### Jalankan bot

```bash
npm start
```

Ikuti instruksi autentikasi yang muncul di terminal. Entry point dan proses start mengikuti konfigurasi `package.json` pada versi repository yang digunakan.

</details>

<details>
<summary><strong>2. Konfigurasi dan keamanan</strong></summary>

Periksa file konfigurasi yang tersedia di repository, termasuk `settings.js` jika digunakan oleh versi tersebut. Atur nomor owner, prefix, pengaturan bot, API key, dan endpoint sesuai format yang didukung oleh script.

Jangan mengunggah file sesi, token, API key privat, atau database yang berisi data sensitif ke repository publik.

Contoh aturan `.gitignore` yang dapat disesuaikan:

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

Sesuaikan daftar tersebut dengan kebutuhan project. Jangan mengecualikan file yang memang diperlukan sebagai source code atau data contoh publik.

</details>

<details>
<summary><strong>3. Sistem plugin</strong></summary>

ELYRA menggunakan sistem plugin untuk memisahkan fitur dari sistem utama. Jika loader pada versi yang digunakan menerima format berikut, contoh plugin sederhana:

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

Contoh susunan folder plugin:

```text
plugins/
├── bot/
├── chanel/
├── grup/
├── konvert/
├── owner/
└── tools/
```

Ketentuan dasar:

- Ikuti format ekspor yang digunakan loader.
- Pastikan plugin memiliki `command` dan fungsi `execute` jika diwajibkan.
- Gunakan context serta API yang tersedia pada versi wrapper.
- Tangani error pada operasi yang berpotensi gagal.
- Hindari pekerjaan berat yang tidak diperlukan pada setiap pesan masuk.
- Jangan menaruh kredensial sensitif langsung di dalam plugin.

Struktur folder dan format plugin dapat berubah dalam pembaruan berikutnya.

</details>

<details>
<summary><strong>4. Contoh API dasar</strong></summary>

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

Contoh mengikuti pola API yang digunakan dalam script. Jika implementasi Zapo-JS atau wrapper berubah, periksa kembali API yang tersedia pada versi terpasang.

</details>

<details>
<summary><strong>5. Source code dan obfuscation</strong></summary>

Sebagian source code ERINE-AI • ELYRA di-obfuscate, sedangkan sebagian lainnya tetap dapat dibaca. Keputusan ini merupakan bagian dari pengelolaan project yang saat ini dikembangkan oleh satu developer.

Obfuscation digunakan untuk mempersulit pembacaan langsung pada bagian implementasi tertentu. Obfuscation bukan jaminan bahwa kode tidak dapat dianalisis dan tidak menggantikan praktik keamanan yang baik.

Harap menghormati proses pengembangan dan hak atas kode yang terdapat dalam project. Perubahan pada tingkat obfuscation maupun struktur internal dapat dilakukan sesuai kebutuhan pemeliharaan.

</details>

<details>
<summary><strong>6. API key dan dukungan project</strong></summary>

ELYRA dapat menggunakan API atau layanan eksternal untuk mendukung fitur tertentu. Ketersediaannya bergantung pada konfigurasi, kuota, status penyedia, dan kebijakan masing-masing layanan.

Kami berupaya menjaga integrasi API agar tetap berfungsi selama memungkinkan. Namun, layanan pihak ketiga dapat mengalami perubahan, gangguan, pembatasan, atau penghentian yang berada di luar kendali pengembang.

Jika ingin membantu biaya operasional API dan keberlanjutan pengembangan, dukungan dapat diberikan melalui Saweria:

<div align="center">

[![Dukung ELYRA melalui Saweria](https://img.shields.io/badge/Dukung_Project-Saweria-FFB000?style=for-the-badge)](https://saweria.co/LynxPreset)

**[saweria.co/LynxPreset](https://saweria.co/LynxPreset)**

</div>

Donasi bersifat sukarela dan tidak menjamin API key akan aktif selamanya, kuota tidak akan habis, atau seluruh fitur selalu tersedia tanpa gangguan.

</details>

<details>
<summary><strong>7. Troubleshooting</strong></summary>

**Plugin tidak terbaca**

Periksa lokasi file, ekstensi, sintaks JavaScript, format ekspor, serta properti yang diwajibkan loader. Lihat log terminal untuk mengetahui penyebab kegagalan saat plugin dimuat.

**Bot meminta autentikasi ulang**

Pastikan folder sesi tidak terhapus dan proses bot memiliki izin baca/tulis yang diperlukan. Periksa log koneksi untuk mengetahui apakah sesi tidak valid atau autentikasi gagal.

**FFmpeg tidak ditemukan**

```bash
ffmpeg -version
ffprobe -version
```

Pastikan keduanya tersedia melalui `PATH` jika diperlukan oleh fitur yang digunakan.

**API gagal digunakan**

Periksa API key, endpoint, koneksi internet, parameter request, kuota, dan status penyedia API. Jangan menyertakan API key privat ketika melaporkan masalah.

**Bot berhenti atau mengalami error**

Periksa log terminal, versi Node.js, dependensi, konfigurasi, dan plugin yang terakhir digunakan. Hapus informasi sensitif sebelum mengirim laporan error.

</details>

<details>
<summary><strong>8. Project sebelumnya</strong></summary>

Project berikut telah berhenti dikembangkan. Terima kasih kepada semua pengguna yang telah menjadi bagian dari perjalanannya.

- **ERINE-MD:** [github.com/Lynxcode-id/ERINE-MD](https://github.com/Lynxcode-id/ERINE-MD)
- **Li-Shiya MD:** [github.com/Lynxcode-id/Li-Shiya-MD](https://github.com/Lynxcode-id/Li-Shiya-MD)

Penghentian pengembangan tidak menghapus pengalaman dan kontribusi yang telah menjadi bagian dari perjalanan project tersebut.

</details>

<details>
<summary><strong>9. Ecosystem Lynx</strong></summary>

- **Portfolio:** [www.lynxdev.my.id](https://www.lynxdev.my.id/)
- **Lynx Snippets:** [lynxsnippets.web.id](https://lynxsnippets.web.id)
- **Lynx Snippets V2:** [lynxsnippets2.web.id](https://lynxsnippets2.web.id)
- **Lynx REST API:** [lynxapis.my.id](https://lynxapis.my.id)

</details>

<details>
<summary><strong>10. Channel dan komunitas</strong></summary>

- **API's:** [Channel WhatsApp](https://whatsapp.com/channel/0029VbCMzVqE50UZAnV44u05)
- **INF Code:** [Channel WhatsApp](https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X)
- **L-Store:** [Channel WhatsApp](https://whatsapp.com/channel/0029Vb6eyvOJUM2caRIktb2L)
- **GC Erine:** [Grup WhatsApp](https://chat.whatsapp.com/JlUNKqeRT8tAK4Nnqxxc51?s=cl&p=a&mlu=4&ilr=4)
- **GC Shiya:** [Grup WhatsApp](https://chat.whatsapp.com/CAT03E3YJNJ1RaLsUo1X80)

**Informasi grup:** Grup chat ERINE AI saat ini ditutup dan tidak menerima permintaan masuk secara terbuka. Grup Li Shiya ESM menjadi ruang diskusi publik yang tersedia melalui tautan di atas. Status akses grup dapat berubah.

**Etika komunitas**

- Admin mungkin membutuhkan waktu untuk membalas pesan.
- Jangan melakukan spam chat atau panggilan berulang. Aktivitas spam dapat memicu pemblokiran otomatis.
- Biasakan mengucapkan salam saat memulai percakapan.
- Hormati anggota lain dan jangan membagikan kredensial atau informasi pribadi di ruang publik.

</details>

<details>
<summary><strong>11. Kontak, sosial media, dan dukungan</strong></summary>

**Kontak**

- Bisnis: [WhatsApp Business](https://wa.me/6285143688664)
- Support: [WhatsApp Support](https://wa.me/6281362133135)
- Bot Telegram: [Lynx CPanel Bot](https://t.me/Lynxcpanel_bot)
- Telegram: `@Lynxmanuelz4`

**Sosial media**

- Instagram: `@lynxdecode_`
- YouTube: `@lynxdecode_`
- TikTok: `@olineonlyy_`

**Dukungan**

- Saweria: [saweria.co/LynxPreset](https://saweria.co/LynxPreset)
- NGL: [ngl.link/lynxdsinii](https://ngl.link/lynxdsinii)

</details>

<details>
<summary><strong>12. Jadibot gratis</strong></summary>

Layanan jadibot dapat digunakan secara gratis sesuai ketersediaan dan ketentuan yang berlaku.

1. Bergabung dengan grup komunitas yang menerima pengguna baru.
2. Ikuti aturan dan petunjuk komunitas.
3. Ketik `.jadibot` jika fitur tersedia pada grup terkait.

Kapasitas serta ketersediaan layanan dapat berubah sesuai kondisi operasional.

</details>

<details>
<summary><strong>13. Credits dan disclaimer</strong></summary>

**Teknologi dan dependensi**

- [Zapo-JS](https://github.com/vinikjkkj/zapo)
- [Base-Original](https://github.com/BangsulBotz/zapo-js)
- [@zapo-js/media-utils](https://www.npmjs.com/package/@zapo-js/media-utils)
- [@zapo-js/store-sqlite](https://www.npmjs.com/package/@zapo-js/store-sqlite)
- [better-sqlite3](https://www.npmjs.com/package/better-sqlite3)
- [sharp](https://www.npmjs.com/package/sharp)
- FFmpeg dan FFprobe

Terima kasih kepada pengguna, penguji, dan komunitas yang memberikan masukan selama pengembangan. Lisensi masing-masing dependensi tetap mengikuti pemiliknya.

**Disclaimer**

ERINE-AI • ELYRA adalah project independen untuk kebutuhan automasi dan pengembangan sistem bot. Project ini tidak berafiliasi dengan, tidak disponsori oleh, dan tidak didukung secara resmi oleh WhatsApp.

Zapo-JS merupakan dependensi terpisah. Nama, merek, dan hak atas setiap dependensi tetap menjadi milik pemegang hak masing-masing. Pengguna bertanggung jawab atas konfigurasi, keamanan kredensial, penggunaan API, dan aktivitas yang dijalankan melalui script.

</details>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:22d3ee,55:164e63,100:111827&height=115&section=footer&animation=fadeIn" width="100%" alt="Footer" />

**ERINE-AI • ELYRA**  
Developed by **Lynx decode — Arman Maulana**  
INF PROJECT TEAM · INF PROJECT'S · GENERAL DISTRICT

[Repository](https://github.com/Lynxcode-id/ERINE-AI) · [INF PROJECT](https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X) · [Support](https://saweria.co/LynxPreset)

*Build Smart System | Automate Everything*

</div>
