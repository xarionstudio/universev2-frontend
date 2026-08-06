# 0004 — Layar display dibuka di tab baru + fullscreen; penamaan "display"

- Status: Accepted
- Tanggal: 2026-07-12
- Mengamandemen: [0003](0003-kiosk-nextjs-routes.md) (route Next.js tetap; cara buka & penamaan berubah)

## Konteks

ADR 0003 menampilkan layar TV lewat overlay iframe di dalam admin (mengikuti mock
Claude Design v3). Hasil review pemilik proyek: perilaku yang diinginkan adalah layar
selalu terbuka di **tab baru** dan **fullscreen** (sejalan dengan perilaku desain v1
yang memakai `target="_blank"`), dan penamaan di kode memakai istilah produk
**"display"**, bukan "kiosk" — di UI produk layar-layar ini memang disebut display
(Display Attendance, Display Fleet, dst.).

## Keputusan

1. **Tab baru**: semua pembuka layar (tombol "Buka layar kiosk", ikon pratinjau per
   baris, dan anak sidebar Display Fit To Work / Monitoring Fingerprint) memanggil
   `openDisplay(url)` (`lib/open-display.ts`) = `window.open(url, "_blank", "noopener")`.
   Overlay iframe + `KioskProvider` dihapus.
2. **Fullscreen**: `DisplayShell` meminta `requestFullscreen()` saat layar dibuka;
   karena browser mensyaratkan gestur pengguna, interaksi pertama (pointer/keyboard)
   di layar juga memicunya. Di TV sungguhan, browser mode kiosk tetap jadi andalan.
3. **Penamaan "display"**: layar TV di `app/display/{attendance,fleet,fitwork,fingerprint}`
   (komponen `DisplayShell`/`DisplayTable`/`DisplayBadge`, data `lib/data/display-screens.ts`);
   halaman admin pengelolaan pindah ke `app/(app)/displays/{attendance,fleet}` agar URL
   tidak bentrok: `/display/*` = layarnya, `/displays/*` = pengelolaannya.
   Aturan ini berlaku untuk pengelolaan LAYAR saja; master perangkat yang
   kebetulan punya layar tinggal di modulnya sendiri (lihat ADR 0009 —
   `/fingerprint`), bukan di bawah `/displays/*`.
   Teks UI dari kamus desain (mis. "Buka layar kiosk") tidak diubah — itu wilayah desain.

## Konsekuensi

- Kunci i18n `dspCloseKiosk` tidak lagi terpakai (tetap di kamus agar sinkron dengan
  desain sumber).
- Mock desain masih menggambarkan overlay iframe; jika desain diperbarui mengikuti
  perilaku tab-baru, tidak ada perubahan kode yang diperlukan lagi.
- Fullscreen otomatis tanpa gestur tidak dijamin oleh browser — pada muat pertama
  layar tampil memenuhi tab, dan menjadi fullscreen penuh setelah interaksi pertama.
