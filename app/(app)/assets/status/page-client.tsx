"use client";

import * as React from "react";
import { CircleAlert, Search, Wrench } from "lucide-react";

import { errorDetail, fleetApi } from "@/lib/api";
import { toUnitHist, toUnits } from "@/lib/api/adapters";
import {
  statusDotColor,
  type UnitHist,
  type UnitStatus,
} from "@/lib/data/unit-status";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/components/providers/app-store";
import { usePermissions } from "@/components/providers/permissions";
import { useRegisterRefresh } from "@/components/providers/refresh";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, Spinner } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogIcon,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  Timeline,
  TimelineItem,
} from "@/components/ui/drawer";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  FootSum,
  Fresh,
  PageTitle,
  Panel,
  PanelFoot,
  Toolbar,
  ToolbarGroup,
  ToolbarTitle,
} from "@/components/ui/panel";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented, SegmentedButton } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { StateBox } from "@/components/ui/state-box";
import {
  NameCell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

const statusBadge: Record<
  UnitStatus,
  { variant: BadgeVariant; label: string }
> = {
  ready: { variant: "success", label: "Ready" },
  breakdown: { variant: "danger", label: "Breakdown" },
  standby: { variant: "warning", label: "Standby" },
};

/* Papan berubah dari sisi server (laporan breakdown, sinkron unit DB) —
   irama poll yang sama dengan halaman ber-API lain. */
const REFRESH_MS = 60 * 1000;

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function stampNow() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())} WITA`;
}

/* stempel riwayat meniru layout server persis: Go `02 Jan 15:04` — bulan
   INGGRIS. toLocaleDateString("id-ID") menghasilkan "Agu"/"Mei" dan baris
   refleksi jadi beda format dari baris server di timeline yang sama. */
const GO_MONTHS = [
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
];
function histStampNow() {
  const d = new Date();
  return `${pad(d.getDate())} ${GO_MONTHS[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function UnitStatusPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { can } = usePermissions();
  const canManage = can("asset", "manage");
  /* Daftar tetap di app-store: dashboard membaca `units` untuk baris
     perhatian breakdown — halaman ini yang menghidrasinya dari backend. */
  const { units, setUnits } = useAppStore();

  const [filter, setFilter] = React.useState<"all" | UnitStatus>("all");
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [per, setPer] = React.useState("10");
  const [freshTime, setFreshTime] = React.useState("");

  /* ── hidrasi + poll 60 dtk (GET /api/units/status) ──
     Kegagalan poll latar didiamkan: data lama bertahan dan stempel
     "data per" tidak maju; kegagalan muat PERTAMA menampilkan kotak error
     dengan tombol ulang. */
  const [loaded, setLoaded] = React.useState(false);
  const [loadErr, setLoadErr] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    let ac: AbortController | null = null;
    const loadUnits = () => {
      ac?.abort();
      const c = new AbortController();
      ac = c;
      void fleetApi
        .listUnitStatuses(c.signal)
        .then((rows) => {
          if (!alive) return;
          setUnits(toUnits(rows));
          setLoaded(true);
          setLoadErr(false);
          setFreshTime(stampNow());
        })
        .catch(() => {
          if (alive && !c.signal.aborted) setLoadErr(true);
        });
    };
    loadUnits();
    const timer = setInterval(loadUnits, REFRESH_MS);
    return () => {
      alive = false;
      ac?.abort();
      clearInterval(timer);
    };
  }, [reloadKey, setUnits]);

  const retry = React.useCallback(() => {
    setLoadErr(false);
    setReloadKey((k) => k + 1);
  }, []);

  /* refresh dari topbar: tarik ulang dari server (stempel maju saat sukses) */
  useRegisterRefresh(retry);

  const [drawerCode, setDrawerCode] = React.useState<string | null>(null);
  const [dlgCode, setDlgCode] = React.useState<string | null>(null);
  const [newSt, setNewSt] = React.useState("Ready");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  /* Riwayat penuh diambil LAZY per unit saat drawer dibuka — payload daftar
     hanya membawa cuplikan; kegagalan jatuh diam-diam ke cuplikan itu. */
  const [drawerHist, setDrawerHist] = React.useState<{
    code: string;
    rows: UnitHist[];
  } | null>(null);
  React.useEffect(() => {
    if (!drawerCode) return;
    const ac = new AbortController();
    void fleetApi
      .getUnitHistory(drawerCode, ac.signal)
      .then((rows) => {
        if (!ac.signal.aborted)
          setDrawerHist({
            code: drawerCode,
            rows: (rows ?? []).map(toUnitHist),
          });
      })
      .catch(() => {
        /* pakai cuplikan dari payload daftar */
      });
    return () => ac.abort();
  }, [drawerCode]);

  const needle = q.trim().toLowerCase();
  const rows = units.filter((u) => {
    if (filter !== "all" && u.status !== filter) return false;
    if (!needle) return true;
    return (
      u.code.toLowerCase().includes(needle) ||
      u.type.toLowerCase().includes(needle) ||
      u.loc.toLowerCase().includes(needle)
    );
  });
  const breakN = units.filter((u) => u.status === "breakdown").length;

  const perN = Number(per);
  const pageCount = Math.max(1, Math.ceil(rows.length / perN));
  const p = Math.min(page, pageCount);
  const pageRows = rows.slice((p - 1) * perN, p * perN);
  const range = rows.length
    ? `${(p - 1) * perN + 1}–${Math.min(rows.length, p * perN)}`
    : "0";

  const drawerUnit = drawerCode
    ? units.find((u) => u.code === drawerCode)
    : undefined;
  const dlgUnit = dlgCode ? units.find((u) => u.code === dlgCode) : undefined;
  const drawerRows =
    drawerHist && drawerUnit && drawerHist.code === drawerUnit.code
      ? drawerHist.rows
      : (drawerUnit?.hist ?? []);

  function openDialog(code: string) {
    const u = units.find((x) => x.code === code);
    if (!u) return;
    setNewSt(statusBadge[u.status].label);
    setReason("");
    setDlgCode(code);
  }

  /* Ubah status → PUT /units/:code/status; Breakdown → POST status-report
     (server mencatat riwayat, menyetel updated_note, dan menyinkronkan flag
     unit DB). Refleksi lokal meniru persis yang disimpan server supaya poll
     berikutnya tidak menulis ulang barisnya. */
  async function saveStatus() {
    if (!dlgUnit || !reason.trim() || saving) return;
    const kind = newSt.toLowerCase() as UnitStatus;
    const why = reason.trim();
    setSaving(true);
    try {
      if (kind === "breakdown") {
        await fleetApi.reportUnitBreakdown(dlgUnit.code, why);
      } else {
        await fleetApi.updateUnitStatus(dlgUnit.code, kind, why);
      }
      const when = histStampNow();
      const what = kind === "breakdown" ? "Breakdown" : kind;
      setUnits((prev) =>
        prev.map((u) =>
          u.code === dlgUnit.code
            ? {
                ...u,
                status: kind,
                upd: why,
                hist: [[when, what, why, kind], ...u.hist],
              }
            : u
        )
      );
      setDlgCode(null);
      pushToast("success", `${dlgUnit.code} → ${newSt}`, t.toastStD);
      /* Tarik ulang SEKARANG (refleksi di atas hanya penambal kedip):
         reloadKey membatalkan GET poll yang mungkin sedang terbang dengan
         snapshot pra-simpan — tanpa ini balasannya bisa mendarat setelah
         refleksi dan mengembalikan baris ke status lama sampai poll
         berikut; sekalian merapikan urutan (breakdown naik ke atas). */
      retry();
    } catch (e) {
      /* dialog tetap terbuka — alasan yang diketik jangan hilang */
      pushToast("error", t.apErrT, errorDetail(e, t.usLoadErrB));
    } finally {
      setSaving(false);
    }
  }

  const heads = [
    t.thUnitCode,
    t.thType,
    t.thStatus,
    t.thLoc,
    t.thLastUpd,
    t.thAct,
  ];

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.navUnitStatus} sub={t.usSub}>
        <Fresh>
          {t.dataAsOf}&nbsp;
          <b className="font-mono text-(--text-secondary)">{freshTime}</b>
        </Fresh>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.usListTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60 max-sm:w-full"
              placeholder={t.searchUnit}
              aria-label={t.searchUnit}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Segmented role="group" aria-label="Filter status">
              {(
                [
                  ["all", t.segAll],
                  ["ready", "Ready"],
                  ["breakdown", "Breakdown"],
                  ["standby", "Standby"],
                ] as ["all" | UnitStatus, string][]
              ).map(([key, label]) => (
                <SegmentedButton
                  key={key}
                  active={filter === key}
                  onClick={() => {
                    setFilter(key);
                    setPage(1);
                  }}
                >
                  {label}
                </SegmentedButton>
              ))}
            </Segmented>
          </ToolbarGroup>
        </Toolbar>

        {loadErr && !loaded ? (
          <StateBox
            icon={<CircleAlert className="text-danger-text" />}
            title={t.apLoadErrT}
            body={t.usLoadErrB}
          >
            <Button onClick={retry}>{t.apRetry}</Button>
          </StateBox>
        ) : !loaded ? (
          <div className="grid place-items-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : rows.length ? (
          <Table>
            <TableHeader>
              <tr>
                {heads.map((h, i) => (
                  <TableHead
                    key={h}
                    className={i === 3 ? "max-xl:hidden" : undefined}
                    style={i === 5 ? { width: 220 } : undefined}
                  >
                    {h}
                  </TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {pageRows.map((u) => (
                <TableRow key={u.code}>
                  <TableCell>
                    <NameCell name={u.code} />
                  </TableCell>
                  <TableCell>{u.type}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadge[u.status].variant} dot>
                      {statusBadge[u.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-xl:hidden">{u.loc}</TableCell>
                  <TableCell className="text-[13px] text-(--text-secondary)">
                    {u.upd}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDrawerCode(u.code)}
                      >
                        {t.btnHist}
                      </Button>
                      {canManage ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openDialog(u.code)}
                        >
                          {t.btnChangeSt}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <StateBox
            icon={<Search className="text-primary-bright" />}
            title={t.usEmptyT}
            body={t.usEmptyB}
          />
        )}

        {loaded ? (
          <PanelFoot>
            <FootSum>
              {t.attSumA} <b>{range}</b> {t.attSumB} <b>{rows.length}</b>{" "}
              {t.udbSumB} · <b>{breakN}</b> Breakdown
            </FootSum>
            <Pagination
              page={p}
              pageCount={pageCount}
              onPage={setPage}
              per={per}
              perOptions={["10", "25", "50"]}
              onPer={(v) => {
                setPer(v);
                setPage(1);
              }}
            />
          </PanelFoot>
        ) : null}
      </Panel>

      {/* Drawer riwayat status */}
      <Drawer
        open={!!drawerUnit}
        onClose={() => setDrawerCode(null)}
        labelledBy="us-dw-t"
      >
        {drawerUnit ? (
          <>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 id="us-dw-t" className="text-xl font-semibold">
                  {drawerUnit.code}
                </h3>
                <span className="font-mono text-xs text-(--text-tertiary)">
                  {drawerUnit.type} · {drawerUnit.loc}
                </span>
              </div>
              <DrawerClose
                onClick={() => setDrawerCode(null)}
                aria-label={t.btnClose}
              />
            </div>
            <div className="mb-5">
              <Badge variant={statusBadge[drawerUnit.status].variant} dot>
                {statusBadge[drawerUnit.status].label}
              </Badge>
            </div>
            <h4 className="mb-4 text-xs font-semibold tracking-[.05em] text-(--text-tertiary) uppercase">
              {t.histTitle}
            </h4>
            <Timeline>
              {drawerRows.map(([when, what, why, kind], i) => (
                <TimelineItem
                  key={`${when}-${i}`}
                  dotColor={statusDotColor[kind]}
                  when={when}
                  what={what}
                  why={why}
                />
              ))}
            </Timeline>
          </>
        ) : null}
      </Drawer>

      {/* Dialog ubah status */}
      <Dialog
        open={!!dlgUnit}
        onClose={() => setDlgCode(null)}
        labelledBy="us-st-t"
      >
        <DialogIcon variant="warning">
          <Wrench />
        </DialogIcon>
        <DialogTitle id="us-st-t">
          {t.usDlgT} {dlgUnit?.code}
        </DialogTitle>
        <DialogBody>{t.usDlgB}</DialogBody>
        <Field label={t.lblNewSt} htmlFor="st-new" required className="mt-4">
          <Select
            id="st-new"
            value={newSt}
            onChange={(e) => setNewSt(e.target.value)}
          >
            <option>Ready</option>
            <option>Breakdown</option>
            <option>Standby</option>
          </Select>
        </Field>
        <Field
          label={t.lblReason2}
          htmlFor="st-reason"
          required
          helper={t.helpReasonSt}
          className="mt-4"
        >
          <Textarea
            id="st-reason"
            placeholder={t.phReasonSt}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDlgCode(null)}>
            {t.btnCancel}
          </Button>
          <Button
            onClick={() => void saveStatus()}
            disabled={!reason.trim() || saving}
          >
            {saving ? <Spinner /> : null}
            {t.btnSaveSt}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
