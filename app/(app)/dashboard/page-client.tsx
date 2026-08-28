"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, MessageSquareMore, Search, Truck, XCircle } from "lucide-react";

import { fleetApi, miscApi, rosterApi } from "@/lib/api";
import { toUnits } from "@/lib/api/adapters";
import type { ApiDashboardSummary } from "@/lib/api/endpoints/misc";
import type { ApiAttendanceRow } from "@/lib/api/endpoints/roster";
import { ftwData, type FtwRecord } from "@/lib/data/ftw";
import type { Unit } from "@/lib/data/unit-status";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/components/providers/app-store";
import { usePermissions } from "@/components/providers/permissions";
import { useRegisterRefresh } from "@/components/providers/refresh";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
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

import { WeatherCard } from "./_components/weather-card";

/* Irama poll yang sama dengan halaman Attendance & layar TV (worker
   fingerprint backend juga menyinkron tiap 60 detik). */
const REFRESH_MS = 60 * 1000;

type AttentionRow = {
  name: string;
  sub: string;
  dept: string;
  issue: string;
  badge: string;
  badgeVariant: BadgeVariant;
  route: string;
  action: string;
};

function attentionRows(
  en: boolean,
  breakUnits: Unit[],
  kurang: FtwRecord[],
  belumAbsen: ApiAttendanceRow[]
): AttentionRow[] {
  /* semua baris diturunkan dari sumber terpusat — status unit, log tidur,
     dan log absensi yang sama dengan halaman modul & display TV */
  const unitRows: AttentionRow[] = breakUnits.slice(0, 2).map((u) => ({
    name: u.code,
    sub: u.type,
    dept: "—",
    /* upd dari server adalah alasan mentah, bukan lagi "HH:MM — ..." mock —
       slice(0,5) hanya sah bila prefiksnya memang jam */
    issue: /^\d\d:\d\d/.test(u.upd)
      ? en
        ? `Reported down at ${u.upd.slice(0, 5)} — awaiting repair (${u.loc})`
        : `Dilaporkan rusak ${u.upd.slice(0, 5)} — menunggu perbaikan (${u.loc})`
      : en
        ? `Reported down — ${u.upd || "awaiting repair"} (${u.loc})`
        : `Dilaporkan rusak — ${u.upd || "menunggu perbaikan"} (${u.loc})`,
    badge: "Breakdown",
    badgeVariant: "danger",
    route: "/assets/status",
    action: en ? "Open Unit Status" : "Buka Status Unit",
  }));
  const unfitRows: AttentionRow[] = kurang.slice(0, 3).map((r) => ({
    name: r.name,
    sub: r.nik,
    dept: r.dept,
    issue: en
      ? `Slept ${r.sleep} — below the safe threshold`
      : `Tidur ${r.sleep} — di bawah ambang aman`,
    badge: "Unfit",
    badgeVariant: "danger",
    route: "/fit-to-work",
    action: en ? "Open Fit To Work" : "Buka Fit To Work",
  }));
  const belumRows: AttentionRow[] = belumAbsen.slice(0, 2).map((r) => ({
    name: r.name || r.nik,
    sub: r.nik,
    dept: r.dept,
    issue: en
      ? `Roster ${r.code} — no check-in yet`
      : `Roster ${r.code} — belum check-in`,
    badge: en ? "Not clocked in" : "Belum absen",
    badgeVariant: "warning",
    route: "/roster/attendance",
    action: en ? "View attendance" : "Lihat attendance",
  }));
  return [
    ...unitRows,
    ...unfitRows,
    ...belumRows,
    {
      name: "REV-0711-02",
      sub: "3 entri",
      dept: "SDI",
      issue: en
        ? "3 revision entries pending more than 24 hours"
        : "3 entri revisi menunggu lebih dari 24 jam",
      badge: "Pending",
      badgeVariant: "info",
      route: "/roster/approval",
      action: en ? "Open Approval" : "Buka Approval",
    },
  ];
}

