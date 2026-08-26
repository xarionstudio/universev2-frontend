# 0014 — Modul Karyawan tersambung ke backend Go

- Status: Accepted
- Tanggal: 2026-08-25

## Konteks

Modul Karyawan masih sepenuhnya mock: halaman list/detail/form membaca
`empAll()` di app-store — gabungan persona desain (`lib/data/employees.ts`) dan
operator hasil generate dari file setting operator (`lib/data/operators.ts`) —
dan seluruh mutasi hidup di state React. Endpoint backend-nya sudah lengkap
(`/api/employees` CRUD + kompetensi + foto + import/export, permission
`employees`), helper frontend-nya pun sudah ada di
`lib/api/endpoints/employees.ts`; yang belum ada hanyalah kabelnya — persis
situasi ADR 0011 (fingerprint) dan ADR 0013 (users). Efek turunannya nyata:
dropdown "Karyawan tertaut" di menu User menawarkan NIK mock yang tidak ada di
database, sehingga tautan yang dipilih tidak pernah cocok dengan karyawan
sungguhan.

Gabungan mock yang sama juga dikonsumsi modul lain yang MASIH mock — alokasi
fleet, display fleet, prestasi, fit-to-work, revisi roster, weather — dan
modul-modul itu bergantung pada NIK seed lama (peta kompetensi, log tidur,
alokasi per unit). Menghidrasi mereka berada di luar scope perubahan ini.

## Keputusan

1. **`emps` baru di app-store sebagai salinan hasil hidrasi backend** — lahir
   kosong, diisi halaman Karyawan dan Users dari `GET /api/employees` lewat
   adapter `toEmployee/toEmployees` (tanggal DATE dipotong ke `YYYY-MM-DD`,
   `komp` selalu array). `empAll()` DIPERTAHANKAN sebagai seed statis untuk
   modul yang masih mock; mutasinya (`saveEmployee`/`deleteEmployee`/
   override) dihapus karena tidak ada lagi penulisnya. Konsumen mock tidak
   berubah perilaku.

2. **Daftar ditarik seluruhnya, disaring di klien.** `listAllEmployees()`
   menelusuri halaman API (perPage 200, batas backend) sampai habis. Filter
   departemen di UI multi-pilih dan tidak bisa diekspresikan query backend
   (`dept` tunggal), jadi pola filter/paginasi klien yang sudah ada
   dipertahankan — risiko terkecil untuk data seukuran ini.

3. **Detail & form edit memuat record-nya sendiri** (`getEmployee` +
   `getCompetencies`) sehingga refresh dan deep-link `/employees/:nik` bekerja
   tanpa mampir ke halaman list; 404 dikembalikan ke daftar, error lain
   mendapat kotak muat-ulang (pola ADR 0011).

4. **CRUD menulis ke backend dulu, state menyusul.** Tambah = `createEmployee`
   (+`updateCompetencies` bila ada baris, +`uploadPhoto` bila dipilih); edit =
   `updateEmployee` dengan payload GABUNGAN: field tanpa input di form
   (status, darah, BPJS, kontak, foto) dikirim balik dari record hasil muat,
   karena `PUT` backend menimpa SEMUA kolom (repo memakai `Select` penuh) dan
   string status kosong di-default-kan ke `"aktif"` — tanpa merge, karyawan
   cuti akan diam-diam aktif kembali (pelajaran kasus IsActive fingerprint).
   `simper`/`simperExp` PUNYA input sendiri di form (bagian SIMPER & Medis):
   tanpa input itu, masa berlaku SIMPER yang kosong sejak create tidak pernah
   bisa dilengkapi dari UI (lihat Konsekuensi). Kompetensi =
   `updateCompetencies` (mengganti seluruh daftar); validasi klien mewajibkan
   tiap baris ber-Type EGI punya masa berlaku karena `expiry_date` NOT NULL
   dan PUT-nya satu transaksi — satu baris kosong menggagalkan seluruhnya.
   Store hanya menerima hasil aktual tiap langkah: komp/foto yang gagal
   tersimpan tidak ditulis ke `emps`. Foto = `uploadPhoto` (JPEG/PNG ≤ 5MB,
   field form `photo`), hasil `photoUrl`-nya dirender lewat `assetUrl()` dari
   `/uploads`. Export memakai xlsx backend; import hanya menerima `.xlsx/.xls`
   (validasi ekstensi backend), menampilkan hasil per baris
   (`imported`/`skipped`/`errors` dari handler — 0 baris masuk bukan sukses),
   lalu memuat ulang daftar bila ada baris yang masuk.

5. **Dropdown "Karyawan tertaut" di menu User membaca `emps`** — dimuat sekali
   saat halaman dibuka, non-fatal (403/gagal tidak merobohkan halaman users),
   dan nilai tautan lama yang tidak ada di daftar tetap ditawarkan sebagai
   opsi supaya tidak lepas diam-diam.

## Konsekuensi

- Halaman Karyawan menampilkan isi database sungguhan; tambah/edit/hapus/
  import tersimpan nyata dan tautan karyawan di menu User memakai NIK yang
  benar-benar ada.
- **Keterbatasan backend yang diketahui:** `PUT /api/employees/:nik` menulis
  kolom `join_date`/`exp_date`/`simper_exp` apa adanya tanpa `nullIfEmpty`
  (berbeda dengan create), sehingga edit karyawan yang salah satu tanggalnya
  kosong ditolak PostgreSQL (SQLSTATE 22007). Dampaknya mencakup SEMUA
  karyawan yang dibuat lewat UI, bukan hanya sebagian baris seed: create
  menyimpan NULL untuk tanggal yang kosong, dan selama form tidak punya input
  `simperExp`, masa berlaku SIMPER tidak pernah bisa diisi dari UI — setiap
  karyawan buatan UI menjadi permanen tidak bisa di-edit apa pun yang diisi
  pengguna. Karena itulah form menyediakan input `simper`/`simperExp`
  (opsional saat tambah) supaya ketiga tanggal bisa dilengkapi dari UI, dan
  kegagalannya diterjemahkan menjadi pesan yang bisa ditindaklanjuti
  (`efErrDateEmpty`) alih-alih SQL mentah; perbaikan hakiki tetap menunggu
  backend meniru `nullIfEmpty` milik create pada jalur update.
- Modul mock lain (alokasi fleet, display, prestasi, fit-to-work, revisi
  roster, weather) tetap membaca seed lama lewat `empAll()` — nama/NIK yang
  tampil di sana belum tentu sama dengan database sampai modulnya sendiri
  dihidrasi.
- Metadata halaman detail/edit memakai NIK, bukan nama (nama baru tersedia
  setelah fetch klien).
- Tanpa backend hidup, halaman Karyawan menampilkan kotak "Gagal memuat" +
  tombol muat ulang, bukan 21 persona desain yang tampak sehat.
