<!--
  ERINE-AI • ELYRA
  Developed by Lynx decode - Arman Maulaba
  INF PROJECT ECOSYSTEM
--><div align="center"><img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=28&duration=3000&pause=1000&color=78DCE8&center=true&vCenter=true&repeat=true&width=600&height=65&lines=ERINE-AI+%E2%80%A2+ELYRA;WhatsApp+Automation+System;Continuously+Growing+%E2%80%A2+INF+PROJECT" alt="ERINE-AI ELYRA" /><br><img src="https://img.shields.io/badge/ERINE--AI-ELYRA-78DCE8?style=for-the-badge&logo=probot&logoColor=white" alt="ERINE-AI ELYRA" />
<img src="https://img.shields.io/badge/JavaScript-ESM-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript ESM" />
<img src="https://img.shields.io/badge/WhatsApp-Automation-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp Automation" /><br><br>

A growing WhatsApp automation system built with Zapo-JS.

Bukan sekadar script bot, melainkan project yang terus berkembang bersama ekosistem INF PROJECT.

<br>"📡 INF PROJECT" (https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X) · "💻 GitHub" (https://github.com/Lynxcode-id) · "🌐 Lynx Dev" (https://www.lynxdev.my.id/) · "☕ Support Project" (https://saweria.co/LynxPreset)

<br><img src="https://capsule-render.vercel.app/api?type=rect&color=0:101820,50:173B4A,100:78DCE8&height=3&section=header" width="100%" alt="divider" /></div>✦ Tentang Project

ERINE-AI • ELYRA adalah script bot WhatsApp berbasis "Zapo-JS" (https://github.com/vinikjkkj/zapo) yang dikembangkan untuk menghadirkan sistem otomatisasi WhatsApp yang fleksibel, efisien, dan dapat terus diperluas.

Project ini telah berkembang melampaui konsep base bot sederhana. ELYRA merupakan script bot yang memiliki sistem, fitur, dan struktur pengembangannya sendiri, dengan fokus pada pengembangan berkelanjutan.

Dikembangkan secara mandiri oleh Lynx decode — Arman Maulaba, ELYRA menjadi bagian dari perjalanan pengembangan sistem bot, AI, dan automasi dalam ekosistem INF PROJECT.

«⚡ Project ini masih dalam tahap pengembangan. Fitur, struktur, dan sistem internal dapat berubah seiring proses pengembangan dan pembaruan.»

Informasi Project

Informasi| Detail
Nama project| ERINE-AI • ELYRA
Developer| Lynx decode — Arman Maulaba
Tim & komunitas| INF PROJECT TEAM
Ekosistem| INF PROJECT & GENERAL DISTRICT
Runtime| Node.js
Bahasa utama| JavaScript (ES Modules)
Library WhatsApp| Zapo-JS
Status| Aktif dikembangkan
Kontribusi| Dukungan, laporan bug, dan masukan

---

✦ Development Philosophy

ELYRA dikembangkan dengan prinsip bahwa sebuah sistem tidak harus langsung sempurna untuk terus berkembang.

Setiap pembaruan menjadi bagian dari proses membangun script yang lebih baik, baik dari segi performa, stabilitas, struktur kode, maupun pengalaman penggunaan.

- Continuous Development — pengembangan dilakukan secara bertahap sesuai kebutuhan dan prioritas.
- Efficiency First — mengutamakan penggunaan resource yang wajar dan menghindari proses yang tidak diperlukan.
- Modular Architecture — memisahkan fungsi ke dalam modul dan plugin agar lebih mudah dikelola.
- Stability & Reliability — memperbaiki bug dan menjaga kestabilan sistem berdasarkan hasil pengujian.
- Flexible Integration — menyediakan ruang untuk pengembangan fitur baru dan integrasi API.
- Long-Term Vision — membangun fondasi yang dapat dikembangkan lebih jauh, bukan hanya mengejar banyaknya fitur.

✦ Fitur & Sistem

ELYRA menggunakan sistem modular untuk memudahkan penambahan dan pemeliharaan fitur.

Beberapa komponen yang tersedia dalam struktur project meliputi:

- Plugin System — pengelolaan perintah, alias, kategori, dan eksekusi fitur.
- Plugin Reloading — mendukung pemuatan ulang plugin tanpa harus selalu melakukan restart penuh.
- Session Management — penyimpanan sesi menggunakan SQLite.
- Message Handler — pemrosesan pesan masuk dan pengelolaan perintah.
- Connection Handler — pengelolaan peristiwa koneksi bot.
- Group Event Handler — penanganan peristiwa yang berkaitan dengan grup.
- Media Support — dukungan pengiriman media sesuai kemampuan wrapper dan konfigurasi.
- Reaction Support — pengiriman reaction pada pesan.
- Database Integration — penyimpanan data untuk kebutuhan sistem dan plugin.
- Custom Nodes — dukungan ekstensi pengiriman pesan melalui patch tertentu.
- Plugin Error Isolation — penanganan kesalahan plugin agar kegagalan satu fitur tidak selalu menghentikan keseluruhan bot.

«Ketersediaan dan perilaku fitur mengikuti versi script, konfigurasi, dependensi, dan layanan yang digunakan.»

---

✦ Tech Stack

<div align="center"><img src="https://skillicons.dev/icons?i=nodejs,javascript,sqlite,npm,git,github&theme=dark" alt="Technology Stack" /></div>Teknologi| Penggunaan
Node.js| Runtime JavaScript
JavaScript ESM| Sistem modul project
Zapo-JS| Integrasi WhatsApp
SQLite| Penyimpanan sesi dan data tertentu
FFmpeg| Pemrosesan media yang memerlukannya
npm| Manajemen dependensi
Git & GitHub| Version control dan repository

---

✦ Installation

1. Persyaratan

Pastikan perangkat atau server telah menyediakan:

- Node.js 20 atau lebih baru, sesuai kompatibilitas dependensi.
- npm.
- FFmpeg dan FFprobe untuk fitur media yang memerlukannya.
- Koneksi internet.
- Terminal yang mendukung tampilan QR code.

2. Clone Repository

git clone https://github.com/Lynxcode-id/ERINE-AI.git
cd ERINE-AI

3. Install Dependencies

npm install

Jika konfigurasi package menjalankan "patch.js" melalui script "postinstall", proses patch akan berjalan otomatis selama instalasi berhasil.

4. Konfigurasi

Periksa file konfigurasi project, termasuk "settings.js" jika tersedia.

Sesuaikan pengaturan yang diperlukan, seperti:

- Prefix perintah.
- Nomor owner.
- Pengaturan bot.
- API key dan endpoint layanan eksternal.
- Konfigurasi fitur yang membutuhkan kredensial.

Gunakan format konfigurasi yang memang didukung oleh versi script yang sedang digunakan.

5. Jalankan Bot

npm start

Jika script start pada "package.json" menggunakan entry point yang berbeda, ikuti konfigurasi repository tersebut.

Saat pertama kali dijalankan, ikuti instruksi autentikasi yang muncul di terminal.

«⚠️ Jangan membagikan QR autentikasi, kredensial, API key privat, database sensitif, atau data sesi kepada pihak lain.»

---

✦ Plugin Development

ELYRA menggunakan sistem plugin untuk memisahkan fitur dari sistem utama.

Jika struktur dan format plugin masih mengikuti implementasi Zapo-JS yang digunakan project, contoh plugin sederhana dapat ditulis seperti berikut:

export default {
  command: 'halo',
  alias: ['hi'],
  category: 'bot',
  description: 'Menyapa pengguna',

  async execute(m) {
    await m.reply(`Halo ${m.pushName || 'kak'}!`)
  }
}

Simpan plugin pada folder kategori yang sesuai dengan struktur repository.

Contoh struktur plugin:

plugins/
├── bot/
├── chanel/
├── grup/
├── konvert/
├── owner/
└── tools/

Struktur folder dapat berubah mengikuti pembaruan project.

Prinsip Membuat Plugin

- Gunakan "export default" jika sistem loader mengharuskannya.
- Pastikan plugin memiliki properti "command" dan fungsi "execute".
- Gunakan API yang tersedia pada versi Zapo-JS dan wrapper project.
- Hindari proses berat yang tidak diperlukan pada setiap pesan masuk.
- Tangani error agar kegagalan fitur lebih mudah ditelusuri.
- Jangan menyimpan kredensial privat secara langsung di dalam plugin.

Contoh API

Reply pesan:

await m.reply('Halo dunia!')

Mengirim pesan:

await sock.message.send(m.chat, 'Halo dunia!')

Reaction:

await sock.sendReact(m.chat, '👍', m.id)

Contoh di atas mengikuti pola API yang digunakan dalam project. Periksa implementasi aktual jika terjadi perubahan pada versi library.

---

✦ Source Code & Obfuscation

Sebagian kode sumber ERINE-AI • ELYRA sengaja di-obfuscate, sedangkan bagian lainnya tetap tersedia dalam bentuk kode yang dapat dibaca.

Keputusan ini diambil sebagai bagian dari pengelolaan source code project yang saat ini dikembangkan secara mandiri oleh satu developer.

Obfuscation digunakan untuk mempersulit pembacaan langsung pada bagian kode tertentu, terutama bagian yang dianggap perlu dilindungi. Pendekatan ini bukan berarti seluruh kode tertutup, dan bukan pula jaminan bahwa kode tidak dapat dianalisis.

Mengapa Tidak Semua Kode Dibuka?

- Menjaga bagian tertentu dari implementasi internal.
- Mengurangi kemudahan penyalinan langsung pada bagian kode tertentu.
- Memberikan ruang bagi developer untuk mengelola source code sesuai kebutuhan project.
- Memungkinkan bagian yang perlu dipelajari, diperiksa, atau dikembangkan tetap disajikan dalam bentuk yang terbaca.

ELYRA tetap merupakan project yang dikembangkan secara bertahap. Susunan kode, tingkat obfuscation, dan pembagian modul dapat berubah sewaktu-waktu.

Harap menghormati proses pengembangan dan hak atas kode yang terdapat di dalam project.

---

✦ API Key & Project Support

ELYRA dapat menggunakan API dan layanan eksternal untuk mendukung fitur tertentu. Ketersediaan fitur tersebut dapat bergantung pada penyedia API, kuota, kebijakan layanan, serta konfigurasi yang digunakan.

Kami berupaya menjaga integrasi API agar tetap dapat digunakan selama layanan terkait masih tersedia dan pengelolaannya memungkinkan.

Namun, tidak ada jaminan bahwa seluruh API key akan aktif selamanya. API eksternal dapat mengalami perubahan, pembatasan kuota, penghentian layanan, atau penyesuaian kebijakan dari penyedianya.

☕ Dukung Keberlanjutan Project

Jika ingin membantu menjaga keberlangsungan pengembangan ELYRA dan mendukung kebutuhan layanan API, silakan berdonasi melalui:

<div align="center"><a href="https://saweria.co/LynxPreset">
  <img src="https://img.shields.io/badge/☕_DONATE-Saweria-FFB000?style=for-the-badge" alt="Donasi melalui Saweria" />
</a>Saweria: "saweria.co/LynxPreset" (https://saweria.co/LynxPreset)

Setiap dukungan membantu pengembangan, pemeliharaan, dan kebutuhan layanan project.

</div>Donasi bersifat sukarela. Donasi bukan jaminan bahwa suatu API akan selalu aktif, kuota tidak akan habis, atau semua fitur akan tersedia tanpa gangguan.

---

✦ Security & Privacy

Keamanan konfigurasi merupakan bagian penting dalam penggunaan script bot.

Perhatikan hal-hal berikut:

- Jangan mengunggah folder "session/" atau kredensial autentikasi ke repository publik.
- Jangan membagikan API key privat.
- Jangan mengunggah database yang mengandung informasi sensitif.
- Gunakan ".gitignore" untuk mengecualikan file lokal yang bersifat rahasia.
- Periksa dependensi dan konfigurasi sebelum menjalankan script pada server.
- Gunakan API sesuai kebijakan penyedia layanan.
- Lakukan pencadangan data secara berkala sesuai kebutuhan.

Contoh entri ".gitignore" yang dapat disesuaikan dengan struktur project:

node_modules/
session/
auth/
.env
.env.*
*.db
*.sqlite
*.sqlite3
npm-debug.log*

Catatan: sesuaikan daftar tersebut dengan kebutuhan repository. Jangan mengecualikan file database yang memang sengaja digunakan sebagai bagian dari source code atau fixture publik.

---

✦ Troubleshooting

<details>
<summary><b>Plugin tidak terbaca</b></summary>Periksa hal-hal berikut:

- Lokasi plugin sesuai dengan struktur folder.
- Ekstensi file sesuai dengan format yang didukung.
- Sintaks JavaScript valid.
- Format ekspor sesuai dengan sistem loader.
- Properti "command" dan fungsi "execute" tersedia jika diwajibkan.
- Tidak ada error saat plugin dimuat.

</details><details>
<summary><b>Bot meminta autentikasi ulang</b></summary>Pastikan folder sesi tidak terhapus, lokasi penyimpanan benar, dan proses bot memiliki izin baca/tulis yang diperlukan.

Periksa juga log koneksi untuk mengetahui apakah autentikasi gagal atau sesi memang sudah tidak valid.

</details><details>
<summary><b>FFmpeg tidak ditemukan</b></summary>Periksa instalasi FFmpeg dan FFprobe:

ffmpeg -version
ffprobe -version

Pastikan keduanya dapat diakses melalui "PATH" apabila fitur yang digunakan memerlukannya.

</details><details>
<summary><b>API gagal digunakan</b></summary>Periksa:

- API key dan konfigurasi endpoint.
- Koneksi internet.
- Status layanan penyedia API.
- Batas penggunaan dan kuota.
- Format parameter request.
- Pesan error yang dikembalikan oleh server.

API yang dikelola pihak eksternal dapat mengalami gangguan di luar kendali project.

</details><details>
<summary><b>Bot berhenti atau mengalami error</b></summary>Periksa log terminal, kompatibilitas Node.js, dependensi, konfigurasi, dan plugin yang terakhir digunakan.

Jika ingin melaporkan masalah, sertakan pesan error yang relevan tanpa membagikan kredensial, API key privat, atau informasi autentikasi.

</details>---

✦ SELAMAT DATANG DI INF PROJECT

<div align="center"><img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=20&duration=3500&pause=1200&color=78DCE8&center=true&vCenter=true&repeat=true&width=500&height=45&lines=Automation+%E2%80%A2+WhatsApp+Bot+%E2%80%A2+AI+Project;Explore.+Share.+Develop.;Build+Smart+System+%7C+Automate+Everything" alt="INF PROJECT" />Automation • WhatsApp Bot • AI Project

Terima kasih atas dukungannya!

Tempat eksplorasi, berbagi, dan mengembangkan sistem bot serta teknologi automasi. INF PROJECT menjadi bagian dari perjalanan pengembangan berbagai project, layanan, dan komunitas yang terus bertumbuh.

</div>---

📂 Project & Repository

GitHub Organization/Developer: Lynxcode-id

Beberapa project berikut telah berhenti dikembangkan. Terima kasih kepada semua pengguna yang telah menjadi bagian dari perjalanan tersebut.

Project| Repository| Status
ERINE-MD| "Lihat Repository" (https://github.com/Lynxcode-id/ERINE-MD)| Pengembangan dihentikan
Li-Shiya MD| "Lihat Repository" (https://github.com/Lynxcode-id/Li-Shiya-MD)| Pengembangan dihentikan

Penghentian pengembangan pada project tersebut tidak menghapus kontribusi dan pengalaman yang telah menjadi bagian dari perjalanan INF PROJECT.

---

📡 Ecosystem Lynx

Jelajahi layanan dan platform dalam ekosistem Lynx.

Platform| Deskripsi| Link
Portfolio| Profil dan informasi project| "lynxdev.my.id" (https://www.lynxdev.my.id/)
Lynx Snippets| Platform berbagi snippets| "lynxsnippets.web.id" (https://lynxsnippets.web.id)
Lynx Snippets V2| Platform snippets versi kedua| "lynxsnippets2.web.id" (https://lynxsnippets2.web.id)
Lynx REST API| Layanan API| "lynxapis.my.id" (https://lynxapis.my.id)

---

📣 Channel & Community

Ikuti channel dan komunitas untuk mendapatkan informasi, berbagi perkembangan, serta mengikuti pembaruan dari ekosistem INF PROJECT.

Nama| Akses
API's| "Channel WhatsApp" (https://whatsapp.com/channel/0029VbCMzVqE50UZAnV44u05)
INF Code| "Channel WhatsApp" (https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X)
L-Store| "Channel WhatsApp" (https://whatsapp.com/channel/0029Vb6eyvOJUM2caRIktb2L)
GC Erine| "Grup WhatsApp" (https://chat.whatsapp.com/JlUNKqeRT8tAK4Nnqxxc51?s=cl&p=a&mlu=4&ilr=4)
GC Shiya| "Grup WhatsApp" (https://chat.whatsapp.com/CAT03E3YJNJ1RaLsUo1X80)

🏷 Informasi Grup

Saat ini, grup chat ERINE AI ditutup dan tidak menerima permintaan masuk secara terbuka.

Untuk komunitas publik, grup Li Shiya ESM menjadi ruang diskusi yang tersedia. Pastikan untuk memeriksa status grup melalui tautan yang disediakan.

---

🌐 Connect & Socials

Untuk keperluan bisnis, dukungan, dan informasi lebih lanjut, silakan gunakan kontak berikut.

Kebutuhan| Kontak
Bisnis| "WhatsApp Business" (https://wa.me/6285143688664)
Support| "WhatsApp Support" (https://wa.me/6281362133135)
Bot Telegram| "Lynx CPanel Bot" (https://t.me/Lynxcpanel_bot)
Telegram| "@Lynxmanuelz4"
Instagram| "@lynxdecode_"
YouTube| "@lynxdecode_"
TikTok| "@olineonlyy_"

---

☕ Support Us

Dukungan dari pengguna membantu menjaga semangat pengembangan dan mendukung kebutuhan operasional project.

<div align="center"><a href="https://saweria.co/LynxPreset">
  <img src="https://img.shields.io/badge/SAWERIA-Support_Project-FFB000?style=for-the-badge" alt="Saweria" />
</a><a href="https://ngl.link/lynxdsinii">
  <img src="https://img.shields.io/badge/NGL-Send_a_Message-8A2BE2?style=for-the-badge" alt="NGL" />
</a><br><br>

Saweria: "saweria.co/LynxPreset" (https://saweria.co/LynxPreset)

NGL: "ngl.link/lynxdsinii" (https://ngl.link/lynxdsinii)

</div>---

🪄 Jadibot Clone — 100% Free

Ingin mencoba menjadi bot menggunakan layanan jadibot yang tersedia?

1. Bergabunglah dengan grup komunitas yang menerima pengguna baru.
2. Baca aturan dan petunjuk yang tersedia.
3. Ketik perintah ".jadibot" jika fitur tersebut tersedia dan diizinkan dalam grup.

Layanan ini ditujukan untuk penggunaan gratis sesuai ketentuan yang berlaku. Ketersediaan layanan, kapasitas, dan fitur dapat berubah sewaktu-waktu.

---

⚠️ Notes & Community Guidelines

Untuk menjaga komunikasi yang nyaman dan tertib:

- Admin mungkin membutuhkan waktu untuk membalas pesan.
- Hindari spam chat atau panggilan berulang. Aktivitas spam dapat memicu pemblokiran otomatis.
- Budayakan mengucapkan salam saat memulai percakapan.
- Gunakan layanan dan bot secara bertanggung jawab.
- Hormati pengguna lain dan aturan komunitas.
- Jangan membagikan informasi pribadi atau kredensial sensitif di grup publik.

Terima kasih telah ikut menjaga ekosistem INF PROJECT tetap nyaman bagi semua orang.

---

✦ Credits & Acknowledgements

ELYRA dibangun dengan memanfaatkan berbagai teknologi dan dependensi, termasuk:

- "Zapo-JS" (https://github.com/vinikjkkj/zapo)
- "@zapo-js/media-utils" (https://www.npmjs.com/package/@zapo-js/media-utils)
- "@zapo-js/store-sqlite" (https://www.npmjs.com/package/@zapo-js/store-sqlite)
- "better-sqlite3" (https://www.npmjs.com/package/better-sqlite3)
- "sharp" (https://www.npmjs.com/package/sharp)
- FFmpeg & FFprobe
- Kontributor, pengguna, dan komunitas yang telah memberikan masukan selama perjalanan pengembangan.

Hak cipta dan ketentuan lisensi masing-masing dependensi tetap mengikuti pemilik serta lisensinya.

---

✦ Disclaimer

ERINE-AI • ELYRA merupakan project independen yang dikembangkan untuk kebutuhan otomatisasi, eksperimen teknis, dan pengembangan sistem bot.

Project ini tidak berafiliasi dengan, tidak disponsori oleh, dan tidak didukung secara resmi oleh WhatsApp.

Zapo-JS merupakan dependensi terpisah yang digunakan oleh project ini. Nama, merek, dan hak atas dependensi tersebut tetap menjadi milik pemegang hak masing-masing.

Pengguna bertanggung jawab atas konfigurasi, penggunaan API, keamanan kredensial, dan aktivitas yang dijalankan melalui script.

Perubahan internal, ketersediaan layanan eksternal, serta dukungan terhadap versi tertentu tidak dijamin selalu sama sepanjang waktu.

---

<div align="center"><img src="https://capsule-render.vercel.app/api?type=waving&color=0:78DCE8,50:173B4A,100:101820&height=120&section=footer" width="100%" alt="Footer" />⚡ Build Smart System | Automate Everything

ERINE-AI • ELYRA

Developed by Lynx decode — Arman Maulaba

INF PROJECT TEAM · INF PROJECT'S · GENERAL DISTRICT

<br><img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=14&duration=4000&pause=1000&color=78DCE8&center=true&vCenter=true&repeat=true&width=440&height=30&lines=Thank+you+for+supporting+the+project.;More+ideas.+More+development.+More+possibilities." alt="Thank You" />Aktifkan notifikasi repository dan channel untuk mengikuti perkembangan ekosistem INF PROJECT.

</div>
