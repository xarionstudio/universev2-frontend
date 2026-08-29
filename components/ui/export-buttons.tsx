"use client";

import * as React from "react";
import { FileSpreadsheet, Printer } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { printedAt, reportFileName } from "@/lib/report/logo";
import { printReport, type PrintReport } from "@/lib/report/print";
import { downloadXlsx, type XlsxSheet } from "@/lib/report/xlsx";
import { Button, Spinner } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/* Tombol ekspor laporan (Excel + PDF) — dipakai bersama oleh halaman-halaman
   yang punya tabel laporan. Pemanggil hanya menyiapkan DATA lewat `build`,
   bukan format berkasnya; kop bermerek ditangani lib/report/*.

   `build` dipanggil SAAT diklik (bukan saat render) supaya ekspor selalu
   mengikuti filter yang sedang aktif dan tidak ada kerja sia-sia tiap render. */
export type ExportPayload = {
  /* dasar nama berkas, mis. "fit-to-work-log-tidur" */
  fileBase: string;
  title: string;
  subtitle?: string;
  meta: string[];
  sheetName: string;
  columns: {
    header: string;
    width: number;
    align?: "left" | "right" | "center";
  }[];
  /* baris seragam untuk kedua format; sel bertanda status boleh objek */
  rows: (
    | string
    | number
    | null
    | { text: string; tone?: "success" | "warning" | "danger" | "neutral" }
  )[][];
  landscape?: boolean;
};

export function ExportButtons({
  build,
  iconOnly = false,
}: {
  build: () => ExportPayload;
  /* Toolbar yang padat filter (mis. Attendance) memakai tombol ikon 40px agar
     sejajar dengan kontrol h-10 dan tidak melipat toolbar jadi dua baris;
     labelnya pindah ke title + aria-label. */
  iconOnly?: boolean;
}) {
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function onExcel() {
    if (busy) return;
    const data = build();
    if (!data.rows.length) {
      pushToast("info", t.expEmptyT, t.expEmptyD);
      return;
    }
    setBusy(true);
    try {
      const sheet: XlsxSheet = {
        name: data.sheetName,
        title: data.title,
        /* Excel tidak menambah baris meta sendiri, jadi cap waktu & jumlah
           baris ditambahkan di sini. Dokumen cetak sudah menambahkannya
           otomatis — kalau dikirim dari halaman, isinya jadi dobel. */
        meta: [
          `${t.expPrintedAt}: ${printedAt(lang === "en")}`,
          `${t.expRows}: ${data.rows.length}`,
          ...data.meta,
        ],
        columns: data.columns.map((c) => ({
          header: c.header,
          width: c.width,
        })),
        rows: data.rows,
      };
      const name = reportFileName(data.fileBase, "xlsx");
      await downloadXlsx(name, sheet);
      pushToast("success", t.expToastT, name);
    } finally {
      setBusy(false);
    }
  }

  function onPdf() {
    const data = build();
    if (!data.rows.length) {
      pushToast("info", t.expEmptyT, t.expEmptyD);
      return;
    }
    /* Lebar kolom Excel (satuan karakter) dipetakan ke persentase supaya
       proporsinya ikut terbawa ke halaman A4. Tanpa ini kolom sempit seperti
       NIK ikut dibagi rata dan isinya terpotong jadi dua baris. */
    const totalW = data.columns.reduce((s, c) => s + c.width, 0) || 1;
    const report: PrintReport = {
      title: data.title,
      subtitle: data.subtitle,
      meta: data.meta,
      columns: data.columns.map((c) => ({
        header: c.header,
        align: c.align,
        width: `${((c.width / totalW) * 100).toFixed(2)}%`,
      })),
      rows: data.rows.map((r) =>
        r.map((cell) =>
          cell === null ? "—" : typeof cell === "number" ? String(cell) : cell
        )
      ),
      landscape: data.landscape ?? true,
      en: lang === "en",
    };
    pushToast("info", t.expToastPdfT, t.expToastPdfD);
    printReport(report);
  }

  const iconCls = iconOnly ? "size-10 [&_svg]:size-4" : undefined;
  return (
    <>
      <Button
        variant="secondary"
        size={iconOnly ? "icon" : "default"}
        className={iconCls}
        onClick={onExcel}
        disabled={busy}
        aria-label={t.expExcel}
        title={iconOnly ? t.expExcel : undefined}
      >
        {busy ? <Spinner className="size-4" /> : <FileSpreadsheet />}
        {iconOnly ? null : t.expExcel}
      </Button>
      <Button
        variant="secondary"
        size={iconOnly ? "icon" : "default"}
        className={iconCls}
        onClick={onPdf}
        aria-label={t.expPdf}
        title={iconOnly ? t.expPdf : undefined}
      >
        <Printer />
        {iconOnly ? null : t.expPdf}
      </Button>
    </>
  );
}
