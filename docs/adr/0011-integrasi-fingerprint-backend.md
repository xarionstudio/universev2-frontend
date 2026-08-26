# 0011 — Modul Mesin Fingerprint tersambung ke backend Go

- Status: Accepted (mengamandemen [0009](0009-ping-mesin-fingerprint.md))
- Tanggal: 2026-08-25

## Konteks

ADR 0009 membangun master mesin fingerprint sebagai mock: seed 12 mesin di
`lib/data/fingerprint.ts`, seluruh mutasi hidup di state React (`app-store`),
dan konsekuensinya dinyatakan terang-terangan — "data aplikasi masih di memori
browser, layar TV di perangkat lain memulai dari seed sampai backend
tersambung".

Backend-nya kini ada: tabel `fingerprint_devices` beserta CRUD-nya
(`/api/fingerprint/devices`), proyeksi untuk TV (`/api/display/fingerprint`),
dan worker sync yang menulis `isOnline`/`lastSync` sungguhan dari mesin
(`POST /api/fingerprint/sync`). Helper API frontend di
`lib/api/endpoints/misc.ts` juga sudah cocok dengan tag JSON modelnya. Yang
belum ada hanyalah kabelnya.

Satu gesekan bentuk: `FpMachine.id` di frontend adalah KODE mesin ("FP-01") —
tampil besar di layar TV dan boleh diganti admin — sedangkan identitas baris
di backend adalah `id` numerik auto-increment.

## Keputusan

1. **Seed `initialFpMachines` dihapus.** `fpMachines` di app-store lahir
   kosong dan dihidrasi halaman admin dari `GET /api/fingerprint/devices`
   lewat adapter `toFpMachine` di `lib/api/adapters.ts` — berkas jembatan
   yang sama dengan user/role. Pola muat/error/retry meniru tab Halaman Auth
   di Settings (halaman pertama yang tersambung penuh).

2. **`FpMachine` mendapat `dbId: number`** — id numerik backend, identitas
   untuk PUT/DELETE dan untuk mutasi state (upsert/delete/ping). `id` tetap
   kode mesin yang tampil di UI; tidak ada perilaku tampilan yang berubah.

3. **CRUD menulis ke backend dulu, state menyusul dari respons API** —
   `createFingerprintDevice`/`updateFingerprintDevice`/`deleteFingerprintDevice`,
   toast error memakai pola `toastErr` yang sama dengan tab Halaman Auth.
   Payload update **selalu menyertakan `isActive` eksplisit** (kini diwajibkan
   tipe helper-nya): handler backend menyalin field itu tanpa cek kosong,
   jadi melewatkannya berarti mengirim `false` dan menonaktifkan mesin
   diam-diam. `lastPing` satu-satunya field yang tetap milik klien.

4. **Tombol "Tarik Absen Sekarang"** (hanya `can("fingerprint","manage")`)
   memanggil `POST /api/fingerprint/sync`, ber-spinner selama menunggu (mesin
   offline memakan timeout ~3 dtk per perangkat), menampilkan `totalSynced`,
   lalu memuat ulang daftar — kolom "Koneksi" (Online/Offline) kini adalah
   `isOnline` hasil sync backend, bukan seed.

5. **Layar TV membaca `GET /api/display/fingerprint`**, bukan store tab —
   store tab TV selalu kosong tanpa seed. Proyeksi backend (`DisplayFpDevice`)
   memang dibentuk sama dengan `DisplayMachine`: kode sebagai id, tanpa
   IP/port (ADR 0009 tetap berlaku: kiosk tidak menerima alamat jaringan).
   `fpDisplayMachines` menyusut jadi pengurut kartu. Layar memuat ulang tiap
   60 detik dan mendiamkan kegagalan sambil mempertahankan data lama — tidak
   ada operator di depan TV yang bisa membaca toast. Auth kiosk tidak butuh
   apa-apa yang baru: sesi di localStorage terbaca di tab pratinjau, dan
   klien API sudah menempelkan Bearer token sendiri.

6. **Fitur Ping tidak disentuh** — tetap route Next lokal
   `/api/fingerprint/ping` (ADR 0009/0010), dan hasilnya tetap tidak menimpa
   `online`.

## Konsekuensi

- Butir "data-di-memori" pada Konsekuensi ADR 0009 **tidak berlaku lagi untuk
  modul ini**: layar TV di perangkat mana pun kini menampilkan daftar yang
  sama dengan modul admin, karena keduanya membaca backend yang sama.
- Kartu "Scan Hari Ini" di TV menampilkan 0 untuk sementara: `meta` dari
  backend baru berisi jejak waktu sinkron, belum jumlah scan. Mengisinya
  adalah pekerjaan backend (`GetDisplayFingerprint`), bukan frontend.
- `nextFpId` menghitung kode berikutnya dari daftar hasil hidrasi — saran
  kode di form baru benar hanya setelah daftar termuat, seiring halaman yang
  memang menahan tabelnya sampai hidrasi selesai.
- Halaman admin tanpa backend hidup kini menampilkan kotak "Gagal memuat" +
  tombol muat ulang, bukan 12 mesin fiktif yang tampak sehat.
