# UNIVERSE — Frontend

Antarmuka web UNIVERSE (Unggul Network for Integrated Vehicle Resource Smart
Ecosystem). Next.js 16 App Router, Tailwind v4, TypeScript.

Backend Go dan Postgres-nya berada di [`../universev2-backend`](../universev2-backend).

## Satu origin, bukan dua

Hal paling penting untuk dipahami sebelum menyentuh apa pun: **browser tidak
pernah memanggil backend secara langsung.** Frontend meneruskan `/api` dan
`/uploads` ke backend lewat rewrite di `next.config.ts`, jadi semua permintaan
pergi ke origin halaman itu sendiri.

Empat masalah produksi hilang karena keputusan ini:

- **CORS tidak pernah ikut bermain.** Tidak ada lagi daftar origin yang harus
  diperbarui setiap kali domain atau port berubah.
- **Tidak ada mixed content.** Halaman HTTPS yang memanggil backend HTTP
  diblokir browser. Dengan path relatif, skemanya selalu ikut halaman.
- **Cookie `jwt` menjadi same-origin**, tidak bergantung pada `SameSite=Lax`
  yang kebetulan masih lolos antar port.
- **Optimizer gambar Next ikut benar.** Optimizer mengambil berkas dari sisi
  server; URL absolut ke `localhost:8080` akan menunjuk container frontend
  sendiri, sedangkan `/uploads` relatif tetap di dalam container lalu
  diteruskan.

Konsekuensinya ada dua alamat dengan peran berbeda, dan keduanya ditentukan
saat **build**:

| variabel                   | dilihat oleh          | bawaan                |
| -------------------------- | --------------------- | --------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | browser               | `/api` (relatif)      |
| `BACKEND_ORIGIN`           | proses Next di server | `http://backend:8080` |

Keduanya di-inline saat `next build` — `NEXT_PUBLIC_*` ke dalam bundel browser,
`BACKEND_ORIGIN` ke dalam `routes-manifest.json`. Mengubahnya berarti build
ulang; `restart` container tidak mengubah apa pun.

## Menjalankan di mesin sendiri

```bash
pnpm install
pnpm dev
```

Buka <http://localhost:3000>. Nilai untuk mesin pengembang ada di `.env.local`
(templatnya `.env.example`) — di sana `BACKEND_ORIGIN` menunjuk
`http://localhost:8080` karena backend dijangkau lewat port yang dipetakan ke
host.

| perintah         | kegunaan               |
| ---------------- | ---------------------- |
| `pnpm build`     | build produksi         |
| `pnpm start`     | menyajikan hasil build |
| `pnpm typecheck` | `tsc --noEmit`         |
| `pnpm lint`      | ESLint                 |
| `pnpm format`    | Prettier               |

## Menjalankan lewat Docker

Stack frontend berdiri sebagai **project Compose sendiri**, terpisah dari stack
backend. Itu disengaja: nama volume Compose diberi awalan nama project, sehingga
menarik `db` dan `backend` ke dalam project baru akan membuat `pgdata` menjadi
volume baru yang kosong dan meninggalkan data yang sudah ada di
`universev2-backend_pgdata`. Di Docker Desktop keduanya tampak sebagai dua stack
bersebelahan.

Backend harus menyala lebih dulu — frontend bergabung ke jaringannya dan
memerlukan nama service `backend` bisa diresolusi. Dari folder
`universev2-backend`:

```bash
docker compose --env-file .env.docker up -d --build
```

Lalu frontend, dari folder ini:

```bash
docker compose --env-file .env.docker up -d --build
```

Buka <http://localhost:3000>. Container bernama `universev-frontend`.

`--env-file .env.docker` tidak boleh dilewatkan — Compose hanya membaca `.env`
secara otomatis, dan tanpa berkas itu semua `${...}` jatuh ke nilai bawaan.

Port host bisa diubah lewat `FRONTEND_PORT_MAP` tanpa menyentuh apa pun di sisi
backend; sejak frontend memproxy, origin browser tidak lagi terikat pada
`CORS_ALLOWED_ORIGINS`. Yang perlu diingat hanya `pnpm dev` juga memakai 3000,
jadi keduanya tidak bisa menyala bersamaan.

Kalau backend **tidak** dijalankan lewat Docker, arahkan `BACKEND_ORIGIN` ke
`http://host.docker.internal:8080` dan hapus blok `networks` di
`docker-compose.yml`.

### Mode pengembangan di dalam container

```bash
docker compose --env-file .env.docker \
  -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Kode sumber di-mount dari host, sedangkan `node_modules` dan `.next` ditaungi
volume anonim karena versi host-nya berisi biner Windows yang tidak bisa
dijalankan di Linux. Image-nya diberi tag terpisah (`universev2-frontend:dev`)
supaya tidak menimpa image produksi. Karena kode sumber di-mount, `.env.local`
milik host juga terlihat di dalam container — jadi di mode ini kedua variabel
alamat dibaca dari sana, bukan dari build arg.

**Mode ini tidak memberi hot-reload di Windows.** Ini hasil pengujian, bukan
dugaan: bind mount dari Windows tidak meneruskan event inotify, jadi watcher
Turbopack tidak pernah tahu berkas berubah. Perubahan di host memang sampai ke
dalam container, tetapi dev server tetap menyajikan versi lama.
`WATCHPACK_POLLING` dan `CHOKIDAR_USEPOLLING` tidak menolong (keduanya variabel
webpack, sedangkan Next 16 memakai Turbopack), dan `watchOptions.pollIntervalMs`
milik Next juga sudah dicoba tanpa hasil. Alurnya karena itu **ubah kode lalu
restart**:

```bash
docker compose --env-file .env.docker \
  -f docker-compose.yml -f docker-compose.dev.yml restart frontend
