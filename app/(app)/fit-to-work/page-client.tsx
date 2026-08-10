"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Clock, Search } from "lucide-react";

import { ftwApi } from "@/lib/api/ftw";
import { ftwStripAt, type FtwRecord, type FtwStatus } from "@/lib/data/ftw";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { useRegisterRefresh } from "@/components/providers/refresh";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { ExportButtons } from "@/components/ui/export-buttons";
import { Input } from "@/components/ui/input";
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
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StateBox } from "@/components/ui/state-box";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StKey = FtwStatus;

type Row = {
  op: FtwRecord;
  company: string;
  pos: string;
  st: StKey;
  /* jam istirahat tambahan sebelum boleh bekerja (0/1/2) */
  restHours: number;
  sleep: string;
  sendTime: string;
  date: string;
  d: number;
};

const sleepClass = (st: StKey) =>
  cn(
    "font-mono",
    st === "pulang" && "font-semibold text-danger-text",
    st === "spare" && "font-semibold text-(--badge-warning-text)",
    st === "belum" && "text-(--text-tertiary)",
    st === "fit" && "text-(--text-secondary)"
  );

const STRIP_CLS: Record<"ok" | "bad" | "na", string> = {
  ok: "bg-[rgba(23,206,100,.75)]",
  bad: "bg-[rgba(233,155,42,.85)]",
  na: "bg-(--fill-hover-strong)",
};

