"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleAlert, Search } from "lucide-react";

import { rosterApi } from "@/lib/api";
import type { ApiAttendanceRow } from "@/lib/api/endpoints/roster";
import { type AttRow, type AttStatus } from "@/lib/data/attendance";
import { useI18n } from "@/lib/i18n";
import { useRegisterRefresh } from "@/components/providers/refresh";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, Spinner } from "@/components/ui/button";
import { ExportButtons } from "@/components/ui/export-buttons";
import { Input } from "@/components/ui/input";
import { Pagination, usePagination } from "@/components/ui/pagination";
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
import { Select } from "@/components/ui/select";
import { StateBox } from "@/components/ui/state-box";
import {
  IOCell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const stBadge: Record<AttStatus, BadgeVariant> = {
  hadir: "success",
  terlambat: "warning",
  belum: "neutral",
  unfit: "danger",
  off: "neutral",
};

/* Warna pill status di laporan ekspor — selaras dengan stBadge di atas. */
const stTone: Record<AttStatus, "success" | "warning" | "danger" | "neutral"> =
  {
    hadir: "success",
    terlambat: "warning",
    belum: "neutral",
    unfit: "danger",
    off: "neutral",
  };

/* Log absensi ditarik ulang tiap menit — irama yang sama dengan worker
   fingerprint backend (FINGERPRINT_SYNC_INTERVAL=60), supaya scan yang baru
   masuk muncul tanpa menunggu pengguna menekan refresh. */
const REFRESH_MS = 60 * 1000;

const ST_VALID = new Set<string>([
  "hadir",
  "terlambat",
  "belum",
  "unfit",
  "off",
]);

const MON_ID = [
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
const MON_EN = [
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

/* Tanggal kalender LOKAL hari ini. BUKAN toISOString().slice(0,10): itu
   kalender UTC, dan antara 00:00-08:00 WITA nilainya masih kemarin — papan
   yang tampil (dan yang di-SyncAttendanceRange backend) jadi salah hari. */
function localISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* "2026-08-26" -> "26 Agu" — format label tanggal yang sama dengan mock lama */
function dayLabel(iso: string, en: boolean): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const MON = en ? MON_EN : MON_ID;
  return `${d.getDate() < 10 ? "0" : ""}${d.getDate()} ${MON[d.getMonth()]}`;
}

/* Baris API -> baris tampilan. `date` dinormalkan ke YYYY-MM-DD: driver DB
   bisa mengirim "2026-08-26T00:00:00Z" untuk kolom DATE. Status di luar lima
   nilai yang dikenal (termasuk kolom NULL) diperlakukan "belum". */
function toAttRow(r: ApiAttendanceRow, en: boolean): AttRow {
  const iso = (r.date ?? "").slice(0, 10);
  const st = (ST_VALID.has(r.st) ? r.st : "belum") as AttStatus;
  return {
    name: r.name || r.nik,
    nik: r.nik,
    dept: r.dept,
    code: r.code,
    in: r.in,
    inM: r.inM,
    out: r.out,
    outM: r.outM,
    st,
    date: iso,
    dLabel: dayLabel(iso, en),
  };
}

function AttendanceInner() {
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();

  const initialDate = searchParams.get("date") || localISODate();
  const [from, setFrom] = React.useState(initialDate);
  const [to, setTo] = React.useState(initialDate);
  const [status, setStatus] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [q, setQ] = React.useState("");
  const [freshTime, setFreshTime] = React.useState("");

  const updateFresh = React.useCallback(() => {
    const d = new Date();
    setFreshTime(
      `${d.getHours() < 10 ? "0" : ""}${d.getHours()}:${d.getMinutes() < 10 ? "0" : ""}${d.getMinutes()} WITA`
    );
  }, []);

  /* Hidrasi dari GET /api/attendance/range — endpoint yang juga membangun
     ulang papan absensi (SyncAttendanceRange) sebelum membaca, jadi status
     belum/terlambat/off ikut terhitung dari roster + scan mesin fingerprint.

     Data dan error DITANDAI kunci rentangnya (from|to|reloadKey), bukan
     di-reset lewat setState di badan effect (dilarang lint react-hooks):
     saat rentang berganti, data lama otomatis tidak berlaku dan halaman
     kembali ke keadaan memuat. Kegagalan SAAT data rentang ini sudah ada
     (poll latar) didiamkan — data lama dipertahankan dan stempel "data per"
     tidak maju, itu sinyal kebasiannya; kegagalan muat PERTAMA menampilkan
     kotak error dengan tombol ulang. */
  const [reloadKey, setReloadKey] = React.useState(0);
  const dataKey = `${from}|${to}|${reloadKey}`;
  const [data, setData] = React.useState<{
    key: string;
    rows: ApiAttendanceRow[];
  } | null>(null);
  const [errKey, setErrKey] = React.useState<string | null>(null);
  /* Input date native melapor "" saat di-clear; backend menolak range tanpa
     from/to (400). Selama salah satu kosong: jangan fetch — tampilkan
     keadaan kosong, bukan kotak error server yang menyesatkan. */
  const ready = from !== "" && to !== "";
  React.useEffect(() => {
    if (from === "" || to === "") return;
    let alive = true;
    let gotData = false;
    let ac: AbortController | null = null;
    const load = () => {
      ac?.abort();
      const c = new AbortController();
      ac = c;
      void rosterApi
        .getAttendanceRange(from, to, c.signal)
        .then((rows) => {
          if (!alive) return;
          gotData = true;
          setData({ key: dataKey, rows });
          setErrKey(null);
          updateFresh();
        })
        .catch(() => {
          if (!alive || c.signal.aborted) return;
          if (!gotData) setErrKey(dataKey);
        });
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      ac?.abort();
      clearInterval(timer);
    };
  }, [from, to, dataKey, updateFresh]);

  const current = data && data.key === dataKey ? data.rows : null;
  const loadErr = errKey === dataKey;

  const retry = React.useCallback(() => setReloadKey((k) => k + 1), []);

  /* refresh dari topbar: tarik ulang dari server (stempel ikut maju) */
  useRegisterRefresh(retry);

  const stLabel = (s: AttStatus) =>
    s === "hadir"
      ? t.bHadir
      : s === "terlambat"
        ? t.bLate
        : s === "belum"
          ? t.bBelum
          : s === "unfit"
            ? t.bUnfit
            : t.bOff;

  const all = React.useMemo<AttRow[]>(
    () => (current ?? []).map((r) => toAttRow(r, lang === "en")),
    [current, lang]
  );

  /* Pilihan departemen diturunkan dari data, bukan daftar tetap — nilai dept
     sungguhan milik master karyawan di server. */
  const depts = React.useMemo(
    () => Array.from(new Set(all.map((r) => r.dept).filter(Boolean))).sort(),
    [all]
  );

  /* Dept yang sedang dipilih ikut ditampilkan walau tidak ada lagi di data —
     tanpa ini select terlihat "tak berfilter" (selectedIndex -1) padahal
     filternya masih membuang semua baris. */
  const deptOptions = React.useMemo(
    () => (dept && !depts.includes(dept) ? [...depts, dept].sort() : depts),
    [depts, dept]
  );

  /* Rentang tanggal sudah disaring server; sisanya milik klien. */
  const rows = all.filter((r) => {
    if (status && r.st !== status) return false;
    if (dept && r.dept !== dept) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return r.name.toLowerCase().includes(needle) || r.nik.includes(needle);
  });

  const presentN = rows.filter(
    (r) => r.st === "hadir" || r.st === "terlambat"
  ).length;
  const pg = usePagination(rows);

  /* Payload ekspor — SEMUA baris hasil filter (bukan cuma halaman aktif),
     dibangun saat tombol diklik supaya selalu mengikuti filter yang sedang
     berlaku. Kop bermerek (logo, nama PT, cap waktu penarikan) ditangani
     lib/report lewat <ExportButtons>. */
  const buildExport = () => {
    const filters = [
      status
        ? `${t.thStatus}: ${stLabel(status as AttStatus)}`
        : `${t.thStatus}: ${t.expAll}`,
      dept ? `${t.thDept}: ${dept}` : `${t.thDept}: ${t.expAll}`,
      from || to ? `${t.lblDate}: ${from || "…"} — ${to || "…"}` : null,
      q.trim() ? `${t.searchEmp}: “${q.trim()}”` : null,
    ].filter(Boolean) as string[];

    return {
      fileBase: "attendance-log-absensi",
      title: t.expReportAtt,
      /* cap waktu & jumlah baris ditambahkan oleh <ExportButtons> per format */
      meta: [`${t.expFilter}: ${filters.join(" · ")}`],
      sheetName: t.attLog,
      columns: [
        { header: t.thEmp, width: 26 },
        { header: "NIK", width: 14 },
        { header: t.lblDate, width: 12 },
        { header: t.thDept, width: 26 },
        { header: t.thRoster, width: 9 },
        { header: t.thIn, width: 10 },
        { header: t.expThInM, width: 20 },
        { header: t.thOut, width: 10 },
        { header: t.expThOutM, width: 20 },
        { header: t.thStatus, width: 13 },
      ],
      rows: rows.map((r) => [
        r.name,
        r.nik,
        r.date || null,
        r.dept,
        r.code,
        r.in || null,
        r.inM || null,
        r.out || null,
        r.outM || null,
        { text: stLabel(r.st), tone: stTone[r.st] },
      ]),
      landscape: true,
    };
  };

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle
        title={t.navR4}
        sub={
          <>
            {t.attSubA} <Link href="/roster/revision">{t.flowRevisi}</Link>
            {t.attSubB}
          </>
        }
      >
        <Fresh>
          {t.dataAsOf}&nbsp;
          <b className="font-mono text-(--text-secondary)">{freshTime}</b>
        </Fresh>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.attLog}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60 max-sm:w-full"
              placeholder={t.searchEmp}
              aria-label={t.searchEmp}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              aria-label={t.allStatus}
              wrapperClassName="w-42.5 max-sm:w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">{t.allStatus}</option>
              <option value="hadir">{t.bHadir}</option>
              <option value="terlambat">{t.bLate}</option>
              <option value="belum">{t.bBelum}</option>
              <option value="unfit">{t.bUnfit}</option>
              <option value="off">{t.bOff}</option>
            </Select>
            <Select
              aria-label={t.allDepts}
              wrapperClassName="w-45 max-sm:w-full"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
            >
              <option value="">{t.allDepts}</option>
              {deptOptions.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
            <div className="flex items-center gap-2 max-sm:w-full max-sm:flex-col max-sm:items-stretch">
              <label
                htmlFor="att-from"
                className="text-xs text-(--text-tertiary)"
              >
                {t.lblDate}
              </label>
              <Input
                id="att-from"
                type="date"
                className="w-40 font-mono max-sm:w-full"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-(--text-tertiary) max-sm:text-center">
                –
              </span>
              <Input
                id="att-to"
                type="date"
                className="w-40 font-mono max-sm:w-full"
                aria-label={t.lblDateTo}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <ExportButtons build={buildExport} />
          </ToolbarGroup>
        </Toolbar>

        {loadErr ? (
          <StateBox
            icon={<CircleAlert className="text-danger-text" />}
            title={t.apLoadErrT}
            body={t.attLoadErrB}
          >
            <Button onClick={retry}>{t.apRetry}</Button>
          </StateBox>
        ) : !ready ? (
          <StateBox
            icon={<Search className="text-primary-bright" />}
            title={t.noResTitle}
            body={t.attEmptyB}
          />
        ) : current === null ? (
          <div className="grid place-items-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : rows.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>{t.thEmp}</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>{t.lblDate}</TableHead>
                <TableHead className="max-xl:hidden">{t.thDept}</TableHead>
                <TableHead>{t.thRoster}</TableHead>
                <TableHead>{t.thIn}</TableHead>
                <TableHead>{t.thOut}</TableHead>
                <TableHead>{t.thStatus}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pg.rows.map((r, i) => (
                <TableRow key={`${r.nik}-${r.date}-${i}`}>
                  <TableCell className="font-semibold">{r.name}</TableCell>
                  <TableCell className="font-mono text-(--text-secondary) tabular-nums">
                    {r.nik}
                  </TableCell>
                  <TableCell className="font-mono whitespace-nowrap">
                    {r.dLabel}
                  </TableCell>
                  <TableCell className="max-xl:hidden">{r.dept}</TableCell>
                  <TableCell>
                    <Badge variant="info">{r.code}</Badge>
                  </TableCell>
                  <TableCell>
                    <IOCell time={r.in} machine={r.inM} />
                  </TableCell>
                  <TableCell>
                    <IOCell time={r.out} machine={r.outM} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={stBadge[r.st]} dot>
                      {stLabel(r.st)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <StateBox
            icon={<Search className="text-primary-bright" />}
            title={t.noResTitle}
            body={t.attEmptyB}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{pg.range}</b> {t.attSumB} <b>{pg.total}</b>{" "}
            {t.attSumLog} · <b>{presentN}</b> {t.attSumD}
          </FootSum>
          <Pagination
            page={pg.page}
            pageCount={pg.pageCount}
            onPage={pg.setPage}
            per={pg.per}
            perOptions={["10", "25", "50"]}
            onPer={pg.setPer}
          />
        </PanelFoot>
      </Panel>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <React.Suspense>
      <AttendanceInner />
    </React.Suspense>
  );
}
