# 0010 — Tanpa streaming respons ke browser; umpan balik lewat permintaan pendek

- Status: Accepted
- Tanggal: 2026-08-06
- Mengamandemen: [0009](0009-ping-mesin-fingerprint.md)

## Konteks

ADR 0009 meninggalkan satu pertanyaan terbuka. Uji koneksi mesin fingerprint
berjalan di server dan bisa memakan waktu sampai 6 detik per mesin, sementara
server tahu persis sedang di tahap mana (TCP dulu, ICMP sebagai cadangan).
Godaannya jelas: alirkan tahapan itu ke browser sebagai NDJSON supaya admin
melihat kemajuan, bukan layar diam.

Sebelum itu ditulis sebagai keputusan, dibuat route probe sementara
(`app/api/streamtest`) untuk mengujinya — bukan karena streaming diragukan
secara teori, tetapi karena tidak ada satu pun route handler yang pernah
mengalirkan respons di aplikasi ini, jadi tidak ada bukti apa pun tentang
bagaimana ia berperilaku sampai ke browser admin.

Hasil pengukurannya membalik rencananya.

## Bukti

Semua diukur 6 Agustus 2026, Next 16.2.10, Node 22.14, Windows 11.

**Servernya memang mengalir.** Dibaca oleh Node/undici dari `next start`:
header tiba +56 ms, `transfer-encoding: chunked`, tanpa `content-length`, dan
kelima baris NDJSON tiba +57/550/1063/1565/2077 ms — persis mengikuti waktu
server menuliskannya.

**Tidak ada browser yang menerimanya bertahap.** `await fetch()` sendiri baru
selesai ketika stream berakhir (±2040 ms untuk stream 2 detik), jadi bahkan
header responsnya ikut ditahan. Sama persis di Chromium headless, Chromium
bermuka, Chrome asli headless, Chrome asli bermuka, lewat `fetch` maupun
`XMLHttpRequest`.

Yang sudah diuji dan **tidak** mengubah apa pun:

| Dugaan           | Uji                                                  | Hasil                                        |
| ---------------- | ---------------------------------------------------- | -------------------------------------------- |
| MIME sniffing    | `X-Content-Type-Options: nosniff`                    | tetap utuh                                   |
| Kompresi         | tanpa `content-encoding`; `no-transform`; `identity` | tetap utuh                                   |
| Ambang ukuran    | baris pengganjal 2 KB → 16 KB → 256 KB → 1 MB → 4 MB | tetap utuh                                   |
| Ambang waktu     | stream 11 detik                                      | dilepas di ms ke-11088, tidak ada sebelumnya |
| Tipe konten      | `application/json`                                   | tetap utuh                                   |
|                  | `text/event-stream`                                  | `ERR_INCOMPLETE_CHUNKED_ENCODING`            |
| Jalur jaringan   | `127.0.0.1`, `localhost`, alamat LAN                 | sama semua                                   |
| Heuristik header | undici dengan User-Agent & `Sec-Fetch-*` Chrome      | **mengalir mulus**                           |

Baris terakhir itu yang menunjuk penyebabnya: penyaringannya mengenali
**proses**, bukan rupa lalu lintasnya. Dan Next.js tidak terlibat sama sekali —
server `node:http` polos dengan `res.flushHeaders()` menunjukkan pembelahan yang
sama: undici membacanya bertahap (+22/523/1024/1536/2039 ms), Chromium menahan
seluruhnya (header +2055 ms).

Mesin uji menjalankan **Sophos Intercept X** dengan layanan _Sophos Network
Threat Protection_ dan mini-filter WFP-nya; tidak ada proxy HTTP yang
dikonfigurasi (`netsh winhttp` = direct, `ProxyEnable` = 0, tanpa env proxy).
Ini korelasi, bukan eksperimen terkendali: produk keamanannya **tidak**
dimatikan untuk membuktikannya, dan memang tidak boleh dimatikan hanya untuk
sebuah pengukuran.

**Pembanding yang menentukan.** Satu server tiruan, 12 mesin dengan durasi
campuran, dibaca dari browser yang sama:

| Pendekatan                                      | Hasil pertama terlihat | Momen pembaruan UI                   |
| ----------------------------------------------- | ---------------------- | ------------------------------------ |
| 12 permintaan pendek, 4 paralel (cara sekarang) | 106 ms                 | **12 kali**, menyebar sampai 6440 ms |
| Satu stream NDJSON (usulan)                     | 6424 ms                | **1 kali**, semuanya di akhir        |

Permintaan pendek menang justru karena pendek: tiap respons sudah lengkap
ketika pemindai melepasnya. Stream panjang ditahan utuh sampai mesin terakhir
selesai.

## Keputusan

1. **Tidak ada respons streaming ke browser.** Umpan balik bertahap dicapai
   dengan banyak permintaan pendek yang berdiri sendiri, satu per satuan kerja
   — bukan satu koneksi panjang yang menetes.

