/**
 * lib/report/xlsx.ts
 *
 * Penulis .xlsx (OOXML SpreadsheetML) tanpa dependensi apa pun.
 *
 * ---------------------------------------------------------------------------
 * LOGO
 * ---------------------------------------------------------------------------
 * Logo UNGGUL DISISIPKAN sebagai gambar sungguhan (xl/media/logo.png) melalui
 * paket DrawingML lengkap. Karena `REPORT_LOGO_SVG` adalah vektor sedangkan
 * DrawingML membutuhkan raster, SVG dirasterisasi di browser lewat
 * <img> + <canvas> + canvas.toBlob() — proses asinkron, sehingga `downloadXlsx`
 * bersifat async. `buildXlsx` sendiri tetap sinkron dan murni: ia menerima byte
 * PNG (opsional) sebagai parameter, jadi tetap bisa diuji di lingkungan tanpa DOM.
 *
 * Bila rasterisasi gagal (canvas ternoda, SVG ditolak, timeout), paket dibangun
 * TANPA bagian drawing dan kop tetap tampil sebagai wordmark teks bold-italic
 * hijau di antara bar emas dan bar hitam. Ekspor tidak pernah gagal total.
 *
 * ---------------------------------------------------------------------------
 * KEPUTUSAN PAKET
 * ---------------------------------------------------------------------------
 * - ZIP memakai metode STORE (0). CRC-32 dihitung per entri, dan
 *   compressedSize == uncompressedSize == PANJANG BYTE UTF-8 (bukan panjang
 *   string JS). Semua bagian XML di-encode ke Uint8Array lebih dulu; ukuran
 *   selalu diambil dari `Uint8Array.length`, tidak pernah dari `String.length`.
 *   Nama entri pun diukur setelah TextEncoder.encode().
 * - Teks sel memakai inline string (t="inlineStr"), bukan sharedStrings.xml:
 *   satu bagian paket, satu override content-type, dan satu relasi lebih sedikit.
 * - Tidak ada API browser yang disentuh di module scope -> aman untuk SSR.
 */

import { BRAND, REPORT_COMPANY, REPORT_LOGO_SVG } from "./logo";

/* -------------------------------------------------------------------------- */
/* API publik                                                                  */
/* -------------------------------------------------------------------------- */

export type XlsxTone = "success" | "warning" | "danger" | "neutral";

/** Sel bertanda status (FIT / TIDAK FIT dst). */
export type XlsxToneCell = { text: string; tone?: XlsxTone };

/** Sel tanggal sejati — masuk Excel sebagai angka serial + number format. */
export type XlsxDateCell = { date: Date; withTime?: boolean };

export type XlsxCell = string | number | null | XlsxToneCell | XlsxDateCell;

export type XlsxColumn = {
  header: string;
  /** Lebar dalam satuan "karakter" Excel. Dibatasi 4..90. */
  width: number;
};

export type XlsxSheet = {
  /** Nama tab. Disanitasi ke aturan Excel (<=31 karakter, tanpa []:*?/\). */
  name: string;
  /** Judul laporan, dicetak di bawah kop. */
  title: string;
  /** Baris meta, mis. ["Dicetak: 20 Jul 2026 20:31 WITA", "Filter: Semua unit"]. */
  meta: string[];
  columns: XlsxColumn[];
  rows: XlsxCell[][];
};

export type BuildXlsxOptions = {
  /** Waktu untuk stempel ZIP. Default: sekarang. */
  now?: Date;
  /** Byte PNG logo. Bila null/kosong, paket dibangun tanpa gambar. */
  logoPng?: Uint8Array | null;
};

/* -------------------------------------------------------------------------- */
/* Warna                                                                       */
/* -------------------------------------------------------------------------- */

/** "#RRGGBB" (atau "#RGB") -> "FFRRGGBB". OOXML memakai ARGB, alpha di depan. */
function argb(hex: string): string {
  const raw = hex.trim().replace(/^#/, "");
  const six =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  return `FF${six.toUpperCase()}`;
}

const ARGB = {
  green: argb(BRAND.green),
  gold: argb(BRAND.gold),
  black: argb(BRAND.black),
  ink: argb(BRAND.ink),
  muted: argb(BRAND.muted),
  metaBand: argb(BRAND.greenSoft),
  gridLine: argb(BRAND.greenLine),
  white: "FFFFFFFF",
} as const;

/** Wordmark teks — dipakai hanya bila gambar logo tidak tersedia. */
const WORDMARK = "UNGGUL";

/** Warna pill status; sengaja identik dengan TONE_STYLE di print.ts. */
const TONE_ARGB: Record<XlsxTone, { bg: string; fg: string }> = {
  success: { bg: "FFE8F3E6", fg: "FF23421F" },
  warning: { bg: "FFFBF1DC", fg: "FF6E4F0E" },
  danger: { bg: "FFFBE9E6", fg: "FF8A1F14" },
  neutral: { bg: "FFEEEFEC", fg: "FF394037" },
};

/* -------------------------------------------------------------------------- */
/* Type guards                                                                 */
/* -------------------------------------------------------------------------- */

function isDateCell(value: XlsxCell): value is XlsxDateCell {
  return (
    typeof value === "object" &&
    value !== null &&
    "date" in value &&
    value.date instanceof Date
  );
}

function isToneCell(value: XlsxCell): value is XlsxToneCell {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof value.text === "string"
  );
}

