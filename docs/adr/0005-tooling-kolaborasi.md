# 0005 — Format, linter, dan pre-commit mengikuti universe-2

- Status: Accepted
- Tanggal: 2026-07-12

## Konteks

Menjelang kolaborasi, repo butuh aturan format dan pemeriksaan otomatis yang seragam.
Proyek saudara `~/Workspaces/universe-2` sudah punya perangkat yang disepakati; repo ini
mengadopsi aturan yang sama (disesuaikan dari monorepo ke satu paket).

## Keputusan

1. **Prettier** (`.prettierrc.json`): semi, kutip ganda, lebar 80, trailing comma es5,
   plugin `@ianvs/prettier-plugin-sort-imports` (urutan: react → next → pihak ketiga →
   `@/lib` → `@/components` → `@/app` → `@/*` → relatif) dan
   `prettier-plugin-tailwindcss` (sortir kelas; `tailwindStylesheet ./app/globals.css`,
   `tailwindFunctions cn/cva/clsx/twMerge`). Seluruh repo telah diformat sekali jalan.
2. **ESLint** (`eslint.config.mjs`): `eslint-config-next` (core-web-vitals dan
   typescript) ditambah `eslint-config-prettier`, plus aturan khusus: **warna hex
   arbitrer di `className` dilarang** (mis. `bg-[#fff]`) — wajib token desain dari
   `globals.css`. Pelanggaran lama dibersihkan (token baru `--gradient-logo`; avatar
   memakai `--gradient-cta`; `#7AE6FF` → `--color-primary-bright`).
3. **husky + lint-staged**: `.husky/pre-commit` → `pnpm exec lint-staged`;
   `*.{js,jsx,ts,tsx}` → `eslint --fix` + `prettier --write`; `*.{json,css,md}` →
   `prettier --write`. Script `prepare: husky` memasang hook otomatis saat `pnpm install`.
4. **Editor**: `.editorconfig` (LF, 2 spasi, final newline) dan `.vscode/`
   (format-on-save Prettier, fix-on-save ESLint, rekomendasi ekstensi).
5. **Script package.json**: `lint`, `lint:fix`, `format`, `format:check`, `typecheck`.
6. `.gitignore` menambah `.claude/*` (mengikuti universe-2).

## Konsekuensi

- Commit dengan pelanggaran lint/format ditolak di lokal sebelum sampai review.
- Gaya impor dan urutan kelas Tailwind konsisten otomatis — diff PR lebih bersih.
- Warna di luar token tidak bisa masuk lagi lewat `className`; perubahan warna selalu
  lewat token `globals.css` (memperkuat ADR 0001).
