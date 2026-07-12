# 0003 — Layar kiosk sebagai route Next.js (menggantikan aset statis)

- Status: Accepted
- Tanggal: 2026-07-12
- Menggantikan: [0002](0002-kiosk-static-assets.md)

## Konteks

ADR 0002 menaruh layar kiosk sebagai HTML statis verbatim di `public/kiosk/`. Keputusan
itu murah dan setia pada berkas desain, tetapi konsekuensinya buruk untuk arah proyek:
data hardcode di dalam HTML, gaya di luar sistem token/komponen (butuh `tokens.css`
duplikat), dan tidak ada jalur wajar menuju integrasi backend. Pemilik proyek meminta
kiosk dibangun dengan Next.js.

## Keputusan

1. Kiosk menjadi **route Next.js** `app/kiosk/{attendance,fleet,fitwork,fingerprint}`
   di luar route group `(app)` (tanpa shell admin, tanpa cek auth — layar TV standalone).
2. Perilaku khas kiosk dipusatkan di `app/kiosk/_components/`:
   `KioskShell` (kanvas 1920×1080 letterbox via `transform:scale`, jam real-time,
   indikator kesegaran 30 dtk, pixel-shift anti burn-in, banner koneksi + demo switch)
   dan `KioskTable`/`KioskBadge` (tipe 22–80 px, header pinned + isi auto-scroll loop).
3. **Dark-only tanpa resolver**: token gelap di `globals.css` kini juga dideklarasikan
   pada selector `[data-theme="dark"]`, dan `KioskShell` membungkus konten dengan
   `data-theme="dark"` — kiosk selalu gelap meski preferensi tema admin terang.
4. Data mock dipindah ke `lib/data/kiosk.ts`; `public/kiosk/` (termasuk `tokens.css`)
   dihapus. Overlay admin (`KioskProvider`, ADR 0002) tetap — iframe kini memuat route
   internal (`/kiosk/attendance` dst.).
5. Animasi kiosk (`pxshift`, `kscroll`, `kblink`) hidup sebagai keyframes global di
   `globals.css` dengan aturan `prefers-reduced-motion`.

## Konsekuensi

- Kiosk kini satu sistem dengan aplikasi: token dari `globals.css`, ikon lucide,
  data dari `lib/data/*` — saat backend siap, kiosk tinggal membaca sumber data yang
  sama dengan halaman admin (SSE/polling), tanpa migrasi format.
- Perubahan desain kiosk tidak lagi bisa "disalin verbatim"; harus diporting ke JSX
  seperti halaman lain (konsisten dengan ADR 0001).
- URL kiosk berubah dari `/kiosk/*.html` menjadi `/kiosk/*` — TV yang menunjuk URL
  lama perlu diarahkan ulang.
