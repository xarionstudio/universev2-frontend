# 0007 — Alokasi operator per tanggal+shift, display fleet memantulkannya

- Status: Accepted
- Tanggal: 2026-07-13

## Konteks

Proses lama site (docs/setting-operator.xlsx): file Excel bulanan berisi 30
sheet (satu per tanggal), ±680 baris/hari yang memetakan operator→unit secara
manual — rawan unit dobel, nama nyasar kolom, pit tidak baku, dan ±80 baris
"SPARE" sebagai unit fiktif. Kolom SHIFT-nya (D1–D6/N1–N6) adalah kelompok
kerja/crew, bukan fleet, sehingga tampilan kiosk per fleet harus dirakit manual
lagi. Di aplikasi, `faAlloc` semula hanya `{pagi, malam}` tanpa dimensi tanggal,
dan TV fleet memakai pool operator dummy sendiri.

## Keputusan

1. **Alokasi berdimensi tanggal**: `faAlloc[tanggalISO][shift][kodeUnit] = nik`
   (`lib/data/fleet-alloc.ts`). Seed demo deterministik untuk kemarin + hari
   ini (greedy: formasi fleet aktif × operator berkompetensi).
2. **"Salin dari kemarin"** di papan alokasi: mengisi slot kosong dari shift
   yang sama sehari sebelumnya; unit breakdown dan operator yang sudah terpakai
   dilewati. Ini pengganti utama kerja bulanan menyalin sheet.
3. **Papan dibatasi class yang memang di-setting operatornya**
   (HD/LD/EX/DZ/WT/MH — mengikuti isi file lama); urutan kartu: unit formasi
   fleet dulu (sesuai Setting Fleet), lalu unit support; ada filter per fleet.
4. **Pool "Operator spare" eksplisit** di bawah papan — operator berkompetensi
   yang belum kebagian unit di tanggal+shift itu — menggantikan baris SPARE.
5. **Display Fleet TV tidak punya data operator sendiri**:
   `fleetDisplayCards(fleet, alloc, nameOfNik)` membaca `faAlloc` (tanggal hari
   ini + shift menurut jam, 06:00–17:59 = pagi; bisa dipaksa `?shift=`).
   Crew D1–D6/N1–N6 ditangani domain roster, bukan papan alokasi.

## Konsekuensi

- Papan alokasi dan TV selalu menampilkan operator yang sama; mengubah alokasi
  langsung mengubah TV.
- Alokasi tiap tanggal tersimpan terpisah — dasar untuk riwayat/ekspor harian
  menggantikan file 30-sheet ketika backend masuk.
- Kedua shift pada seed demo berisi mapping yang sama (dummy); aslinya crew
  siang/malam berbeda dan akan diisi dari roster.
