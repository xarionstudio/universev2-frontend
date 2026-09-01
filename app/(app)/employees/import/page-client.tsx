"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CircleAlert,
  Download,
  TriangleAlert,
  Upload,
} from "lucide-react";

import { employeesApi, errorDetail } from "@/lib/api";
import type {
  ApiEmployeeImportPreview,
  ApiImportIssue,
} from "@/lib/api/endpoints/employees";
import { useI18n } from "@/lib/i18n";
import { usePermissions } from "@/components/providers/permissions";
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

import { downloadBlob } from "../../users/_lib/csv";

type Stage = "idle" | "checking" | "results";

/* Halaman tersendiri, bukan dialog di atas daftar Karyawan: alurnya membawa
   dua tabel penuh plus deretan hitungan, dan menaruh itu dalam modal berarti
   area gulir sempit atau modal lebih tinggi dari layar. Halaman juga bisa
   dikirim sebagai tautan ke admin lain, dan impor yang diurungkan cukup
   ditinggalkan dengan Kembali. */
export default function EmployeeImportPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { can } = usePermissions();
  const router = useRouter();

  const canManage = can("employees", "manage");

  const [stage, setStage] = React.useState<Stage>("idle");
  const [pct, setPct] = React.useState(0);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<ApiEmployeeImportPreview | null>(
    null
  );
  const [dragging, setDragging] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [fatal, setFatal] = React.useState<string | null>(null);
  const [confirmPos, setConfirmPos] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [qPrev, setQPrev] = React.useState("");
  const [qErr, setQErr] = React.useState("");

  async function downloadTemplate() {
    try {
      const blob = await employeesApi.downloadImportTemplate();
      const name = "template-karyawan-kompetensi.xlsx";
      downloadBlob(name, blob);
      pushToast("success", t.eiTplToastT, name);
    } catch (e) {
      pushToast("error", t.eiTpl, errorDetail(e, t.apErrT));
    }
  }

  /* Preview TIDAK menulis apa pun — berkas hanya diperiksa. Progres di sini
     hanya penanda bahwa unggahannya berjalan; server tidak melaporkan
     kemajuan per baris, jadi angkanya sengaja berhenti di 85% sampai
     jawabannya benar-benar tiba. */
  async function check(picked: File) {
    setFile(picked);
    setPreview(null);
    setFatal(null);
    setStage("checking");
    setPct(15);

    const timer = setInterval(() => setPct((p) => (p < 85 ? p + 10 : p)), 120);
    try {
      const res = await employeesApi.previewImportEmployees(picked);
      setPreview(res);
      setStage("results");
    } catch (e) {
      setStage("idle");
      setFatal(errorDetail(e, t.apErrT));
    } finally {
      clearInterval(timer);
      setPct(100);
    }
  }

  /* Posisi baru bersifat permanen — satu ejaan salah ikut jadi opsi register
     selamanya, dan hanya admin yang bisa membedakan posisi baru dari salah
     ketik. Selain itu tidak ada yang perlu dikonfirmasi: rencananya sudah
     terbaca utuh di tabel. */
  function requestCommit() {
    if ((preview?.newPositions ?? []).length) setConfirmPos(true);
    else void commit();
  }

  async function commit() {
    if (!file) return;
    setConfirmPos(false);
    setBusy(true);
    try {
      const res = await employeesApi.importEmployees(file);
      const parts = [
        `${res.created} ${t.eiCreated}`,
        `${res.updated} ${t.eiUpdated}`,
      ];
      if (res.kompUpdated > 0) parts.push(`${res.kompUpdated} ${t.eiKompDone}`);
      if (res.pending > 0) parts.push(`${res.pending} ${t.eiPendingDone}`);
      pushToast("success", t.eiDoneT, parts.join(" · "));
      router.push("/employees");
    } catch (e) {
      pushToast("error", t.apErrT, errorDetail(e, t.eiBlocked));
    } finally {
      setBusy(false);
    }
  }

  const rows = preview?.rows ?? [];
  const needlePrev = qPrev.trim().toLowerCase();
  const prevRows = rows.filter(
    (r) =>
      !needlePrev ||
      r.nik.toLowerCase().includes(needlePrev) ||
      r.name.toLowerCase().includes(needlePrev) ||
      r.data.toLowerCase().includes(needlePrev)
  );
  const pgPrev = usePagination(prevRows);

  /* Error dan peringatan dalam SATU daftar, urut nomor baris. Dua tabel
     akan memaksa admin mencocokkan nomor baris antar-tabel untuk menjawab
     satu pertanyaan: apa yang harus saya lihat sebelum menekan Import.
     Tingkat keparahannya sudah dibawa badge tiap baris. */
  const needleErr = qErr.trim().toLowerCase();
  const errRows = [...(preview?.errors ?? []), ...(preview?.warnings ?? [])]
    .sort((a, b) => Number(a.row) - Number(b.row))
    .filter(
      (e: ApiImportIssue) =>
        !needleErr ||
        e.nik.toLowerCase().includes(needleErr) ||
        e.emp.toLowerCase().includes(needleErr) ||
        e.issue.toLowerCase().includes(needleErr)
    );
  const pgErr = usePagination(errRows);

  /* Apa yang akan benar-benar ditulis. Kompetensi ikut dihitung: berkas
     yang data karyawannya sudah sama persis dan hanya mengisi SIMPER yang
     masih kosong tidak boleh mematikan tombol Import — itu justru kasus
     pemakaian yang paling lazim. */
  const willWrite = preview
    ? preview.newCount +
      preview.updatedCount +
      preview.pendingCount +
      preview.kompChangedCount
    : 0;

  const chips = preview
    ? [
        { n: preview.newCount, label: t.eiNew, tone: "success" as const },
        { n: preview.updatedCount, label: t.eiUpd, tone: "warning" as const },
        { n: preview.unchangedCount, label: t.eiSame, tone: "muted" as const },
        {
          n: preview.pendingCount,
          label: t.eiPending,
          tone: "warning" as const,
        },
        { n: preview.errorCount, label: t.eiErr, tone: "danger" as const },
        {
          n: preview.kompChangedCount,
          label: t.eiKompChip,
          tone: "info" as const,
        },
      ]
    : [];

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
    info: {
      background: "rgba(0,212,255,.12)",
      borderColor: "rgba(0,212,255,.4)",
      color: "var(--color-primary-bright)",
    },
    muted: {
      background: "var(--fill-subtle)",
      borderColor: "var(--divider)",
      color: "var(--text-secondary)",
    },
  };

  /* Tampilan saja — backend menolak ketiga endpoint impor tanpa
     employees:manage, apa pun yang ter-render di sini. */
  if (!canManage) {
    return (
      <StateBox
        icon={<CircleAlert className="text-danger-text" />}
        title={t.apErrT}
        body={t.eiSub}
      >
        <Button onClick={() => router.push("/employees")}>{t.eiBack}</Button>
      </StateBox>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.eiTitle} sub={t.eiSub}>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push("/employees")}>
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
          title={t.eiDzTitle}
          hint={t.eiDzHint}
          aria-label={t.eiDzTitle}
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

        {/* Berkas tanpa sheet Kompetensi bukan kesalahan, tapi diam-diam
            membiarkan SIMPER apa adanya adalah hal yang harus dikatakan:
            admin yang mengira sedang memperbarui kompetensi perlu tahu
            bahwa berkasnya tidak memuatnya. */}
        {stage === "results" && preview && !preview.kompSheetFound ? (
          <p className="mt-4 rounded-control border border-(--badge-warning-border) bg-(--badge-warning-fill) px-3 py-2.5 text-xs text-(--badge-warning-text)">
            <b>{t.eiNoKompSheetT}</b> — {t.eiNoKompSheetB}
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
                  <TableHead>{t.eiDataCol}</TableHead>
                  <TableHead className="w-60">{t.eiKompCol}</TableHead>
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
                            : r.kind === "updated" || r.kind === "pending"
                              ? "warning"
                              : "neutral"
                        }
                        dot
                      >
                        {r.kind === "new"
                          ? t.eiNew
                          : r.kind === "updated"
                            ? t.eiUpd
                            : r.kind === "pending"
                              ? t.eiPending
                              : t.eiSame}
                      </Badge>
                    </TableCell>
                    {/* Baris apa adanya, seluruh kolom digabung — supaya
                        preview bisa dicocokkan dengan berkasnya tanpa
                        membuka Excel. Dibungkus, bukan dipotong: baris
                        karyawan memang panjang. */}
                    <TableCell className="max-w-120">
                      <span className="wrap-break-word">
                        <b className="font-semibold">{r.nik}</b>
                        <span className="text-(--text-secondary)">
                          {" "}
                          {r.data.slice(r.nik.length)}
                        </span>
                      </span>
                    </TableCell>
                    {/* Kosong = sheet Kompetensi tidak menyebut NIK ini;
                        SIMPER lamanya tidak disentuh. Dikatakan, bukan
                        dibiarkan sebagai sel kosong yang ambigu. */}
                    <TableCell className="text-(--text-secondary)">
                      {r.komp?.length ? (
                        <div className="flex flex-col gap-0.5 text-xs">
                          {r.komp.map((k) => (
                            <span key={k} className="font-mono">
                              {k}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-(--text-tertiary)">
                          {t.eiNoKomp}
                        </span>
                      )}
                    </TableCell>
                    {/* Menyebut tiap kolom yang akan tertimpa adalah yang
                        mencegah nilai hasil perbaikan manual hilang lewat
                        unggah ulang. */}
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
                <b>{pgPrev.total}</b> {t.eiRowsB}
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
                  <TableHead className="w-32">NIK</TableHead>
                  <TableHead className="w-48">{t.eiValueCol}</TableHead>
                  <TableHead>{t.thIssue}</TableHead>
                  <TableHead className="w-36">{t.thType}</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {/* Ber-indeks: satu baris berkas bisa memunculkan beberapa
                    temuan, dan keduanya berbagi nomor baris serta NIK. */}
                {pgErr.rows.map((e, i) => (
                  <TableRow key={`${e.row}-${e.nik}-${i}`}>
                    <TableCell className="font-mono">{e.row}</TableCell>
                    <TableCell className="font-mono">{e.nik}</TableCell>
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
                  onClick={requestCommit}
                  disabled={busy || preview.errorCount > 0 || willWrite === 0}
                >
                  {busy ? <Spinner /> : null}
                  {/* "Import 0" akan terbaca sebagai tombol yang seharusnya
                      bisa ditekan; menyebut alasannya lebih jujur. */}
                  {busy
                    ? t.eiDoing
                    : willWrite === 0
                      ? t.eiNothing
                      : `${t.eiDo} ${willWrite} ${t.eiRowsB}`}
                </Button>
              </div>
            </PanelFoot>
          </Panel>
        </>
      ) : null}

      <Dialog
        open={confirmPos}
        onClose={() => setConfirmPos(false)}
        labelledBy="ei-pos-t"
      >
        <DialogIcon variant="warning">
          <TriangleAlert />
        </DialogIcon>
        <DialogTitle id="ei-pos-t">{t.eiPosT}</DialogTitle>
        <DialogBody>{t.eiPosB}</DialogBody>
        <div className="mt-4 flex max-h-[40vh] flex-wrap gap-1.5 overflow-y-auto">
          {(preview?.newPositions ?? []).map((p) => (
            <span
              key={p}
              className="rounded-control border border-(--badge-warning-border) bg-(--badge-warning-fill) px-2 py-1 text-xs text-(--badge-warning-text)"
            >
              {p}
            </span>
          ))}
        </div>
        <DialogActions>
          <Button variant="ghost" onClick={() => setConfirmPos(false)}>
            {t.btnCancel}
          </Button>
          <Button onClick={() => void commit()} disabled={busy}>
            {busy ? <Spinner /> : null}
            {t.eiConfirm}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
