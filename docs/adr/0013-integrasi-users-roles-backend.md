# 0013 — Menu User & Roles tersambung ke backend Go

- Status: Accepted
- Tanggal: 2026-08-25

## Konteks

Halaman User dan Roles adalah sisa mock terakhir modul users: `umUsers`/
`umRoles` diseed dari `lib/data/users.ts` dan seluruh mutasi hidup di state
React. Akibat nyatanya, akun yang mendaftar lewat halaman register tersimpan
di database tetapi tidak pernah tampil di menu User, sehingga Superadmin tidak
bisa mengubah role, menonaktifkan, atau menghapusnya. Endpoint backend-nya
sendiri sudah lengkap (`/api/users`, `/api/roles` — view untuk GET, manage
untuk mutasi), begitu pula helper frontend di `lib/api/endpoints/users.ts`;
yang belum ada hanyalah kabelnya — persis situasi ADR 0011 pada modul
fingerprint.

## Keputusan

1. **Seed `initialUmUsers`/`initialUmRoles` dihapus.** `umUsers`/`umRoles`
   di app-store lahir kosong dan dihidrasi kedua halaman dari
   `GET /api/users` + `GET /api/roles` (Promise.all — masing-masing halaman
   butuh keduanya) lewat adapter `toUmUsers`/`toUmRoles`, dengan pola
   muat/error/retry ADR 0011.

2. **Identitas: `UmUser.id`/`UmRole.id` = id numerik backend dalam bentuk
   string** (`String(ApiUser.id)`) — jalur yang sudah dipakai `toUmUser` di
   sesi login, jadi penjaga `me.id === target.id` tetap cocok tanpa perlu
   `dbId` terpisah ala fingerprint (tidak ada id tampilan berbeda di sini).

3. **CRUD menulis ke backend dulu, state menyusul.** Tambah user memakai
   `createUser` (form mendapat field password awal — backend mewajibkannya);
   edit memakai `updateUser` + `toggleUserStatus` bila status berubah (PUT
   tidak menyentuh `is_active`); tombol hapus baru memakai `deleteUser`
   dengan pagar "bukan diri sendiri, bukan Superadmin aktif terakhir".
   Atur ulang password menumpang `password` opsional di `updateUser` — tidak
   ada lagi hashing di klien. Role: `createRole`/`updateRole`/`deleteRole`;
   role terkunci tetap read-only di UI, selaras 403 backend.

4. **Matriks permission ditulis lewat `toApiPermMap`** — kebalikan
   `toPermMap`: modul `fingerprint` dibuang saat menulis karena penegakan
   `/api/fingerprint` menumpang `settings` (MODULE_FALLBACK); menyimpannya
   akan membuat UI menampilkan akses yang tidak pernah ditegakkan.

5. **Export memakai CSV backend** (`exportUsers`/`exportRoles`, unduh blob);
   import user memakai `POST /api/users/import` lalu memuat ulang daftar.
   Import role tetap simulasi klien — backend tidak punya endpoint-nya.

## Konsekuensi

- Akun hasil register langsung tampil dan bisa dikelola; perubahan role/user
  tersimpan nyata di database, bukan hilang saat refresh.
- Field `pwSalt`/`pwHash` hilang dari `UmUser` (digest tidak pernah sampai
  klien); kolom "Password" kini membaca `pwAt`, sehingga akun yang belum
  pernah ganti password tampil "Belum diatur" walau punya password.
- Melepas tautan karyawan saat edit tidak menghapus nama/NIK di server
  (backend mewajibkan `name` dan mengabaikan NIK kosong); akun baru tanpa
  tautan memakai bagian lokal email sebagai nama.
- Tanpa backend hidup, kedua halaman menampilkan kotak "Gagal memuat" +
  tombol muat ulang, bukan lima user fiktif yang tampak sehat.