```

Untuk pengembangan sehari-hari `pnpm dev` di host jelas lebih baik. Mode ini
gunanya sempit tapi nyata: mereproduksi perilaku Linux — probe ICMP, resolusi
DNS antar container.

## Menaruh ke server produksi

Bentuk yang dituju: **satu pintu masuk saja.** Reverse proxy (nginx, Caddy,
Traefik) menerminasi TLS dan meneruskan semuanya ke frontend di port 3000.
Frontend yang meneruskan `/api` dan `/uploads` ke backend melalui jaringan
Docker internal.

```text
Internet ──HTTPS──> reverse proxy ──HTTP──> universev-frontend:3000
                                                    │
                                        /api, /uploads (jaringan Docker)
                                                    ↓
                                            universev-backend:8080 ──> db
```

Yang perlu dilakukan di server:

1. **Jangan publikasikan port backend ke publik.** Karena frontend
   menjangkaunya lewat jaringan Docker internal, `APP_PORT_MAP` di sisi backend
   tidak perlu diarahkan ke antarmuka publik sama sekali. Permukaan serangan
   berkurang tanpa mengubah apa pun di aplikasi.

2. **Biarkan `NEXT_PUBLIC_API_BASE_URL=/api`.** Justru inilah yang membuat image
   yang sama bisa dipakai di `localhost` maupun `https://universe.domain` tanpa
   dibangun ulang — tidak ada domain yang tertanam di bundel.

3. **Sesuaikan `BACKEND_ORIGIN` hanya bila topologinya berbeda.** Bawaannya
   `http://backend:8080` sudah benar untuk dua stack yang berbagi jaringan.

4. **Terminasi TLS di proxy, bukan di Next.** Next di sini melayani HTTP polos
   di jaringan internal. Pastikan proxy meneruskan `Host`,
   `X-Forwarded-Proto`, dan `X-Forwarded-For`.

5. **Verifikasi lewat `/api/health`.** Endpoint itu mengembalikan versi
   aplikasi, jadi bisa dipakai memastikan build yang benar-benar terpasang:

   ```bash
   curl -s https://universe.domain/api/health
   # {"ok":true,"service":"universev2-frontend","version":"v1.0.0"}
   ```

Hal-hal yang sudah disiapkan dan tidak perlu dipikirkan lagi: proses berjalan
sebagai pengguna non-root, base image dipatok sampai minor (`node:22.23-alpine3.24`)
supaya dua build di waktu berbeda menghasilkan runtime yang sama, log dirotasi
(`max-size 10m`, 3 berkas) supaya tidak menghabiskan disk, `restart:
unless-stopped`, dan healthcheck yang tidak ikut merah saat backend turun.

### Perintah perawatan

```bash
docker compose --env-file .env.docker logs -f frontend   # ikuti log
docker compose --env-file .env.docker ps                 # status + health
docker compose --env-file .env.docker restart frontend   # restart
docker compose --env-file .env.docker down               # matikan
```

Kesehatan container dibaca dari `GET /api/health`, yang hanya melaporkan
kesiapan proses Next — sengaja tidak menyentuh backend, supaya frontend tidak
ditandai `unhealthy` (lalu di-restart) hanya karena backend sedang turun.

## Hal yang perlu diketahui

- **Route handler frontend menang atas proxy.** Rewrite dipasang di
  `afterFiles`, jadi `/api/health`, `/api/device/ping`, `/api/fingerprint/ping`,
  dan `/api/streamtest` dilayani frontend sendiri; sisanya diteruskan ke
  backend. Kalau backend nanti punya endpoint dengan path yang sama persis,
  punya frontend yang terpakai.

- **Trailing slash diteruskan apa adanya.** `skipTrailingSlashRedirect` menyala
  karena normalisasi 308 milik Next mengeluarkan `Location` absolut dengan
  skema yang dia lihat — di belakang TLS-termination itu bisa melempar
  panggilan API dari https ke http. Aman dimatikan karena backend memakai
  `fiber.Config` tanpa `StrictRouting`, sehingga `/api/users` dan `/api/users/`
  menuju handler yang sama.

- **Batas ukuran unggahan lewat proxy 25 MB**
  (`experimental.proxyClientMaxBodySize`). Bawaan Next 10 MB, dan kalau
  terlampaui yang muncul adalah galat ukuran yang tidak jelas asalnya. Naikkan
  di `next.config.ts` bila impor Excel bertambah besar.

- **Probe perangkat fingerprint.** `POST /api/device/ping` memakai koneksi TCP
  dan `ping` ICMP ke perangkat di LAN. Karena itu image runtime memasang
  `iputils-ping`, dan compose menyetel `net.ipv4.ping_group_range` agar proses
  non-root boleh membuka socket ICMP. Lalu lintas ke LAN keluar lewat NAT bridge
  Docker, jadi perangkat di jaringan kantor tetap terjangkau — tetapi alamat
  yang diprobe harus alamat yang bisa dirutekan dari host, bukan `localhost`.

- **Versi aplikasi.** Ditampilkan di footer setiap halaman dan dibaca dari
  `version` di `package.json` melalui `lib/version.ts`. Menaikkan versi cukup
  di satu tempat itu.
