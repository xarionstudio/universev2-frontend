/**
 * lib/report/print.ts
 *
 * Cetak laporan ber-brand ke PDF tanpa dependensi apa pun.
 * Strategi: bangun satu dokumen HTML lengkap (standalone) lalu cetak lewat
 * mesin print bawaan browser (Save as PDF) di dalam <iframe> tersembunyi.
 *
 * Tidak ada API browser yang dipanggil di module scope -> aman untuk SSR.
 * Semua akses `window` / `document` terjadi di dalam printReport(), yang hanya
 * dipanggil dari event handler klik.
 *
 * Catatan urutan yang KRITIS (lihat printReport):
 *   `srcdoc` HARUS di-set SEBELUM iframe disisipkan ke DOM. Bila iframe
 *   disisipkan lebih dulu tanpa src/srcdoc, browser membuat dokumen awal
 *   about:blank dan MEMICU event `load` untuk dokumen kosong itu. Handler
 *   `{ once: true }` akan habis di situ, lalu print() berjalan di atas dokumen
 *   kosong / setengah ter-parse — PDF blank. Handler di sini juga sengaja
 *   BUKAN `once`, dan memverifikasi keberadaan #report-root sebelum mencetak.
 */

import {
  BRAND,
  printedAt,
  REPORT_APP,
  REPORT_COMPANY,
  REPORT_LOGO_SVG,
} from "./logo";

/* ------------------------------------------------------------------ types */

export type PrintColumn = {
  header: string;
  /** Lebar CSS, mis. "14%" atau "28mm". Bila salah satu kolom tidak diisi,
   *  semua lebar dihitung otomatis dari panjang isi. */
  width?: string;
  align?: "left" | "right" | "center";
};

export type PrintTone = "success" | "warning" | "danger" | "neutral";

export type PrintCell = string | { text: string; tone?: PrintTone };

export type PrintReport = {
  title: string;
  subtitle?: string;
  meta: string[];
  columns: PrintColumn[];
  rows: PrintCell[][];
  landscape?: boolean;
  /** true -> label dokumen berbahasa Inggris. Pemanggil mengirim lang === "en". */
  en?: boolean;
};

/* -------------------------------------------------------------- constants */

/** Warna pill. Dijaga tetap kontras walau dicetak hitam-putih. */
const TONE_STYLE: Record<PrintTone, { bg: string; fg: string; bd: string }> = {
  success: { bg: "#E8F3E6", fg: "#23421F", bd: "#B4D2AC" },
  warning: { bg: "#FBF1DC", fg: "#6E4F0E", bd: "#E4CB88" },
  danger: { bg: "#FBE9E6", fg: "#8A1F14", bd: "#EEB1A8" },
  neutral: { bg: "#EEEFEC", fg: "#394037", bd: "#D2D6CE" },
};

type Labels = {
  printed: string;
  rows: string;
  empty: string;
};

function labelsFor(en: boolean): Labels {
  return en
    ? { printed: "Printed:", rows: "Rows:", empty: "No data to display." }
    : {
        printed: "Dicetak:",
        rows: "Jumlah baris:",
        empty: "Tidak ada data untuk ditampilkan.",
      };
}

/** Penanda agar handler `load` tahu dokumen laporan sudah benar-benar ada. */
const ROOT_ID = "report-root";

/** Jaga-jaga bila satu tab diklik cepat berulang. */
let printing = false;

/* -------------------------------------------------------------- utilities */

/** Escape teks dari data ke konteks HTML text/attribute. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeCell(cell: PrintCell): { text: string; tone?: PrintTone } {
  return typeof cell === "string" ? { text: cell } : cell;
}

function alignOf(col: PrintColumn | undefined): "left" | "right" | "center" {
  return col?.align ?? "left";
}

/**
 * Lebar kolom. Bila pemanggil sudah mengisi SEMUA lebar, dipakai apa adanya.
 * Bila ada yang kosong, lebar dihitung proporsional dari panjang teks terpanjang
 * per kolom — jauh lebih baik daripada `table-layout: fixed` membagi rata,
 * yang membuat kolom "Shift" selebar kolom "Perusahaan".
 */
function resolveWidths(report: PrintReport): string[] {
  const cols = report.columns;
  if (cols.length === 0) return [];

  const allGiven = cols.every(
    (c) => typeof c.width === "string" && c.width.length > 0
  );
  if (allGiven) return cols.map((c) => c.width ?? "");

  const weights = cols.map((col, i) => {
    let max = col.header.length;
    for (const row of report.rows) {
      const raw = row[i];
      if (raw === undefined) continue;
      const text = normalizeCell(raw).text;
      for (const segment of text.split("\n")) {
        if (segment.length > max) max = segment.length;
      }
    }
    return Math.min(40, Math.max(6, max));
  });

  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => `${((w / total) * 100).toFixed(3)}%`);
}

