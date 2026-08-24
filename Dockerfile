# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────────────────────────────────
# Image produksi frontend Next.js.
#
# Tiga stage supaya yang terkirim ke registry hanya hasil akhirnya:
#   deps    — unduh dependensi (di-cache selama lockfile tidak berubah)
#   builder — `next build`, menghasilkan bundel standalone
#   runner  — node + berkas hasil build saja, tanpa pnpm dan tanpa devDeps
#
# Dua nilai ditentukan saat BUILD, bukan saat container dijalankan. Keduanya
# tidak bisa diubah lewat `environment:` di compose; mengubahnya butuh --build.
#
#   BACKEND_ORIGIN — tujuan proxy /api dan /uploads. Next menuliskan hasil
#   rewrites() ke routes-manifest.json saat build, dan next.config.ts tidak ikut
#   ke bundel standalone. Bawaannya nama service Docker (`backend`) supaya satu
#   image berlaku di semua lingkungan: yang memutuskan arti nama itu adalah
#   jaringan Docker, bukan isi image.
#
#   NEXT_PUBLIC_API_BASE_URL — alamat yang dipakai BROWSER. Bawaannya relatif
#   ("/api"), jadi tidak ada domain yang perlu ditanam ke dalam bundel sama
#   sekali. Ini yang membuat image aman dipindah antar lingkungan: HTTPS, nama
#   domain, dan nomor port ditentukan oleh URL yang dibuka pengguna.
#
# Versi base image dipatok sampai minor (bukan `22-alpine` yang mengambang)
# supaya dua build di waktu berbeda menghasilkan runtime yang sama.
# ──────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=22.23-alpine3.24
ARG PNPM_VERSION=11.15.1

# ---- Stage 1: dependensi ----
FROM node:${NODE_VERSION} AS deps

# libc6-compat: biner native Next (SWC) ditautkan ke glibc, sedangkan Alpine
# memakai musl. Tanpa shim ini `next build` gagal memuat SWC.
RUN apk add --no-cache libc6-compat

ARG PNPM_VERSION
RUN npm install --global pnpm@${PNPM_VERSION}

WORKDIR /app

# husky memasang git hook saat lifecycle `prepare`; di dalam image tidak ada
# .git (dan tidak perlu ada), jadi langkah itu dilewati.
ENV HUSKY=0

# Hanya manifes yang disalin lebih dulu: selama ketiga berkas ini tidak
# berubah, Docker memakai layer hasil install yang sudah ada.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Stage 2: build ----
FROM node:${NODE_VERSION} AS builder

RUN apk add --no-cache libc6-compat

ARG PNPM_VERSION
RUN npm install --global pnpm@${PNPM_VERSION}

WORKDIR /app

ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Keduanya terpaku ke hasil build — lihat catatan di kepala berkas ini.
ARG NEXT_PUBLIC_API_BASE_URL=/api
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ARG BACKEND_ORIGIN=http://backend:8080
ENV BACKEND_ORIGIN=${BACKEND_ORIGIN}

RUN pnpm build

# ---- Stage 3: runtime ----
FROM node:${NODE_VERSION} AS runner

# iputils-ping wajib ada: /api/device/ping memakai ICMP sebagai cadangan untuk
# memisahkan "perangkat mati" dari "port tertutup" (lihat lib/device-probe.ts).
# Tanpa biner ping, probe itu selalu menjawab "spawn-failed".
RUN apk add --no-cache libc6-compat iputils-ping

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Wajib, dan bukan karena bawaannya localhost. Baris di .next/standalone/server.js
# adalah `process.env.HOSTNAME || '0.0.0.0'`, sementara Docker sendiri mengisi
# HOSTNAME dengan id container (mis. 87758527cac7). Tanpa baris ini Next mengikat
# nama itu — kebetulan masih bisa diakses karena namanya beresolusi ke IP bridge
# container, tetapi bergantung pada resolusi nama yang tidak dijamin. 0.0.0.0
# menghilangkan ketergantungan itu.
ENV HOSTNAME=0.0.0.0

# Bukan root: kalau ada celah RCE di sini, penyerang tidak langsung mendapat
# uid 0 di dalam container. Image node sudah punya uid 1000 (`node`), jadi
# dipakai 1001 agar tidak bertabrakan.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

# public/ tetap milik root dan hanya bisa dibaca — tidak ada alasan proses
# server bisa menulisi asetnya sendiri.
COPY --from=builder /app/public ./public

# Keluaran standalone sudah membawa node_modules hasil pemangkasan di dalamnya.
# .next/static tidak ikut dan harus disalin terpisah — ini yang sering
# terlewat dan membuat halaman tampil tanpa CSS sama sekali.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
