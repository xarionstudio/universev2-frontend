"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Upload } from "lucide-react";

import { rosterApi } from "@/lib/api/roster";
import type { RosterValidation, ShiftCodeGroup } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button, Spinner } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Input } from "@/components/ui/input";
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
import { Progress } from "@/components/ui/progress";
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

type Stage = "idle" | "progress" | "validating" | "results";

function colorOfCode(c: string) {
  if (["OFF", "CR", "AL", "LWP", "LWOP", "PH", "PHD"].includes(c))
    return "var(--text-tertiary)";
  if (["S", "A", "ISM", "OBC", "KRT", "TERM", "RSG", "EOC"].includes(c))
    return "var(--color-danger-text)";
  if (c === "N") return "var(--color-primary-bright)";
  return "var(--text-secondary)";
}

export default function RosterUploadPage() {
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const router = useRouter();

  const [stage, setStage] = React.useState<Stage>("idle");
  const [pct, setPct] = React.useState(0);
  const [upName, setUpName] = React.useState("");
  const [dragging, setDragging] = React.useState(false);
  const [importBusy, setImportBusy] = React.useState(false);
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [upMonth, setUpMonth] = React.useState(() =>
    // WITA (UTC+8) — avoid "yesterday" bug at 00:00–07:59 local time
    new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 7)
  );
  const [upDept, setUpDept] = React.useState("Operation");

  const [validation, setValidation] = React.useState<RosterValidation | null>(
    null
  );
  const [legendGroups, setLegendGroups] = React.useState<ShiftCodeGroup[]>([]);

  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    rosterApi
      .getShiftCodes()
      .then((data) => {
        if (data && Array.isArray(data)) {
          setLegendGroups(data);
        }
      })
      .catch(() => {});
  }, []);

  const startUpload = React.useCallback(
    async (fileOrName?: File | string) => {
      if (!fileOrName) return;
      let file: File | null = null;
      if (typeof fileOrName !== "string") {
        file = fileOrName;
      }
      if (!file) return;

      setUploadedFile(file);
      setUpName(file.name);
      setStage("progress");
      setPct(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("month", upMonth);
      formData.append("dept", upDept);
      formData.append("label", upMonth);

      try {
        const result = await rosterApi.uploadRosterWithProgress(
          formData,
          (percent) => {
            setPct(percent);
          }
        );
        setStage("validating");
        setValidation(result.validation);
        setTimeout(() => setStage("results"), 400);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Upload gagal";
        pushToast("error", "Upload Gagal", errorMessage);
        setStage("idle");
      }
    },
    [pushToast, upMonth, upDept]
  );

  async function doImport() {
    if (!uploadedFile) return;
    setImportBusy(true);
    try {
      /* Baris valid sudah tersimpan backend saat unggah; tombol ini hanya
         meneruskan ke daftar. Impor dua-tahap tidak ada — dijelaskan supaya
         user tidak mengira tombol ini yang menyimpan data. */
      pushToast("success", t.toastSavedT, t.toastSavedD);
      router.push("/roster/data");
    } finally {
      setImportBusy(false);
    }
  }

  const [qPrev, setQPrev] = React.useState("");
  const needlePrev = qPrev.trim().toLowerCase();
  const prevRows = React.useMemo(() => {
    if (!validation) return [];
    return validation.preview.filter(
      (r) =>
        !needlePrev ||
        r.name.toLowerCase().includes(needlePrev) ||
        r.nik.toLowerCase().includes(needlePrev)
    );
  }, [validation, needlePrev]);
  const pgPrev = usePagination(prevRows);

  const [qErr, setQErr] = React.useState("");
  const needleErr = qErr.trim().toLowerCase();
  const errRows = React.useMemo(() => {
    if (!validation) return [];
    return validation.errors.filter(
      (e) =>
        !needleErr ||
        e.nik.toLowerCase().includes(needleErr) ||
        e.emp.toLowerCase().includes(needleErr) ||
        (lang === "en" ? e.issueEn : e.issue).toLowerCase().includes(needleErr)
    );
  }, [validation, needleErr, lang]);
  const pgErr = usePagination(errRows);

  const vchips = [
    {
      n: validation ? String(validation.validCount) : "0",
      label: t.vValid,
      bg: "var(--badge-success-fill)",
      border: "var(--badge-success-border)",
      color: "var(--badge-success-text)",
    },
    {
      n: validation ? String(validation.dupCount) : "0",
      label: t.vDup,
      bg: "var(--badge-warning-fill)",
      border: "var(--badge-warning-border)",
      color: "var(--badge-warning-text)",
    },
    {
      n: validation ? String(validation.errCount) : "0",
      label: t.vErr,
      bg: "var(--badge-danger-fill)",
      border: "var(--badge-danger-border)",
      color: "var(--color-danger-text)",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.navR1} sub={t.upSub}>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push("/roster/data")}>
            <ArrowLeft />
            {t.upBack}
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              pushToast("success", t.toastTemplateT, t.toastTemplateD)
            }
          >
            <Download />
            {t.upTemplate}
          </Button>
        </div>
      </PageTitle>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <label className="flex flex-col gap-1 text-xs text-(--text-secondary)">
            {t.lblMonth}
            <Input
              type="month"
              className="w-44 font-mono"
              value={upMonth}
              onChange={(e) => setUpMonth(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-(--text-secondary)">
            {t.thDept}
            <Select
              className="w-44"
              value={upDept}
              onChange={(e) => setUpDept(e.target.value)}
            >
              <option value="Operation">Operation</option>
              <option value="Plant">Plant</option>
              <option value="SDI">SDI</option>
            </Select>
          </label>
        </div>
        <Dropzone
          icon={<Upload />}
          title={t.dzTitle}
          hint={t.dzHint}
          aria-label={t.dzTitle}
          dragging={dragging}
          onDragChange={setDragging}
          onPick={() => fileRef.current?.click()}
          onDropFile={(file) => startUpload(file)}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) startUpload(file);
            e.target.value = "";
          }}
        />
        {stage === "progress" || stage === "validating" ? (
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-semibold">{upName}</span>
              <span className="font-mono text-(--text-secondary)">
                {Math.round(pct)}%
              </span>
            </div>
            <Progress value={pct} />
            <p className="mt-2 text-xs text-(--text-tertiary)">
              {stage === "validating" ? t.upValidating : t.upUploading}
            </p>
          </div>
        ) : null}
      </Panel>

      {stage === "results" && validation ? (
        <div className="flex flex-col gap-6">
          <Panel>
            <Toolbar className="mb-4">
              <ToolbarTitle>
                {t.upPrevTitle} — {upName}
              </ToolbarTitle>
              <ToolbarGroup>
                <SearchInput
                  className="w-60"
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
                    {validation.days.map((d) => (
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
                      {validation.days.map((_, dayIdx) => {
                        const dayNum = dayIdx + 1;
                        const code = r.codes[dayNum] || "—";
                        return (
                          <TableCell
                            key={dayNum}
                            className="px-1.5 py-3 text-center font-mono text-xs"
                            style={{ color: colorOfCode(code) }}
                          >
                            {code}
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
          </Panel>

          <Panel>
            <Toolbar className="mb-4">
              <ToolbarTitle>
                {t.upResults} — {upName}
              </ToolbarTitle>
              <ToolbarGroup>
                <SearchInput
                  className="w-60"
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
                    <TableCell>{lang === "en" ? e.issueEn : e.issue}</TableCell>
                    <TableCell>
                      <Badge variant={e.badgeVariant} dot>
                        {e.badge}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PanelFoot>
              <FootSum>{t.upFootNote}</FootSum>
              <div className="flex flex-wrap items-center gap-4">
                <Pagination
                  page={pgErr.page}
                  pageCount={pgErr.pageCount}
                  onPage={pgErr.setPage}
                  per={pgErr.per}
                  perOptions={["10", "25", "50"]}
                  onPer={pgErr.setPer}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      pushToast("success", t.toastErrT, t.toastErrD)
                    }
                  >
                    <Download />
                    {t.upDlErrors}
                  </Button>
                  <Button onClick={doImport} disabled={importBusy}>
                    {importBusy ? <Spinner /> : null}
                    {importBusy ? t.upImporting : t.upGoData}
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
          <div key={g.group}>
            <div
              className={`mb-2 text-xs font-semibold tracking-[.05em] text-(--text-tertiary) uppercase ${gi === 0 ? "" : "mt-4"}`}
            >
              {lang === "en" ? g.groupEn : g.group}
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
                  {lang === "en" ? c.vEn : c.v}
                </div>
              ))}
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
