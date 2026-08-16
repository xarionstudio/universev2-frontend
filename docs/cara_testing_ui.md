# Panduan Pengujian UI & Alur Bisnis Sistem UniverseV2

Dokumentasi ini menjelaskan langkah-demi-langkah (scenario-based testing) untuk menguji seluruh alur sistem (system flow) dan alur bisnis (business flow) UniverseV2 melalui Antarmuka Pengguna (UI).

UniverseV2 adalah sistem manajemen operasional tambang terpadu yang mencakup manajemen karyawan, roster kerja, Fit To Work (FTW), absensi, manajemen aset, alokasi armada (fleet), hingga tampilan monitor real-time (Displays).

---

## Daftar Isi

1. [Prasyarat & Cara Menjalankan Sistem](#1-prasyarat--cara-menjalankan-sistem)
2. [Akun Pengujian (Kredensial Default)](#2-akun-pengujian-kredensial-default)
3. [Alur 1: Autentikasi & Hak Akses (RBAC)](#alur-1-autentikasi--hak-akses-rbac)
4. [Alur 2: Data Karyawan & Kompetensi (SIMPER)](#alur-2-data-karyawan--kompetensi-simper)
5. [Alur 3: Fit To Work (FTW) - Kelayakan Kerja Karyawan](#alur-3-fit-to-work-ftw---kelayakan-kerja-karyawan)
6. [Alur 4: Roster Kerja & Alur Revisi (Approval)](#alur-4-roster-kerja--alur-revisi-approval)
7. [Alur 5: Manajemen Aset & Status Breakdown Unit](#alur-5-manajemen-aset--status-breakdown-unit)
8. [Alur 6: Pengaturan Fleet & Alokasi Otomatis (Auto-Allocation)](#alur-6-pengaturan-fleet--alokasi-otomatis-auto-allocation)
9. [Alur 7: Layar Tampilan Monitor (TV Displays)](#alur-7-layar-tampilan-monitor-tv-displays)
10. [Panduan Pemecahan Masalah (Troubleshooting)](#panduan-pemecahan-masalah-troubleshooting)

---

## 1. Prasyarat & Cara Menjalankan Sistem

Untuk melakukan pengujian secara penuh, Anda harus menjalankan kedua modul sistem (Backend & Frontend) secara bersamaan.

### A. Menjalankan Backend (Go / Fiber)

1. Buka terminal baru dan masuk ke direktori backend:
   ```bash
   cd universev2-backend
   ```
2. Pastikan file `.env` sudah diatur dengan benar (koneksi PostgreSQL/SQLite).
3. Jalankan migrasi database dan seed data awal:
   ```bash
   # Jalankan binary migration untuk setup database awal:
   go run cmd/migrate/main.go
   ```
4. Jalankan server backend:
   ```bash
   go run cmd/server/main.go
   ```
   _Backend akan berjalan di: `http://localhost:8080`_

### B. Menjalankan Frontend (Next.js)

1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd universev2-frontend
   ```
2. Instal dependensi (menggunakan `pnpm`):
   ```bash
   pnpm install
   ```
3. Jalankan server development:
   ```bash
   pnpm dev
   ```

## 2. Akun Pengujian (Kredensial Default)

Data awal (seeds) telah menyediakan beberapa akun dengan tingkatan hak akses (RBAC) yang berbeda:

| No  | Email                   | Password   | Role           | NIK Terkait | Keterangan                                                                                     |
| --- | ----------------------- | ---------- | -------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| 1   | `angel@unggul.co.id`    | `admin123` | **Superadmin** | `503264133` | Akses penuh ke semua modul, pengaturan, pengguna, dan role.                                    |
| 2   | `rahmat.h@unggul.co.id` | `admin123` | **Admin**      | `503264134` | Mengelola operasional harian (Roster, FTW, Fleet, Master). Tidak bisa mengelola pengguna/role. |
| 3   | `clinic@unggul.co.id`   | `admin123` | **Viewer**     | -           | Hanya melihat data (Read-only), tidak dapat melakukan aksi ubah.                               |

---

## Alur 1: Autentikasi & Hak Akses (RBAC)

**Tujuan**: Memastikan sistem keamanan login dan pembatasan menu berjalan sesuai hak akses role masing-masing.

### Skenario Pengujian:

1. **Login sebagai Superadmin**:
   - Buka `http://localhost:3000/login`.
   - Masukkan email `angel@unggul.co.id` dan password `admin123`.
   - **Hasil yang diharapkan**: Berhasil masuk ke Dashboard. Menu samping menampilkan seluruh modul: _Dashboard, Employees, Roster, Fit To Work, Assets, Prestasi, Master Data, Users & Roles, Settings_.
2. **Uji Proteksi Menu (Admin)**:
   - Logout, lalu login kembali menggunakan `rahmat.h@unggul.co.id` (`admin123`).
   - **Hasil yang diharapkan**: Menu _Users & Roles_ dan _Settings_ disembunyikan. Jika mencoba mengakses `/users` secara manual via URL, sistem akan mengarahkan kembali atau menampilkan pesan akses ditolak (Unauthorized/Forbidden).
3. **Uji Mode Lihat-Saja (Viewer)**:
   - Logout, lalu login menggunakan `clinic@unggul.co.id` (`admin123`).
   - Buka halaman _Employees_ (`/employees`).
   - **Hasil yang diharapkan**: Tombol "Tambah Karyawan" atau aksi "Edit/Hapus" hilang dari UI, atau tidak dapat diklik (disabled).

## Alur 2: Data Karyawan & Kompetensi (SIMPER)

**Tujuan**: Memverifikasi manajemen data profil karyawan serta penambahan izin mengemudi alat berat (SIMPER) yang nantinya sangat penting untuk Alokasi Fleet.

### Skenario Pengujian:

1. **Melihat Profil Karyawan**:
   - Login sebagai Superadmin (`angel@unggul.co.id`).
   - Masuk ke menu **Employees**.
   - Cari karyawan bernama **First Angel Paustine** (NIK: `503264133`). Klik namanya untuk melihat detail profil.
2. **Menambahkan/Memperbarui Kompetensi (SIMPER)**:
   - Di dalam detail profil karyawan tersebut, cari tab/bagian **Kompetensi / SIMPER**.
   - Tambahkan kompetensi baru:
     - _Class Name_: `DT` (Dump Truck) atau `EX` (Excavator)
     - _Simper No_: `DT Kelas A`
     - _Masa Berlaku_: Pilih tanggal di masa depan (misal: 1 tahun dari sekarang).
   - Klik **Simpan**.
   - **Hasil yang diharapkan**: Kompetensi baru muncul di profil karyawan tersebut. Karyawan ini kini memenuhi syarat untuk mengoperasikan unit Dump Truck.

---

## Alur 3: Fit To Work (FTW) - Kelayakan Kerja Karyawan

**Tujuan**: Menguji logika penentuan kelayakan operator berdasarkan jam istirahat dan jam tidur mereka sebelum memulai shift.

### Skenario Pengujian:

Sistem mendasarkan kelayakan kerja (`can_work`) pada formula berikut:

- **Fit** (Siap Kerja): Jam Tidur $\ge$ 5 jam 30 menit (330 menit).
- **Spare** (Cadangan/Istirahat Dulu): Jam Tidur 4 jam s.d. 5 jam 29 menit.
  - Tidur 5 jam - 5 jam 29 menit $\rightarrow$ Wajib istirahat **1 jam** sebelum bekerja.
  - Tidur 4 jam - 4 jam 59 menit $\rightarrow$ Wajib istirahat **2 jam** sebelum bekerja.
- **Pulang** (Unfit): Jam Tidur < 4 jam $\rightarrow$ Dikirim pulang karena berisiko tinggi (fatigue).

### Langkah-Langkah Pengujian UI:

1. **Lakukan Submit Form FTW**:
   - Masuk ke menu **Fit To Work** (`/fit-to-work`).
   - Klik **Submit FTW** atau isi form yang tersedia.
   - Skenario Uji 1 (**Fit**):
     - Masukkan NIK: `503264133` (First Angel Paustine).
     - Pilih Shift: `Pagi` (Day Shift).
     - Isi Jam Tidur: `06:00` (6 jam) atau isi menit tidur: `360`.
     - Kirim Form.
     - **Hasil**: Status karyawan tersebut di tabel FTW adalah **FIT** (Berwarna hijau).
   - Skenario Uji 2 (**Spare**):
     - Lakukan submit untuk NIK lain, misal `503264134` (Rahmat Hidayat).
     - Isi Jam Tidur: `05:10` (5 jam 10 menit / 310 menit).
     - **Hasil**: Status menjadi **SPARE** (Kuning) dengan keterangan wajib istirahat 1 jam.
   - Skenario Uji 3 (**Pulang**):
     - Lakukan submit untuk NIK: `503264142` (Maya Sari).
     - Isi Jam Tidur: `03:30` (3 jam 30 menit / 210 menit).
     - **Hasil**: Status menjadi **PULANG** (Merah). Operator ini tidak diperbolehkan bekerja hari ini.

## Alur 4: Roster Kerja & Alur Revisi (Approval)

**Tujuan**: Menguji pengaturan jadwal kerja bulanan karyawan dan proses pengajuan perubahan jadwal oleh operasional yang membutuhkan persetujuan atasan.

### Skenario Pengujian:

1. **Melihat Roster Bulanan**:
   - Masuk ke menu **Roster** (`/roster`).
   - Pilih departemen `Operation` dan bulan berjalan.
   - Perhatikan kode warna jadwal: `D` (Day Shift/Siang), `N` (Night Shift/Malam), `OFF` (Libur).
2. **Mengajukan Revisi Jadwal (Oleh Admin/User)**:
   - Klik salah satu kotak tanggal kerja karyawan (misal NIK `503264133` pada tanggal hari ini yang berstatus `D`).
   - Pilih opsi **Revisi/Ubah Jadwal**.
   - Ubah status dari `D` (Day Shift) menjadi `N` (Night Shift) atau `OFF`.
   - Masukkan alasan revisi (misal: "Pertukaran shift darurat").
   - Klik **Ajukan Revisi**.
   - **Hasil**: Status pengajuan revisi akan masuk ke daftar dengan status **Pending** (Menunggu persetujuan).
3. **Persetujuan Revisi (Oleh Superadmin)**:
   - Login sebagai Superadmin (`angel@unggul.co.id`).
   - Masuk ke menu **Roster** $\rightarrow$ submenu **Approval** (`/roster/approval`).
   - Cari pengajuan revisi yang baru saja Anda buat.
   - Klik tombol **Approve** (atau **Reject** untuk skenario penolakan).
   - **Hasil**: Jadwal kerja karyawan di halaman Roster utama otomatis berubah mengikuti revisi yang disetujui, dan notifikasi sukses dikirimkan ke pengguna terkait.

---

## Alur 5: Manajemen Aset & Status Breakdown Unit

**Tujuan**: Mengatur status kesehatan alat berat (Dump Truck, Excavator) dan melihat bagaimana status breakdown berdampak langsung pada operasional tambang.

### Skenario Pengujian:

1. **Mengubah Status Unit menjadi Breakdown (Rusak)**:
   - Masuk ke menu **Assets** $\rightarrow$ submenu **Status Unit** (`/assets/status`).
   - Cari unit alat berat, contoh: **DT5108** (Dump Truck 777D).
   - Klik aksi **Update Status**.
   - Ubah statusnya dari `Ready` menjadi `Breakdown`.
   - Pilih lokasi kerusakan (misal: `Workshop Plant`) dan masukkan deskripsi kerusakan (misal: `Low Power / Engine Trouble`).
   - Klik **Simpan**.
2. **Verifikasi Dampak Sistem**:
   - Perhatikan munculnya Notifikasi Bahaya (**Danger Notification**) di pojok kanan atas UI bahwa unit `DT5108` sedang breakdown.
   - Buka menu **Assets** $\rightarrow$ submenu **Alokasi Fleet** (`/assets/allocation`).
   - **Hasil yang diharapkan**: Unit `DT5108` akan ditandai dengan warna merah (breakdown) dan **tidak dapat dipilih** atau dialokasikan untuk membawa muatan tambang karena kondisinya tidak siap pakai.

## Alur 6: Pengaturan Fleet & Alokasi Otomatis (Auto-Allocation)

**Tujuan**: Ini adalah **Alur Inti Operasional (Core Dispatch Flow)**. Mengatur formasi armada tambang (1 Digger/Excavator berpasangan dengan beberapa Dump Truck) dan melakukan penugasan Operator secara otomatis berbasis kompetensi dan kesehatan.

### Skenario Pengujian:

1. **Konfigurasi Formasi Fleet**:
   - Masuk ke menu **Assets** $\rightarrow$ submenu **Fleet Setting** (`/assets/fleet-setting`).
   - Aktifkan/Buat formasi armada. Misal:
     - _Digger (Excavator)_: `EX5002` (Hitachi EX700)
     - _Lokasi Kerja_: `Panel East Tengah`
     - _Unit DT Pendukung_: Masukkan `DT5112`, `DT5111` (Jangan masukkan `DT5108` yang sedang breakdown).
     - Set status armada: `Aktif`.
2. **Proses Alokasi Karyawan (Manual & Otomatis)**:
   - Masuk ke menu **Assets** $\rightarrow$ submenu **Allocation** (`/assets/allocation`).
   - Pilih tanggal hari ini dan pilih Shift: `Pagi`.
   - **Aksi 1: Alokasi Manual**:
     - Klik pada baris unit `EX5002`, pilih Operator dari daftar dropdown.
     - Sistem hanya akan menampilkan operator yang memiliki kompetensi mengoperasikan Excavator (`EX Kelas A/B`) dan berstatus **FIT** pada hari tersebut.
   - **Aksi 2: Alokasi Otomatis (Auto Allocate)**:
     - Klik tombol **Auto Allocate** di bagian atas halaman.
     - **Analisis Algoritma (Greedy Match)**:
       1. Sistem akan memindai seluruh Fleet yang aktif untuk tanggal dan shift tersebut.
       2. Sistem memeriksa ketersediaan unit yang berstatus `Ready` (bukan breakdown).
       3. Sistem mencari karyawan yang dijadwalkan bekerja (`D` atau `N` sesuai shift) berdasarkan Roster.
       4. Sistem menyaring karyawan yang telah lolos uji kelayakan tidur (**FIT** di modul FTW).
       5. Sistem mencocokkan tipe kompetensi karyawan (SIMPER) dengan jenis unit (misal: Operator bersimper `DT` dipasangkan ke unit `DT5112`).
     - **Hasil yang diharapkan**: Semua unit di dalam formasi fleet yang aktif otomatis terisi oleh operator yang sehat dan berkompeten tanpa tumpang tindih (1 operator hanya memegang 1 unit).

---

## Alur 7: Layar Tampilan Monitor (TV Displays)

**Tujuan**: Menguji layar display publik (kiosk mode) yang biasanya dipasang pada TV Monitor di area Mess Karyawan atau Kantor Dispatcher untuk menyajikan informasi real-time tanpa navigasi menu.

### Skenario Pengujian:

1. **Membuka Layar Kiosk**:
   - Akses URL display secara langsung di browser Anda:
     - **Monitor Absensi**: `http://localhost:3000/display/attendance`
     - **Monitor Kelayakan Kerja (FTW)**: `http://localhost:3000/display/fitwork`
     - **Monitor Alokasi Fleet**: `http://localhost:3000/display/fleet`
     - **Monitor Fingerprint**: `http://localhost:3000/display/fingerprint`
2. **Uji Sinkronisasi Data Real-Time**:
   - Buka dua jendela browser berdampingan:
     - Jendela 1: Tampilan Monitor Fleet (`http://localhost:3000/display/fleet`).
     - Jendela 2: Halaman Admin Alokasi Fleet (`http://localhost:3000/assets/allocation` - Login sebagai Superadmin).
   - Di Jendela 2 (Admin), lakukan perubahan alokasi operator pada unit tertentu atau ubah status unit.
   - **Hasil yang diharapkan**: Tampilan di Jendela 1 (Monitor TV) langsung memperbarui datanya secara otomatis tanpa perlu melakukan refresh halaman manual (didukung oleh sistem auto-refresh / heartbeat).

---

## Panduan Pemecahan Masalah (Troubleshooting)

### 1. Masalah: Data di UI Tidak Berubah Setelah Submit Form

- **Penyebab**: Frontend Anda mungkin masih menggunakan mode simulasi data lokal (mockup/seed) dan belum sepenuhnya terhubung ke Backend API, atau koneksi ke Backend terputus.
- **Solusi**:
  1. Periksa terminal backend Anda untuk memastikan tidak ada error crash.
  2. Periksa variabel lingkungan di frontend (`universev2-frontend/.env` atau `.env.local`). Pastikan memiliki baris:
     ```env
     NEXT_PUBLIC_API_URL=http://localhost:8080/api
     ```
  3. Buka Console Developer Tools (F12) di browser Anda untuk melihat apakah ada pesan kesalahan jaringan atau CORS Blocked.

### 2. Masalah: Status Login Selalu "Unauthorized (401)"

- **Penyebab**: Token JWT Anda sudah kedaluwarsa atau server database belum dijalankan sehingga backend gagal melakukan verifikasi password.
- **Solusi**:
  1. Lakukan pembersihan cookies/local storage di browser Anda.
  2. Pastikan database PostgreSQL/SQLite menyala dan data benih (seed) berhasil dimasukkan dengan benar.
  3. Coba lakukan login ulang dengan kredensial yang tepat (Contoh: `angel@unggul.co.id` / `admin123`).

### 3. Masalah: Operator Tidak Muncul Saat Auto-Allocate

- **Penyebab**: Operator tersebut mungkin tidak memenuhi salah satu syarat kelayakan berikut:
  - Roster hari ini tidak berstatus masuk kerja (`OFF` atau `Cuti`).
  - Belum melakukan submit pemeriksaan FTW, atau hasil FTW menunjukkan status `Pulang`/`Spare` yang belum menyelesaikan masa istirahatnya.
  - Kompetensi/SIMPER di profilnya telah kedaluwarsa (Expired) atau tidak sesuai dengan jenis unit.
- **Solusi**:
  1. Periksa Roster karyawan tersebut di halaman Roster.
  2. Buat entri FTW baru yang menghasilkan status **FIT** (Jam tidur $\ge$ 5 jam 30 menit).
  3. Perbarui masa berlaku kompetensi SIMPER karyawan tersebut di modul Employees.

### 4. Masalah: Dropdown "Digger (fleet leader)" Kosong Saat Tambah Fleet

- **Penyebab**: Dropdown ini hanya menampilkan unit yang memenuhi **dua syarat sekaligus**:
  1. Kategori unit = `BIG_DIGGER` atau `MEDIUM_DIGGER` (kolom `category` di tabel `units_db`) — pada data lama kolom ini kosong sehingga semua unit terfilter keluar.
  2. Unit **belum menjadi digger (fleet leader) fleet lain** — sengaja disembunyikan agar tidak ada fleet dengan digger ganda. Pada data seed, keempat digger `EX5002`, `EX7001`, `EX7007`, `EX8001` sudah dipakai fleet #1–#4 sehingga tidak muncul saat **menambah** fleet baru.
- **Solusi**:
  1. Pastikan migration sudah dijalankan: `cd universev2-backend && go run ./cmd/migrate` (file `000015_seed_units_db_category` & `000016_seed_units_db_full`). Setelah itu tersedia 18 digger cadangan beserta ratusan unit OHT.
  2. Jika daftar tetap kosong, cek via SQL: `SELECT code, category FROM units_db WHERE category IN ('BIG_DIGGER','MEDIUM_DIGGER') AND is_active;`
  3. Cara cepat tanpa migrasi ulang: buat unit baru lewat **Master → Units** lalu pilih kategori `BIG_DIGGER`/`MEDIUM_DIGGER` pada form, barulah unit itu muncul di dropdown Digger.

### 5. Masalah: error `duplicate key value violates unique constraint pkey (SQLSTATE 23505)` saat buat unit / fleet

- **Penyebab**: seed migration `000002` memasukkan baris dengan **id eksplisit** (mis. `1..8`) tanpa menyetujuduhkan sequence `SERIAL` ke `MAX(id)`. Pada database baru di-clone, `nextval()` belum lonceng, sehingga id baru untuk `INSERT` sudah dipakai oleh baris lama → bentrok primary key. Gejala muncul justri _setelah_ data master tampak lengkap — "mengapa tiba-tiba create gagal?" bukan karena data duplikat.
- **Solusi**:
  1. Migration korektif `000017_fix_sequences` akan loncengkan **seluruh** sequence ke `MAX(id)` tiap tabel: `cd universev2-backend && go run ./cmd/migrate`.
  2. Verifikasi: `SELECT (SELECT MAX(id) FROM units_db) AS max_id, (SELECT last_value FROM units_db_id_seq) AS seq_last;` → pastikan `seq_last >= max_id`. Kemudian buat unit baru via **Master → Units**; `POST /api/units/db` kini sukses dengan id bebas.
  3. Setval manual bila perlu mengganti sequence tertentu:
     ```sql
     SELECT setval(pg_get_serial_sequence('public.units_db','id'),
                   GREATEST((SELECT COALESCE(MAX(id), 1) FROM units_db), 1),
                   (SELECT MAX(id) FROM units_db) IS NOT NULL);
     ```
- **Catatan**: ini bukan data duplikat — hanya urutan id yang ketinggalan. Setelah `000017` berjalan, semua create (Units, Fleet Setting, Roster, dst.) bebas `23505`.