/* -------------------------------------------------------------------------- */
/* CRC-32 (IEEE 802.3, reflected, poly 0xEDB88320)                             */
/* -------------------------------------------------------------------------- */

const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/**
 * CRC-32 atas BYTE, bukan atas karakter. Ini wajib: menghitung CRC dari string
 * JS akan salah untuk setiap teks non-ASCII (dan ukuran entri pun akan salah),
 * sehingga Excel menolak berkas.
 */
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    const idx = (c ^ bytes[i]) & 0xff;
    c = (CRC32_TABLE[idx] ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

/* -------------------------------------------------------------------------- */
/* Penulis byte little-endian                                                  */
/* -------------------------------------------------------------------------- */

class ByteWriter {
  private buf: Uint8Array;
  private len = 0;

  constructor(initialCapacity = 1 << 16) {
    this.buf = new Uint8Array(Math.max(64, initialCapacity));
  }

  get length(): number {
    return this.len;
  }

  private ensure(extra: number): void {
    const needed = this.len + extra;
    if (needed <= this.buf.length) return;
    let cap = this.buf.length;
    while (cap < needed) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }

  u16(value: number): void {
    this.ensure(2);
    const v = value >>> 0;
    this.buf[this.len] = v & 0xff;
    this.buf[this.len + 1] = (v >>> 8) & 0xff;
    this.len += 2;
  }

  u32(value: number): void {
    this.ensure(4);
    const v = value >>> 0;
    this.buf[this.len] = v & 0xff;
    this.buf[this.len + 1] = (v >>> 8) & 0xff;
    this.buf[this.len + 2] = (v >>> 16) & 0xff;
    this.buf[this.len + 3] = (v >>> 24) & 0xff;
    this.len += 4;
  }

  bytes(src: Uint8Array): void {
    this.ensure(src.length);
    this.buf.set(src, this.len);
    this.len += src.length;
  }

  /** Salinan berukuran persis; ArrayBuffer-nya tanpa sisa, aman untuk Blob. */
  finish(): Uint8Array {
    return this.buf.slice(0, this.len);
  }
}

/* -------------------------------------------------------------------------- */
/* Kontainer ZIP (STORE saja)                                                  */
/* -------------------------------------------------------------------------- */

type ZipEntry = {
  /** Jalur di dalam paket, garis miring maju, tanpa garis miring awal. */
  path: string;
  /** Isi entri SEBAGAI BYTE. Panjangnya yang dipakai untuk field ukuran ZIP. */
  data: Uint8Array;
};

/** Waktu MS-DOS terpaket: (jam << 11) | (menit << 5) | (detik / 2). */
function dosTime(d: Date): number {
  return (
    ((d.getHours() & 0x1f) << 11) |
    ((d.getMinutes() & 0x3f) << 5) |
    ((d.getSeconds() >> 1) & 0x1f)
  );
}

/** Tanggal MS-DOS terpaket: ((tahun - 1980) << 9) | (bulan << 5) | hari. */
function dosDate(d: Date): number {
  const year = Math.min(2107, Math.max(1980, d.getFullYear()));
  return (
    (((year - 1980) & 0x7f) << 9) |
    (((d.getMonth() + 1) & 0x0f) << 5) |
    (d.getDate() & 0x1f)
  );
}

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

/** Bit 11 general purpose: nama berkas & komentar ber-UTF-8. */
const FLAG_UTF8 = 0x0800;
/** Versi 2.0 — minimum yang mencakup STORE. */
const VERSION = 20;

function zipStore(entries: readonly ZipEntry[], now: Date): Uint8Array {
  const encoder = new TextEncoder();
  const time = dosTime(now);
  const date = dosDate(now);

  const out = new ByteWriter(1 << 17);
  const central: {
    nameBytes: Uint8Array;
    crc: number;
    size: number;
    offset: number;
  }[] = [];

  for (const entry of entries) {
    // Nama entri diukur dalam BYTE UTF-8, sama seperti isinya.
    const nameBytes = encoder.encode(entry.path);
    const crc = crc32(entry.data);
    const size = entry.data.length;
    const offset = out.length;

    // ---- Local file header -------------------------------------------------
    out.u32(SIG_LOCAL);
    out.u16(VERSION); // version needed to extract
    out.u16(FLAG_UTF8); // general purpose bit flag
    out.u16(0); // compression method: 0 = stored
    out.u16(time);
    out.u16(date);
    out.u32(crc);
    out.u32(size); // compressed size (stored -> sama dengan uncompressed)
    out.u32(size); // uncompressed size
    out.u16(nameBytes.length);
    out.u16(0); // extra field length
    out.bytes(nameBytes);
    out.bytes(entry.data);

    central.push({ nameBytes, crc, size, offset });
  }

  // ---- Central directory ---------------------------------------------------
  const centralStart = out.length;
  for (const e of central) {
    out.u32(SIG_CENTRAL);
    out.u16(VERSION); // version made by
    out.u16(VERSION); // version needed to extract
    out.u16(FLAG_UTF8);
    out.u16(0); // method: stored
    out.u16(time);
    out.u16(date);
    out.u32(e.crc);
    out.u32(e.size);
    out.u32(e.size);
    out.u16(e.nameBytes.length);
    out.u16(0); // extra field length
    out.u16(0); // file comment length
    out.u16(0); // disk number start
    out.u16(0); // internal file attributes
    out.u32(0); // external file attributes
    out.u32(e.offset); // relative offset of local header
    out.bytes(e.nameBytes);
  }
  const centralSize = out.length - centralStart;

  // ---- End of central directory --------------------------------------------
  out.u32(SIG_EOCD);
  out.u16(0); // number of this disk
  out.u16(0); // disk where central directory starts
  out.u16(central.length); // entries on this disk
  out.u16(central.length); // total entries
  out.u32(centralSize);
  out.u32(centralStart);
  out.u16(0); // comment length

  return out.finish();
}

/* -------------------------------------------------------------------------- */
/* Bantuan XML                                                                 */
/* -------------------------------------------------------------------------- */

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/**
 * Escape untuk isi elemen maupun nilai atribut, sekaligus membuang karakter
 * yang ilegal di XML 1.0: kontrol C0 selain TAB/LF/CR, U+FFFE/U+FFFF, dan
 * surrogate tak berpasangan. Satu byte kontrol nyasar dari catatan operator
 * yang di-paste sudah cukup membuat Excel menolak berkas.
 */
function xmlEscape(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);

    if (code >= 0xd800 && code <= 0xdbff) {
      const low = i + 1 < raw.length ? raw.charCodeAt(i + 1) : 0;
      if (low >= 0xdc00 && low <= 0xdfff) {
        out += raw[i] + raw[i + 1];
        i += 1;
      }
      continue; // high surrogate tanpa pasangan -> dibuang
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue; // low tanpa pasangan
    if (code === 0xfffe || code === 0xffff) continue;
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d)
      continue;

    switch (code) {
      case 0x26:
        out += "&amp;";
        break;
      case 0x3c:
        out += "&lt;";
        break;
      case 0x3e:
        out += "&gt;";
        break;
      case 0x22:
        out += "&quot;";
        break;
      case 0x27:
        out += "&apos;";
        break;
      default:
        out += raw[i];
    }
  }
  return out;
}

