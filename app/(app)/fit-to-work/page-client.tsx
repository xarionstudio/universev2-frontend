"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Clock, Search } from "lucide-react";

import { ftwApi } from "@/lib/api";
import type { ApiFtwRecord, FtwStatus } from "@/lib/api/endpoints/ftw";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { useRegisterRefresh } from "@/components/providers/refresh";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, Spinner } from "@/components/ui/button";
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
  rec: ApiFtwRecord;
  company: string;
  pos: string;
  strip: ("ok" | "bad" | "na")[];
};

/* Panjang bilah riwayat di kolom terakhir. Menentukan seberapa jauh ke
   belakang data harus ditarik melampaui filter tanggal yang dipilih user. */
const STRIP_DAYS = 7;

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

/* Geser tanggal ISO sebanyak `days` hari. Dipakai untuk memundurkan batas
   bawah penarikan; UTC dipakai agar tidak tergelincir DST/zona. */
function shiftIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* Satu kotak bilah riwayat: hijau bila boleh kerja tanpa istirahat tambahan,
   oranye bila melapor tapi kurang tidur, abu-abu bila tidak ada laporan. */
function stripCell(rec: ApiFtwRecord | undefined): "ok" | "bad" | "na" {
  if (!rec || rec.st === "belum") return "na";
  return rec.st === "fit" ? "ok" : "bad";
}

