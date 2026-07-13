"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";

import {
  ftwData,
  ftwHistoryFor,
  type FtwHistEntry,
  type FtwRecord,
} from "@/lib/data/ftw";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageButton } from "@/components/ui/pagination";
import {
  FootSum,
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
  NameCell,
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
  entry: FtwHistEntry;
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

/* Pagination berjendela — maksimal 5 nomor halaman, terpusat di halaman aktif */
function WindowPagination({
  page,
  pageCount,
  onPage,
  per,
  onPer,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  per: string;
  onPer: (per: string) => void;
}) {
  const { t } = useI18n();
  const size = Math.min(5, Math.max(1, pageCount));
  const startN = Math.max(1, Math.min(page - 2, pageCount - size + 1));
  const pages = Array.from({ length: size }, (_, i) => startN + i);
  return (
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-2 text-xs text-(--text-tertiary)">
        {t.rppLabel}
        <Select
          value={per}
          onChange={(e) => onPer(e.target.value)}
          aria-label={t.rppLabel}
          wrapperClassName="w-auto"
          className="h-8 w-auto rounded-lg px-2 pr-8"
        >
          {["10", "25", "50"].map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <PageButton
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label={t.pgPrev}
        >
          ‹
        </PageButton>
        {pages.map((n) => (
          <PageButton key={n} active={n === page} onClick={() => onPage(n)}>
            {n}
          </PageButton>
        ))}
        <PageButton
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          aria-label={t.pgNext}
        >
          ›
        </PageButton>
      </div>
    </div>
  );
}

function FtwHistoryInner() {
  const { t, lang } = useI18n();
  const { empAll } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const startIso = new Date(now.getTime() - 90 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [fhOp, setFhOp] = React.useState(searchParams.get("nik") ?? "");
  const [q, setQ] = React.useState("");
  const [st, setSt] = React.useState("");
  const [shift, setShift] = React.useState("");
  const [d1, setD1] = React.useState(startIso);
  const [d2, setD2] = React.useState(todayIso);
  const [per, setPer] = React.useState("10");
  const [page, setPage] = React.useState(1);

  const ops = ftwData(lang);
  const selectedOp = ops.find((o) => o.nik === fhOp);

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
  for (const op of selectedOp ? [selectedOp] : ops) {
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
      const key = stOf(entry.st);
      if (st && key !== st) continue;
      rows.push({ op, company, pos, st: key, entry });
    }
  }
  rows.sort((a, b) =>
    a.entry.iso < b.entry.iso ? 1 : a.entry.iso > b.entry.iso ? -1 : 0
  );

  const perN = parseInt(per, 10);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / perN));
  const cur = Math.min(page, pageCount);
  const shown = rows.slice((cur - 1) * perN, cur * perN);
  const start = total === 0 ? 0 : (cur - 1) * perN + 1;
  const end = Math.min(total, cur * perN);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={t.ftwHistPage}
        sub={
          selectedOp ? `${selectedOp.name} — NIK ${selectedOp.nik}` : t.fhSubAll
        }
      >
        <Button variant="ghost" onClick={() => router.push("/fit-to-work")}>
          <ArrowLeft />
          {t.backFtw}
        </Button>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.ftwHistTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-[240px]"
              placeholder={t.searchEmp}
              aria-label={t.searchEmp}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Select
              wrapperClassName="w-[250px]"
              value={fhOp}
              onChange={(e) => {
                setFhOp(e.target.value);
                setPage(1);
              }}
              aria-label={t.allOps}
            >
              <option value="">{t.allOps}</option>
              {ops.map((o) => (
                <option key={o.nik} value={o.nik}>
                  {o.name} — {o.nik}
                </option>
              ))}
            </Select>
            <Select
              wrapperClassName="w-[160px]"
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
              wrapperClassName="w-[140px]"
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
                  <TableHead>{t.lblDate}</TableHead>
                  <TableHead>{t.thOperator}</TableHead>
                  <TableHead>{t.thCompany}</TableHead>
                  <TableHead>{t.thDept}</TableHead>
                  <TableHead>{t.thPos}</TableHead>
                  <TableHead>{t.thShift}</TableHead>
                  <TableHead>{t.thSleep}</TableHead>
                  <TableHead>{t.thStatus}</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {shown.map((r) => (
                  <TableRow key={`${r.op.nik}-${r.entry.d}`}>
                    <TableCell className="font-mono whitespace-nowrap">
                      {r.entry.date}
                    </TableCell>
                    <TableCell>
                      <NameCell name={r.op.name} sub={r.op.nik} />
                    </TableCell>
                    <TableCell>{r.company}</TableCell>
                    <TableCell>{r.op.dept}</TableCell>
                    <TableCell>{r.pos}</TableCell>
                    <TableCell>
                      {r.op.shift === "malam" ? t.shiftNight : t.shiftDay}
                    </TableCell>
                    <TableCell className={sleepClass(r.st)}>
                      {r.entry.sleep}
                    </TableCell>
                    <TableCell>{stBadge(r.st)}</TableCell>
                  </TableRow>
                ))}
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
          <WindowPagination
            page={cur}
            pageCount={pageCount}
            onPage={setPage}
            per={per}
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

export default function FtwHistoryPage() {
  return (
    <React.Suspense>
      <FtwHistoryInner />
    </React.Suspense>
  );
}