export default function FitToWorkPage() {
  const { t, lang } = useI18n();
  const { empAll } = useAppStore();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [q, setQ] = React.useState("");
  const [st, setSt] = React.useState("");
  const [shift, setShift] = React.useState("");
  const [d1, setD1] = React.useState(todayIso);
  const [d2, setD2] = React.useState(todayIso);
  const [per, setPer] = React.useState("10");
  const [page, setPage] = React.useState(1);
  const [freshTime, setFreshTime] = React.useState("");

  const updateFresh = React.useCallback(() => {
    const d = new Date();
    setFreshTime(
      `${d.getHours() < 10 ? "0" : ""}${d.getHours()}:${d.getMinutes() < 10 ? "0" : ""}${d.getMinutes()} WITA`
    );
  }, []);

  const [apiLogs, setApiLogs] = React.useState<Record<string, unknown>[]>([]);
  const [apiHist, setApiHist] = React.useState<Record<string, unknown>[]>([]);

  React.useEffect(() => {
    ftwApi
      .getTodayLogs(d1)
      .then((logs) => {
        if (logs && Array.isArray(logs)) {
          setApiLogs(logs);
        }
      })
      .catch(() => {});
  }, [d1]);

  /* Fetch riwayat FTW dari API (bukan sintetis) */
  React.useEffect(() => {
    ftwApi
      .getHistory({ from: d1, to: d2 })
      .then((hist) => {
        if (hist && Array.isArray(hist)) {
          setApiHist(hist as Record<string, unknown>[]);
        }
      })
      .catch(() => {});
  }, [d1, d2]);

  /* refresh dari topbar: perbarui stempel "data per" */
  useRegisterRefresh(updateFresh);

  const stBadge = (key: StKey) => {
    const map: Record<StKey, { v: BadgeVariant; l: string }> = {
      fit: { v: "success", l: t.bFit },
      spare: { v: "warning", l: t.ftwStatSpare },
      pulang: { v: "danger", l: t.ftwStatPulang },
      belum: { v: "neutral", l: t.ftwStatBelum },
    };
    return (
      <Badge variant={map[key].v} dot>
        {map[key].l}
      </Badge>
    );
  };

  const emps = empAll();
  /* status hari ini per operator — dari API backend */
  const today: FtwRecord[] = apiLogs.map((l) => ({
    nik: String(l.nik || ""),
    name: String(l.name || l.nik || ""),
    shift: (l.shift || "pagi") as FtwRecord["shift"],
    st: (l.status || "belum") as StKey,
    dept: String(l.dept || "Operation"),
    sleep: l.sleepHours ? `${l.sleepHours} jam` : "—",
    sleepMin: Number(l.sleepMin || 0),
    restHours: Number(l.restHours || 0),
    sendTime: String(l.sendTime || "—"),
    hist: [],
  }));
  const needle = q.trim().toLowerCase();
  const rows: Row[] = [];
  for (const op of today) {
    if (shift && op.shift !== shift) continue;
    if (
      needle &&
      !op.name.toLowerCase().includes(needle) &&
      !op.nik.includes(needle)
    )
      continue;
    const emp = emps.find((e) => e.nik === op.nik);
    const company = emp?.company ?? "PT Unggul Dinamika Utama";
    const pos = emp?.pos ?? "—";
    /* Riwayat dari API — satu-satunya sumber data */
    const histEntries = apiHist
      .filter((h) => String(h.nik || "") === op.nik)
      .map((h) => ({
        d: Number(h.d ?? 0),
        iso: String(h.iso || ""),
        date: String(h.date || ""),
        st: Number(h.st ?? 0),
        sleepMin: h.sleepMin != null ? Number(h.sleepMin) : null,
        sleep: String(h.sleep || "—"),
        status: (h.status || "belum") as StKey,
        restHours: Number(h.restHours || 0),
        sendTime: String(h.sendTime || "—"),
      }));
    for (const entry of histEntries) {
      if (d1 && entry.iso < d1) continue;
      if (d2 && entry.iso > d2) continue;
      // hari ini pakai data log asli operator, bukan deret riwayat sintetis
      const isToday = entry.d === 0;
      const key = isToday ? op.st : entry.status;
      if (st && key !== st) continue;
      rows.push({
        op,
        company,
        pos,
        st: key,
        restHours: isToday ? op.restHours : entry.restHours,
        sleep: isToday ? op.sleep : entry.sleep,
        sendTime: entry.sendTime,
        date: entry.date,
        d: entry.d,
      });
    }
  }

  /* Payload ekspor — SEMUA baris hasil filter (bukan cuma halaman aktif),
     karena laporan yang cuma berisi 10 baris pertama menyesatkan. */
  const buildExport = () => {
    const stLabel: Record<StKey, string> = {
      fit: t.bFit,
      spare: t.ftwStatSpare,
      pulang: t.ftwStatPulang,
      belum: t.ftwStatBelum,
    };
    const tone: Record<StKey, "success" | "warning" | "danger" | "neutral"> = {
      fit: "success",
      spare: "warning",
      pulang: "danger",
      belum: "neutral",
    };
    const filters = [
      st
        ? `${t.thStatus}: ${stLabel[st as StKey]}`
        : `${t.thStatus}: ${t.expAll}`,
      shift
        ? `${t.thShift}: ${shift === "malam" ? t.shiftNight : t.shiftDay}`
        : `${t.thShift}: ${t.expAll}`,
      d1 || d2 ? `${t.lblDate}: ${d1 || "…"} — ${d2 || "…"}` : null,
      q.trim() ? `${t.searchOp}: “${q.trim()}”` : null,
    ].filter(Boolean) as string[];

    return {
      fileBase: "fit-to-work-log-tidur",
      title: t.expReportFtw,
      /* cap waktu & jumlah baris ditambahkan oleh <ExportButtons> per format */
      meta: [`${t.expFilter}: ${filters.join(" · ")}`],
      sheetName: t.ftwLog,
      columns: [
        { header: t.thOperator, width: 26 },
        { header: "NIK", width: 14 },
        { header: t.thCompany, width: 26 },
        { header: t.thDept, width: 16 },
        { header: t.thPos, width: 22 },
        { header: t.thShift, width: 10 },
        { header: t.thSleep, width: 12, align: "right" as const },
        { header: t.thStatus, width: 15 },
        { header: t.ftwThRest, width: 11, align: "right" as const },
        { header: t.lblDate, width: 14 },
        { header: t.thSendTime, width: 14 },
      ],
      rows: rows.map((r) => [
        r.op.name,
        r.op.nik,
        r.company,
        r.op.dept,
        r.pos,
        r.op.shift === "malam" ? t.shiftNight : t.shiftDay,
        r.sleep,
        { text: stLabel[r.st], tone: tone[r.st] },
        r.restHours > 0 ? `+${r.restHours} ${t.hourShort}` : "—",
        r.date,
        r.sendTime,
      ]),
      landscape: true,
    };
  };

  const perN = parseInt(per, 10);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / perN));
  const cur = Math.min(page, pageCount);
  const shown = rows.slice((cur - 1) * perN, cur * perN);
  const start = total === 0 ? 0 : (cur - 1) * perN + 1;
  const end = Math.min(total, cur * perN);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.navFtw} sub={t.ftwSub}>
        <Fresh>
          {t.dataAsOf}&nbsp;
          <b className="font-mono text-(--text-secondary)">{freshTime}</b>
        </Fresh>
      </PageTitle>

      <div className="grid grid-cols-3 gap-4 max-xl:grid-cols-2">
        <StatCard
          icon={<CheckCircle2 />}
          iconStyle={{
            background: "var(--badge-success-fill)",
            borderColor: "var(--badge-success-border)",
            color: "var(--badge-success-text)",
          }}
          value={String(today.filter((r) => r.st === "fit").length)}
          label={t.ftwStatFit}
          detail={t.ftwRuleFit}
        />
        <StatCard
          icon={<Clock />}
          iconStyle={{
            background: "var(--badge-warning-fill)",
            borderColor: "var(--badge-warning-border)",
            color: "var(--badge-warning-text)",
          }}
          value={String(today.filter((r) => r.st === "spare").length)}
          label={t.ftwStatSpare}
          detail={t.ftwRestNote}
        />
        <StatCard
          icon={<CircleAlert />}
          iconStyle={{
            background: "var(--badge-danger-fill)",
            borderColor: "var(--badge-danger-border)",
            color: "var(--color-danger-text)",
          }}
          value={String(today.filter((r) => r.st === "pulang").length)}
          label={t.ftwStatPulang}
          detail={t.ftwPulangNote}
        />
      </div>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.ftwLog}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60"
              placeholder={t.searchOp}
              aria-label={t.searchOp}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Select
              wrapperClassName="w-42.5"
              value={st}
              onChange={(e) => {
                setSt(e.target.value);
                setPage(1);
              }}
              aria-label={t.allStatus}
            >
              <option value="">{t.allStatus}</option>
              <option value="belum">{t.ftwStatBelum}</option>
              <option value="pulang">{t.ftwStatPulang}</option>
              <option value="spare">{t.ftwStatSpare}</option>
              <option value="fit">{t.bFit}</option>
            </Select>
            <Select
              wrapperClassName="w-37.5"
              value={shift}
              onChange={(e) => {
                setShift(e.target.value);
                setPage(1);
              }}
              aria-label={t.allShift}
            >
              <option value="">{t.allShift}</option>
              <option value="siang">{t.shiftDay}</option>
              <option value="malam">{t.shiftNight}</option>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-40 font-mono"
                value={d1}
                onChange={(e) => {
                  setD1(e.target.value);
                  setPage(1);
                }}
                aria-label={t.lblDate}
              />
              <span className="text-(--text-tertiary)">—</span>
              <Input
                type="date"
                className="w-40 font-mono"
                value={d2}
                onChange={(e) => {
                  setD2(e.target.value);
                  setPage(1);
                }}
                aria-label={t.lblDateTo}
              />
            </div>
            {/* ekspor mengikuti filter aktif: yang diunduh = yang terlihat */}
            <ExportButtons build={buildExport} />
          </ToolbarGroup>
        </Toolbar>

        {shown.length ? (
          <div className="overflow-x-auto">
            <Table className="min-w-7xl">
              <TableHeader>
                <tr>
                  <TableHead>{t.thOperator}</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>{t.thCompany}</TableHead>
                  <TableHead>{t.thDept}</TableHead>
                  <TableHead>{t.thPos}</TableHead>
                  <TableHead>{t.thShift}</TableHead>
                  <TableHead>{t.thSleep}</TableHead>
                  <TableHead>{t.thStatus}</TableHead>
                  <TableHead>{t.ftwThRest}</TableHead>
                  <TableHead>{t.lblDate}</TableHead>
                  <TableHead>{t.thSendTime}</TableHead>
                  <TableHead>{t.thHist}</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {shown.map((r) => {
                  const strip = ftwStripAt(r.op, r.d);
                  const bad = strip.filter((s) => s === "bad").length;
                  return (
                    <TableRow key={`${r.op.nik}-${r.d}`}>
                      <TableCell className="font-semibold">
                        {r.op.name}
                      </TableCell>
                      <TableCell className="font-mono text-(--text-secondary) tabular-nums">
                        {r.op.nik}
                      </TableCell>
                      <TableCell>{r.company}</TableCell>
                      <TableCell>{r.op.dept}</TableCell>
                      <TableCell>{r.pos}</TableCell>
                      <TableCell>
                        {r.op.shift === "malam" ? t.shiftNight : t.shiftDay}
                      </TableCell>
                      <TableCell className={sleepClass(r.st)}>
                        {r.sleep}
                      </TableCell>
                      <TableCell>{stBadge(r.st)}</TableCell>
                      {/* istirahat tambahan sebelum boleh bekerja */}
                      <TableCell className="whitespace-nowrap">
                        {r.restHours > 0 ? (
                          <span className="text-(--badge-warning-text)">
                            +{r.restHours} {t.hourShort}
                          </span>
                        ) : (
                          <span className="text-(--text-tertiary)">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap">
                        {r.date}
                      </TableCell>
                      <TableCell className="font-mono">{r.sendTime}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {strip.map((s, i) => (
                            <i
                              key={i}
                              className={cn(
                                "size-2.5 flex-none rounded-[3px]",
                                STRIP_CLS[s]
                              )}
                            />
                          ))}
                          <span className="ml-1.5 text-xs text-(--text-tertiary)">
                            {bad === 0 ? t.histStable : `${bad}${t.histBad}`}
                          </span>
                        </div>
                        <Link
                          href={`/fit-to-work/history?nik=${r.op.nik}`}
                          className="mt-1 inline-block text-xs"
                        >
                          {t.ftwSeeAll}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <StateBox
            icon={<Search className="text-primary-bright" />}
            title={t.noResTitle}
            body={t.ftwEmptyB}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{`${start}–${end}`}</b> {t.attSumB} <b>{total}</b>{" "}
            {t.ftwSumLogs}
          </FootSum>
          <Pagination
            page={cur}
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
      </Panel>

      {/* aturan kelayakan — ditulis eksplisit agar operator & admin melihat
          ambang yang sama dengan yang dipakai mesin poin Prestasi */}
      <div className="rounded-card border border-(--divider) bg-(--fill-subtle) p-4">
        <b className="mb-1 block text-[13px] font-semibold">{t.ftwRuleT}</b>
        <ul className="flex flex-col gap-1.5 text-xs text-(--text-secondary)">
          {[
            [t.ftwRuleFit, "success"],
            [t.ftwRuleSpare1, "warning"],
            [t.ftwRuleSpare2, "warning"],
            [t.ftwRulePulang, "danger"],
          ].map(([label, tone]) => (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "size-1.5 flex-none rounded-full",
                  tone === "success" && "bg-(--badge-success-text)",
                  tone === "warning" && "bg-(--badge-warning-text)",
                  tone === "danger" && "bg-danger-text"
                )}
              />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
