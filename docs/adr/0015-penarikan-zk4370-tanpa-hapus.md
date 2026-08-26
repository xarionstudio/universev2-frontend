# 0015 — Penarikan absen ZK 4370 tanpa hapus memori mesin

- Status: Accepted (mengamandemen [0011](0011-integrasi-fingerprint-backend.md))
- Tanggal: 2026-08-25

## Konteks

Worker sync backend selama ini hanya bicara SOAP (`http://ip:port/iWsService`,
pola Solution X100C) dan MENGHAPUS memori mesin (`ClearAttLog`) setiap kali
seluruh record berhasil ditulis. Dua-duanya tidak cocok dengan lapangan: mesin
existing melayani protokol biner ZKTeco di TCP 4370, dan log absen di mesin
adalah satu-satunya sumber kebenaran — menghapusnya membuat kegagalan tulis
sesudahnya tak bisa dipulihkan. Konsekuensinya berantai: bila memori tidak
pernah dihapus, tiap tarikan memuat ulang SEMUA log lama, jadi ingestion wajib
idempoten.

## Keputusan

1. **Worker mendukung dua protokol, dipilih heuristik per port terdaftar:**
   port 4370 = protokol biner ZKTeco (connect/auth, baca log, disconnect);
   port lain (mis. 80) = SOAP `/iWsService` yang sudah ada. Tidak ada kolom
   baru di `fingerprint_devices` — port yang diisi admin adalah saklarnya.
2. **Penarikan TIDAK PERNAH menghapus memori mesin.** Pemanggilan
   `ClearAttLog` dihapus dari worker; kedua jalur protokol hanya mengirim
   perintah baca.
3. **Ingestion idempoten first/last scan:** per (nik, tanggal), scan PERTAMA
   menjadi In dan scan TERAKHIR menjadi Out; memutar ulang log yang sama tidak
   mengubah baris dan tidak menggandakan data di DB maupun tampilan.
4. **Watermark per device di worker** — tarikan berikutnya memproses log mulai
   dari jejak waktu terakhir yang sudah tercerna, supaya memori mesin yang
   tidak pernah dikosongkan tidak membuat tiap sync memproses ulang seluruh
   riwayat. Scan milik NIK yang belum terdaftar sebagai karyawan dihitung
   terpisah (unknown-nik) dan TIDAK menahan laju watermark — hanya kegagalan
   transien (DB error) yang membuat watermark diam agar record dicoba ulang.
   Watermark juga di-clamp terhadap jam server supaya satu record korup
   berjam masa depan tidak membuat scan asli ter-skip.
5. **Tombol "Tarik Absen Sekarang" = replay penuh** (watermark direset dulu):
   inilah jalur resmi mengisi ulang scan lama milik karyawan yang baru
   didaftarkan — tick otomatis 60 detik tetap inkremental dan cepat.

## Konsekuensi

- Frontend: teks bantuan port pada form Mesin Fingerprint (`fpPortHelp`) kini
  menjelaskan kedua protokol, dan komentar `FP_DEFAULT_PORT` di
  `lib/data/fingerprint.ts` tidak lagi menyebut 4370 sebagai port yang mustahil
  ditarik. Default form tetap 80 mengikuti skema backend.
- Mesin yang didaftarkan dengan port 4370 kini ikut tertarik oleh tombol
  "Tarik Absen Sekarang" (ADR 0011) tanpa perubahan UI apa pun.
- Log lama menumpuk di mesin — pembersihan (bila kelak diperlukan) adalah
  tindakan manual di luar aplikasi, bukan jalur kode worker.