/* ---------------------------------------------------------------- the CSS */

function buildCss(landscape: boolean): string {
  const tonesCss = (Object.keys(TONE_STYLE) as PrintTone[])
    .map((tone) => {
      const s = TONE_STYLE[tone];
      return (
        `.pill--${tone}{background:${s.bg};color:${s.fg};` +
        `border-color:${s.bd};}`
      );
    })
    .join("");

  return `
@page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 12mm; }

*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: #FFFFFF;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  font-size: 9.5pt;
  line-height: 1.35;
  color: ${BRAND.ink};
}

/* ------------------------------------------------------------ header band */

.band {
  display: flex;
  align-items: center;
  gap: 8mm;
  background: ${BRAND.green};
  color: #FFFFFF;
  padding: 5mm 6mm;
  border-radius: 2mm;
  border-bottom: 1.4mm solid ${BRAND.gold};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.band__logo {
  flex: 0 0 auto;
  background: #FFFFFF;
  border-radius: 1.5mm;
  padding: 2mm 3mm;
  line-height: 0;
}

.band__logo svg {
  display: block;
  height: 12mm;
  width: auto;
  max-width: 46mm;
}

.band__text { flex: 1 1 auto; min-width: 0; }

.band__title {
  margin: 0;
  font-size: 16pt;
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1.15;
}

.band__company {
  margin: 1.2mm 0 0;
  font-size: 9pt;
  font-weight: 700;
  color: ${BRAND.gold};
  letter-spacing: 0.02em;
}

.band__subtitle {
  margin: 1mm 0 0;
  font-size: 9.5pt;
  font-weight: 500;
  color: #DFE9DC;
}

.band__app {
  flex: 0 0 auto;
  align-self: flex-start;
  max-width: 46mm;
  text-align: right;
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${BRAND.gold};
}

/* -------------------------------------------------------------- meta block */

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2mm 4mm;
  margin: 4mm 0 3mm;
  padding: 3mm 4mm;
  border: 0.3mm solid ${BRAND.greenLine};
  border-left: 1.2mm solid ${BRAND.gold};
  border-radius: 1.5mm;
  background: ${BRAND.greenSoft};
  font-size: 8.5pt;
  color: ${BRAND.muted};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.meta__item { white-space: nowrap; }
.meta__item strong { font-weight: 700; color: ${BRAND.ink}; }

/* ------------------------------------------------------------------ table */

table.report {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 8.5pt;
  font-variant-numeric: tabular-nums;
}

/* Keduanya BERULANG di setiap halaman cetak. thead membawa strip brand +
   judul kolom; tfoot membawa footer laporan (dan, karena ikut tata letak
   tabel, tidak mungkin menimpa baris data seperti footer position:fixed). */
table.report thead { display: table-header-group; }
table.report tfoot { display: table-footer-group; }

table.report th {
  background: ${BRAND.green};
  color: #FFFFFF;
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2.2mm 2.4mm;
  border: 0.25mm solid #24401F;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

table.report td {
  padding: 1.9mm 2.4mm;
  border: 0.25mm solid ${BRAND.greenLine};
  vertical-align: top;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

table.report tbody tr {
  break-inside: avoid;
  page-break-inside: avoid;
}

table.report tbody tr:nth-child(even) td {
  background: #F5F7F4;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Strip brand tipis yang ikut berulang di tiap halaman, supaya halaman 2+
   tetap teridentifikasi sebagai laporan resmi. */
table.report thead tr.brandrow th {
  background: #FFFFFF;
  color: ${BRAND.ink};
  border: 0;
  border-bottom: 0.8mm solid ${BRAND.gold};
  padding: 1.4mm 0;
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: none;
}

.brandrow__inner {
  display: flex;
  justify-content: space-between;
  gap: 4mm;
}

.brandrow__right { font-weight: 500; color: ${BRAND.muted}; }

/* Utilitas perataan DIRUANGLINGKUPKAN ke dalam tabel agar spesifisitasnya
   (0,2,2) mengalahkan aturan "table.report th" / "table.report td" (0,1,2).
   Tanpa ini,
   align="right"/"center" pada header tidak pernah berlaku. */
table.report th.al-left,   table.report td.al-left   { text-align: left; }
table.report th.al-right,  table.report td.al-right  { text-align: right; font-variant-numeric: tabular-nums; }
table.report th.al-center, table.report td.al-center { text-align: center; font-variant-numeric: tabular-nums; }

table.report td.empty {
  padding: 8mm 2mm;
  text-align: center;
  color: ${BRAND.muted};
  font-style: italic;
}

/* ------------------------------------------------------------------ pills */

.pill {
  display: inline-block;
  padding: 0.6mm 2mm;
  border-radius: 6mm;
  border: 0.25mm solid transparent;
  font-size: 7.5pt;
  font-weight: 700;
  line-height: 1.5;
  white-space: nowrap;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
${tonesCss}

/* ----------------------------------------------------------------- footer */

table.report tfoot td.foot {
  border: 0;
  border-top: 0.3mm solid ${BRAND.greenLine};
  padding: 1.5mm 0 0;
  font-size: 7.5pt;
  color: ${BRAND.muted};
  background: #FFFFFF;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.foot__inner {
  display: flex;
  justify-content: space-between;
  gap: 4mm;
}

.foot__inner strong { color: ${BRAND.green}; font-weight: 800; }

@media screen {
  body { padding: 10mm; }
}
`;
}

