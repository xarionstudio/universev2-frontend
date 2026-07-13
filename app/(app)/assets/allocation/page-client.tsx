"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CopyPlus, Wand2 } from "lucide-react";

import { ftwTodayMap } from "@/lib/data/employees";
import { isoAddDays } from "@/lib/data/fleet-alloc";
import { typeOfEgi } from "@/lib/data/units-db";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { Avatar, initialsOf } from "@/components/ui/avatar";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/toast";

import { AllocDialog } from "./_components/alloc-dialog";
import { AutoDialog, type FaProposal } from "./_components/auto-dialog";
import {
  displayKomp,
  ftwBadgeOf,
  type FaOp,
  type FaUnit,
} from "./_components/fa";

type Shift = "pagi" | "malam";
type Filter = "all" | "unalloc" | "alloc" | "issue";

/* class unit yang di-setting operatornya — mengikuti file setting lama
   (OHT/DT/digger/dozer/water truck/manhaul); LV, bus, pompa dsb. di luar papan */
const OPERATED_CLS = new Set(["HD", "LD", "EX", "DZ", "WT", "MH"]);

const stBadge: Record<
  FaUnit["status"],
  { variant: BadgeVariant; label: string }
> = {
  ready: { variant: "success", label: "Ready" },
  breakdown: { variant: "danger", label: "Breakdown" },
  standby: { variant: "warning", label: "Standby" },
};

