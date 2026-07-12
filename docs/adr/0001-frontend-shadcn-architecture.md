# 0001 — Frontend mengikuti arsitektur ala shadcn/ui

- Status: Accepted
- Tanggal: 2026-07-12

## Konteks

UI UNIVERSE didesain sebagai mock satu berkas (`UNIVERSE.dc.html` di proyek Claude Design
"UNIVERSE Redesign", id `e06f0fb6-9a47-4907-bd63-90a0bb9ff2f5`) dengan CSS kelas global
(`admin.css` + token `styles.css`). Implementasi produksi memakai Next.js 16 (App Router)

- Tailwind CSS v4, dan harus tetap setia pada desain (glassmorphism, tema gelap/terang,
  i18n id/en) sambil mudah dirawat.

## Keputusan

Mengadopsi arsitektur ala shadcn/ui, bukan menyalin CSS kelas global desain:

1. **Token desain = CSS variables** di `app/globals.css` — dipindah apa adanya dari
   `styles.css` desain (dark di `:root`, light di `[data-theme="light"]`), dipetakan ke
   utilitas Tailwind lewat `@theme inline` (font, warna inti, radius `chip/control/icon/card/panel`).
   Komponen mengakses token dengan arbitrary value Tailwind v4 (`text-(--text-secondary)`).
2. **Primitif UI di `components/ui/*`** — button/badge/panel/table/dialog/... memakai
   `cva` untuk varian + `cn()` (`clsx` + `tailwind-merge`) di `lib/utils.ts`; ikon `lucide-react`
   (SVG di desain memang path lucide). Kelas CSS desain (`.btn-primary`, `.dt`, `.badge`)
   diterjemahkan satu-satu menjadi varian komponen.
3. **State demo** in-memory: `AppStoreProvider` (React context) untuk data lintas halaman
   (karyawan, antrean approval, master data, alokasi fleet, pengaturan); provider terpisah
   untuk tema (`data-theme`, preferensi `system|light|dark` di localStorage kunci
   `universe-theme`), bahasa (`universe-lang`), dan toast.
4. **Kamus i18n** id/en diporting utuh dari script desain ke `lib/i18n/{id,en}.ts`
   (kunci identik, ~520 kunci); semua teks UI wajib lewat `t.*`.
5. **Routing nyata** menggantikan router state mock: `/login`, grup `(app)` berisi
   dashboard, roster (upload/data/revision/approval/attendance), employees, fit-to-work,
   assets (status/allocation/fleet-setting), master (units + 8 kategori dinamis),
   display, users (placeholder), settings.

## Konsekuensi

- Komponen halaman tidak boleh menulis resep kaca/badge/tabel sendiri — selalu lewat
  primitif `components/ui`; perubahan gaya cukup di satu tempat.
- Nilai token tidak boleh di-hardcode di komponen; tema terang otomatis benar selama
  token dipakai.
- Kiosk display (1920×1080, dark-only) belum diimplementasi — halaman admin "Kiosk
  Display" hanya mengelola daftarnya; tombol "Buka layar kiosk" masih demo.
- Data masih mock (in-memory). Integrasi backend (lihat rencana NestJS) tinggal
  mengganti isi `lib/data/*` + `AppStoreProvider` dengan fetch nyata tanpa menyentuh UI.
