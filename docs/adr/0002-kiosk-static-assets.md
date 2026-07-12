# 0002 — Layar kiosk sebagai aset statis + overlay iframe fullscreen

- Status: Superseded by [0003](0003-kiosk-nextjs-routes.md)
- Tanggal: 2026-07-12

## Konteks

Update desain (proyek Claude Design "UNIVERSE Redesign") mengubah halaman admin Kiosk
Display: tombol "Buka layar kiosk" tidak lagi stub, melainkan menampilkan layar kiosk
sungguhan fullscreen (Esc untuk keluar), dengan tombol per-konten (Attendance / Fit To
Work / Fingerprint di halaman Display Attendance; Fleet di Display Fleet) dan tombol
pratinjau per-display. Layar kiosk di sumber desain adalah HTML standalone
(`kiosk/*.html` + `kiosk.css`): dark-only, kanvas 1920×1080 di-letterbox via
`transform:scale()`, jam real-time, auto-scroll header-pinned, pixel-shift anti burn-in,
banner koneksi, dan demo switch online/terputus.

## Keputusan

1. Layar kiosk dipertahankan sebagai **HTML statis verbatim** di `public/kiosk/`
   (attendance/fitwork/fleet/fingerprint + `kiosk.css`) — bukan diporting ke React.
   Satu-satunya perubahan: link stylesheet design-system diarahkan ke
   `public/kiosk/tokens.css` (salinan token dark-only; font self-hosted diganti
   Google Fonts Instrument Sans + Geist Mono).
2. Admin menampilkannya lewat **overlay fullscreen ber-iframe** di
   `app/(app)/display/_components/display-admin.tsx` (z-400, latar `#010416`,
   tombol "Tutup kiosk" kanan-atas, Esc menutup). Peta konten → URL ada di
   `KIOSK_URLS`.

## Konsekuensi

- Kiosk tetap dark-only dan bebas dari resolver tema/bundle admin — sesuai desain
  (TV tidak memuat theme resolver) dan tanpa menambah berat bundle Next.js.
- Perubahan desain kiosk cukup disalin ulang ke `public/kiosk/` (sumber kebenaran
  tetap proyek Claude Design).
- Data di layar kiosk masih hardcode di HTML-nya (sesuai mock); saat integrasi
  backend, kiosk perlu diganti menjadi halaman ber-data (kandidat: route Next.js
  `/kiosk/*` dark-only) — keputusan terpisah nanti.