export default function FleetAllocationPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const router = useRouter();
  const { udbAll, empAll, faAlloc, setFaAlloc, fleets } = useAppStore();

  const [faDate, setFaDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [shift, setShift] = React.useState<Shift>("pagi");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [fleetF, setFleetF] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [per, setPer] = React.useState("6");
  const [allocFor, setAllocFor] = React.useState<FaUnit | null>(null);
  const [autoOpen, setAutoOpen] = React.useState(false);

  /* urutan papan: unit formasi fleet dulu (sesuai Setting Fleet), lalu support */
  const fleetRank = React.useMemo(() => {
    const rank = new Map<string, number>();
    fleets
      .filter((f) => f.active)
      .forEach((f, fi) =>
        [f.digger, ...f.units].forEach((c, ci) => rank.set(c, fi * 100 + ci))
      );
    return rank;
  }, [fleets]);

  const faUnits: FaUnit[] = React.useMemo(
    () =>
      udbAll()
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
    [udbAll, fleetRank]
  );

  const ops: FaOp[] = React.useMemo(
    () =>
      empAll()
        .filter((r) => r.status === "aktif" && r.komp && r.komp.length)
        .map((r) => ({ ...r, ftw: ftwTodayMap[r.nik] || "belum" })),
    [empAll]
  );

  /* alokasi tanggal + shift terpilih */
  const alloc = React.useMemo(
    () => faAlloc[faDate]?.[shift] ?? {},
    [faAlloc, faDate, shift]
  );
  const opByNik = React.useMemo(
    () => new Map(ops.map((o) => [o.nik, o])),
    [ops]
  );

  function kindOf(u: FaUnit): "bd" | "none" | "warn" | "ok" {
    if (u.status === "breakdown") return "bd";
    const nik = alloc[u.code];
    const op = nik ? opByNik.get(nik) : undefined;
    if (!op) return "none";
    return op.ftw !== "fit" ? "warn" : "ok";
  }

  const needle = q.trim().toLowerCase();
  const filtered = faUnits.filter((u) => {
    const kind = kindOf(u);
    if (filter === "unalloc" && kind !== "none") return false;
    if (filter === "alloc" && kind !== "ok") return false;
    if (filter === "issue" && kind !== "warn" && kind !== "bd") return false;
    if (fleetF === "support" && fleetRank.has(u.code)) return false;
    if (fleetF !== "all" && fleetF !== "support") {
      const f = fleets.find((x) => x.id === fleetF);
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

  /* tulis ke alloc[tanggal][shift] */
  function writeAlloc(mut: (next: Record<string, string>) => void) {
    setFaAlloc((prev) => {
      const next = { ...(prev[faDate]?.[shift] ?? {}) };
      mut(next);
      return { ...prev, [faDate]: { ...prev[faDate], [shift]: next } };
    });
  }

  function assign(unit: FaUnit, op: FaOp) {
    writeAlloc((next) => {
      next[unit.code] = op.nik;
    });
    setAllocFor(null);
    pushToast("success", `${op.name} → ${unit.code}`, t.faToastDoD);
  }

  function release(unit: FaUnit) {
    const op = opByNik.get(alloc[unit.code] ?? "");
    writeAlloc((next) => {
      delete next[unit.code];
    });
    if (op)
      pushToast(
        "info",
        `${op.name} ${t.faToastRelT} ${unit.code}`,
        t.faToastRelD
      );
  }

  function applyAuto(proposals: FaProposal[]) {
    writeAlloc((next) => {
      for (const pr of proposals) next[pr.code] = pr.nik;
    });
    setAutoOpen(false);
    pushToast("success", `${proposals.length} ${t.faAutoToastT}`);
  }

  /* salin alokasi shift yang sama dari hari sebelumnya — hanya slot kosong,
     operator yang sudah terpakai hari ini dilewati */
  function copyFromYesterday() {
    const src = faAlloc[isoAddDays(faDate, -1)]?.[shift] ?? {};
    const usedNik = new Set(Object.values(alloc));
    const operable = new Map(faUnits.map((u) => [u.code, u]));
    let n = 0;
    writeAlloc((next) => {
      for (const [code, nik] of Object.entries(src)) {
        const u = operable.get(code);
        if (!u || u.status === "breakdown") continue;
        if (next[code] || usedNik.has(nik) || !opByNik.has(nik)) continue;
        next[code] = nik;
        usedNik.add(nik);
        n++;
      }
    });
    if (n) pushToast("success", `${n} ${t.faCopyToastT}`);
    else pushToast("info", t.faCopyEmptyT, t.faCopyEmptyD);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.navFleetAlloc} sub={`${shiftLabel} — ${t.faSubB}`}>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            className="w-[160px] font-mono"
            value={faDate}
            onChange={(e) => {
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
          <Button variant="secondary" onClick={copyFromYesterday}>
            <CopyPlus />
            {t.faCopyYday}
          </Button>
          <Button onClick={() => setAutoOpen(true)}>
            <Wand2 />
            {t.faAutoBtn}
          </Button>
        </div>
      </PageTitle>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-(--text-secondary)">
          <b className="font-semibold text-(--text-primary)">{allocN}</b>{" "}
          {t.faAllocOf}{" "}
          <b className="font-semibold text-(--text-primary)">
            {faUnits.length}
          </b>{" "}
          {t.faAllocUnits}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
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
            {fleets
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
            className="w-55"
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
          const fleet = fleets.find(
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
                  <div className="flex min-h-[62px] items-center justify-center rounded-icon border border-dashed border-(--divider) bg-(--fill-subtle) p-3 text-[13px] text-(--text-tertiary)">
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
                    <Avatar className="text-xs">{initialsOf(op.name)}</Avatar>
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
                      {komp
                        ? `${komp.cls} · SIMPER ${komp.simper}`
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
                  <div className="flex min-h-[62px] items-center justify-center rounded-icon border border-dashed border-(--divider) bg-(--fill-subtle) p-3 text-[13px] text-(--text-tertiary)">
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
                <p className="text-xs leading-[1.4] text-(--color-danger-text)">
                  {t.faWarnNote}
                </p>
              ) : null}

              <div className="mt-auto flex gap-2">
                {kind === "warn" ? (
                  <Button
                    variant="destructive"
                    className="h-[34px] flex-1 text-[13px]"
                    onClick={() => setAllocFor(u)}
                  >
                    {t.faReplace}
                  </Button>
                ) : kind === "ok" ? (
                  <>
                    <Button
                      variant="secondary"
                      className="h-[34px] flex-1 text-[13px]"
                      onClick={() => setAllocFor(u)}
                    >
                      {t.faChange}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-[34px] flex-1 text-[13px]"
                      onClick={() => release(u)}
                    >
                      {t.faRelease}
                    </Button>
                  </>
                ) : kind === "none" ? (
                  <Button
                    className="h-[34px] flex-1 text-[13px]"
                    onClick={() => setAllocFor(u)}
                  >
                    {t.faAssign}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="h-[34px] flex-1 text-[13px]"
                    onClick={() => router.push("/assets/status")}
                  >
                    {t.faGoStatus}
                  </Button>
                )}
              </div>
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
          <span className="text-xs text-(--text-tertiary)">{t.faSpareSub}</span>
        </Toolbar>
        {(() => {
          const usedNik = new Set(Object.values(alloc));
          const spare = ops.filter((o) => !usedNik.has(o.nik));
          if (!spare.length)
            return (
              <p className="text-sm text-(--text-tertiary)">{t.faSpareEmpty}</p>
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
                    <Avatar className="text-xs">{initialsOf(o.name)}</Avatar>
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

      <DNote title={t.faNoteT}>{t.faNoteB}</DNote>

      <AllocDialog
        key={allocFor?.code ?? "none"}
        unit={allocFor}
        ops={ops}
        alloc={alloc}
        onClose={() => setAllocFor(null)}
        onAssign={(op) => {
          if (allocFor) assign(allocFor, op);
        }}
      />

      <AutoDialog
        open={autoOpen}
        units={faUnits}
        ops={ops}
        alloc={alloc}
        onClose={() => setAutoOpen(false)}
        onApply={applyAuto}
      />
    </div>
  );
}
