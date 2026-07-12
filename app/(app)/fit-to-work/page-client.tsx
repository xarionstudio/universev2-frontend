"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Clock, Search } from "lucide-react";

import {
  ftwData,
  ftwHistoryFor,
  ftwStripAt,
  type FtwRecord,
} from "@/lib/data/ftw";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
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

type StKey = "fit" | "kurang" | "belum";

type Row = {
  op: FtwRecord;
  company: string;
  pos: string;
  st: StKey;
  sleep: string;
  sendTime: string;
  date: string;
  d: number;
};

const stOf = (n: number): StKey =>
  n === 1 ? "fit" : n === 0 ? "kurang" : "belum";

const sleepClass = (st: StKey) =>
  cn(
    "font-mono",
    st === "kurang" && "font-semibold text-(--color-danger-text)",
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

  React.useEffect(() => {
    const id = setTimeout(updateFresh, 0);
    return () => clearTimeout(id);
  }, [updateFresh]);

  const stBadge = (key: StKey) => {
    const map: Record<StKey, { v: BadgeVariant; l: string }> = {
      fit: { v: "success", l: t.bFit },
      kurang: { v: "warning", l: t.ftwStatKurang },
      belum: { v: "neutral", l: t.ftwStatBelum },
    };
    return (
      <Badge variant={map[key].v} dot>
        {map[key].l}
      </Badge>
    );
  };

  const emps = empAll();
  const needle = q.trim().toLowerCase();
  const rows: Row[] = [];
  for (const op of ftwData(lang)) {
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
    for (const entry of ftwHistoryFor(op, lang, 90)) {
      if (d1 && entry.iso < d1) continue;
      if (d2 && entry.iso > d2) continue;
      // hari ini pakai data log asli operator, bukan deret riwayat sintetis
      const isToday = entry.d === 0;
      const key = isToday ? op.st : stOf(entry.st);
      if (st && key !== st) continue;
      rows.push({
        op,
        company,
        pos,
        st: key,
        sleep: isToday ? op.sleep : entry.sleep,
        sendTime: entry.sendTime,
        date: entry.date,
        d: entry.d,
      });
    }
  }

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
          value="231"
          label={t.ftwStatFit}
          detail={t.ftwDFit}
        />
        <StatCard
          icon={<Clock />}
          iconStyle={{
            background: "var(--badge-warning-fill)",
            borderColor: "var(--badge-warning-border)",
            color: "var(--badge-warning-text)",
          }}
          value="12"
          label={t.ftwStatKurang}
          detail={t.ftwDKurang}
        />
        <StatCard
          icon={<CircleAlert />}
          iconStyle={{
            background: "var(--badge-danger-fill)",
            borderColor: "var(--badge-danger-border)",
            color: "var(--color-danger-text)",
          }}
          value="4"
          label={t.ftwStatBelum}
          detail={t.ftwDBelum}
        />
      </div>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.ftwLog}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-50"
              placeholder={t.searchOp}
              aria-label={t.searchOp}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Select
              wrapperClassName="w-[170px]"
              value={st}
              onChange={(e) => {
                setSt(e.target.value);
                setPage(1);
              }}
              aria-label={t.allStatus}
            >
              <option value="">{t.allStatus}</option>
              <option value="belum">{t.ftwStatBelum}</option>
              <option value="kurang">{t.ftwStatKurang}</option>
              <option value="fit">{t.bFit}</option>
            </Select>
            <Select
              wrapperClassName="w-[150px]"
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
          </ToolbarGroup>
        </Toolbar>

        {shown.length ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[1280px]">
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
            icon={<Search className="text-(--color-primary-bright)" />}
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
    </div>
  );
}