/** Batas keras Excel untuk jumlah karakter satu sel. */
const MAX_CELL_CHARS = 32767;

/** Indeks kolom 1-based -> A, B, ... Z, AA, AB, ... */
function colLetter(index: number): string {
  let n = index;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s || "A";
}

/**
 * xsd:double menerima notasi eksponen, jadi String(n) selalu literal yang sah
 * — termasuk "1e+21". Yang tidak boleh masuk hanya NaN/Infinity, yang akan
 * merusak seluruh workbook; keduanya menjadi sel kosong.
 */
function numToXml(n: number): string | null {
  return Number.isFinite(n) ? String(n) : null;
}

/**
 * Date -> nomor serial Excel (hari sejak 1899-12-30), dihitung dari komponen
 * waktu LOKAL supaya tanggal yang tampil sama dengan yang dilihat pengguna
 * (WITA), bukan bergeser ke UTC. Tanggal sebelum 1900 tidak terwakilkan.
 */
function excelSerial(d: Date): number | null {
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  const days = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
  const serialDay = days + 25569; // 1970-01-01 == serial 25569
  const frac =
    (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
  const serial = serialDay + frac;
  return Number.isFinite(serial) && serial >= 1 ? serial : null;
}

/* -------------------------------------------------------------------------- */
/* Indeks style (WAJIB sinkron dengan urutan <xf> di cellXfs pada STYLES_XML)   */
/* -------------------------------------------------------------------------- */

const S_WORDMARK = 1;
const S_BAR_GOLD = 2;
const S_BAR_BLACK = 3;
const S_TITLE = 4;
const S_META = 5;
const S_HEADER = 6;
const S_BODY_TEXT = 7;
const S_BODY_NUM = 8;
const S_COMPANY = 9;
const S_DATE = 10;
const S_DATETIME = 11;

const S_TONE: Record<XlsxTone, number> = {
  success: 12,
  warning: 13,
  danger: 14,
  neutral: 15,
};

/* -------------------------------------------------------------------------- */
/* Bagian paket                                                                */
/* -------------------------------------------------------------------------- */

function contentTypesXml(withImage: boolean): string {
  return (
    XML_DECL +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    (withImage ? '<Default Extension="png" ContentType="image/png"/>' : "") +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    (withImage
      ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
      : "") +
    "</Types>"
  );
}

const ROOT_RELS_XML =
  XML_DECL +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  "</Relationships>";

const WORKBOOK_RELS_XML =
  XML_DECL +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  "</Relationships>";

const SHEET_RELS_XML =
  XML_DECL +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>' +
  "</Relationships>";

const DRAWING_RELS_XML =
  XML_DECL +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.png"/>' +
  "</Relationships>";

/** Ukuran gambar logo di lembar kerja, dalam EMU (914400 EMU = 1 inci). */
const LOGO_EMU_CY = 402336; // ~0,44 inci (~31,7 pt), muat di baris setinggi 36 pt
const LOGO_EMU_CX = 1126541; // rasio 560:200 mengikuti viewBox SVG

/**
 * Jangkar gambar di baris ke-2 (indeks 1), kolom pertama. oneCellAnchor:
 * sudut kiri-atas terkunci ke sel, ukuran tetap — logo tidak melar saat lebar
 * kolom berubah.
 */
const DRAWING_XML =
  XML_DECL +
  '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
  "<xdr:oneCellAnchor>" +
  "<xdr:from><xdr:col>0</xdr:col><xdr:colOff>57150</xdr:colOff>" +
  "<xdr:row>1</xdr:row><xdr:rowOff>28575</xdr:rowOff></xdr:from>" +
  `<xdr:ext cx="${LOGO_EMU_CX}" cy="${LOGO_EMU_CY}"/>` +
  "<xdr:pic>" +
  "<xdr:nvPicPr>" +
  '<xdr:cNvPr id="1" name="Logo UNGGUL" descr="UNGGUL"/>' +
  '<xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>' +
  "</xdr:nvPicPr>" +
  "<xdr:blipFill>" +
  '<a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/>' +
  "<a:stretch><a:fillRect/></a:stretch>" +
  "</xdr:blipFill>" +
  "<xdr:spPr>" +
  `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${LOGO_EMU_CX}" cy="${LOGO_EMU_CY}"/></a:xfrm>` +
  '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' +
  "</xdr:spPr>" +
  "</xdr:pic>" +
  "<xdr:clientData/>" +
  "</xdr:oneCellAnchor>" +
  "</xdr:wsDr>";

/**
 * Urutan elemen di dalam <styleSheet> dikunci oleh skema:
 * numFmts, fonts, fills, borders, cellStyleXfs, cellXfs, cellStyles, dxfs,
 * tableStyles. Fill 0 WAJIB `none` dan fill 1 WAJIB `gray125` — Excel
 * meng-hardcode kedua slot itu dan akan "memperbaiki" berkas bila berbeda.
 */
const STYLES_XML =
  XML_DECL +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  // ---- numFmts -----------------------------------------------------------
  '<numFmts count="2">' +
  '<numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>' +
  '<numFmt numFmtId="165" formatCode="dd/mm/yyyy hh:mm"/>' +
  "</numFmts>" +
  // ---- fonts (indeks 0..10) ----------------------------------------------
  '<fonts count="11">' +
  /*  0 */ '<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>' +
  /*  1 */ `<font><b/><sz val="14"/><color rgb="${ARGB.green}"/><name val="Calibri"/><family val="2"/></font>` +
  /*  2 */ `<font><i/><sz val="9"/><color rgb="${ARGB.muted}"/><name val="Calibri"/><family val="2"/></font>` +
  /*  3 */ `<font><b/><sz val="11"/><color rgb="${ARGB.white}"/><name val="Calibri"/><family val="2"/></font>` +
  /*  4 */ `<font><sz val="10"/><color rgb="${ARGB.ink}"/><name val="Calibri"/><family val="2"/></font>` +
  /*  5 */ `<font><b/><i/><sz val="22"/><color rgb="${ARGB.green}"/><name val="Calibri"/><family val="2"/></font>` +
  /*  6 */ `<font><b/><sz val="10"/><color rgb="${ARGB.green}"/><name val="Calibri"/><family val="2"/></font>` +
  /*  7 */ `<font><b/><sz val="10"/><color rgb="${TONE_ARGB.success.fg}"/><name val="Calibri"/><family val="2"/></font>` +
  /*  8 */ `<font><b/><sz val="10"/><color rgb="${TONE_ARGB.warning.fg}"/><name val="Calibri"/><family val="2"/></font>` +
  /*  9 */ `<font><b/><sz val="10"/><color rgb="${TONE_ARGB.danger.fg}"/><name val="Calibri"/><family val="2"/></font>` +
  /* 10 */ `<font><b/><sz val="10"/><color rgb="${TONE_ARGB.neutral.fg}"/><name val="Calibri"/><family val="2"/></font>` +
  "</fonts>" +
  // ---- fills (indeks 0..9) -----------------------------------------------
  '<fills count="10">' +
  /* 0 */ '<fill><patternFill patternType="none"/></fill>' +
  /* 1 */ '<fill><patternFill patternType="gray125"/></fill>' +
  /* 2 */ `<fill><patternFill patternType="solid"><fgColor rgb="${ARGB.green}"/><bgColor indexed="64"/></patternFill></fill>` +
  /* 3 */ `<fill><patternFill patternType="solid"><fgColor rgb="${ARGB.gold}"/><bgColor indexed="64"/></patternFill></fill>` +
  /* 4 */ `<fill><patternFill patternType="solid"><fgColor rgb="${ARGB.black}"/><bgColor indexed="64"/></patternFill></fill>` +
  /* 5 */ `<fill><patternFill patternType="solid"><fgColor rgb="${ARGB.metaBand}"/><bgColor indexed="64"/></patternFill></fill>` +
  /* 6 */ `<fill><patternFill patternType="solid"><fgColor rgb="${TONE_ARGB.success.bg}"/><bgColor indexed="64"/></patternFill></fill>` +
  /* 7 */ `<fill><patternFill patternType="solid"><fgColor rgb="${TONE_ARGB.warning.bg}"/><bgColor indexed="64"/></patternFill></fill>` +
  /* 8 */ `<fill><patternFill patternType="solid"><fgColor rgb="${TONE_ARGB.danger.bg}"/><bgColor indexed="64"/></patternFill></fill>` +
  /* 9 */ `<fill><patternFill patternType="solid"><fgColor rgb="${TONE_ARGB.neutral.bg}"/><bgColor indexed="64"/></patternFill></fill>` +
  "</fills>" +
  // ---- borders -----------------------------------------------------------
  '<borders count="2">' +
  "<border><left/><right/><top/><bottom/><diagonal/></border>" +
  "<border>" +
  `<left style="thin"><color rgb="${ARGB.gridLine}"/></left>` +
  `<right style="thin"><color rgb="${ARGB.gridLine}"/></right>` +
  `<top style="thin"><color rgb="${ARGB.gridLine}"/></top>` +
  `<bottom style="thin"><color rgb="${ARGB.gridLine}"/></bottom>` +
  "<diagonal/></border>" +
  "</borders>" +
  // ---- cellStyleXfs ------------------------------------------------------
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  // ---- cellXfs (indeks WAJIB cocok dengan konstanta S_*) ------------------
  '<cellXfs count="16">' +
  /*  0 default    */ '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  /*  1 wordmark   */ '<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
  /*  2 bar emas   */ '<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/>' +
  /*  3 bar hitam  */ '<xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1"/>' +
  /*  4 judul      */ '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
  /*  5 meta       */ '<xf numFmtId="0" fontId="2" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
  /*  6 header     */ '<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
  /*  7 isi teks   */ '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>' +
  /*  8 isi angka  */ '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>' +
  /*  9 perusahaan */ '<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
  /* 10 tanggal    */ '<xf numFmtId="164" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>' +
  /* 11 tgl + jam  */ '<xf numFmtId="165" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>' +
  /* 12 success    */ '<xf numFmtId="0" fontId="7" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>' +
  /* 13 warning    */ '<xf numFmtId="0" fontId="8" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>' +
  /* 14 danger     */ '<xf numFmtId="0" fontId="9" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>' +
  /* 15 neutral    */ '<xf numFmtId="0" fontId="10" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>' +
  "</cellXfs>" +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '<dxfs count="0"/>' +
  '<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>' +
  "</styleSheet>";

/* -------------------------------------------------------------------------- */
/* Pembuatan worksheet + workbook                                              */
/* -------------------------------------------------------------------------- */

/** Aturan nama tab Excel: 1..31 karakter, tanpa []:*?/\, tanpa ' di ujung. */
function sanitizeSheetName(raw: string): string {
  const cleaned = raw
    .replace(/[[\]:*?/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31)
    .replace(/^'+|'+$/g, "")
    .trim();
  return cleaned.length > 0 ? cleaned : "Laporan";
}

/** Sel bergaya eksplisit; dipakai untuk kop dan header (nilai selalu teks). */
function textCellXml(
  ref: string,
  styleId: number,
  value: string | null
): string {
  if (value === null || value.length === 0) {
    return `<c r="${ref}" s="${styleId}"/>`;
  }
  const text = xmlEscape(value.slice(0, MAX_CELL_CHARS));
  return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
}

/** Sel data: gaya ditentukan oleh bentuk nilainya. */
function dataCellXml(ref: string, value: XlsxCell): string {
  if (value === null) {
    return `<c r="${ref}" s="${S_BODY_TEXT}"/>`;
  }

  if (typeof value === "number") {
    const v = numToXml(value);
    if (v === null) return `<c r="${ref}" s="${S_BODY_NUM}"/>`;
    return `<c r="${ref}" s="${S_BODY_NUM}"><v>${v}</v></c>`;
  }

  if (typeof value === "string") {
    return textCellXml(ref, S_BODY_TEXT, value);
  }

  if (isDateCell(value)) {
    const style = value.withTime === true ? S_DATETIME : S_DATE;
    const serial = excelSerial(value.date);
    if (serial === null) return `<c r="${ref}" s="${style}"/>`;
    return `<c r="${ref}" s="${style}"><v>${serial}</v></c>`;
  }

  if (isToneCell(value)) {
    const style = value.tone === undefined ? S_BODY_TEXT : S_TONE[value.tone];
    return textCellXml(ref, style, value.text);
  }

  return `<c r="${ref}" s="${S_BODY_TEXT}"/>`;
}

/**
 * Satu baris kop selebar tabel: nilai di kolom A, ditambah sel kosong bergaya
 * sama di B..lastCol. Sel kosong itu mubazir bila merge dihormati, tapi
 * menjamin pita warna tetap membentang penuh di aplikasi yang membuang merge
 * (LibreOffice, Google Sheets, Numbers).
 */
function bandRowXml(
  rowIndex: number,
  lastCol: number,
  styleId: number,
  value: string | null,
  heightPt: number
): string {
  const cells: string[] = [textCellXml(`A${rowIndex}`, styleId, value)];
  for (let c = 2; c <= lastCol; c += 1) {
    cells.push(textCellXml(`${colLetter(c)}${rowIndex}`, styleId, null));
  }
  return `<row r="${rowIndex}" ht="${heightPt}" customHeight="1">${cells.join("")}</row>`;
}

type SheetBuild = { xml: string; headerRow: number };

function buildSheetXml(sheet: XlsxSheet, withImage: boolean): SheetBuild {
  const columns =
    sheet.columns.length > 0 ? sheet.columns : [{ header: "", width: 20 }];
  const lastCol = columns.length;
  const lastColRef = colLetter(lastCol);

  const rowsXml: string[] = [];
  const merges: string[] = [];

  const pushMerge = (rowIndex: number): void => {
    // Merge satu sel (A1:A1) tidak sah dan memicu jalur "repair" Excel.
    if (lastCol > 1) merges.push(`A${rowIndex}:${lastColRef}${rowIndex}`);
  };

  let r = 1;

  // --- Blok kop ------------------------------------------------------------
  rowsXml.push(bandRowXml(r, lastCol, S_BAR_GOLD, null, 7.5));
  pushMerge(r);
  r += 1;

  // Baris logo. Bila gambar tersisip, teks wordmark dikosongkan agar tidak
  // tertimpa gambar; bila tidak, wordmark teks menjadi penggantinya.
  rowsXml.push(
    bandRowXml(
      r,
      lastCol,
      S_WORDMARK,
      withImage ? null : WORDMARK,
      withImage ? 36 : 30
    )
  );
  pushMerge(r);
  r += 1;

  rowsXml.push(bandRowXml(r, lastCol, S_BAR_BLACK, null, 5.25));
  pushMerge(r);
  r += 1;

  rowsXml.push(bandRowXml(r, lastCol, S_COMPANY, REPORT_COMPANY, 16));
  pushMerge(r);
  r += 1;

  rowsXml.push(bandRowXml(r, lastCol, S_TITLE, sheet.title, 22));
  pushMerge(r);
  r += 1;

  for (const line of sheet.meta) {
    rowsXml.push(bandRowXml(r, lastCol, S_META, line, 14));
    pushMerge(r);
    r += 1;
  }

  // Baris jeda antara kop dan tabel.
  rowsXml.push(`<row r="${r}" ht="6" customHeight="1"/>`);
  r += 1;

  // --- Header tabel ---------------------------------------------------------
  const headerRow = r;
  const headerCells = columns.map((col, i) =>
    textCellXml(`${colLetter(i + 1)}${headerRow}`, S_HEADER, col.header)
  );
  rowsXml.push(
    `<row r="${headerRow}" ht="24" customHeight="1">${headerCells.join("")}</row>`
  );
  r += 1;

  // --- Baris data -----------------------------------------------------------
  for (const dataRow of sheet.rows) {
    const cells: string[] = [];
    for (let c = 0; c < lastCol; c += 1) {
      const value: XlsxCell = c < dataRow.length ? dataRow[c] : null;
      cells.push(dataCellXml(`${colLetter(c + 1)}${r}`, value));
    }
    rowsXml.push(`<row r="${r}">${cells.join("")}</row>`);
    r += 1;
  }

  const lastRow = Math.max(1, r - 1);

  // --- <cols> ---------------------------------------------------------------
  const colsXml = columns
    .map((col, i) => {
      const w = Number.isFinite(col.width) ? col.width : 20;
      const width = Math.min(90, Math.max(4, w));
      const n = i + 1;
      return `<col min="${n}" max="${n}" width="${width}" customWidth="1"/>`;
    })
    .join("");

  // --- Pane ----------------------------------------------------------------
  // Kop DIGULUNG keluar viewport lewat topLeftCell pada <sheetView>, lalu HANYA
  // baris header yang dibekukan. Membekukan seluruh kop akan menyita sepertiga
  // layar untuk dekorasi. Baris 1..headerRow-1 tetap ada di dokumen dan tetap
  // ikut tercetak.
  const frozenTop = headerRow + 1;
  const sheetViewXml =
    "<sheetViews>" +
    `<sheetView showGridLines="0" tabSelected="1" topLeftCell="A${headerRow}" workbookViewId="0">` +
    `<pane ySplit="1" topLeftCell="A${frozenTop}" activePane="bottomLeft" state="frozen"/>` +
    `<selection pane="bottomLeft" activeCell="A${frozenTop}" sqref="A${frozenTop}"/>` +
    "</sheetView>" +
    "</sheetViews>";

  const autoFilterXml =
    sheet.rows.length > 0
      ? `<autoFilter ref="A${headerRow}:${lastColRef}${lastRow}"/>`
      : "";

  const mergeXml =
    merges.length > 0
      ? `<mergeCells count="${merges.length}">` +
        merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("") +
        "</mergeCells>"
      : "";

  // Urutan anak <worksheet> dikunci skema: sheetPr, dimension, sheetViews,
  // sheetFormatPr, cols, sheetData, autoFilter, mergeCells, pageMargins,
  // pageSetup, drawing.
  const xml =
    XML_DECL +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    `<dimension ref="A1:${lastColRef}${lastRow}"/>` +
    sheetViewXml +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `<cols>${colsXml}</cols>` +
    `<sheetData>${rowsXml.join("")}</sheetData>` +
    autoFilterXml +
    mergeXml +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
    '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
    (withImage ? '<drawing r:id="rId1"/>' : "") +
    "</worksheet>";

  return { xml, headerRow };
}

/**
 * Nama lembar untuk dipakai di dalam defined name: apostrof digandakan, lalu
 * seluruhnya dikutip tunggal.
 */
function quotedSheetName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

function buildWorkbookXml(sheetName: string, headerRow: number): string {
  // Print_Titles membuat baris header berulang di SETIAP halaman cetak/PDF.
  // Tanpa ini, halaman ke-2 dan seterusnya hanya berisi grid tanpa judul kolom
  // — dan fitToHeight="0" secara eksplisit mengizinkan halaman vertikal tak
  // terbatas, jadi laporan riwayat pasti multi-halaman.
  const printTitles = `${quotedSheetName(sheetName)}!$${headerRow}:$${headerRow}`;

  return (
    XML_DECL +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<workbookPr defaultThemeVersion="166925"/>' +
    '<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="20000" windowHeight="12000"/></bookViews>' +
    `<sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    "<definedNames>" +
    `<definedName name="_xlnm.Print_Titles" localSheetId="0">${xmlEscape(printTitles)}</definedName>` +
    "</definedNames>" +
    "</workbook>"
  );
}

/* -------------------------------------------------------------------------- */
/* Rasterisasi logo (browser saja)                                             */
/* -------------------------------------------------------------------------- */

const LOGO_VIEWBOX_W = 560;
const LOGO_VIEWBOX_H = 200;
const LOGO_RASTER_W = 1120;

function loadSvgImage(
  url: string,
  timeoutMs: number
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      reject(new Error("logo raster timeout"));
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("logo gagal dimuat"));
    };
    img.src = url;
  });
}

/**
 * Rasterisasi REPORT_LOGO_SVG menjadi PNG. Mengembalikan null pada kegagalan
 * apa pun — pemanggil lalu membangun paket tanpa gambar (kop teks).
 *
 * Catatan: atribut width/height disuntikkan ke elemen <svg> karena beberapa
 * mesin (Gecko) menolak menggambar SVG yang hanya punya viewBox tanpa ukuran
 * intrinsik ke dalam <canvas>.
 */
async function rasterizeLogoPng(): Promise<Uint8Array | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const sized = REPORT_LOGO_SVG.replace(
    /<svg\b/,
    `<svg width="${LOGO_VIEWBOX_W}" height="${LOGO_VIEWBOX_H}"`
  );
  const svgBlob = new Blob([sized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await loadSvgImage(url, 4000);
    const height = Math.round(
      (LOGO_RASTER_W * LOGO_VIEWBOX_H) / LOGO_VIEWBOX_W
    );
    const canvas = document.createElement("canvas");
    canvas.width = LOGO_RASTER_W;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Latar putih: PNG transparan di atas sel berwarna akan tampak kotor.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, LOGO_RASTER_W, height);
    ctx.drawImage(img, 0, 0, LOGO_RASTER_W, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });
    if (!blob) return null;
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return bytes.length > 0 ? bytes : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* -------------------------------------------------------------------------- */
/* Build + download                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Fungsi murni: menghasilkan byte paket .xlsx lengkap.
 * Aman dipanggil tanpa DOM (tidak menyentuh document/URL) — berguna untuk uji.
 */
export function buildXlsx(
  sheet: XlsxSheet,
  options: BuildXlsxOptions = {}
): Uint8Array {
  const now = options.now ?? new Date();
  const logoPng = options.logoPng ?? null;
  const withImage = logoPng !== null && logoPng.length > 0;

  const encoder = new TextEncoder();
  const sheetName = sanitizeSheetName(sheet.name);
  const { xml: sheetXml, headerRow } = buildSheetXml(sheet, withImage);

  // Setiap bagian di-encode ke byte DULU; ukuran & CRC di ZIP selalu diambil
  // dari panjang Uint8Array, tidak pernah dari panjang string JS.
  const entries: ZipEntry[] = [
    {
      path: "[Content_Types].xml",
      data: encoder.encode(contentTypesXml(withImage)),
    },
    { path: "_rels/.rels", data: encoder.encode(ROOT_RELS_XML) },
    {
      path: "xl/workbook.xml",
      data: encoder.encode(buildWorkbookXml(sheetName, headerRow)),
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      data: encoder.encode(WORKBOOK_RELS_XML),
    },
    { path: "xl/styles.xml", data: encoder.encode(STYLES_XML) },
    { path: "xl/worksheets/sheet1.xml", data: encoder.encode(sheetXml) },
  ];

  if (logoPng !== null && withImage) {
    entries.push(
      {
        path: "xl/worksheets/_rels/sheet1.xml.rels",
        data: encoder.encode(SHEET_RELS_XML),
      },
      { path: "xl/drawings/drawing1.xml", data: encoder.encode(DRAWING_XML) },
      {
        path: "xl/drawings/_rels/drawing1.xml.rels",
        data: encoder.encode(DRAWING_RELS_XML),
      },
      { path: "xl/media/logo.png", data: logoPng }
    );
  }

  return zipStore(entries, now);
}

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Buang pemisah jalur dan pastikan berekstensi .xlsx. */
function safeFilename(raw: string): string {
  const base = raw
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const name = base.length > 0 ? base : "laporan";
  return /\.xlsx$/i.test(name) ? name : `${name}.xlsx`;
}

/**
 * Khusus browser. Panggil dari event handler (jangan dari render/effect):
 * menyentuh `document` dan `URL`, yang tidak ada saat SSR.
 * Mengikuti pola Blob + createObjectURL + <a download> sementara di
 * app/(app)/users/_lib/csv.ts.
 *
 * Async karena logo dirasterisasi lewat canvas. Unduhan yang dipicu setelah
 * await tetap diizinkan browser (berbeda dengan window.open yang butuh gesture
 * yang masih "hangat").
 */
export async function downloadXlsx(
  filename: string,
  sheet: XlsxSheet
): Promise<void> {
  if (typeof document === "undefined") return;

  const logoPng = await rasterizeLogoPng();
  const bytes = buildXlsx(sheet, { logoPng });

  // Salin ke ArrayBuffer nyata: menghindari penegasan tipe pada perpecahan
  // Uint8Array<ArrayBufferLike> di TypeScript 5.7+.
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);

  const blob = new Blob([buffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeFilename(filename);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 500);
}