export default function DashboardPage() {
  const { t, lang } = useI18n();
  const { userName: storeName, units, setUnits } = useAppStore();
  /* Sapaan harus menyebut orang yang BENAR-BENAR login. Sebelumnya diambil
     dari app-store yang nilai awalnya masih persona mock ("First Angel"),
     sehingga siapa pun yang masuk disapa dengan nama orang lain. Store tetap
     dipakai sebagai cadangan agar tidak ada kedip teks kosong saat sesi belum
     terbaca — pola yang sama dengan topbar. */
  const { user: me } = usePermissions();
  const userName = me?.kar ?? storeName;
  /* Store `units` diseed [] — dashboard TIDAK boleh bergantung pada halaman
     Status Unit pernah dibuka: efek di bawah menghidrasinya sendiri dari
     GET /units/status. Bila akun tak punya izin modul asset (403), kartu
     Breakdown jatuh ke angka summary.fleet (tanpa rincian kode unit). */
  const [unitsOk, setUnitsOk] = React.useState(false);
  const breakUnits = units.filter((u) => u.status === "breakdown");
  /* statistik dari sumber yang sama dengan modul & display TV */
  /* "Unfit" = benar-benar tidak boleh bekerja (dipulangkan, < 4 jam).
     Spare tidak dihitung di sini karena masih boleh bekerja setelah
     istirahat tambahan. */
  const kurang = ftwData(lang).filter((r) => r.st === "pulang");

  /* Absensi dari backend, bukan mock lagi — angka kartu dari
     GET /api/dashboard/summary (permission modul dashboard), baris
     "belum absen" di tabel perhatian dari GET /api/attendance/today
     (permission roster — bila akun tidak memilikinya, baris itu dilewati
     diam-diam dan tabel tetap berisi sumber lain). Poll 60 detik, irama
     yang sama dengan halaman Attendance & layar TV; kegagalan poll
     didiamkan dan data lama dipertahankan. */
  const [summary, setSummary] = React.useState<ApiDashboardSummary | null>(
    null
  );
  const [attRows, setAttRows] = React.useState<ApiAttendanceRow[] | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const att = summary?.attendance ?? null;
  /* "dari N roster hari ini" = rostered yang diharapkan hadir (tanpa off) */
  const rosterN = att ? att.total - att.off : null;
  const belumAbsen = (attRows ?? []).filter((r) => r.st === "belum");
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [freshTime, setFreshTime] = React.useState("");

  const updateFresh = React.useCallback(() => {
    const d = new Date();
    setFreshTime(
      `${d.getHours() < 10 ? "0" : ""}${d.getHours()}:${d.getMinutes() < 10 ? "0" : ""}${d.getMinutes()} WITA`
    );
  }, []);

  React.useEffect(() => {
    let alive = true;
    let ac: AbortController | null = null;
    const load = () => {
      ac?.abort();
      const c = new AbortController();
      ac = c;
      void miscApi
        .getDashboardSummary(undefined, c.signal)
        .then((sum) => {
          if (!alive) return;
          setSummary(sum);
          updateFresh();
        })
        .catch(() => {});
      void rosterApi
        .getAttendanceToday(c.signal)
        .then((res) => {
          if (alive) setAttRows(res.items ?? []);
        })
        .catch(() => {});
      void fleetApi
        .listUnitStatuses(c.signal)
        .then((rows) => {
          if (!alive) return;
          setUnits(toUnits(rows));
          setUnitsOk(true);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      ac?.abort();
      clearInterval(timer);
    };
  }, [reloadKey, updateFresh, setUnits]);

  React.useEffect(() => {
    const id = setTimeout(updateFresh, 0);
    return () => clearTimeout(id);
  }, [updateFresh]);

  /* refresh dari topbar: tarik ulang dari server + skeleton singkat */
  useRegisterRefresh(
    () =>
      new Promise<void>((done) => {
        setLoading(true);
        setReloadKey((k) => k + 1);
        setTimeout(() => {
          setLoading(false);
          done();
        }, 900);
      })
  );

  const hour = new Date().getHours();
  const greet =
    hour < 11
      ? t.greetMorning
      : hour < 15
        ? t.greetNoon
        : hour < 19
          ? t.greetAfternoon
          : t.greetEvening;
  const firstName = userName.trim().split(/\s+/).slice(0, 2).join(" ");
  const dateLine = `${new Date().toLocaleDateString(lang === "en" ? "en-GB" : "id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${t.shiftNote}`;

  const allRows = attentionRows(lang === "en", breakUnits, kurang, belumAbsen);
  const badgeOpts = Array.from(new Set(allRows.map((r) => r.badge)));
  const rows = allRows.filter((r) => {
    const needle = q.toLowerCase();
    const okQ =
      r.name.toLowerCase().includes(needle) ||
      r.sub.toLowerCase().includes(needle) ||
      r.issue.toLowerCase().includes(needle);
    return okQ && (statusFilter === "" || r.badge === statusFilter);
  });

  const pg = usePagination(rows);

  const heads = [t.thName, t.thDept, t.thIssue, t.thStatus, t.thAction];

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={`${greet}, ${firstName} 👋`} sub={dateLine}>
        <Fresh>
          {t.dataAsOf}&nbsp;
          <b className="font-mono text-(--text-secondary)">{freshTime}</b>
        </Fresh>
      </PageTitle>

      {/* Cuaca lokasi saat ini — tepat setelah salam, di atas strip KPI. */}
      <WeatherCard />

      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:gap-3">
        <StatCard
          href="/fit-to-work"
          icon={<XCircle />}
          iconStyle={{
            background: "var(--badge-danger-fill)",
            borderColor: "var(--badge-danger-border)",
            color: "var(--color-danger-text)",
          }}
          value={String(kurang.length)}
          label={t.statUnfit}
          detail={
            <>
              {t.dUnfit1} <b>{t.dUnfit2}</b>
            </>
          }
        />
        <StatCard
          href="/roster/attendance"
          icon={<Clock />}
          iconStyle={{
            background: "var(--badge-warning-fill)",
            borderColor: "var(--badge-warning-border)",
            color: "var(--badge-warning-text)",
          }}
          value={att === null ? "—" : String(att.belum)}
          label={t.statAbsent}
          detail={
            <>
              {t.dAbsent1} <b>{rosterN ?? "—"}</b> {t.dAbsent2}
            </>
          }
        />
        <StatCard
          href="/assets/allocation"
          icon={<Truck />}
          iconStyle={{
            background: "var(--badge-danger-fill)",
            borderColor: "var(--badge-danger-border)",
            color: "var(--color-danger-text)",
          }}
          value={
            unitsOk
              ? String(breakUnits.length)
              : summary
                ? String(summary.fleet.breakdown)
                : "—"
          }
          label={t.statBreakdown}
          detail={
            <>
              <b>{breakUnits[0]?.code ?? "—"}</b>
              {breakUnits
                .slice(1, 3)
                .map((u) => ` · ${u.code}`)
                .join("")}
            </>
          }
        />
        <StatCard
          href="/roster/approval"
          icon={<MessageSquareMore />}
          iconStyle={{
            background: "rgba(0,212,255,.14)",
            borderColor: "rgba(0,212,255,.4)",
            color: "var(--color-primary-bright)",
          }}
          value="14"
          label={t.statApproval}
          detail={
            <>
              <b>3</b> {t.dApproval2}
            </>
          }
        />
      </div>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.panelTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60 max-sm:w-full"
              placeholder={t.searchPh}
              aria-label={t.searchPh}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              wrapperClassName="w-42.5 max-sm:w-full"
              aria-label={t.thStatus}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t.allStatus}</option>
              {badgeOpts.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </ToolbarGroup>
        </Toolbar>

        {loading ? (
          <Table>
            <TableHeader>
              <tr>
                {heads.map((h, i) => (
                  <TableHead
                    key={h}
                    className={i === 1 ? "max-xl:hidden" : undefined}
                  >
                    {h}
                  </TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {[75, 65, 80].map((w, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton style={{ width: `${w}%`, height: 14 }} />
                  </TableCell>
                  <TableCell className="max-xl:hidden">
                    <Skeleton style={{ width: "55%", height: 14 }} />
                  </TableCell>
                  <TableCell>
                    <Skeleton style={{ width: "80%", height: 14 }} />
                  </TableCell>
                  <TableCell>
                    <Skeleton
                      style={{ width: 64, height: 20, borderRadius: 10 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Skeleton style={{ width: "65%", height: 14 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : rows.length ? (
          <>
            <Table>
              <TableHeader>
                <tr>
                  {heads.map((h, i) => (
                    <TableHead
                      key={h}
                      className={i === 1 ? "max-xl:hidden" : undefined}
                    >
                      {h}
                    </TableHead>
                  ))}
                </tr>
              </TableHeader>
              <TableBody>
                {/* Kunci nama saja bisa kembar dengan data hidup (dua
                    karyawan senama, atau nama live == nama mock FTW) —
                    pola kunci yang sama dengan halaman Attendance. */}
                {pg.rows.map((r, i) => (
                  <TableRow key={`${r.name}-${r.sub}-${i}`}>
                    <TableCell>
                      <NameCell name={r.name} sub={r.sub} />
                    </TableCell>
                    <TableCell className="max-xl:hidden">{r.dept}</TableCell>
                    <TableCell>{r.issue}</TableCell>
                    <TableCell>
                      <Badge variant={r.badgeVariant} dot>
                        {r.badge}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={r.route}>{r.action}</Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PanelFoot>
              <FootSum>
                {t.attSumA} <b>{pg.range}</b> {t.attSumB} <b>{pg.total}</b>{" "}
                {t.sumRest}
              </FootSum>
              <Pagination
                page={pg.page}
                pageCount={pg.pageCount}
                onPage={pg.setPage}
                per={pg.per}
                perOptions={["10", "25", "50"]}
                onPer={pg.setPer}
              />
              <Link href="/roster/attendance" className="text-sm">
                {t.viewAll}
              </Link>
            </PanelFoot>
          </>
        ) : (
          <StateBox
            icon={<Search className="text-(--text-tertiary)" />}
            title={t.noResTitle}
            body={t.noResBody}
          />
        )}
      </Panel>
    </div>
  );
}
