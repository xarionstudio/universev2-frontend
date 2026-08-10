"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";

import { ftwApi } from "@/lib/api/ftw";
import {
  type FtwHistEntry,
  type FtwRecord,
  type FtwStatus,
} from "@/lib/data/ftw";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExportButtons } from "@/components/ui/export-buttons";
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

type StKey = FtwStatus;

type Row = {
  op: FtwRecord;
  company: string;
  pos: string;
  st: StKey;
  entry: FtwHistEntry;
};

const sleepClass = (st: StKey) =>
  cn(
    "font-mono",
    st === "pulang" && "font-semibold text-danger-text",
    st === "spare" && "font-semibold text-(--badge-warning-text)",
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
  const [apiHist, setApiHist] = React.useState<Record<string, unknown>[]>([]);

  React.useEffect(() => {
    ftwApi
      .getHistory({ nik: fhOp || undefined, from: d1, to: d2 })
      .then((hist) => {
        if (hist && Array.isArray(hist))
          setApiHist(hist as Record<string, unknown>[]);
      })
      .catch(() => {});
  }, [fhOp, d1, d2]);

  const ops: FtwRecord[] = apiHist.map((h) => ({
    nik: String(h.nik || ""),
    name: String(h.name || h.nik || ""),
    shift: (h.shift || "pagi") as FtwRecord["shift"],
    st: (h.status || "belum") as StKey,
    dept: String(h.dept || "Operation"),
    sleep: h.sleepHours ? `${h.sleepHours} jam` : "—",
    sleepMin: Number(h.sleepMin || 0),
    restHours: Number(h.restHours || 0),
    sendTime: String(h.sendTime || "—"),
    hist: [],
  }));
  const selectedOp = ops.find((o) => o.nik === fhOp);

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
      const key = entry.status;
      if (st && key !== st) continue;
      rows.push({ op, company, pos, st: key, entry });
    }
  }
  rows.sort((a, b) =>
    a.entry.iso < b.entry.iso ? 1 : a.entry.iso > b.entry.iso ? -1 : 0
  );

  /* Payload ekspor — seluruh baris hasil filter, bukan hanya halaman aktif */
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
      fileBase: "fit-to-work-riwayat-detail",
      title: t.expReportFtwHist,
      /* cap waktu & jumlah baris ditambahkan oleh <ExportButtons> per format */
      meta: [`${t.expFilter}: ${filters.join(" · ")}`],
      sheetName: t.tabHistory,
      columns: [
        { header: t.lblDate, width: 14 },
        { header: t.thOperator, width: 26 },
        { header: "NIK", width: 14 },
        { header: t.thCompany, width: 26 },
        { header: t.thDept, width: 16 },
        { header: t.thPos, width: 22 },
        { header: t.thShift, width: 10 },
        { header: t.thSleep, width: 12, align: "right" as const },
        { header: t.thStatus, width: 15 },
        { header: t.ftwThRest, width: 11, align: "right" as const },
        { header: t.thSendTime, width: 14 },
      ],
      rows: rows.map((r) => [
        r.entry.date,
        r.op.name,
        r.op.nik,
        r.company,
        r.op.dept,
        r.pos,
        r.op.shift === "malam" ? t.shiftNight : t.shiftDay,
        r.entry.sleep,
        { text: stLabel[r.st], tone: tone[r.st] },
        r.entry.restHours > 0 ? `+${r.entry.restHours} ${t.hourShort}` : "—",
        r.entry.sendTime,
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
              className="w-60"
              placeholder={t.searchEmp}
              aria-label={t.searchEmp}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Select
              wrapperClassName="w-62.5"
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
              wrapperClassName="w-40"
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
              wrapperClassName="w-35"
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
