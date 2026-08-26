# 0012 — Paritas validasi register + role default pendaftar dari Settings

- Status: Accepted
- Tanggal: 2026-08-25

## Konteks

Pendaftaran lewat `/register` sering gagal tanpa alasan yang bisa dipahami
pengguna, karena tiga hal yang saling menumpuk:

1. Validasi klien lebih longgar dari backend: klien hanya memeriksa panjang
   password ≥ 8 dan NIK non-kosong, sedangkan backend
   (`internal/service/auth_service.go` + `internal/pkg/validate.go`) menuntut
   password ber-huruf DAN ber-angka (maks 72), NIK persis 9 digit, dan nama
   maks 100 karakter. Formulir yang "lolos" di klien tetap ditolak server.
2. Kartu gagal memakai `errorMessage()` yang hanya membaca message top-level —
   respons 422 backend bertuliskan "Validation failed", padahal alasan
   sebenarnya ("NIK harus 9 digit", "email sudah terdaftar") ada di
   `fieldErrors` per field dan tidak pernah tampil.
3. Syarat password tidak pernah diberitahukan sebelum submit.

Terpisah dari itu, role akun baru di-hardcode `[]string{"3"}` (Viewer) di
backend — superadmin tidak bisa mengubah kebijakan itu tanpa deploy ulang,
padahal Settings → Halaman Auth sudah menjadi rumah pengaturan alur auth.

## Keputusan

1. **Validasi klien menyalin aturan backend, dari sumber yang sudah ada.**
   `passwordIssues()` di `lib/password.ts` (cermin `IsPasswordStrong`) dipakai
   halaman register — bukan menulis regex baru; NIK divalidasi `^\d{9}$`
   dengan input yang menyaring non-digit dan `maxLength=9`; nama `maxLength`
   100; password `maxLength` 72. Backend tetap memvalidasi ulang semuanya —
   klien murni kenyamanan.
2. **Syarat password tampil proaktif** sebagai helper text kecil di bawah
   field password (string `umPwHelp` yang sama dengan halaman Users), bukan
   baru muncul setelah gagal.
3. **Kartu gagal menampilkan alasan spesifik.** Util baru `errorDetail()` di
   `lib/api/error.ts` merangkai pesan-pesan `fieldErrors` (pola `toastErr`
   yang sudah dipakai tab Settings) dan jatuh ke `errorMessage()` bila kosong;
   `errorMessage()` sendiri tidak berubah demi pemakai lamanya. Tab Halaman
   Auth ikut memakai util ini menggantikan salinan lokalnya.
4. **Role default pendaftar diatur superadmin**, di Settings → Halaman Auth
   bagian "Role pendaftar baru": `GET /api/settings/registration` menjawab
   `{ defaultRoleId, roles }` (roles tanpa Superadmin/terkunci),
   `PUT /api/settings/registration` menyimpan `{ defaultRoleId }` — helper di
   `lib/api/endpoints/settings.ts`. Kontrol hanya aktif bila
   `can("settings","manage")`; bagian ini memuat datanya terpisah supaya
   kegagalan endpoint baru tidak menjatuhkan pengelolaan slide/opsi.
5. **Email register dikunci domain perusahaan**: field email hanya menerima
   nama (local part) dengan suffix `@universe.com` permanen di UI; backend
   menolak domain lain saat register (`RegisterEmailDomain`,
   `internal/service/auth_service.go`). Login akun lama berdomain lain
   (mis. seed `@unggul.co.id`) tidak terpengaruh.

## Konsekuensi

- Pengguna melihat seluruh kekurangan formulir sebelum menyentuh jaringan,
  dan bila server tetap menolak, alasannya per-field — bukan "Validation
  failed". `t.regFailB` tinggal jadi fallback saat jaringan mati.
- Aturan password kini tertulis di dua tempat (Go dan `lib/password.ts`) —
  sudah begitu sejak halaman Users; mengubah aturan berarti mengubah keduanya.
- `id` role diperlakukan longgar (`string | number`) dan dikirim balik apa
  adanya dari respons GET: backend merujuk role sebagai string di `user.Roles`
  tetapi primary key-nya numerik, dan frontend tidak boleh menebak.
- Komentar "akun baru selalu Viewer" di klien tidak lagi akurat dan sudah
  diarahkan ke setting baru; nilai bawaannya sendiri tetap Viewer sampai
  superadmin mengubahnya.
