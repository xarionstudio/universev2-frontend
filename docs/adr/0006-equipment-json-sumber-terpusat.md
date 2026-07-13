# 0006 — equipment.json sebagai sumber data unit terpusat

- Status: Accepted
- Tanggal: 2026-07-13

## Konteks

Data unit tersebar dan saling lepas: `units-db.ts` berisi ±327 unit karangan,
`unit-status.ts` punya 7 unit sendiri dengan kode yang tidak ada di database
(DT-114, GR-02), dashboard menyebut kode-kode itu secara hardcode, dan master
data (area, bus, product, eq class) adalah daftar lepas yang tidak cocok dengan
unit mana pun. Halaman-halaman menampilkan "kebenaran" yang berbeda-beda.

Kini tersedia data riil: `docs/equipment.json` — ekspor
`Data_Equipment_Unggul_Update_Juli_2026.xlsx` (sheet ASSET POP), 513 unit,
25 kategori, 22 lokasi pit.

## Keputusan

1. **`docs/equipment.json` adalah sumber kebenaran** untuk populasi unit.
   `lib/data/units-db.ts` DIGENERATE dari file itu oleh
   `docs/generate-units-db.py` — jangan diedit manual; jalankan ulang skrip
   bila JSON berubah.
2. **Atribut yang tidak ada di sumber digenerate dummy deterministik** (seed
   tetap) dan dibake ke file hasil: status operasional (aktif/standby/
   breakdown) dan lokasi pit. Semua halaman membaca hasil bake yang sama —
   tidak ada halaman yang mengarang status sendiri.
3. **Modul lain diturunkan, bukan menyalin**: `unit-status.ts` (papan Status
   Unit) di-derive dari `unitsDb`; master data area (22 pit resmi), bus (26 bus
   riil), product/merek, dan eq class di-derive lewat ekspor `pitLocations`,
   `eqClassDefs`, `unitMakes`; Type EGI (`typeOfEgi` + `egiTypes`) dipetakan
   dari model sumber dan tetap memuat semua grup lama agar kompetensi karyawan
   tidak putus.
4. **Form memilih dari sumber, bukan teks bebas**: digger fleet = kategori
   BIG/MEDIUM_DIGGER, unit OHT = class HD, lokasi kerja fleet = master Area,
   bus default = master Bus.

## Konsekuensi

- Dashboard, Status Unit, Database Unit, Fleet Allocation, Setting Fleet,
  master data, dan display TV menampilkan populasi serta status unit yang sama.
- Nilai yang aneh di sumber (mis. "Parkitan Sebatik", merek "K480 8x4") ikut
  tampil atau dinormalkan di generator — perbaikannya di JSON/generator, bukan
  di halaman.
- Backend nanti tinggal mengganti modul generate ini dengan API tanpa mengubah
  konsumen.