/* ------------------------------------------------------------ html builder */

function buildHtml(report: PrintReport): string {
  const landscape = report.landscape ?? true;
  const en = report.en ?? false;
  const label = labelsFor(en);
  // Sumber cap waktu yang sama dengan ekspor Excel, supaya dua berkas dari satu
  // klik tidak melaporkan waktu pembuatan yang berbeda.
  const stamp = printedAt(en);

  const colCount = report.columns.length || 1;
  const widths = resolveWidths(report);

  const colgroup = report.columns
    .map((_, i) => {
      const w = widths[i];
      return `<col${w ? ` style="width:${esc(w)}"` : ""}>`;
    })
    .join("");

  const thead = report.columns
    .map(
      (c) => `<th class="al-${alignOf(c)}" scope="col">${esc(c.header)}</th>`
    )
    .join("");

  const brandRow =
    `<tr class="brandrow"><th colspan="${colCount}" scope="colgroup">` +
    `<span class="brandrow__inner">` +
    `<span>${esc(REPORT_COMPANY)}</span>` +
    `<span class="brandrow__right">${esc(report.title)}</span>` +
    `</span></th></tr>`;

  const body =
    report.rows.length === 0
      ? `<tr><td class="empty" colspan="${colCount}">${esc(label.empty)}</td></tr>`
      : report.rows
          .map((row) => {
            const tds = report.columns
              .map((col, i) => {
                const cell = normalizeCell(row[i] ?? "");
                const align = alignOf(col);
                const inner = cell.tone
                  ? `<span class="pill pill--${cell.tone}">${esc(cell.text)}</span>`
                  : esc(cell.text);
                return `<td class="al-${align}">${inner}</td>`;
              })
              .join("");
            return `<tr>${tds}</tr>`;
          })
          .join("");

  const tfoot =
    `<tfoot><tr><td class="foot" colspan="${colCount}">` +
    `<span class="foot__inner">` +
    `<span><strong>${esc(REPORT_APP)}</strong></span>` +
    `<span>${esc(label.printed)} ${esc(stamp)}</span>` +
    `</span></td></tr></tfoot>`;

  const metaItems = [
    `<span class="meta__item"><strong>${esc(label.printed)}</strong> ${esc(stamp)}</span>`,
    `<span class="meta__item"><strong>${esc(label.rows)}</strong> ${report.rows.length}</span>`,
    ...report.meta.map((m) => `<span class="meta__item">${esc(m)}</span>`),
  ].join("");

  const docTitle = report.subtitle
    ? `${report.title} — ${report.subtitle}`
    : report.title;

  return `<!DOCTYPE html>
<html lang="${en ? "en" : "id"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(docTitle)}</title>
<style>${buildCss(landscape)}</style>
</head>
<body>
<div id="${ROOT_ID}">
<header class="band">
  <div class="band__logo">${REPORT_LOGO_SVG}</div>
  <div class="band__text">
    <h1 class="band__title">${esc(report.title)}</h1>
    <p class="band__company">${esc(REPORT_COMPANY)}</p>
    ${report.subtitle ? `<p class="band__subtitle">${esc(report.subtitle)}</p>` : ""}
  </div>
  <div class="band__app">${esc(REPORT_APP)}</div>
</header>

<section class="meta">${metaItems}</section>

<table class="report">
  <colgroup>${colgroup}</colgroup>
  <thead>${brandRow}<tr>${thead}</tr></thead>
  ${tfoot}
  <tbody>${body}</tbody>
</table>
</div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ print */

/**
 * Render laporan ke iframe tersembunyi lalu buka dialog cetak browser.
 * Pengguna memilih "Save as PDF" untuk mendapatkan berkas PDF.
 *
 * Aman dipanggil berulang: panggilan saat proses cetak sebelumnya masih
 * berjalan diabaikan. Sebaiknya pemanggil juga men-disable tombolnya supaya
 * klik yang diabaikan itu terlihat oleh pengguna.
 */
export function printReport(report: PrintReport): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (printing) return;
  printing = true;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("tabindex", "-1");
  frame.title = "report-print-surface";
  // Jangan pakai display:none / visibility:hidden — sebagian engine tidak
  // melakukan layout (dan karenanya tidak mencetak) untuk frame semacam itu.
  // Cukup geser keluar viewport dengan ukuran nyata.
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1123px;height:794px;" +
    "border:0;opacity:0;pointer-events:none;";

  let finished = false;
  let fired = false;
  let fallbackTimer = 0;
  let gateTimer = 0;
  let loadWatchdog = 0;

  const cleanup = (): void => {
    if (finished) return;
    finished = true;
    window.clearTimeout(fallbackTimer);
    window.clearTimeout(gateTimer);
    window.clearTimeout(loadWatchdog);
    frame.removeEventListener("load", onLoad);
    // Beri jeda: melepas iframe terlalu cepat membuat Chrome membatalkan
    // print preview yang belum selesai dirender.
    window.setTimeout(() => {
      frame.remove();
      printing = false;
    }, 800);
  };

  function onLoad(): void {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    // Abaikan dokumen awal about:blank; hanya dokumen laporan yang dicetak.
    if (!win || !doc) return;
    if (doc.getElementById(ROOT_ID) === null) return;

    window.clearTimeout(loadWatchdog);

    // afterprint didukung Chrome, Firefox, dan Safari 13+. Ini jalur cleanup
    // utama; 60 detik hanyalah jaring pengaman.
    win.addEventListener("afterprint", cleanup, { once: true });
    fallbackTimer = window.setTimeout(cleanup, 60_000);

    const fire = (): void => {
      if (fired || finished) return;
      fired = true;
      window.clearTimeout(gateTimer);

      // Ukur apakah print() memblokir. Safari: sinkron (modal) -> setelah
      // kembali, dialog sudah ditutup, jadi aman langsung cleanup.
      // Chrome/Firefox: kembali segera -> JANGAN cleanup, tunggu afterprint,
      // kalau tidak preview yang masih terbuka akan dibongkar di tengah jalan.
      const t0 = Date.now();
      try {
        win.focus();
        win.print();
      } catch {
        // Dialog cetak diblokir / gagal — tetap bersihkan.
        cleanup();
        return;
      }
      if (Date.now() - t0 > 400) cleanup();
    };

    // Logo adalah inline SVG (bukan <img src>) sehingga ter-layout bersama
    // dokumen — tidak ada request jaringan yang perlu ditunggu. Yang tersisa
    // hanya font dan satu siklus layout.
    //
    // rAF TIDAK berjalan di tab tersembunyi / headless, jadi gerbang kesiapan
    // dilombakan dengan timer: mana pun yang menang, print tetap terjadi
    // sekali (dijaga flag `fired`).
    gateTimer = window.setTimeout(fire, 400);
    void Promise.resolve(doc.fonts ? doc.fonts.ready : null)
      .then(() => {
        win.requestAnimationFrame(() => {
          win.requestAnimationFrame(fire);
        });
      })
      .catch(() => {
        fire();
      });
  }

  frame.addEventListener("load", onLoad);

  // srcdoc DULU, baru disisipkan. Bila urutannya dibalik, browser memicu event
  // `load` untuk dokumen awal about:blank dan print() bisa berjalan di atas
  // dokumen kosong. srcdoc juga mewarisi origin induk (contentWindow tetap
  // bisa diakses) tanpa document.write yang usang.
  frame.srcdoc = buildHtml(report);
  document.body.appendChild(frame);

  // Jaring pengaman bila `load` tidak pernah datang: jangan kunci `printing`
  // selamanya.
  loadWatchdog = window.setTimeout(() => {
    if (!fired) cleanup();
  }, 10_000);
}
