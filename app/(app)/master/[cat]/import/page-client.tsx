"use client";

import * as React from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert, Download, Upload } from "lucide-react";

import { errorDetail, masterApi } from "@/lib/api";
import {
  hasGuidedImport,
  type ApiMasterImportPreview,
  type MasterCategory,
  type MasterImportCategory,
} from "@/lib/api/endpoints/master";
import { useI18n } from "@/lib/i18n";
import { usePermissions } from "@/components/providers/permissions";
import { Badge } from "@/components/ui/badge";
import { Button, Spinner } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
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
import { StateBox } from "@/components/ui/state-box";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

import { downloadBlob } from "../../../users/_lib/csv";

type Stage = "idle" | "checking" | "results";

/* Halaman impor master, satu layar untuk kedua kategori yang punya impor
   terpandu (Eq. Class dan Type EGI) — yang berbeda hanya label kolom dan
   petunjuknya. Bentuknya sengaja sama dengan /employees/import: admin yang
   sudah pernah mengimpor karyawan tidak perlu belajar alur kedua. */
export default function MasterImportPage() {
  const params = useParams<{ cat: string }>();
  const cat = params.cat as MasterCategory;
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { can } = usePermissions();
  const router = useRouter();

  const canManage = can("master", "manage");

  const [stage, setStage] = React.useState<Stage>("idle");
  const [pct, setPct] = React.useState(0);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<ApiMasterImportPreview | null>(
    null
  );
  const [dragging, setDragging] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [fatal, setFatal] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [qPrev, setQPrev] = React.useState("");
  const [qErr, setQErr] = React.useState("");

  /* Kategori tanpa impor terpandu tidak punya endpoint preview/template —
     404 di sini, bukan layar yang setiap tombolnya gagal.

     Disimpan sebagai nilai TERSEMPIT (bukan mengandalkan penyempitan dari
     `if` di atas): penyempitan tidak menembus closure, dan tiap pemanggil
     endpoint di bawah adalah closure. */
  const importCat: MasterImportCategory | null = hasGuidedImport(cat)
    ? cat
    : null;
  if (!importCat) notFound();

  const isEgi = cat === "egi";
  const nameCol = isEgi ? t.miNameEgi : t.miNameEq;
  const extraCol = isEgi ? t.miExtraEgi : t.miExtraEq;
  const hint = isEgi ? t.miHintEgi : t.miHintEq;
  const listHref = `/master/${cat}`;

  async function downloadTemplate() {
    if (!importCat) return;
    try {
      const blob = await masterApi.downloadMasterImportTemplate(importCat);
      const name = `template-master-${cat}.xlsx`;
      downloadBlob(name, blob);
      pushToast("success", t.eiTplToastT, name);
    } catch (e) {
      pushToast("error", t.eiTpl, errorDetail(e, t.apErrT));
    }
  }

  async function check(picked: File) {
    if (!importCat) return;
    setFile(picked);
    setPreview(null);
    setFatal(null);
    setStage("checking");
    setPct(15);

    const timer = setInterval(() => setPct((p) => (p < 85 ? p + 10 : p)), 120);
    try {
      setPreview(await masterApi.previewImportMaster(importCat, picked));
      setStage("results");
    } catch (e) {
      setStage("idle");
      setFatal(errorDetail(e, t.apErrT));
    } finally {
      clearInterval(timer);
      setPct(100);
    }
  }

  async function commit() {
    if (!file || !importCat) return;
    setBusy(true);
    try {
      const res = await masterApi.importMaster(importCat, file);
      pushToast(
        "success",
        t.eiDoneT,
        `${res.created} ${t.eiCreated} · ${res.updated} ${t.eiUpdated}`
      );
      router.push(listHref);
    } catch (e) {
      pushToast("error", t.apErrT, errorDetail(e, t.eiBlocked));
    } finally {
      setBusy(false);
    }
  }

  const needlePrev = qPrev.trim().toLowerCase();
  const prevRows = (preview?.rows ?? []).filter(
    (r) => !needlePrev || r.data.toLowerCase().includes(needlePrev)
  );
  const pgPrev = usePagination(prevRows);

  /* Error dan peringatan dalam satu daftar, urut nomor baris — tingkat
     keparahannya sudah dibawa badge tiap baris. */
  const needleErr = qErr.trim().toLowerCase();
  const errRows = [...(preview?.errors ?? []), ...(preview?.warnings ?? [])]
    .sort((a, b) => Number(a.row) - Number(b.row))
    .filter(
      (e) =>
        !needleErr ||
        e.nik.toLowerCase().includes(needleErr) ||
        e.emp.toLowerCase().includes(needleErr) ||
        e.issue.toLowerCase().includes(needleErr)
    );
  const pgErr = usePagination(errRows);

  const willWrite = preview ? preview.newCount + preview.updatedCount : 0;

  const chipStyle: Record<string, React.CSSProperties> = {
    success: {
      background: "var(--badge-success-fill)",
      borderColor: "var(--badge-success-border)",
      color: "var(--badge-success-text)",
    },
    warning: {
      background: "var(--badge-warning-fill)",
      borderColor: "var(--badge-warning-border)",
      color: "var(--badge-warning-text)",
    },
    danger: {
      background: "var(--badge-danger-fill)",
      borderColor: "var(--badge-danger-border)",
      color: "var(--color-danger-text)",
    },
    muted: {
      background: "var(--fill-subtle)",
      borderColor: "var(--divider)",
      color: "var(--text-secondary)",
    },
  };
  const chips = preview
    ? [
        { n: preview.newCount, label: t.eiNew, tone: "success" as const },
        { n: preview.updatedCount, label: t.eiUpd, tone: "warning" as const },
        { n: preview.unchangedCount, label: t.eiSame, tone: "muted" as const },
        { n: preview.errorCount, label: t.eiErr, tone: "danger" as const },
      ]
    : [];

  /* Tampilan saja — backend menolak ketiga endpoint tanpa master:manage. */
  if (!canManage) {
    return (
      <StateBox
        icon={<CircleAlert className="text-danger-text" />}
        title={t.apErrT}
        body={t.miSub}
      >
        <Button onClick={() => router.push(listHref)}>{t.eiBack}</Button>
      </StateBox>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={`${t.miTitle} — ${preview?.categoryLabel ?? (isEgi ? "Type EGI" : "Eq. Class")}`}
        sub={t.miSub}
      >
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push(listHref)}>
            <ArrowLeft />
            {t.eiBack}
          </Button>
          <Button variant="secondary" onClick={() => void downloadTemplate()}>
            <Download />
            {t.eiTpl}
          </Button>
        </div>
      </PageTitle>

      <Panel>
        <Dropzone
          icon={<Upload />}
          title={t.miDzTitle}
          hint={hint}
          aria-label={t.miDzTitle}
          dragging={dragging}
          onDragChange={setDragging}
          onPick={() => fileRef.current?.click()}
          onDropFile={(_name, dropped) => {
            if (dropped) void check(dropped);
            else fileRef.current?.click();
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            /* reset dulu supaya berkas yang sama bisa dipilih ulang
               setelah diperbaiki di Excel */
            e.target.value = "";
            if (picked) void check(picked);
          }}
        />

        {stage === "checking" ? (
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-semibold">{file?.name}</span>
              <span className="font-mono text-(--text-secondary)">
                {Math.round(pct)}%
              </span>
            </div>
            <Progress value={pct} />
            <p className="mt-2 text-xs text-(--text-tertiary)">
              {t.eiChecking}
            </p>
          </div>
        ) : null}

        {fatal ? (
          <p
            role="alert"
            className="mt-4 rounded-control border border-(--badge-danger-border) bg-(--badge-danger-fill) px-3 py-2.5 text-xs text-danger-text"
          >
            {fatal}
          </p>
        ) : null}
      </Panel>

      {stage === "results" && preview ? (
        <>
          <Panel>
            <Toolbar className="mb-4">
              <ToolbarTitle>
                {t.eiPrevTitle} — {preview.fileName}
              </ToolbarTitle>
              <ToolbarGroup>
                <SearchInput
                  className="w-60"
                  placeholder={t.mdSearchPh}
                  aria-label={t.mdSearchPh}
                  value={qPrev}
                  onChange={(e) => setQPrev(e.target.value)}
                />
              </ToolbarGroup>
            </Toolbar>

            <div className="mb-5 flex flex-wrap gap-3">
              {chips.map((c) => (
                <div
                  key={c.label}
                  className="flex min-w-40 flex-1 items-center gap-3 rounded-card border px-4 py-3"
                  style={chipStyle[c.tone]}
                >
                  <div>
                    <div className="text-xl font-bold tabular-nums">{c.n}</div>
                    <div className="text-xs">{c.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="w-16">{t.thRow}</TableHead>
                  <TableHead className="w-32">{t.thType}</TableHead>
                  <TableHead className="w-48">{nameCol}</TableHead>
                  <TableHead>{extraCol}</TableHead>
                  <TableHead className="w-60">{t.eiChanges}</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {pgPrev.rows.map((r) => (
                  <TableRow key={r.row}>
                    <TableCell className="font-mono">{r.row}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.kind === "new"
                            ? "success"
                            : r.kind === "updated"
                              ? "warning"
                              : "neutral"
                        }
                        dot
                      >
                        {r.kind === "new"
                          ? t.eiNew
                          : r.kind === "updated"
                            ? t.eiUpd
                            : t.eiSame}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{r.name}</TableCell>
                    {/* Type EGI tanpa Eq. Class tidak akan muncul di dropdown
                        mana pun — sel kosong yang polos menyembunyikan itu,
                        jadi keadaannya disebut. */}
                    <TableCell className="text-(--text-secondary)">
                      {r.extra || (
                        <span className="text-xs text-(--text-tertiary)">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-(--text-secondary)">
                      {r.changes?.length ? (
                        <div className="flex flex-col gap-0.5 text-xs">
                          {r.changes.map((c) => (
                            <span key={c.field}>
                              <b>{c.field}</b>: {c.from || "—"} → {c.to || "—"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-(--text-tertiary)">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PanelFoot>
              <FootSum>
                {t.attSumA} <b>{pgPrev.range}</b> {t.attSumB}{" "}
                <b>{pgPrev.total}</b> {t.miEntriesB}
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
              <ToolbarTitle>{t.eiResults}</ToolbarTitle>
              <ToolbarGroup>
                <SearchInput
                  className="w-60"
                  placeholder={t.mdSearchPh}
                  aria-label={t.mdSearchPh}
                  value={qErr}
                  onChange={(e) => setQErr(e.target.value)}
                />
              </ToolbarGroup>
            </Toolbar>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="w-20">{t.thRow}</TableHead>
                  <TableHead className="w-48">{nameCol}</TableHead>
                  <TableHead className="w-48">{t.eiValueCol}</TableHead>
                  <TableHead>{t.thIssue}</TableHead>
                  <TableHead className="w-36">{t.thType}</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {/* Ber-indeks: satu baris berkas bisa memunculkan beberapa
                    temuan yang berbagi nomor baris dan kunci. */}
                {pgErr.rows.map((e, i) => (
                  <TableRow key={`${e.row}-${e.nik}-${i}`}>
                    <TableCell className="font-mono">{e.row}</TableCell>
                    <TableCell className="font-semibold">{e.nik}</TableCell>
                    <TableCell className="text-(--text-secondary)">
                      {e.emp}
                    </TableCell>
                    <TableCell>{e.issue}</TableCell>
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
              <FootSum>
                {preview.errorCount > 0
                  ? t.eiBlocked
                  : willWrite === 0
                    ? t.eiNothingB
                    : t.eiFoot}
              </FootSum>
              <div className="flex flex-wrap items-center gap-4">
                <Pagination
                  page={pgErr.page}
                  pageCount={pgErr.pageCount}
                  onPage={pgErr.setPage}
                  per={pgErr.per}
                  perOptions={["10", "25", "50"]}
                  onPer={pgErr.setPer}
                />
                <Button
                  onClick={() => void commit()}
                  disabled={busy || preview.errorCount > 0 || willWrite === 0}
                >
                  {busy ? <Spinner /> : null}
                  {busy
                    ? t.eiDoing
                    : willWrite === 0
                      ? t.eiNothing
                      : `${t.eiDo} ${willWrite} ${t.miEntriesB}`}
                </Button>
              </div>
            </PanelFoot>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
