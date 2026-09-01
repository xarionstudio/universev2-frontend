"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CopyPlus, Wand2 } from "lucide-react";

import {
  employeesApi,
  errorMessage,
  fleetApi,
  ftwApi,
  rosterApi,
} from "@/lib/api";
import { toEmployees, toFleet } from "@/lib/api/adapters";
import type { ApiFleetAlloc, ApiUnitDb } from "@/lib/api/endpoints/fleet";
import type { Fleet } from "@/lib/data/fleet";
import { isoAddDays } from "@/lib/data/fleet-alloc";
import type { FtwStatus } from "@/lib/data/ftw";
import { typeOfEgi } from "@/lib/data/units-db";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/components/providers/permissions";
import { Avatar, initialsOf } from "@/components/ui/avatar";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, Spinner } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  DNote,
  FootSum,
  PageTitle,
  Panel,
  Toolbar,
  ToolbarTitle,
} from "@/components/ui/panel";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented, SegmentedButton } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { StateBox } from "@/components/ui/state-box";
import { useToast } from "@/components/ui/toast";

import { AllocDialog } from "./_components/alloc-dialog";
import { AutoDialog } from "./_components/auto-dialog";
import {
  displayKomp,
  ftwBadgeOf,
  type FaOp,
  type FaUnit,
} from "./_components/fa";

type Shift = "pagi" | "malam";
type Filter = "all" | "unalloc" | "alloc" | "issue";

/* class unit yang di-setting operatornya — mengikuti file setting lama
   (OHT/DT/digger/dozer/water truck/manhaul); LV, bus, pompa dsb. di luar
   papan. "DT" ikut: kosakata class backend memakainya untuk sebagian OHT
   lama (mis. DT5108) yang di data mock tergolong "HD". */
const OPERATED_CLS = new Set(["HD", "DT", "LD", "EX", "DZ", "WT", "MH"]);

/* Alokasi/FTW/kehadiran berubah dari sisi server — irama poll standar. */
const REFRESH_MS = 60 * 1000;

const stBadge: Record<
  FaUnit["status"],
  { variant: BadgeVariant; label: string }
> = {
  ready: { variant: "success", label: "Ready" },
  breakdown: { variant: "danger", label: "Breakdown" },
  standby: { variant: "warning", label: "Standby" },
};

/* Tanggal kalender LOKAL — toISOString adalah kalender UTC dan salah hari
   antara 00:00–08:00 WITA. */
function localISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function FleetAllocationPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can("asset", "manage");

  const [faDate, setFaDate] = React.useState(localISODate);
  const [shift, setShift] = React.useState<Shift>("pagi");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [fleetF, setFleetF] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [per, setPer] = React.useState("6");
  const [allocFor, setAllocFor] = React.useState<FaUnit | null>(null);
  const [autoOpen, setAutoOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  /* Nomor mutasi: naik tiap PUT/auto sukses. Balasan poll yang BERANGKAT
     sebelum mutasi (seq lama) dibuang — tanpa ini respons GET yang lambat
     bisa menimpa refleksi pasca-PUT dengan snapshot pra-PUT, dan edit
     berikutnya (peta LENGKAP) menghapus penugasan tadi di server. */
  const mutSeq = React.useRef(0);

  /* ── grup REFERENSI (sekali per reload): unit DB, fleet, karyawan ──
     Fleet dipakai LOKAL (bukan store): konfigurasi display masih merujuk
     id seed mock, dan papan ini harus memakai fleet backend yang sama
     dengan yang dipakai auto-alokasi server. */
  const [dbUnits, setDbUnits] = React.useState<ApiUnitDb[] | null>(null);
  const [faFleets, setFaFleets] = React.useState<Fleet[]>([]);
  const [emps, setEmps] = React.useState<ReturnType<typeof toEmployees>>([]);
  const [refErr, setRefErr] = React.useState(false);
  React.useEffect(() => {
    const ac = new AbortController();
    void Promise.all([
      fleetApi.listUnitDb(undefined, ac.signal),
      fleetApi.listFleetSettings(ac.signal),
      employeesApi.listAllEmployees(ac.signal),
    ])
      .then(([units, fleets, employees]) => {
        setDbUnits(units ?? []);
        setFaFleets((fleets ?? []).map(toFleet));
        setEmps(toEmployees(employees));
        setRefErr(false);
      })
      .catch(() => {
        if (!ac.signal.aborted) setRefErr(true);
      });
    return () => ac.abort();
  }, [reloadKey]);

  /* ── grup TANGGAL (poll 60 dtk): alokasi + FTW + kehadiran ──
     Alokasi adalah data inti — kegagalan muat pertamanya menampilkan kotak
     error. FTW/kehadiran hanya kelayakan-hint: kegagalan (termasuk 403 pada
     akun tanpa permission ftw/roster) didegradasi ke "data tidak tersedia"
     dan TIDAK memblokir papan — server tetap otoritas kelayakan. */
  const dateKey = `${faDate}|${reloadKey}`;
  const [allocData, setAllocData] = React.useState<{
    key: string;
    map: ApiFleetAlloc;
  } | null>(null);
  const [eligo, setEligo] = React.useState<{
    key: string;
    ftw: Record<string, FtwStatus>;
    ftwOk: boolean;
    hadir: Set<string>;
    hadirOk: boolean;
  } | null>(null);
  const [allocErrKey, setAllocErrKey] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!faDate) return;
    let alive = true;
    let gotData = false;
    let ac: AbortController | null = null;
    const load = () => {
      ac?.abort();
      const c = new AbortController();
      ac = c;
      const seq = mutSeq.current;
      void Promise.allSettled([
        fleetApi.getAllocations({ date: faDate }, c.signal),
        ftwApi.listAllTodayFtw(faDate, c.signal),
        rosterApi.getAttendanceByDate(faDate, c.signal),
      ]).then(([allocRes, ftwRes, attRes]) => {
        if (!alive || c.signal.aborted || seq !== mutSeq.current) return;
        if (allocRes.status === "fulfilled") {
          gotData = true;
          setAllocData({ key: dateKey, map: allocRes.value ?? {} });
          setAllocErrKey(null);
        } else if (!gotData) {
          setAllocErrKey(dateKey);
        }
        const ftwMap: Record<string, FtwStatus> = {};
        if (ftwRes.status === "fulfilled") {
          for (const r of ftwRes.value) ftwMap[r.nik] = r.st;
        }
        const hadir = new Set<string>();
        if (attRes.status === "fulfilled") {
          for (const r of attRes.value) {
            if (r.st === "hadir" || r.st === "terlambat") hadir.add(r.nik);
          }
        }
        setEligo({
          key: dateKey,
          ftw: ftwMap,
          ftwOk: ftwRes.status === "fulfilled",
          hadir,
          hadirOk: attRes.status === "fulfilled",
        });
      });
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      ac?.abort();
      clearInterval(timer);
    };
  }, [faDate, dateKey]);

  const retry = React.useCallback(() => setReloadKey((k) => k + 1), []);

  /* urutan papan: unit formasi fleet dulu (sesuai Setting Fleet), lalu support */
  const fleetRank = React.useMemo(() => {
    const rank = new Map<string, number>();
    faFleets
      .filter((f) => f.active)
      .forEach((f, fi) =>
        [f.digger, ...f.units].forEach((c, ci) => rank.set(c, fi * 100 + ci))
      );
    return rank;
  }, [faFleets]);

  const faUnits: FaUnit[] = React.useMemo(
    () =>
      (dbUnits ?? [])
        .filter((u) => u.active && OPERATED_CLS.has(u.cls))
        .map((u) => ({
          code: u.code,
          type: `${u.egi} · ${u.product}`,
          loc: u.loc || u.cls,
          tegi: typeOfEgi(u.egi),
          status: u.breakdown
            ? ("breakdown" as const)
            : u.standby
              ? ("standby" as const)
              : ("ready" as const),
        }))
        .sort(
          (a, b) =>
            (fleetRank.get(a.code) ?? 1e9) - (fleetRank.get(b.code) ?? 1e9) ||
            a.code.localeCompare(b.code)
        ),
    [dbUnits, fleetRank]
  );

  const eligoOk = eligo?.key === dateKey ? eligo : null;
  const ftwAvailable = eligoOk?.ftwOk ?? false;
  const ops: FaOp[] = React.useMemo(
    () =>
      emps
        .filter((r) => r.status === "aktif" && r.komp && r.komp.length)
        .map((r) => ({
          ...r,
          ftw: eligoOk?.ftw[r.nik] ?? "belum",
          hadir: eligoOk?.hadirOk ? eligoOk.hadir.has(r.nik) : undefined,
        })),
    [emps, eligoOk]
  );

  /* alokasi tanggal + shift terpilih — kunci tanggal balasan defensif
     dinormalkan (kolom DATE bisa terbaca berformat timestamp) */
  const alloc = React.useMemo(() => {
    if (!allocData || allocData.key !== dateKey) return {};
    for (const [k, v] of Object.entries(allocData.map)) {
      if (k.slice(0, 10) === faDate) return v[shift] ?? {};
    }
    return {};
  }, [allocData, dateKey, faDate, shift]);

  const opByNik = React.useMemo(
    () => new Map(ops.map((o) => [o.nik, o])),
    [ops]
  );

  /* peta alokasi TERKINI untuk mutasi async yang melewati await (salin
     kemarin): closure render saat klik bisa basi saat PUT dijalankan */
  const allocRef = React.useRef(alloc);
  React.useEffect(() => {
    allocRef.current = alloc;
  }, [alloc]);

  const ready = dbUnits !== null && allocData?.key === dateKey;
  const firstErr =
    (refErr && dbUnits === null) ||
    (allocErrKey === dateKey && allocData?.key !== dateKey);

  function kindOf(u: FaUnit): "bd" | "none" | "warn" | "ok" {
    if (u.status === "breakdown") return "bd";
    const nik = alloc[u.code];
    const op = nik ? opByNik.get(nik) : undefined;
    if (!op) return "none";
    /* peringatan FTW hanya bila datanya benar-benar termuat;
       spare (fit + sudah absen) setara fit — bukan peringatan */
    return ftwAvailable && op.ftw !== "fit" && op.ftw !== "spare"
      ? "warn"
      : "ok";
  }

  const needle = q.trim().toLowerCase();
  const filtered = faUnits.filter((u) => {
    const kind = kindOf(u);
    if (filter === "unalloc" && kind !== "none") return false;
    if (filter === "alloc" && kind !== "ok") return false;
    if (filter === "issue" && kind !== "warn" && kind !== "bd") return false;
    if (fleetF === "support" && fleetRank.has(u.code)) return false;
    if (fleetF !== "all" && fleetF !== "support") {
      const f = faFleets.find((x) => x.id === fleetF);
      if (!f || (f.digger !== u.code && !f.units.includes(u.code)))
        return false;
    }
    if (!needle) return true;
    return (
      u.code.toLowerCase().includes(needle) ||
      u.type.toLowerCase().includes(needle) ||
      u.loc.toLowerCase().includes(needle)
    );
  });

  const perN = Number(per);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perN));
  const p = Math.min(page, pageCount);
  const cards = filtered.slice((p - 1) * perN, p * perN);
  const range = filtered.length
    ? `${(p - 1) * perN + 1}–${Math.min(filtered.length, p * perN)}`
    : "0";

  const allocN = faUnits.filter((u) => opByNik.has(alloc[u.code] ?? "")).length;
  const shiftLabel = shift === "pagi" ? t.faShiftPagi : t.faShiftMalam;

  /* ── mutasi: PUT peta LENGKAP (backend hapus-dan-buat-ulang per
     tanggal+shift), pesimistis — refleksi lokal setelah sukses ──
     putUnits = inti PUT + refleksi TANPA mengelola flag `saving` (pemanggil
     yang memegangnya — salin-kemarin perlu memegangnya lebih awal, sejak
     sebelum fetch peta kemarin). */
  async function putUnits(next: Record<string, string>): Promise<boolean> {
    try {
      await fleetApi.saveAllocation({ date: faDate, shift, units: next });
      mutSeq.current += 1;
      setAllocData((prev) =>
        prev && prev.key === dateKey
          ? {
              key: prev.key,
              map: {
                ...prev.map,
                [faDate]: { ...(prev.map[faDate] ?? {}), [shift]: next },
              },
            }
          : prev
      );
      return true;
    } catch (e) {
      pushToast("error", t.apErrT, errorMessage(e, t.faLoadErrB));
      retry();
      return false;
    }
  }

  async function saveUnits(next: Record<string, string>): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    try {
      return await putUnits(next);
    } finally {
      setSaving(false);
    }
  }

  async function assign(unit: FaUnit, op: FaOp) {
    if (await saveUnits({ ...alloc, [unit.code]: op.nik })) {
      setAllocFor(null);
      pushToast("success", `${op.name} → ${unit.code}`, t.faToastDoD);
    }
  }

  async function release(unit: FaUnit) {
    const op = opByNik.get(alloc[unit.code] ?? "");
    const next = { ...alloc };
    delete next[unit.code];
    if ((await saveUnits(next)) && op)
      pushToast(
        "info",
        `${op.name} ${t.faToastRelT} ${unit.code}`,
        t.faToastRelD
      );
  }

  /* Auto-alokasi: SERVER yang menyusun (aturan MVP: SIMPER Type EGI cocok +
     hadir + Jam Tidur) dan MENGGANTI alokasi tanggal+shift ini; balasannya
     peta segar yang langsung dipakai. */
  async function runAuto() {
    if (saving) return;
    setSaving(true);
    try {
      const fresh = await fleetApi.autoAllocate(faDate, shift);
      mutSeq.current += 1;
      let units: Record<string, string> = {};
      for (const [k, v] of Object.entries(fresh ?? {})) {
        if (k.slice(0, 10) === faDate) units = v[shift] ?? {};
      }
      setAllocData((prev) => ({
        key: dateKey,
        map: {
          ...(prev && prev.key === dateKey ? prev.map : {}),
          [faDate]: {
            ...((prev && prev.key === dateKey ? prev.map[faDate] : {}) ?? {}),
            [shift]: units,
          },
        },
      }));
      setAutoOpen(false);
      pushToast("success", `${Object.keys(units).length} ${t.faAutoToastT}`);
    } catch (e) {
      pushToast("error", t.apErrT, errorMessage(e, t.faLoadErrB));
    } finally {
      setSaving(false);
    }
  }

  /* salin alokasi shift yang sama dari hari sebelumnya — hanya slot kosong,
     operator yang sudah terpakai hari ini dilewati. `saving` dipegang sejak
     SEBELUM fetch peta kemarin: tanpa itu tombol lain tetap hidup selama
     fetch dan PUT-nya menimpa edit yang diselipkan; peta dasar dibaca dari
     allocRef (state terkini saat PUT), bukan snapshot render saat klik. */
  async function copyFromYesterday() {
    if (saving) return;
    setSaving(true);
    try {
      const yday = isoAddDays(faDate, -1);
      let src: Record<string, string> = {};
      try {
        const resp = await fleetApi.getAllocations({ date: yday, shift });
        for (const [k, v] of Object.entries(resp ?? {})) {
          if (k.slice(0, 10) === yday) src = v[shift] ?? {};
        }
      } catch (e) {
        pushToast("error", t.apErrT, errorMessage(e, t.faLoadErrB));
        return;
      }
      const base = allocRef.current;
      const usedNik = new Set(Object.values(base));
      const operable = new Map(faUnits.map((u) => [u.code, u]));
      const next = { ...base };
      let n = 0;
      for (const [code, nik] of Object.entries(src)) {
        const u = operable.get(code);
        if (!u || u.status === "breakdown") continue;
        if (next[code] || usedNik.has(nik) || !opByNik.has(nik)) continue;
        next[code] = nik;
        usedNik.add(nik);
        n++;
      }
      if (!n) {
        pushToast("info", t.faCopyEmptyT, t.faCopyEmptyD);
        return;
      }
      if (await putUnits(next)) pushToast("success", `${n} ${t.faCopyToastT}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.navFleetAlloc} sub={`${shiftLabel} — ${t.faSubB}`}>
        <div className="flex flex-wrap items-center gap-3 max-sm:w-full">
          <Input
            type="date"
            /* w-full, bukan flex-1: berbagi baris dengan pemilih shift
               menyisakan ~130px dan tahunnya ikut terpotong ("08/04/") */
            className="w-40 font-mono max-sm:w-full"
            value={faDate}
            onChange={(e) => {
              /* nilai kosong (input dibersihkan via keyboard) diabaikan —
                 tanpa tanggal efek fetch berhenti dan papan macet di spinner */
              if (!e.target.value) return;
              setFaDate(e.target.value);
              setPage(1);
            }}
            aria-label={t.lblDate}
          />
          <Segmented role="group" aria-label="Shift">
            <SegmentedButton
              active={shift === "pagi"}
              onClick={() => {
                setShift("pagi");
                setPage(1);
              }}
            >
              {t.faShiftPagi}
            </SegmentedButton>
            <SegmentedButton
              active={shift === "malam"}
              onClick={() => {
                setShift("malam");
                setPage(1);
              }}
            >
              {t.faShiftMalam}
            </SegmentedButton>
          </Segmented>
          {canManage ? (
            <>
              <Button
                variant="secondary"
                disabled={!ready || saving}
                onClick={() => void copyFromYesterday()}
              >
                <CopyPlus />
                {t.faCopyYday}
              </Button>
              <Button
                disabled={!ready || saving}
                onClick={() => setAutoOpen(true)}
              >
                <Wand2 />
                {t.faAutoBtn}
              </Button>
            </>
          ) : null}
        </div>
      </PageTitle>

      {firstErr ? (
        <Panel>
          <StateBox
            icon={<CircleAlert className="text-danger-text" />}
            title={t.apLoadErrT}
            body={t.faLoadErrB}
          >
            <Button onClick={retry}>{t.apRetry}</Button>
          </StateBox>
        </Panel>
      ) : !ready ? (
        <Panel>
          <div className="grid place-items-center py-16">
            <Spinner className="size-6" />
          </div>
        </Panel>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-(--text-secondary)">
              <b className="font-semibold text-(--text-primary)">{allocN}</b>{" "}
              {t.faAllocOf}{" "}
              <b className="font-semibold text-(--text-primary)">
                {faUnits.length}
              </b>{" "}
              {t.faAllocUnits}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2 max-sm:w-full max-sm:justify-start">
              <Select
                aria-label="Filter fleet"
                wrapperClassName="w-auto"
                className="h-10 w-auto pr-9"
                value={fleetF}
                onChange={(e) => {
                  setFleetF(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">{t.faFleetAll}</option>
                {faFleets
                  .filter((f) => f.active)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      Fleet {f.digger}
                    </option>
                  ))}
                <option value="support">{t.faSupportGrp}</option>
              </Select>
              <Segmented role="group" aria-label="Filter alokasi">
                {(
                  [
                    ["all", t.segAll],
                    ["unalloc", t.faFUnalloc],
                    ["alloc", t.faFAlloc],
                    ["issue", t.faFIssue],
                  ] as [Filter, string][]
                ).map(([f, label]) => (
                  <SegmentedButton
                    key={f}
                    active={filter === f}
                    onClick={() => {
                      setFilter(f);
                      setPage(1);
                    }}
                  >
                    {label}
                  </SegmentedButton>
                ))}
              </Segmented>
              <SearchInput
                className="w-55 max-sm:w-full"
                placeholder={t.searchUnit}
                aria-label={t.searchUnit}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {cards.map((u) => {
              const kind = kindOf(u);
              const op = opByNik.get(alloc[u.code] ?? "");
              const fleet = faFleets.find(
                (f) => f.digger === u.code || f.units.includes(u.code)
              );
              const komp = op ? displayKomp(op, u.tegi) : null;
              const ftw = op ? ftwBadgeOf(op, t) : null;
              const st = stBadge[u.status];
              return (
                <div
                  key={u.code}
                  className={cn(
                    "flex flex-col gap-4 rounded-card p-5 glass-card",
                    kind === "warn" &&
                      "border-[rgba(252,60,59,.45)] shadow-[0_0_20px_rgba(252,60,59,.18),0_20px_80px_rgba(0,0,0,.5)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <b className="text-base font-bold">{u.code}</b>
                      <span className="mt-px block text-xs text-(--text-tertiary)">
                        {u.type} · {u.loc}
                      </span>
                    </div>
                    <Badge variant={st.variant} dot>
                      {st.label}
                    </Badge>
                  </div>

                  {fleet ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info">Fleet {fleet.digger}</Badge>
                      <span className="text-xs text-(--text-tertiary)">
                        {fleet.loc}
                      </span>
                    </div>
                  ) : null}

                  {kind === "bd" ? (
                    <div>
                      <div className="flex min-h-15.5 items-center justify-center rounded-icon border border-dashed border-(--divider) bg-(--fill-subtle) p-3 text-[13px] text-(--text-tertiary)">
                        {t.faBdNoAlloc}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="danger" dot>
                          {t.faBdFix}
                        </Badge>
                      </div>
                    </div>
                  ) : op ? (
                    <div>
                      <div className="flex items-center gap-3 rounded-icon border border-(--divider) bg-(--fill-subtle) p-3">
                        <Avatar className="text-xs">
                          {initialsOf(op.name)}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <b className="block truncate text-[13px] font-semibold">
                            {op.name}
                          </b>
                          <span className="font-mono text-xs text-(--text-tertiary)">
                            {op.nik}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="info">
                          {/* eq = kode Eq. Class (revisi 1 Sep 2026); baris
                              lawas hanya punya cls */}
                          {komp
                            ? komp.eq
                              ? `${komp.eq} · ${komp.cls}`
                              : komp.cls
                            : t.faKompNone}
                        </Badge>
                        {ftw ? (
                          <Badge variant={ftw.variant} dot>
                            {ftw.label}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex min-h-15.5 items-center justify-center rounded-icon border border-dashed border-(--divider) bg-(--fill-subtle) p-3 text-[13px] text-(--text-tertiary)">
                        {t.faNoOp}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="neutral" dot>
                          {t.faIdle}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {kind === "warn" ? (
                    <p className="text-xs leading-[1.4] text-danger-text">
                      {t.faWarnNote}
                    </p>
                  ) : null}

                  {canManage ? (
                    <div className="mt-auto flex gap-2">
                      {kind === "warn" ? (
                        <Button
                          variant="destructive"
                          className="h-8.5 flex-1 text-[13px]"
                          disabled={saving}
                          onClick={() => setAllocFor(u)}
                        >
                          {t.faReplace}
                        </Button>
                      ) : kind === "ok" ? (
                        <>
                          <Button
                            variant="secondary"
                            className="h-8.5 flex-1 text-[13px]"
                            disabled={saving}
                            onClick={() => setAllocFor(u)}
                          >
                            {t.faChange}
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-8.5 flex-1 text-[13px]"
                            disabled={saving}
                            onClick={() => void release(u)}
                          >
                            {t.faRelease}
                          </Button>
                        </>
                      ) : kind === "none" ? (
                        <Button
                          className="h-8.5 flex-1 text-[13px]"
                          disabled={saving}
                          onClick={() => setAllocFor(u)}
                        >
                          {t.faAssign}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          className="h-8.5 flex-1 text-[13px]"
                          onClick={() => router.push("/assets/status")}
                        >
                          {t.faGoStatus}
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <Panel className="px-6 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FootSum>
                {t.attSumA} <b>{range}</b> {t.attSumB} <b>{filtered.length}</b>{" "}
                {t.udbSumB}
              </FootSum>
              <Pagination
                page={p}
                pageCount={pageCount}
                onPage={setPage}
                per={per}
                perOptions={["6", "12", "24", "48"]}
                onPer={(v) => {
                  setPer(v);
                  setPage(1);
                }}
              />
            </div>
          </Panel>

          {/* pool spare — pengganti baris "SPARE" (unit fiktif) di file lama */}
          <Panel>
            <Toolbar className="mb-4">
              <ToolbarTitle>
                {t.faSpareTitle} (
                {
                  ops.filter((o) => !new Set(Object.values(alloc)).has(o.nik))
                    .length
                }
                )
              </ToolbarTitle>
              <span className="text-xs text-(--text-tertiary)">
                {t.faSpareSub}
              </span>
            </Toolbar>
            {(() => {
              const usedNik = new Set(Object.values(alloc));
              const spare = ops.filter((o) => !usedNik.has(o.nik));
              if (!spare.length)
                return (
                  <p className="text-sm text-(--text-tertiary)">
                    {t.faSpareEmpty}
                  </p>
                );
              return (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                  {spare.map((o) => {
                    const ftw = ftwBadgeOf(o, t);
                    return (
                      <div
                        key={o.nik}
                        className="flex items-center gap-3 rounded-icon border border-(--divider) bg-(--fill-subtle) p-3"
                      >
                        <Avatar className="text-xs">
                          {initialsOf(o.name)}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <b className="block truncate text-[13px] font-semibold">
                            {o.name}
                          </b>
                          <span className="font-mono text-xs text-(--text-tertiary)">
                            {o.nik} · {o.komp?.map((k) => k.cls).join(", ")}
                          </span>
                        </div>
                        <Badge variant={ftw.variant} dot>
                          {ftw.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Panel>
        </>
      )}

      <DNote title={t.faNoteT}>{t.faNoteB}</DNote>

      <AllocDialog
        key={allocFor?.code ?? "none"}
        unit={allocFor}
        ops={ops}
        alloc={alloc}
        ftwAvailable={ftwAvailable}
        onClose={() => setAllocFor(null)}
        onAssign={(op) => {
          if (allocFor) void assign(allocFor, op);
        }}
      />

      <AutoDialog
        open={autoOpen}
        date={faDate}
        shiftLabel={shiftLabel}
        saving={saving}
        onClose={() => setAutoOpen(false)}
        onConfirm={() => void runAuto()}
      />
    </div>
  );
}