2. **Uji koneksi dijalankan satu per satu; "Ping semua" dihapus.** Admin
   menekan Ping pada baris mesin yang dimaksud, dan pop-upnya selalu merujuk
   satu alamat yang jelas. Ini keputusan produk, bukan turunan dari pengukuran
   di atas — tetapi pengukurannya menutup satu-satunya alasan teknis yang bisa
   dipakai untuk mempertahankan aksi massal, yaitu janji kemajuan bertahap
   yang ternyata tidak pernah sampai ke layar.

3. **Animasi tunggu murni sisi klien.** Ikon dialog dikelilingi tiga cincin
   sonar (`--animate-sonar`), nilai "Metode" dan "Waktu tempuh" memakai
   skeleton berkilau, dan tombol "Ping ulang" memakai spinner. Semuanya
   menyatakan "sedang berlangsung" dan **tidak** menggambarkan tahapan: server
   tahu sedang di TCP atau ICMP, tetapi tahapan itu tidak bisa dikirim tepat
   waktu, jadi menampilkannya berarti menganimasikan tebakan.

4. **Keyframes `rot`, `shimmer`, dan `toast-in` dipulihkan.** Tokennya ada di
   `@theme inline` dan kelas utilitasnya tergenerate dengan benar
   (`animationName: "rot"`, durasi 0,7 dtk), tetapi `@keyframes`-nya hilang —
   sehingga `getAnimations().length` = 0 dan tidak ada yang bergerak: Spinner
   tidak berputar, Skeleton tidak berkilau, toast muncul tanpa transisi. Tidak
   ada error yang muncul, hanya diam, itulah kenapa lama tidak ketahuan.
   Keempat keyframes kini ditulis tepat di bawah tokennya masing-masing supaya
   keduanya hidup dan mati bersama.

## Konsekuensi

- **Setiap fitur berikutnya yang tergoda mengalirkan progres** — unggah roster,
  impor massal, sinkronisasi — menabrak dinding yang sama. Ukur dulu dengan
  probe sejenis sebelum mendesainnya; jangan berangkat dari asumsi bahwa
  chunked response sampai ke browser.

- **Batas ini milik lingkungan, bukan kode.** Kalau kebijakan endpoint berubah,
  atau aplikasi dipakai dari mesin tanpa agen pemindai itu, streaming bisa
  hidup kembali. Ulangi pengukurannya, jangan mengandalkan catatan ini: yang
  dicari adalah jarak antara baris pertama dan terakhir yang tiba di browser.
  Kesimpulannya sendiri tidak bergantung pada pemindai itu — tanpa pemindai
  pun, permintaan pendek sudah memberi pembaruan per mesin; streaming hanya
  menambah kendali paralelisme di sisi server, yang tidak dibutuhkan untuk
  belasan perangkat di satu LAN.

- **Mode `next dev` tidak bisa dipakai memverifikasi UI di mesin ini.** Halaman
  dev merender body kosong (0 tombol), dan WebSocket HMR selalu gagal handshake
  (`ERR_INVALID_HTTP_RESPONSE`, lalu `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`).
  Verifikasi visual harus dilakukan terhadap build produksi. Supaya `next start`
  yang sedang berjalan tidak terganggu, build bisa diarahkan ke direktori lain
  lewat `distDir` sementara dan disajikan di port berbeda.

- **Tiga temuan sampingan tentang route handler**, dicatat karena mahal
  didapatkan dan akan mahal lagi kalau harus diukur ulang:
  - `export const runtime` dan `export const dynamic` tidak diperlukan. Build
    menandai `ƒ /api/streamtest` (Dynamic) tanpa keduanya, bahkan ketika GET
    tidak menyentuh apa pun dari `request`. Ini menegaskan catatan di ADR 0009.
  - Error di tengah stream **tidak bisa** menjadi 500. Begitu chunk pertama
    terkirim, statusnya sudah 200; klien hanya menerima koneksi yang terputus
    (`TypeError: terminated`), server mencatat `failed to pipe response`.
  - Pembatalan dari klien **benar-benar** sampai ke server: `AbortController`
    memicu `cancel(reason=ResponseAborted)` pada `ReadableStream`, dan loop
    produsernya berhenti di baris ke-4 dari 20. Artinya batas waktu di sisi
    klien memang membebaskan pekerjaan di server, bukan sekadar berpaling.

- Probe `app/api/streamtest` sudah selesai tugasnya dan tinggal dihapus. Untuk
  mengulang pengukurannya nanti: sajikan NDJSON `chunked` dengan jeda ~500 ms
  antar baris, lalu catat `performance.now()` tiap baris tiba di
  `response.body.getReader()` — dari Node dan dari browser. Bila jarak baris
  pertama ke terakhir mendekati nol di browser sementara Node melihatnya
  menyebar, batas ini masih berlaku.