export default function FitToWorkPage() {
  const { t } = useI18n();
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

  /* Data dari server.
     `all` memuat rentang yang dipilih DITAMBAH 6 hari sebelumnya, karena
     bilah riwayat tiap baris melihat 7 hari ke belakang dari tanggal baris
     itu. Menariknya dalam satu permintaan jauh lebih murah daripada satu
     permintaan /ftw/history per operator yang tampil.
     `todayRows` memberi angka kartu statistik, yang selalu bicara HARI INI
     terlepas dari filter tanggal; kalau hari ini sudah tercakup rentang di
     atas, datanya dipakai ulang tanpa permintaan kedua. */
  const [reloadKey, setReloadKey] = React.useState(0);
  /* Kunci muatan: rentang + penghitung muat-ulang. Hasil dan kegagalan
     disimpan BERSAMA kuncinya, sehingga "sedang memuat" dan "gagal" jadi
     turunan (data.key === key) alih-alih state sendiri. Tanpa itu, effect
     harus memanggil setLoaded(false) secara sinkron — persis yang dilarang
     react-hooks/set-state-in-effect karena memicu render beruntun. */
  const key = `${d1}|${d2}|${reloadKey}`;
  const [data, setData] = React.useState<{
    key: string;
    all: ApiFtwRecord[];
    today: ApiFtwRecord[];
  } | null>(null);
  const [errKey, setErrKey] = React.useState("");

  const loaded = data?.key === key;
  const loadErr = errKey === key;
  const all = React.useMemo(() => (loaded ? data.all : []), [loaded, data]);
  const todayRows = loaded ? data.today : [];

  React.useEffect(() => {
    const ac = new AbortController();
    const from = shiftIso(d1, -(STRIP_DAYS - 1));
    const needsToday = todayIso < from || todayIso > d2;

    void Promise.all([
      ftwApi.getFtwHistory({ date_from: from, date_to: d2 }, ac.signal),
      needsToday
        ? ftwApi.getFtwHistory(
            { date_from: todayIso, date_to: todayIso },
            ac.signal
          )
        : Promise.resolve(null),
    ])
      .then(([range, todayOnly]) => {
        const rows = range ?? [];
        setData({
          key,
          all: rows,
          today:
            todayOnly ?? rows.filter((r) => r.date.slice(0, 10) === todayIso),
        });
        updateFresh();
      })
      .catch(() => {
        if (!ac.signal.aborted) setErrKey(key);
      });
    return () => ac.abort();
  }, [key, d1, d2, todayIso, updateFresh]);

  /* tombol refresh di topbar menarik ulang dari server, bukan sekadar
     memperbarui stempel "data per" */
  const reload = React.useCallback(() => setReloadKey((k) => k + 1), []);
  useRegisterRefresh(reload);

  const retry = reload;

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

  /* Indeks nik|tanggal — dasar bilah riwayat, dibangun sekali per muatan. */
  const byKey = React.useMemo(() => {
    const m = new Map<string, ApiFtwRecord>();
    for (const r of all) m.set(`${r.nik}|${r.date.slice(0, 10)}`, r);
    return m;
  }, [all]);

  const needle = q.trim().toLowerCase();
  const rows: Row[] = React.useMemo(() => {
    const out: Row[] = [];
    for (const rec of all) {
      const iso = rec.date.slice(0, 10);
      /* baris di luar rentang pilihan hanya bahan bilah riwayat */
      if (iso < d1 || iso > d2) continue;
      if (shift && rec.shift !== shift) continue;
      if (st && rec.st !== st) continue;
      if (
        needle &&
        !rec.name.toLowerCase().includes(needle) &&
        !rec.nik.includes(needle)
      )
        continue;

      const emp = emps.find((e) => e.nik === rec.nik);
      const strip: ("ok" | "bad" | "na")[] = [];
      for (let k = STRIP_DAYS - 1; k >= 0; k--) {
        strip.push(stripCell(byKey.get(`${rec.nik}|${shiftIso(iso, -k)}`)));
      }

      out.push({
        rec,
        company: emp?.company ?? "PT Unggul Dinamika Utama",
        pos: emp?.pos ?? "—",
        strip,
      });
    }
    /* terbaru dulu, lalu abjad — urutan submitted_at dari server tidak
       berarti apa-apa saat rentangnya lebih dari satu hari */
    out.sort(
      (a, b) =>
        b.rec.date.localeCompare(a.rec.date) ||
        a.rec.name.localeCompare(b.rec.name)
    );
    return out;
  }, [all, byKey, d1, d2, shift, st, needle, emps]);

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
        r.rec.name,
        r.rec.nik,
        r.company,
        r.rec.dept,
        r.pos,
        r.rec.shift === "malam" ? t.shiftNight : t.shiftDay,
        r.rec.sleep,
        { text: stLabel[r.rec.st], tone: tone[r.rec.st] },
        r.rec.restHours > 0 ? `+${r.rec.restHours} ${t.hourShort}` : "—",
        r.rec.date.slice(0, 10),
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

  const countToday = (key: StKey) =>
    String(todayRows.filter((r) => r.st === key).length);

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.navFtw} sub={t.ftwSub}>
        <Fresh>
          {t.dataAsOf}&nbsp;
          <b className="font-mono text-(--text-secondary)">{freshTime}</b>
        </Fresh>
      </PageTitle>

      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:gap-3">
        <StatCard
          icon={<CheckCircle2 />}
          iconStyle={{
            background: "var(--badge-success-fill)",
            borderColor: "var(--badge-success-border)",
            color: "var(--badge-success-text)",
          }}
          value={loaded ? countToday("fit") : "—"}
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
          value={loaded ? countToday("spare") : "—"}
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
          value={loaded ? countToday("pulang") : "—"}
          label={t.ftwStatPulang}
          detail={t.ftwPulangNote}
        />
      </div>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.ftwLog}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60 max-sm:w-full"
              placeholder={t.searchOp}
              aria-label={t.searchOp}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Select
              wrapperClassName="w-42.5 max-sm:w-full"
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
              wrapperClassName="w-37.5 max-sm:w-full"
              value={shift}
              onChange={(e) => {
                setShift(e.target.value);
                setPage(1);
              }}
              aria-label={t.allShift}
            >
              <option value="">{t.allShift}</option>
              {/* nilainya "pagi", bukan "siang": itu yang dipakai kolom
                  ftw_logs.shift dan alokasi armada di backend */}
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
                  const bad = r.strip.filter((s) => s === "bad").length;
                  const iso = r.rec.date.slice(0, 10);
                  return (
                    <TableRow key={`${r.rec.nik}-${iso}-${r.rec.shift}`}>
                      <TableCell className="font-semibold">
                        {r.rec.name || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-(--text-secondary) tabular-nums">
                        {r.rec.nik}
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
                      {/* istirahat tambahan sebelum boleh bekerja */}
                      <TableCell className="whitespace-nowrap">
                        {r.rec.restHours > 0 ? (
                          <span className="text-(--badge-warning-text)">
                            +{r.rec.restHours} {t.hourShort}
                          </span>
                        ) : (
                          <span className="text-(--text-tertiary) max-sm:text-center">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap">
                        {iso}
                      </TableCell>
                      <TableCell className="font-mono">
                        {r.rec.sendTime || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {r.strip.map((s, i) => (
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
                          href={`/fit-to-work/history?nik=${r.rec.nik}`}
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

        {/* ringkasan "0 log" selama memuat/gagal hanya membingungkan —
            kaki tabel ikut menunggu datanya */}
        {loaded && !loadErr ? (
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
        ) : null}
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
