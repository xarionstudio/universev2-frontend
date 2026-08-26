import type { NextConfig } from "next";

/* Akar proyek dipatok eksplisit. Tanpa ini Next menebaknya dari lockfile
   terdekat ke atas dan menemukan package-lock.json di D:\YAS\universe-real,
   lalu memperlakukan folder itu sebagai akar. Akibatnya bukan cuma peringatan:
   keluaran `output: "standalone"` ikut bersarang satu tingkat
   (.next/standalone/universev2-frontend/server.js), yang membuat COPY di
   Dockerfile menunjuk path yang salah tergantung di mana build dijalankan.

   process.cwd() dipakai, bukan __dirname/import.meta.dirname, karena berkas
   config ini bisa dimuat sebagai CJS maupun ESM dan hanya salah satu dari
   kedua konstanta itu yang tersedia. `next build`/`next dev` selalu berjalan
   dengan cwd = folder proyek (di container: /app). */
const projectRoot = process.cwd();

/* Alamat backend dilihat dari SISI SERVER — proses Next, bukan browser.
   Dipakai sebagai tujuan rewrite di bawah.

   PENTING: nilainya ditentukan saat BUILD, bukan saat container dijalankan.
   Next menuliskan hasil rewrites() ke .next/routes-manifest.json dan
   next.config.ts sendiri tidak ikut ke bundel standalone, jadi mengubah
   variabel ini menuntut build ulang. Itu sebabnya bawaannya nama service
   Docker (`backend`) dan bukan alamat konkret: nama yang sama berlaku di mesin
   pengembang maupun di server, dan yang menentukan artinya adalah jaringan
   Docker — bukan isi image. Satu image jadi bisa dipakai di mana saja. */
const backendOrigin = (
  process.env.BACKEND_ORIGIN ?? "http://backend:8080"
).replace(/\/+$/, "");

/* Alamat backend dilihat dari BROWSER. Bawaannya relatif — lihat komentar
   panjang di lib/api/client.ts soal kenapa relatif adalah pilihan yang benar.
   Bentuk absolut masih didukung supaya penyiapan lama tidak langsung rusak. */
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const apiBaseIsAbsolute = /^https?:\/\//i.test(apiBase);

const nextConfig: NextConfig = {
  /* Bundel mandiri untuk Docker: hanya server.js + berkas yang benar-benar
     terpakai yang disalin ke image, jadi node_modules penuh (±1 GB) tidak
     perlu ikut. Tidak berpengaruh pada `pnpm dev` maupun `pnpm start`. */
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  turbopack: { root: projectRoot },

  /* Next menormalkan trailing slash dengan redirect 308, dan `Location`-nya
     absolut lengkap dengan skema yang DIA lihat. Di belakang reverse proxy yang
     menerminasi TLS, yang dilihatnya http — jadi panggilan API dari halaman
     https bisa dilempar ke http. Klien memang memanggil beberapa endpoint
     dengan trailing slash (lihat /users/ dan /roles/ di lib/api/endpoints),
     jadi ini bukan kasus pinggiran.

     Dimatikan supaya path diteruskan apa adanya ke backend. Aman karena
     backend memakai fiber.Config tanpa StrictRouting (bawaannya false),
     sehingga /api/users dan /api/users/ menuju handler yang sama. */
  skipTrailingSlashRedirect: true,

  /* Frontend meneruskan /api dan /uploads ke backend, sehingga browser hanya
     pernah berbicara dengan satu origin. Yang dibeli oleh keputusan ini:

       - CORS hilang sebagai konsep. Tidak ada lagi CORS_ALLOWED_ORIGINS yang
         harus diingat setiap kali domain atau port berubah.
       - Tidak ada mixed content. Situs HTTPS yang memanggil backend HTTP
         diblokir browser; dengan path relatif, skema selalu ikut halaman.
       - Cookie `jwt` menjadi same-origin, jadi tidak bergantung pada
         SameSite=Lax yang kebetulan masih lolos antar port.
       - Optimizer gambar Next ikut benar. Optimizer mengambil berkas dari sisi
         server; URL absolut ke localhost:8080 menunjuk container frontend
         sendiri di dalam Docker, sedangkan /uploads relatif tetap di dalam
         container lalu diteruskan ke backend.

     afterFiles, BUKAN beforeFiles: route handler milik frontend sendiri
     (/api/health, /api/device/ping, /api/fingerprint/ping, /api/streamtest)
     harus menang lebih dulu. Konsekuensinya, kalau backend nanti punya
     endpoint dengan path yang sama persis, punya frontend yang terpakai. */
  async rewrites() {
    return {
      afterFiles: [
        { source: "/api/:path*", destination: `${backendOrigin}/api/:path*` },
        {
          source: "/uploads/:path*",
          destination: `${backendOrigin}/uploads/:path*`,
        },
      ],
    };
  },

  experimental: {
    /* Batas ukuran body yang boleh lewat proxy rewrite. Disebut eksplisit
       karena inilah yang memutus impor Excel dan unggah foto kalau kelewat:
       bawaan Next 10 MB, dan kegagalannya muncul sebagai galat ukuran yang
       tidak jelas asalnya. 25 MB memberi ruang tanpa membuatnya tanpa batas. */
    proxyClientMaxBodySize: 25 * 1024 * 1024,

    /* Batas waktu proxy rewrite, dalam milidetik. Bawaan Next 30 detik —
       tepat di ambang yang bisa dilampaui POST /api/fingerprint/sync: backend
       menjalani mesin BERURUTAN dan tiap mesin offline memakan timeout penuh
       3 detik (pkg/solutionx100c, Timeout 3s), jadi 10 mesin mati saja sudah
       ±30 detik. Tanpa ini admin mendapat toast gagal padahal sync backend
       jalan terus sampai selesai. 120 detik memberi ruang untuk puluhan mesin
       tanpa membuat permintaan macet menggantung selamanya. */
    proxyTimeout: 120_000,
  },

  /* Hanya relevan bila NEXT_PUBLIC_API_BASE_URL disetel absolut. Dengan base
     relatif, /uploads menjadi berkas lokal di mata Next sehingga remotePatterns
     tidak berlaku sama sekali. */
  images: apiBaseIsAbsolute
    ? {
        remotePatterns: [new URL(`${new URL(apiBase).origin}/uploads/**`)],
      }
    : {},
};

export default nextConfig;
