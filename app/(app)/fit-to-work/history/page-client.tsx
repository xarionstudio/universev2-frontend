"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CircleAlert, Search } from "lucide-react";

import { ftwApi } from "@/lib/api";
import type { ApiFtwRecord, FtwStatus } from "@/lib/api/endpoints/ftw";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, Spinner } from "@/components/ui/button";
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
  rec: ApiFtwRecord;
  company: string;
  pos: string;
};

/* Lebar jendela bawaan. Dulu 90 hari, wajar saat datanya sintetis; dengan log
   asli (ratusan baris per hari) itu puluhan ribu baris sekali tarik. 30 hari
   sudah menjawab pertanyaan "bagaimana bulan ini" tanpa membuat halaman
   menggantung — dan user tetap bebas melebarkannya lewat filter tanggal. */
const DEFAULT_RANGE_DAYS = 30;

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
    /* sama seperti <Pagination> bersama: membungkus di layar sempit, bukan
       mendorong footer panel keluar layar */
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 max-sm:gap-x-3">
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
      <div className="flex flex-wrap items-center gap-2 max-sm:gap-1.5">
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
  const { t } = useI18n();
  const { empAll } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const startIso = new Date(now.getTime() - (DEFAULT_RANGE_DAYS - 1) * 86400000)
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

  const [reloadKey, setReloadKey] = React.useState(0);
  /* Pola yang sama dengan halaman Fit To Work: hasil disimpan bersama kunci
     muatannya, sehingga "sedang memuat" dan "gagal" jadi turunan dan effect
     tidak perlu memanggil setState secara sinkron.
     `nik` ikut kunci karena penyaringan operator dikerjakan server — untuk
     satu operator hasilnya puluhan baris, bukan puluhan ribu. */
  const key = `${fhOp}|${d1}|${d2}|${reloadKey}`;
  const [data, setData] = React.useState<{
    key: string;
    rows: ApiFtwRecord[];
  } | null>(null);
  const [errKey, setErrKey] = React.useState("");

  const loaded = data?.key === key;
  const loadErr = errKey === key;
  const all = React.useMemo(() => (loaded ? data.rows : []), [loaded, data]);

  React.useEffect(() => {
    const ac = new AbortController();
    void ftwApi
      .getFtwHistory(
        { nik: fhOp || undefined, date_from: d1, date_to: d2 },
        ac.signal
      )
      .then((rows) => setData({ key, rows: rows ?? [] }))
      .catch(() => {
        if (!ac.signal.aborted) setErrKey(key);
      });
    return () => ac.abort();
  }, [key, fhOp, d1, d2]);

  const retry = React.useCallback(() => setReloadKey((k) => k + 1), []);

  /* Daftar operator diambil dari log yang benar-benar ada di rentang ini,
     bukan dari master karyawan: yang berguna dipilih di halaman riwayat
     hanyalah operator yang punya log. Operator yang datang lewat ?nik=
     tetap ditambahkan walau rentangnya kosong, supaya pilihannya tidak
     hilang sendiri dari dropdown. */
  const ops = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of all) if (!m.has(r.nik)) m.set(r.nik, r.name || r.nik);
    if (fhOp && !m.has(fhOp)) m.set(fhOp, fhOp);
    return [...m.entries()]
      .map(([nik, name]) => ({ nik, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [all, fhOp]);

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
  const rows: Row[] = React.useMemo(() => {
    const out: Row[] = [];
    for (const rec of all) {
      if (shift && rec.shift !== shift) continue;
      if (st && rec.st !== st) continue;
      if (
        needle &&
        !rec.name.toLowerCase().includes(needle) &&
        !rec.nik.includes(needle)
      )
        continue;
      const emp = emps.find((e) => e.nik === rec.nik);
      out.push({
        rec,
        company: emp?.company ?? "PT Unggul Dinamika Utama",
        pos: emp?.pos ?? "—",
      });
    }
    /* terbaru dulu, lalu abjad — supaya urutannya stabil saat satu tanggal
       berisi banyak operator */
    out.sort(
      (a, b) =>
        b.rec.date.localeCompare(a.rec.date) ||
        a.rec.name.localeCompare(b.rec.name)
    );
    return out;
  }, [all, shift, st, needle, emps]);

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
        r.rec.date.slice(0, 10),
        r.rec.name,
        r.rec.nik,
        r.company,
        r.rec.dept,
        r.pos,
        r.rec.shift === "malam" ? t.shiftNight : t.shiftDay,
        r.rec.sleep,
        { text: stLabel[r.rec.st], tone: tone[r.rec.st] },
        r.rec.restHours > 0 ? `+${r.rec.restHours} ${t.hourShort}` : "—",
        r.rec.sendTime,
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
    <div className="flex flex-col gap-6 max-sm:gap-4">
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
              className="w-60 max-sm:w-full"
              placeholder={t.searchEmp}
              aria-label={t.searchEmp}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Select
              wrapperClassName="w-62.5 max-sm:w-full"
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
              wrapperClassName="w-40 max-sm:w-full"
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
              wrapperClassName="w-35 max-sm:w-full"
              value={shift}
              onChange={(e) => {
                setShift(e.target.value);
                setPage(1);
              }}
              aria-label={t.allShift}
            >
              <option value="">{t.allShift}</option>
              {/* nilainya "pagi", bukan "siang": itu yang tersimpan di
                  kolom ftw_logs.shift */}
              <option value="pagi">{t.shiftDay}</option>
              <option value="malam">{t.shiftNight}</option>
            </Select>
            <div className="flex items-center gap-2 max-sm:w-full max-sm:flex-col max-sm:items-stretch">
              <Input
                type="date"
                className="w-40 font-mono max-sm:w-full"
                value={d1}
                onChange={(e) => {
                  setD1(e.target.value);
                  setPage(1);
                }}
                aria-label={t.lblDate}
              />
              <span className="text-(--text-tertiary) max-sm:text-center">
                —
              </span>
              <Input
                type="date"
                className="w-40 font-mono max-sm:w-full"
                value={d2}
                onChange={(e) => {
                  setD2(e.target.value);
                  setPage(1);
                }}
                aria-label={t.lblDateTo}
              />
            </div>
            {/* ekspor mengikuti filter aktif: yang diunduh = yang terlihat */}
            <ExportButtons build={buildExport} iconOnly />
          </ToolbarGroup>
        </Toolbar>

        {loadErr ? (
          <StateBox
            icon={<CircleAlert className="text-danger-text" />}
            title={t.apLoadErrT}
            body={t.ftwLoadErrB}
          >
            <Button onClick={retry}>{t.apRetry}</Button>
          </StateBox>
        ) : !loaded ? (
          <div className="grid place-items-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : shown.length ? (
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
                  <TableRow
                    key={`${r.rec.nik}-${r.rec.date.slice(0, 10)}-${r.rec.shift}`}
                  >
                    <TableCell className="font-mono whitespace-nowrap">
                      {r.rec.date.slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      <NameCell name={r.rec.name || "—"} sub={r.rec.nik} />
                    </TableCell>
                    <TableCell>{r.company}</TableCell>
                    <TableCell>{r.rec.dept || "—"}</TableCell>
                    <TableCell>{r.pos}</TableCell>
                    <TableCell>
                      {r.rec.shift === "malam" ? t.shiftNight : t.shiftDay}
                    </TableCell>
                    <TableCell className={sleepClass(r.rec.st)}>
                      {r.rec.sleep}
                    </TableCell>
                    <TableCell>{stBadge(r.rec.st)}</TableCell>
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

        {/* ringkasan "0 log" selama memuat/gagal hanya membingungkan */}
        {loaded && !loadErr ? (
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
        ) : null}
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
