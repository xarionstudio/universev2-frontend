/* Kop laporan UNGGUL — logo & warna merek.

   Logo dibuat ulang sebagai SVG inline (bukan berkas raster) supaya:
     - tajam di cetakan PDF pada resolusi berapa pun,
     - tidak perlu request jaringan saat dokumen cetak dirender,
     - bisa disisipkan langsung ke dalam HTML dokumen cetak.

   CATATAN: ini REPRODUKSI dari lampiran, bukan berkas resmi dari brand
   guideline. Bentuk & warnanya sudah didekatkan, tapi hurufnya memakai font
   sistem yang di-skew, sehangga tidak akan 100% identik dengan wordmark asli.
   Bila tersedia berkas vektor resmi, ganti isi REPORT_LOGO_SVG dengan isi
   berkas itu — tidak ada kode lain yang perlu diubah. */

export const BRAND = {
  green: "#2C4A2A",
  gold: "#C8992F",
  black: "#0B0B0B",
  /* turunan untuk latar kop & garis tabel */
  greenSoft: "#EAF0E8",
  greenLine: "#C3D3BF",
  ink: "#1B2A19",
  muted: "#5A6B58",
} as const;

/* viewBox 560×200 — rasio mengikuti lampiran (bar emas, wordmark, bar hitam).
   Bar dibuat parallelogram miring; teks di-skew -12° agar senada. */
export const REPORT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 200" role="img" aria-label="UNGGUL">
  <polygon points="62,8 560,8 538,52 40,52" fill="${BRAND.gold}"/>
  <text x="34" y="140"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="104" font-weight="900" letter-spacing="2"
        fill="${BRAND.green}"
        transform="skewX(-12) translate(28,0)">UNGGUL</text>
  <polygon points="22,160 520,160 498,196 0,196" fill="${BRAND.black}"/>
</svg>`;

/* Nama badan usaha untuk baris kop di bawah logo */
export const REPORT_COMPANY = "PT Unggul Dinamika Utama";
export const REPORT_APP = "UNIVERSE — Fleet Automation System";

/* Cap waktu cetak, gaya WITA seperti dipakai di seluruh aplikasi */
export function printedAt(en: boolean): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const MON = en
    ? [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ]
    : [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
  return `${pad(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())} WITA`;
}

/* Nama berkas aman untuk unduhan: tanpa spasi/karakter terlarang */
export function reportFileName(base: string, ext: "xlsx" | "pdf"): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const safe = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${safe}_${stamp}.${ext}`;
}
