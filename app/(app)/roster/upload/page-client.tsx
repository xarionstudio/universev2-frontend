"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  ScanSearch,
  Upload,
} from "lucide-react";

import { errorDetail, rosterApi } from "@/lib/api";
import type {
  ApiRosterError,
  ApiRosterUploadResult,
  ApiRosterValidation,
} from "@/lib/api/endpoints/roster";
import { useAuthPageConfig } from "@/lib/auth-page-config";
import { legendGroupsFor } from "@/lib/data/roster";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button, Spinner } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogIcon,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dropzone } from "@/components/ui/dropzone";
import { Field, FormGrid } from "@/components/ui/field";
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
  FootSum,
  PageTitle,
  Panel,
  PanelFoot,
  Toolbar,
  ToolbarGroup,
  ToolbarTitle,
} from "@/components/ui/panel";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

import { downloadBlob } from "../../users/_lib/csv";

type Stage = "idle" | "ready" | "scanning" | "results";

const MONTH_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const MONTH_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* Warna sel review: merah untuk kode invalid/kosong; sisanya netral. */
function cellTone(code: string, bad: boolean): string {
  if (bad) return "var(--color-danger-text)";
  if (!code || code === "—") return "var(--text-tertiary)";
  return "var(--text-secondary)";
}

export default function RosterUploadPage() {
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const router = useRouter();
  const { departments } = useAuthPageConfig();

  const [stage, setStage] = React.useState<Stage>("idle");
  const [file, setFile] = React.useState<File | null>(null);
  const [upName, setUpName] = React.useState("");
  const [dragging, setDragging] = React.useState(false);
  const [importBusy, setImportBusy] = React.useState(false);
  const [scanBusy, setScanBusy] = React.useState(false);
  const [validation, setValidation] =
    React.useState<ApiRosterValidation | null>(null);

  /* Periode & dept untuk Scan/Submit — diisi dari dialog template atau
     default bulan depan. */
  const now = new Date();
  const defMonth = ((now.getMonth() + 1) % 12) + 1;
  const defYear =
    now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const [workDept, setWorkDept] = React.useState("");
  const [workMonth, setWorkMonth] = React.useState(String(defMonth));
  const [workYear, setWorkYear] = React.useState(String(defYear));

  const fileRef = React.useRef<HTMLInputElement>(null);

  const [tplOpen, setTplOpen] = React.useState(false);
  const [tplBusy, setTplBusy] = React.useState(false);
  const [tplDept, setTplDept] = React.useState("");
  const [tplMonth, setTplMonth] = React.useState(String(defMonth));
  const [tplYear, setTplYear] = React.useState(String(defYear));
  const [tplDeptErr, setTplDeptErr] = React.useState(false);
  const tplYears = [defYear - 1, defYear, defYear + 1, defYear + 2];
  const monthNames = lang === "en" ? MONTH_EN : MONTH_ID;

  /* Default departemen = opsi resmi pertama begitu daftarnya tiba.
     DITURUNKAN saat render, bukan setState dalam effect (dilarang
     react-hooks/set-state-in-effect — memblokir pre-commit): state kosong
     berarti "belum disentuh pengguna", dan nilai efektif ini dipakai
     KONSISTEN oleh select, validasi, dan payload — pola yang sama dengan
     dept/pos di employee-form. */
  const workDeptEff = workDept || departments[0] || "";
  const tplDeptEff = tplDept || departments[0] || "";

  const monthPeriod = React.useMemo(() => {
    const y = parseInt(workYear, 10);
    const m = parseInt(workMonth, 10);
    return `${y}-${String(m).padStart(2, "0")}`;
  }, [workMonth, workYear]);

  function pickFile(f: File) {
    setFile(f);
    setUpName(f.name);
    setValidation(null);
    setStage("ready");
  }

  async function downloadTemplate() {
    if (tplBusy) return;
    if (!tplDeptEff.trim()) {
      setTplDeptErr(true);
      return;
    }
    setTplBusy(true);
    try {
      const y = parseInt(tplYear, 10);
      const m = parseInt(tplMonth, 10);
      const month = `${y}-${String(m).padStart(2, "0")}`;
      const blob = await rosterApi.downloadRosterTemplate({
        dept: tplDeptEff,
        month,
      });
      const name = `roster-template-${tplDeptEff.toLowerCase().replace(/\s+/g, "-")}-${month}.xlsx`;
      downloadBlob(name, blob);
      setWorkDept(tplDeptEff);
      setWorkMonth(tplMonth);
      setWorkYear(tplYear);
      pushToast("success", t.toastTemplateT, name);
      setTplOpen(false);
    } catch (err) {
      pushToast("error", t.toastScanErrT, errorDetail(err, t.upTplEmpty));
    } finally {
      setTplBusy(false);
    }
  }

  async function doScan() {
    if (!file || scanBusy) return;
    /* Periode/dept diambil dari dialog Unduh Template (bukan filter di
       dekat attach). Jika belum pernah unduh, minta unduh dulu. */
    if (!workDeptEff.trim()) {
      pushToast("error", t.toastScanErrT, t.upTplErrDept);
      setTplOpen(true);
      return;
    }
    setScanBusy(true);
    setStage("scanning");
    try {
      const res: ApiRosterUploadResult = await rosterApi.uploadRoster({
        file,
        month: monthPeriod,
        dept: workDeptEff,
        label: `${monthNames[parseInt(workMonth, 10) - 1]} ${workYear} — ${workDeptEff}`,
        dryRun: true,
      });
      setValidation(res.validation);
      setStage("results");
      pushToast(
        "success",
        t.toastScanT,
        `${res.validation.validCount} ${t.vValid.split("—")[0].trim()}`
      );
    } catch (err) {
      setStage("ready");
      pushToast("error", t.toastScanErrT, errorDetail(err, t.apErrT));
    } finally {
      setScanBusy(false);
    }
  }

  async function doImport() {
    if (!file || !validation || importBusy) return;
    if (validation.errCount > 0) {
      pushToast("error", t.toastScanErrT, t.upImportBlocked);
      return;
    }
    setImportBusy(true);
    try {
      const res = await rosterApi.uploadRoster({
        file,
        month: monthPeriod,
        dept: workDeptEff,
        label: `${monthNames[parseInt(workMonth, 10) - 1]} ${workYear} — ${workDeptEff}`,
        dryRun: false,
      });
      pushToast(
        "success",
        t.toastImportT,
        res.meta
          ? `${res.meta.label} · ${res.meta.emp} ${t.thEmpN.toLowerCase()}`
          : t.toastImportD
      );
      router.push(
        res.meta?.key != null
          ? `/roster/detail?p=${res.meta.key}`
          : "/roster/data"
      );
    } catch (err) {
      pushToast("error", t.apErrT, errorDetail(err, t.upImportBlocked));
    } finally {
      setImportBusy(false);
    }
  }

  /* Peta sel bermasalah: nik|day → true */
  const badCells = React.useMemo(() => {
    const set = new Set<string>();
    for (const e of validation?.errors ?? []) {
      if (e.day && e.nik) set.add(`${e.nik}|${e.day}`);
    }
    return set;
  }, [validation]);

  /* Catatan di bawah tabel: "Tanggal - Catatan Kesalahan" */
  const dateNotes = React.useMemo(() => {
    const notes: { key: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const e of validation?.errors ?? []) {
      if (!e.day) continue;
      const issue = lang === "en" ? e.issueEn || e.issue : e.issue;
      const dayLabel = validation?.days?.[e.day - 1] ?? String(e.day);
      const text = `${dayLabel} - ${issue}`;
      if (seen.has(text)) continue;
      seen.add(text);
      notes.push({ key: `${e.nik}-${e.day}-${e.row}`, label: text });
    }
    return notes;
  }, [validation, lang]);

  const [qPrev, setQPrev] = React.useState("");
  const needlePrev = qPrev.trim().toLowerCase();
  const prevRows = (validation?.preview ?? []).filter(
    (r) =>
      !needlePrev ||
      r.name.toLowerCase().includes(needlePrev) ||
      r.nik.toLowerCase().includes(needlePrev)
  );
  const pgPrev = usePagination(prevRows);

  const [qErr, setQErr] = React.useState("");
  const needleErr = qErr.trim().toLowerCase();
  const errRows = (validation?.errors ?? []).filter((e: ApiRosterError) => {
    if (!needleErr) return true;
    const issue = lang === "en" ? e.issueEn || e.issue : e.issue;
    return (
      e.nik.toLowerCase().includes(needleErr) ||
      e.emp.toLowerCase().includes(needleErr) ||
      issue.toLowerCase().includes(needleErr)
    );
  });
  const pgErr = usePagination(errRows);
  const legendGroups = legendGroupsFor(lang);

  const days = validation?.days ?? [];
  const dayCount = days.length;

  function downloadErrorNotes() {
    const lines = [
      "Tanggal - Catatan Kesalahan",
      ...dateNotes.map((n) => n.label),
      "",
      "Detail baris:",
      ...(validation?.errors ?? []).map((e) => {
        const issue = lang === "en" ? e.issueEn || e.issue : e.issue;
        return `Baris ${e.row} | ${e.nik} | ${e.emp} | ${issue}`;
      }),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    downloadBlob(`roster-errors-${monthPeriod}.txt`, blob);
    pushToast("success", t.toastErrT, t.toastErrD);
  }

  const vchips = validation
    ? [
        {
          n: String(validation.validCount),
          label: t.vValid,
          bg: "var(--badge-success-fill)",
          border: "var(--badge-success-border)",
          color: "var(--badge-success-text)",
        },
        {
          n: String(validation.dupCount),
          label: t.vDup,
          bg: "var(--badge-warning-fill)",
          border: "var(--badge-warning-border)",
          color: "var(--badge-warning-text)",
        },
        {
          n: String(validation.errCount),
          label: t.vErr,
          bg: "var(--badge-danger-fill)",
          border: "var(--badge-danger-border)",
          color: "var(--color-danger-text)",
        },
      ]
    : [];

  const canSubmit = !!validation && validation.errCount === 0;

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.navR1} sub={t.upSub}>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => router.push("/roster/data")}>
            <ArrowLeft />
            {t.upBack}
          </Button>
          <Button variant="secondary" onClick={() => setTplOpen(true)}>
            <Download />
            {t.upTemplate}
          </Button>
        </div>
      </PageTitle>

      <Panel>
        <Dropzone
          icon={<Upload />}
          title={t.dzTitle}
          hint={t.dzHint}
          aria-label={t.dzTitle}
          dragging={dragging}
          onDragChange={setDragging}
          onPick={() => fileRef.current?.click()}
          onDropFile={(name, f) => {
            if (f) pickFile(f);
            else if (name) {
              /* Dropzone lama kadang hanya kirim nama — minta pilih ulang */
              fileRef.current?.click();
            }
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
            e.target.value = "";
          }}
        />

        {file ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-semibold">{upName}</span>
              <span className="ml-2 text-(--text-tertiary)">
                {stage === "scanning" ? t.upScanning : t.upFileReady}
              </span>
            </div>
            <Button
              onClick={() => void doScan()}
              disabled={scanBusy || !workDeptEff}
            >
              {scanBusy ? <Spinner /> : <ScanSearch />}
              {scanBusy ? t.upScanning : t.upScan}
            </Button>
          </div>
        ) : null}
      </Panel>

      {/* Review di tengah: di bawah attach, di atas legend — tanpa filter;
          isi matriks mengikuti hasil Scan dari file yang diunggah. */}
      {stage === "results" && validation ? (
        <div className="flex flex-col gap-6 max-sm:gap-4">
          <Panel>
            <Toolbar className="mb-4">
              <ToolbarTitle>
                {t.upPrevTitle} — {upName}
              </ToolbarTitle>
              <ToolbarGroup>
                <SearchInput
                  className="w-60 max-sm:w-full"
                  placeholder={t.searchEmp}
                  aria-label={t.searchEmp}
                  value={qPrev}
                  onChange={(e) => setQPrev(e.target.value)}
                />
                <span className="text-xs text-(--text-tertiary)">
                  {t.upPrevHint}
                </span>
              </ToolbarGroup>
            </Toolbar>
            <div className="overflow-x-auto pb-2">
              <Table className="min-w-400">
                <TableHeader>
                  <tr>
                    <TableHead className="w-27.5">NIK</TableHead>
                    <TableHead className="w-47.5">{t.thNama}</TableHead>
                    {days.map((d) => (
                      <TableHead
                        key={d}
                        className="px-1.5 py-3 text-center font-mono"
                      >
                        {d}
                      </TableHead>
                    ))}
                  </tr>
                </TableHeader>
                <TableBody>
                  {pgPrev.rows.map((r) => (
                    <TableRow key={r.nik}>
                      <TableCell className="font-mono whitespace-nowrap">
                        {r.nik}
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap">
                        {r.name}
                      </TableCell>
                      {Array.from({ length: dayCount }, (_, i) => {
                        const day = i + 1;
                        const code = r.codes?.[day] ?? "—";
                        const bad =
                          badCells.has(`${r.nik}|${day}`) ||
                          code === "—" ||
                          code === "";
                        return (
                          <TableCell
                            key={day}
                            className="px-1.5 py-3 text-center font-mono text-xs font-semibold"
                            style={{
                              color: cellTone(code, bad),
                              background: bad
                                ? "var(--badge-danger-fill)"
                                : undefined,
                            }}
                          >
                            {code || "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PanelFoot>
              <FootSum>
                {t.upPrevA} <b>{pgPrev.range}</b> {t.upPrevB}
              </FootSum>
              <Pagination
                page={pgPrev.page}
                pageCount={pgPrev.pageCount}
                onPage={pgPrev.setPage}
                per={pgPrev.per}
                perOptions={["10", "25", "50"]}
                onPer={pgPrev.setPer}
              />
            </PanelFoot>

            <div className="mt-4 border-t border-(--divider) px-1 pt-4">
              <div className="mb-2 text-sm font-semibold">{t.upNotesTitle}</div>
              {dateNotes.length === 0 ? (
                <p className="text-sm text-(--text-tertiary)">
                  {t.upNotesEmpty}
                </p>
              ) : (
                <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm text-(--color-danger-text)">
                  {dateNotes.map((n) => (
                    <li key={n.key} className="font-mono">
                      ( {n.label} )
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          <Panel>
            <Toolbar className="mb-4">
              <ToolbarTitle>
                {t.upResults} — {upName}
              </ToolbarTitle>
              <ToolbarGroup>
                <SearchInput
                  className="w-60 max-sm:w-full"
                  placeholder={t.searchEmp}
                  aria-label={t.searchEmp}
                  value={qErr}
                  onChange={(e) => setQErr(e.target.value)}
                />
              </ToolbarGroup>
            </Toolbar>
            <div className="mb-5 flex flex-wrap gap-3">
              {vchips.map((c) => (
                <div
                  key={c.label}
                  className="flex min-w-45 flex-1 items-center gap-3 rounded-card border px-4 py-3"
                  style={{ background: c.bg, borderColor: c.border }}
                >
                  <div>
                    <div
                      className="text-xl font-bold tabular-nums"
                      style={{ color: c.color }}
                    >
                      {c.n}
                    </div>
                    <div className="text-xs" style={{ color: c.color }}>
                      {c.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead className="w-22.5">{t.thRow}</TableHead>
                    <TableHead>NIK</TableHead>
                    <TableHead>{t.thEmp}</TableHead>
                    <TableHead>{t.thIssue}</TableHead>
                    <TableHead>{t.thType}</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {pgErr.rows.map((e, idx) => (
                    <TableRow key={`${e.row}-${e.nik}-${idx}`}>
                      <TableCell className="font-mono">{e.row}</TableCell>
                      <TableCell className="font-mono">{e.nik}</TableCell>
                      <TableCell>{e.emp}</TableCell>
                      <TableCell>
                        {lang === "en" ? e.issueEn || e.issue : e.issue}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            e.badgeVariant === "warning" ? "warning" : "danger"
                          }
                          dot
                        >
                          {e.badge}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
            <PanelFoot>
              <FootSum>{t.upFootNote}</FootSum>
              <div className="flex flex-wrap items-center gap-4">
                {errRows.length > 0 ? (
                  <Pagination
                    page={pgErr.page}
                    pageCount={pgErr.pageCount}
                    onPage={pgErr.setPage}
                    per={pgErr.per}
                    perOptions={["10", "25", "50"]}
                    onPer={pgErr.setPer}
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {dateNotes.length > 0 ||
                  (validation.errors?.length ?? 0) > 0 ? (
                    <Button variant="secondary" onClick={downloadErrorNotes}>
                      <Download />
                      {t.upDlErrors}
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => void doImport()}
                    disabled={importBusy || !canSubmit}
                  >
                    {importBusy ? <Spinner /> : null}
                    {importBusy ? t.upImporting : t.upImport}
                  </Button>
                </div>
              </div>
            </PanelFoot>
          </Panel>
        </div>
      ) : null}

      <Panel>
        <Toolbar className="mb-4">
          <ToolbarTitle>{t.legendTitle}</ToolbarTitle>
          <span className="text-xs text-(--text-tertiary)">{t.legendNote}</span>
        </Toolbar>
        {legendGroups.map((g, gi) => (
          <div key={g.label}>
            <div
              className={`mb-2 text-xs font-semibold tracking-[.05em] text-(--text-tertiary) uppercase ${gi === 0 ? "" : "mt-4"}`}
            >
              {g.label}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
              {g.codes.map((c) => (
                <div
                  key={c.k}
                  className="flex items-center gap-2 rounded-lg border border-(--divider) bg-(--fill-subtle) px-2 py-1.5 text-xs text-(--text-secondary)"
                >
                  <b className="min-w-9.5 flex-none rounded-md border border-[rgba(0,212,255,.3)] bg-[rgba(0,212,255,.12)] px-1 py-0.75 text-center font-mono text-[11px] font-bold text-primary-bright">
                    {c.k}
                  </b>
                  {c.v}
                </div>
              ))}
            </div>
          </div>
        ))}
      </Panel>

      <Dialog
        open={tplOpen}
        onClose={() => setTplOpen(false)}
        labelledBy="tpl-dlg-title"
      >
        <DialogIcon variant="info">
          <FileSpreadsheet />
        </DialogIcon>
        <DialogTitle id="tpl-dlg-title">{t.upTplDlgT}</DialogTitle>
        <DialogBody>{t.upTplDlgB}</DialogBody>
        <FormGrid className="mt-5">
          <Field
            label={t.upTplDept}
            htmlFor="tpl-dept"
            required
            error={tplDeptErr}
            errorMessage={t.upTplErrDept}
            className="col-span-full"
          >
            <Select
              id="tpl-dept"
              value={tplDeptEff}
              onChange={(e) => {
                setTplDept(e.target.value);
                if (e.target.value.trim()) setTplDeptErr(false);
              }}
            >
              <option value="">{t.regDeptPh}</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.upTplMonth} htmlFor="tpl-month">
            <Select
              id="tpl-month"
              value={tplMonth}
              onChange={(e) => setTplMonth(e.target.value)}
            >
              {monthNames.map((mn, i) => (
                <option key={mn} value={String(i + 1)}>
                  {mn}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.upTplYear} htmlFor="tpl-year">
            <Select
              id="tpl-year"
              value={tplYear}
              onChange={(e) => setTplYear(e.target.value)}
            >
              {tplYears.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <DialogActions>
          <Button variant="ghost" onClick={() => setTplOpen(false)}>
            {t.btnCancel}
          </Button>
          <Button onClick={() => void downloadTemplate()} disabled={tplBusy}>
            {tplBusy ? <Spinner /> : <Download />}
            {t.upTemplate}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
