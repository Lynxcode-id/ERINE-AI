<div align="center">ERINE-AI • ELYRA

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=20&duration=3000&pause=1000&color=78DCE8&center=true&vCenter=true&repeat=true&width=500&height=35&lines=WhatsApp+Automation+System;Built+to+Grow.;Powered+by+INF+PROJECT" alt="ERINE-AI ELYRA" />WhatsApp Automation • Plugin System • Continuous Development

Script bot WhatsApp berbasis Zapo-JS yang dikembangkan secara mandiri dan akan terus diperbarui.

"Repository" (https://github.com/Lynxcode-id/ERINE-AI) · "INF PROJECT" (https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X) · "Portfolio" (https://www.lynxdev.my.id/) · "Support Project" (https://saweria.co/LynxPreset)

<br><img src="https://img.shields.io/badge/Status-Active_Development-2ea44f?style=flat-square" alt="Status" />
<img src="https://img.shields.io/badge/Runtime-Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
<img src="https://img.shields.io/badge/Language-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
<img src="https://img.shields.io/badge/Library-Zapo--JS-78DCE8?style=flat-square" alt="Zapo-JS" /></div>---

Tentang Project

ERINE-AI • ELYRA adalah script bot WhatsApp berbasis "Zapo-JS" (https://github.com/vinikjkkj/zapo) yang dirancang untuk kebutuhan otomatisasi, pengembangan fitur, dan integrasi layanan eksternal.

ELYRA bukan lagi sekadar base bot. Project ini merupakan script yang memiliki sistem, struktur, dan fitur pengembangan tersendiri. Saat ini, pengembangannya masih berjalan dan akan terus disesuaikan berdasarkan kebutuhan, evaluasi, serta ketersediaan sumber daya.

Project ini dikembangkan secara mandiri oleh Lynx decode — Arman Maulaba dan menjadi bagian dari ekosistem INF PROJECT.

Kami mengutamakan pengembangan bertahap, efisiensi sistem, kemudahan pemeliharaan, dan kestabilan penggunaan. Tidak semua fitur harus tersedia sekaligus, tetapi setiap pengembangan diharapkan memiliki tujuan yang jelas.

«Status: Dalam pengembangan aktif. Struktur internal, fitur, dependensi, dan konfigurasi dapat berubah pada pembaruan berikutnya.»

Informasi Project

Informasi| Keterangan
Nama| ERINE-AI • ELYRA
Developer| Lynx decode — Arman Maulaba
Tim dan komunitas| INF PROJECT TEAM
Ekosistem| INF PROJECT'S & GENERAL DISTRICT
Bahasa utama| JavaScript (ES Modules)
Runtime| Node.js
Library WhatsApp| Zapo-JS
Repository| "Lynxcode-id/ERINE-AI" (https://github.com/Lynxcode-id/ERINE-AI)
Status pengembangan| Aktif

Kelebihan ELYRA

ELYRA dikembangkan dengan mempertimbangkan kebutuhan penggunaan jangka panjang. Fokusnya bukan sekadar menambah banyak perintah, tetapi membangun sistem yang dapat dipelihara dan diperluas.

1. Sistem plugin modular

Fitur dikelompokkan ke dalam plugin sehingga pengembangan atau perbaikan sebuah fitur dapat dilakukan tanpa harus menulis ulang seluruh sistem utama.

2. Pengelolaan plugin yang fleksibel

Sistem mendukung pemuatan ulang plugin tanpa selalu mengharuskan restart penuh. Hal ini membantu proses pemeliharaan selama pengembangan.

3. Penggunaan resource yang efisien

Struktur sistem dirancang agar proses yang tidak diperlukan dapat diminimalkan. Penggunaan resource tetap bergantung pada jumlah fitur aktif, dependensi, konfigurasi, dan beban server.

4. Penyimpanan berbasis SQLite

SQLite digunakan untuk kebutuhan penyimpanan tertentu, termasuk sesi. Pendekatan ini mengurangi kebutuhan menjalankan server database terpisah untuk kebutuhan yang dapat ditangani secara lokal.

5. Isolasi kesalahan plugin

Penanganan error pada tingkat plugin membantu membatasi dampak kegagalan sebuah fitur sehingga tidak setiap error plugin harus menghentikan keseluruhan bot.

6. Dukungan media dan pesan

Melalui wrapper yang digunakan, script dapat memanfaatkan kemampuan pengiriman pesan, media, reaction, voice note, thumbnail, dan kebutuhan lain yang didukung oleh implementasi terkait.

7. Dapat dikembangkan lebih lanjut

Struktur modul, sistem plugin, database, dan handler memberikan ruang untuk penambahan fitur serta integrasi layanan eksternal.

8. Pengembangan berkelanjutan

ELYRA tidak menganggap versi saat ini sebagai hasil akhir. Perbaikan bug, peningkatan stabilitas, dan pengembangan fitur dilakukan secara bertahap sesuai prioritas.

«Kelebihan di atas menjelaskan tujuan desain dan kemampuan sistem. Performa aktual tetap dipengaruhi oleh perangkat, server, koneksi, konfigurasi, serta versi dependensi yang digunakan.»

Fitur dan Sistem

Komponen utama yang terdapat dalam struktur project meliputi:

Komponen| Fungsi
Plugin System| Pengelolaan command, alias, kategori, dan eksekusi fitur
Plugin Reloading| Pemuatan ulang plugin tanpa selalu melakukan restart penuh
Message Handler| Pemrosesan pesan dan perintah
Connection Handler| Penanganan peristiwa koneksi
Group Event Handler| Penanganan peristiwa grup
SQLite Session| Penyimpanan sesi menggunakan SQLite
Database Integration| Penyimpanan data sesuai kebutuhan sistem
Media Support| Pengolahan dan pengiriman media yang didukung
Reaction Support| Pengiriman reaction pada pesan
Custom Nodes| Ekstensi pengiriman pesan melalui patch tertentu
Error Handling| Penanganan kesalahan agar kegagalan lebih mudah ditelusuri

Ketersediaan setiap kemampuan mengikuti versi script dan dependensi yang digunakan. Dokumentasi ini tidak menjamin seluruh fitur eksternal akan selalu tersedia tanpa gangguan.

Teknologi

ELYRA memanfaatkan beberapa teknologi dan dependensi untuk menjalankan sistemnya.

Teknologi| Kegunaan
Node.js| Runtime JavaScript
JavaScript ESM| Sistem modul
Zapo-JS| Integrasi WhatsApp
SQLite| Penyimpanan sesi dan data tertentu
npm| Pengelolaan dependensi
FFmpeg| Pemrosesan media yang memerlukannya
Git dan GitHub| Version control dan pengelolaan repository

Instalasi

Persyaratan

Sebelum menjalankan script, pastikan lingkungan yang digunakan memiliki:

- Node.js 20 atau lebih baru, dengan mempertimbangkan kompatibilitas dependensi.
- npm.
- FFmpeg dan FFprobe untuk fitur yang memerlukannya.
- Koneksi internet.
- Terminal yang mendukung tampilan QR code jika autentikasi menggunakan QR.

1. Clone repository

git clone https://github.com/Lynxcode-id/ERINE-AI.git
cd ERINE-AI

2. Install dependensi

npm install

Jika "package.json" mengatur "postinstall" untuk menjalankan "patch.js", proses tersebut akan berjalan sesuai konfigurasi package.

3. Atur konfigurasi

Periksa file konfigurasi yang tersedia di repository, termasuk "settings.js" apabila digunakan oleh versi script tersebut.

Sesuaikan konfigurasi yang diperlukan, seperti nomor owner, prefix, pengaturan sistem, API key, dan layanan eksternal.

Gunakan format yang sesuai dengan implementasi aktual. Jangan menambahkan konfigurasi berdasarkan contoh yang tidak didukung oleh versi script yang digunakan.

4. Jalankan bot

npm start

Ikuti instruksi autentikasi yang ditampilkan di terminal.

Nama file utama dan perintah start mengikuti konfigurasi "package.json" pada repository.

«Penting: Jangan membagikan QR autentikasi, kredensial, file sesi, database sensitif, atau API key privat.»

Pengembangan Plugin

ELYRA menggunakan sistem plugin untuk memisahkan fitur berdasarkan fungsi dan kategori.

Apabila loader pada versi yang digunakan menerima format plugin seperti berikut, plugin sederhana dapat dibuat dengan contoh ini:

export default {
  command: 'halo',
  alias: ['hi'],
  category: 'bot',
  description: 'Menyapa pengguna',

  async execute(m) {
    await m.reply(`Halo ${m.pushName || 'kak'}!`)
  }
}

Simpan file pada folder kategori yang sesuai dengan struktur repository.

Contoh struktur folder:

plugins/
├── bot/
├── chanel/
├── grup/
├── konvert/
├── owner/
└── tools/

Struktur tersebut merupakan contoh berdasarkan susunan yang digunakan dalam project dan dapat berubah seiring pengembangan.

Ketentuan dasar

- Gunakan "export default" jika diwajibkan oleh loader.
- Pastikan plugin memiliki "command" dan fungsi "execute".
- Ikuti format context dan API dari wrapper yang digunakan.
- Tangani error pada proses yang berpotensi gagal.
- Hindari pekerjaan berat yang tidak perlu pada setiap pesan masuk.
- Jangan menyimpan kredensial sensitif langsung di dalam plugin.

Contoh API

Reply pesan

await m.reply('Halo dunia!')

Mengirim pesan

await sock.message.send(m.chat, 'Halo dunia!')

Mengirim reaction

await sock.sendReact(m.chat, '👍', m.id)

Contoh tersebut mengikuti pola API yang digunakan dalam script. Periksa implementasi aktual apabila ada perubahan pada versi Zapo-JS atau wrapper.

Source Code dan Obfuscation

Sebagian kode sumber ERINE-AI • ELYRA menggunakan obfuscation, sementara bagian lainnya tetap tersedia dalam bentuk kode yang dapat dibaca.

Keputusan ini diambil sebagai bagian dari pengelolaan source code project yang saat ini dikembangkan secara mandiri oleh satu developer.

Obfuscation diterapkan pada bagian tertentu untuk mempersulit pembacaan langsung dan penyalinan implementasi internal. Pendekatan ini bukan jaminan bahwa kode tidak dapat dianalisis.

Kami memahami bahwa keterbacaan kode penting untuk pemeliharaan. Namun, tidak semua bagian source code harus dibuka sepenuhnya apabila ada pertimbangan pengelolaan dan perlindungan implementasi.

Pengguna diharapkan menghormati struktur, ketentuan penggunaan, dan hak atas kode yang terdapat di dalam repository.

API Key dan Dukungan Project

ELYRA dapat menggunakan API atau layanan eksternal untuk mendukung sejumlah fitur. Ketersediaan fitur tersebut bergantung pada konfigurasi, kuota, status penyedia, dan kebijakan masing-masing layanan.

Kami berupaya menjaga integrasi API yang digunakan agar tetap berfungsi selama memungkinkan. Namun, API pihak ketiga dapat mengalami perubahan, pembatasan, gangguan, atau penghentian layanan yang berada di luar kendali pengembang.

Dukungan untuk Keberlanjutan API

Bagi pengguna yang ingin membantu menjaga layanan API dan mendukung pengembangan ELYRA, donasi dapat dilakukan melalui Saweria.

<div align="center">""Dukung ELYRA" (https://img.shields.io/badge/SUPPORT_PROJECT-Saweria-FFB000?style=for-the-badge)" (https://saweria.co/LynxPreset)

"saweria.co/LynxPreset" (https://saweria.co/LynxPreset)

Dukungan Anda membantu kebutuhan operasional API dan pengembangan project.

</div>Donasi bersifat sukarela. Dukungan finansial membantu kebutuhan operasional, tetapi tidak menjamin semua API key akan aktif selamanya atau seluruh fitur selalu tersedia tanpa gangguan.

Keamanan dan Privasi

Pengguna bertanggung jawab menjaga keamanan konfigurasi dan data yang digunakan oleh bot.

Beberapa hal yang perlu diperhatikan:

- Jangan mengunggah kredensial autentikasi atau folder sesi ke repository publik.
- Jangan membagikan API key privat.
- Jangan mengunggah database yang mengandung informasi sensitif.
- Gunakan ".gitignore" untuk mengecualikan file yang bersifat rahasia.
- Periksa dependensi dan konfigurasi sebelum menjalankan script pada server.
- Gunakan API sesuai ketentuan penyedia layanan.
- Lakukan pencadangan data secara berkala sesuai kebutuhan.

Contoh ".gitignore" yang dapat disesuaikan:

node_modules/
session/
auth/
.env
.env.*
*.db
*.sqlite
*.sqlite3
npm-debug.log*

Sesuaikan daftar tersebut dengan kebutuhan repository. Jangan mengecualikan file yang memang diperlukan sebagai bagian dari source code atau data contoh publik.

Troubleshooting

<details>
<summary><b>Plugin tidak terbaca</b></summary>Periksa lokasi file, ekstensi, format ekspor, sintaks JavaScript, serta properti yang diwajibkan oleh loader. Lihat log terminal untuk mengetahui penyebab kegagalan saat plugin dimuat.

</details><details>
<summary><b>Bot meminta autentikasi ulang</b></summary>Pastikan folder sesi tidak terhapus dan proses bot memiliki izin baca/tulis yang diperlukan. Periksa juga log koneksi untuk mengetahui apakah sesi tidak valid atau autentikasi gagal.

</details><details>
<summary><b>FFmpeg tidak ditemukan</b></summary>Periksa instalasi FFmpeg dan FFprobe:

ffmpeg -version
ffprobe -version

Pastikan keduanya tersedia melalui "PATH" apabila diperlukan oleh fitur yang digunakan.

</details><details>
<summary><b>API gagal digunakan</b></summary>Periksa API key, endpoint, koneksi internet, parameter request, kuota, serta status layanan penyedia API. Jangan mengirimkan API key privat ketika melaporkan masalah.

</details><details>
<summary><b>Bot berhenti atau mengalami error</b></summary>Periksa log terminal, versi Node.js, dependensi, konfigurasi, dan plugin yang terakhir digunakan. Sertakan pesan error yang relevan apabila melaporkan masalah, tetapi hapus informasi sensitif terlebih dahulu.

</details>---

SELAMAT DATANG DI INF PROJECT

<div align="center">Automation • WhatsApp Bot • AI Project

Terima kasih atas dukungannya.

INF PROJECT merupakan tempat untuk mengeksplorasi, berbagi, dan mengembangkan sistem bot serta teknologi automasi. Melalui berbagai project dan komunitas, kami berupaya membangun ekosistem pengembangan yang terus bertumbuh.

</div>Project dan Repository

GitHub: Lynxcode-id

Project berikut telah berhenti dikembangkan. Terima kasih kepada semua pengguna yang telah menjadi bagian dari perjalanan tersebut.

Project| Repository| Status
ERINE-MD| "Lynxcode-id/ERINE-MD" (https://github.com/Lynxcode-id/ERINE-MD)| Pengembangan dihentikan
Li-Shiya MD| "Lynxcode-id/Li-Shiya-MD" (https://github.com/Lynxcode-id/Li-Shiya-MD)| Pengembangan dihentikan

Penghentian pengembangan tidak menghapus pengalaman dan kontribusi yang telah menjadi bagian dari perjalanan project tersebut.

Ecosystem Lynx

Platform| Keterangan| Akses
Portfolio| Profil dan project| "lynxdev.my.id" (https://www.lynxdev.my.id/)
Lynx Snippets| Berbagi snippets| "lynxsnippets.web.id" (https://lynxsnippets.web.id)
Lynx Snippets V2| Platform snippets versi kedua| "lynxsnippets2.web.id" (https://lynxsnippets2.web.id)
Lynx REST API| Layanan API| "lynxapis.my.id" (https://lynxapis.my.id)

Channel dan Komunitas

Nama| Jenis| Akses
API's| Channel WhatsApp| "Buka Channel" (https://whatsapp.com/channel/0029VbCMzVqE50UZAnV44u05)
INF Code| Channel WhatsApp| "Buka Channel" (https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X)
L-Store| Channel WhatsApp| "Buka Channel" (https://whatsapp.com/channel/0029Vb6eyvOJUM2caRIktb2L)
GC Erine| Grup WhatsApp| "Buka Grup" (https://chat.whatsapp.com/JlUNKqeRT8tAK4Nnqxxc51?s=cl&p=a&mlu=4&ilr=4)
GC Shiya| Grup WhatsApp| "Buka Grup" (https://chat.whatsapp.com/CAT03E3YJNJ1RaLsUo1X80)

Informasi grup: Grup chat ERINE AI saat ini ditutup dan tidak menerima permintaan masuk secara terbuka. Komunitas publik Li Shiya ESM menjadi ruang diskusi yang tersedia melalui tautan grup di atas.

Status akses grup dapat berubah sewaktu-waktu.

Connect dan Socials

Untuk keperluan bisnis, dukungan, atau informasi lebih lanjut, gunakan kanal berikut.

Kebutuhan| Kontak
Bisnis| "WhatsApp Business" (https://wa.me/6285143688664)
Support| "WhatsApp Support" (https://wa.me/6281362133135)
Telegram Bot| "Lynx CPanel Bot" (https://t.me/Lynxcpanel_bot)
Telegram| "@Lynxmanuelz4"
Instagram| "@lynxdecode_"
YouTube| "@lynxdecode_"
TikTok| "@olineonlyy_"

Support Us

Dukungan pengguna membantu kebutuhan operasional dan pengembangan project.

Platform| Akses
Saweria| "saweria.co/LynxPreset" (https://saweria.co/LynxPreset)
NGL| "ngl.link/lynxdsinii" (https://ngl.link/lynxdsinii)

Jadibot Clone

Layanan jadibot tersedia secara gratis, mengikuti ketentuan dan ketersediaan layanan.

Untuk mencoba:

1. Bergabunglah dengan grup komunitas yang menerima pengguna baru.
2. Ikuti aturan dan petunjuk yang berlaku.
3. Ketik ".jadibot" jika fitur tersebut tersedia pada grup terkait.

Kapasitas dan ketersediaan layanan dapat berubah sesuai kondisi operasional.

Catatan Komunitas

Untuk menjaga komunikasi tetap nyaman:

- Admin mungkin membutuhkan waktu untuk membalas pesan.
- Hindari spam chat atau panggilan berulang. Aktivitas spam dapat memicu pemblokiran otomatis.
- Biasakan mengucapkan salam ketika memulai percakapan.
- Hormati pengguna lain dan ikuti aturan komunitas.
- Jangan membagikan informasi pribadi atau kredensial sensitif di ruang publik.

Terima kasih telah membantu menjaga ekosistem INF PROJECT tetap tertib dan nyaman.

---

Credits

ELYRA memanfaatkan teknologi dan dependensi berikut, sesuai implementasi yang digunakan:

- "Zapo-JS" (https://github.com/vinikjkkj/zapo)
- "@zapo-js/media-utils" (https://www.npmjs.com/package/@zapo-js/media-utils)
- "@zapo-js/store-sqlite" (https://www.npmjs.com/package/@zapo-js/store-sqlite)
- "better-sqlite3" (https://www.npmjs.com/package/better-sqlite3)
- "sharp" (https://www.npmjs.com/package/sharp)
- FFmpeg dan FFprobe

Terima kasih juga kepada para pengguna, penguji, dan komunitas yang memberikan masukan selama perjalanan pengembangan.

Hak cipta dan ketentuan lisensi setiap dependensi tetap mengikuti pemilik serta lisensi masing-masing.

Disclaimer

ERINE-AI • ELYRA merupakan project independen untuk kebutuhan otomatisasi dan pengembangan sistem bot.

Project ini tidak berafiliasi dengan, tidak disponsori oleh, dan tidak didukung secara resmi oleh WhatsApp.

Zapo-JS merupakan dependensi terpisah yang digunakan oleh project. Nama, merek, dan hak atas dependensi tersebut tetap menjadi milik pemegang hak masing-masing.

Pengguna bertanggung jawab atas konfigurasi, penggunaan API, keamanan kredensial, serta aktivitas yang dijalankan melalui script.

Ketersediaan layanan eksternal, kompatibilitas versi, dan dukungan terhadap fitur tertentu tidak dijamin selalu sama sepanjang waktu.

---

<div align="center">ERINE-AI • ELYRA

Developed by Lynx decode — Arman Maulaba

INF PROJECT TEAM · INF PROJECT'S · GENERAL DISTRICT

"Repository" (https://github.com/Lynxcode-id/ERINE-AI) · "INF PROJECT" (https://whatsapp.com/channel/0029VbCUDdOHFxOyVb2Hfe2X) · "Support" (https://saweria.co/LynxPreset)

Build Smart System | Automate Everything

</div>
