"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Flame,
  Minus,
  Moon,
  TrendingDown,
  Trophy,
} from "lucide-react";

import type { FtwStatus } from "@/lib/data/ftw";
import {
  buildLeaderboard,
  fmtSleep,
  isOperatingCode,
  PERIOD_DAYS,
  type AttMark,
  type DayOutcome,
  type PrestasiDay,
  type PrestasiPeriod,
} from "@/lib/data/prestasi";
import { useI18n } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/id";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { Avatar, initialsOf } from "@/components/ui/avatar";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
  DNote,
  FootSum,
  PageTitle,
  Panel,
  PanelFoot,
  Toolbar,
  ToolbarGroup,
  ToolbarTitle,
} from "@/components/ui/panel";
import { Segmented, SegmentedButton } from "@/components/ui/segmented";
import { StateBox } from "@/components/ui/state-box";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* Label + warna per hasil harian. Netral dipakai untuk hari yang memang tidak
   dijadwalkan supaya tidak terbaca seperti pelanggaran. */
const OUTCOME: Record<
  DayOutcome,
  { key: keyof Dict; note: keyof Dict; variant: BadgeVariant }
> = {
  notScheduled: {
    key: "prOutNotScheduled",
    note: "prNoteNotScheduled",
    variant: "neutral",
  },
  qualified: {
    key: "prOutQualified",
    note: "prNoteQualified",
    variant: "success",
  },
  replacedAbsent: {
    key: "prOutReplacedAbsent",
    note: "prNoteReplacedAbsent",
    variant: "danger",
  },
  replacedSleep: {
    key: "prOutReplacedSleep",
    note: "prNoteReplacedSleep",
    variant: "danger",
  },
  replacement: {
    key: "prOutReplacement",
    note: "prNoteReplacement",
    variant: "info",
  },
};

/* Hasil aturan Fit To Work — label disamakan dengan modul FTW. Warna fit di
   sini SENGAJA hijau (bukan info seperti halaman FTW): riwayat prestasi
   memakai evaluasi band tidur murni sehingga "spare" turunan tidak pernah
   muncul, dan fit adalah status terbaik yang tampil. */
const FTW: Record<FtwStatus, { key: keyof Dict; variant: BadgeVariant }> = {
  fit: { key: "bFit", variant: "success" },
  spare: { key: "ftwStatSpare", variant: "success" },
  istirahat: { key: "ftwStatIstirahat", variant: "warning" },
  pulang: { key: "ftwStatPulang", variant: "danger" },
  belum: { key: "ftwStatBelum", variant: "neutral" },
};

/* Status absen. "off" sengaja netral — di hari yang tidak dijadwalkan,
   tidak tap absen bukan pelanggaran. */
const ATT: Record<AttMark, { key: keyof Dict; variant: BadgeVariant }> = {
  hadir: { key: "prAttHadir", variant: "success" },
  terlambat: { key: "prAttTerlambat", variant: "warning" },
  belum: { key: "prAttBelum", variant: "danger" },
  off: { key: "prAttOff", variant: "neutral" },
};

export default function PrestasiHistoryPage() {
  const { t, lang } = useI18n();
  const params = useParams();
  const nik = String(params?.nik ?? "");
  const { empAll, faAlloc } = useAppStore();
  const [period, setPeriod] = React.useState<PrestasiPeriod>("month");

  const board = React.useMemo(() => {
    const operators = empAll().filter(
      (e) => e.status === "aktif" && e.komp && e.komp.length
    );
    return buildLeaderboard({ operators, alloc: faAlloc, period });
  }, [empAll, faAlloc, period]);

  const me = board.find((e) => e.nik === nik);

  /* Terbaru di atas — jejak audit dibaca mundur dari hari ini */
  const days = React.useMemo(() => (me ? [...me.days].reverse() : []), [me]);
  const pg = usePagination(days);

  /* Ringkasan: poin didapat vs dipotong, dipisah supaya jelas.
     Bonus konsistensi dihitung terpisah oleh mesin, jadi diturunkan dari
     selisih total dengan jumlah poin harian. */
  const earned = days.reduce((s, d) => s + (d.points > 0 ? d.points : 0), 0);
  const lost = days.reduce((s, d) => s + (d.points < 0 ? d.points : 0), 0);
  const streakBonus = (me?.points ?? 0) - (earned + lost);

  if (!me) {
    return (
      <div className="flex flex-col gap-6 max-sm:gap-4">
        <PageTitle title={t.prHistT} sub={t.prHistSub} />
        <StateBox
          icon={<Trophy className="text-primary-bright" />}
          title={t.prOpNotFound}
          body={t.prHistEmpty}
        >
          <Link
            href="/prestasi"
            className="mx-auto inline-flex h-10 items-center gap-2 rounded-control border border-(--border-btn-secondary) px-4 text-sm font-bold text-(--text-primary) no-underline hover:bg-(--fill-hover) hover:no-underline"
          >
            <ArrowLeft className="size-4" />
            {t.prBack}
          </Link>
        </StateBox>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.prHistT} sub={t.prHistSub}>
        <Segmented aria-label={t.prRank}>
          {(
            [
              ["week", t.prPeriodWeek],
              ["month", t.prPeriodMonth],
              ["all", t.prPeriodAll],
            ] as [PrestasiPeriod, string][]
          ).map(([v, label]) => (
            <SegmentedButton
              key={v}
              active={period === v}
              onClick={() => setPeriod(v)}
            >
              {label}
            </SegmentedButton>
          ))}
        </Segmented>
      </PageTitle>

      {/* kartu identitas + ringkasan poin */}
      <Panel className="flex items-center gap-5 p-5 max-lg:flex-col max-lg:items-start">
        <Avatar
          src={me.foto}
          alt={me.name}
          className="size-16 flex-none text-lg"
        >
          {initialsOf(me.name)}
        </Avatar>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-xl font-bold">{me.name}</b>
            <Badge variant="info">#{me.rank}</Badge>
          </div>
          <span className="text-sm text-(--text-secondary)">
            {me.pos} · {me.dept} · <span className="font-mono">{me.nik}</span>
          </span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {me.badges.map((b) => (
              <Badge key={b} variant="neutral">
                {t[`prBadge${b[0].toUpperCase()}${b.slice(1)}` as keyof Dict]}
              </Badge>
            ))}
          </div>
        </div>

        {/* rincian: didapat − dipotong + bonus = akhir */}
        <div className="ml-auto grid grid-cols-4 gap-5 text-right max-lg:ml-0 max-lg:w-full max-lg:grid-cols-2 max-lg:text-left">
          <Sum label={t.prSumEarned} value={`+${earned}`} tone="ok" />
          <Sum label={t.prSumLost} value={String(lost)} tone="bad" />
          <Sum label={t.prSumStreak} value={`+${streakBonus}`} tone="ok" />
          <Sum label={t.prSumNet} value={String(me.points)} tone="net" />
        </div>
      </Panel>

      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:gap-3">
        <Mini label={t.prScheduled} value={me.scheduledDays} />
        <Mini label={t.prQualified} value={me.qualifiedDays} />
        <Mini label={t.prPenaltyDays} value={me.penaltyDays} tone="bad" />
        <Mini label={t.prCoverDays} value={me.coverDays} />
      </div>

      {/* jejak audit harian */}
      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.prHistT}</ToolbarTitle>
          <ToolbarGroup>
            <Link
              href="/prestasi"
              className="inline-flex h-9 items-center gap-2 rounded-control border border-(--border-btn-secondary) px-3 text-xs font-bold text-(--text-primary) no-underline hover:bg-(--fill-hover) hover:no-underline"
            >
              <ArrowLeft className="size-3.5" />
              {t.prBack}
            </Link>
          </ToolbarGroup>
        </Toolbar>

        {pg.rows.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>{t.prThDate}</TableHead>
                <TableHead>{t.prThUnit}</TableHead>
                <TableHead>{t.prThCode}</TableHead>
                <TableHead>{t.prThAtt}</TableHead>
                <TableHead>{t.prThSleep}</TableHead>
                <TableHead>{t.prThFtw}</TableHead>
                <TableHead>{t.prThClockIn}</TableHead>
                <TableHead>{t.prThOutcome}</TableHead>
                <TableHead className="text-right">{t.prThDelta}</TableHead>
                <TableHead className="max-xl:hidden">{t.prThNote}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pg.rows.map((d) => (
                <HistoryRow key={d.iso} d={d} en={lang === "en"} />
              ))}
            </TableBody>
          </Table>
        ) : (
          <StateBox
            icon={<Trophy className="text-primary-bright" />}
            title={t.prHistEmpty}
            body={t.prNoData}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{pg.range}</b> {t.attSumB} <b>{pg.total}</b>{" "}
            {t.prDays} · {PERIOD_DAYS[period]} {t.prDays}
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

      <DNote title={t.prDataNoteT}>{t.prDataNoteB}</DNote>
    </div>
  );
}

/* ---- potongan kecil ---- */

function Sum({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "bad" | "net";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-(--text-tertiary)">{label}</span>
      <b
        className={cn(
          "font-mono text-lg font-bold tabular-nums",
          tone === "ok" && "text-(--badge-success-text)",
          tone === "bad" && "text-danger-text",
          tone === "net" && "text-primary-bright"
        )}
      >
        {value}
      </b>
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "bad";
}) {
  return (
    <div className="rounded-card border border-(--divider) bg-(--fill-subtle) px-4 py-3">
      <b
        className={cn(
          "block font-mono text-2xl font-bold tabular-nums",
          tone === "bad" && value > 0
            ? "text-danger-text"
            : "text-(--text-primary)"
        )}
      >
        {value}
      </b>
      <span className="text-xs text-(--text-tertiary)">{label}</span>
    </div>
  );
}

function HistoryRow({ d, en }: { d: PrestasiDay; en: boolean }) {
  const { t } = useI18n();
  const o = OUTCOME[d.outcome];
  const scheduled = isOperatingCode(d.code);

  /* Keterangan menyebut lawan mainnya, sehingga penggantian bisa ditelusuri
     dari kedua sisi. Bila tidak ada pengganti yang layak, kalimatnya diganti —
     kalau tidak, teksnya akan berhenti menggantung di kata "ke". */
  const replaced =
    d.outcome === "replacedAbsent" || d.outcome === "replacedSleep";
  const note = d.counterpartName
    ? `${t[o.note]} ${d.counterpartName}.`
    : replaced
      ? t.prNoteNoCover
      : t[o.note];

  return (
    <TableRow
      className={d.outcome === "notScheduled" ? "opacity-60" : undefined}
    >
      <TableCell className="font-mono whitespace-nowrap tabular-nums">
        {d.iso}
      </TableCell>
      {/* unit yang dipegang hari itu — pada penggantian, kode unitnya sama
          dengan milik operator yang digantikan sehingga serah terimanya jelas */}
      <TableCell className="font-mono whitespace-nowrap">
        {d.unitCode ? (
          <b className="font-semibold">{d.unitCode}</b>
        ) : (
          <span className="text-(--text-tertiary)">{t.prNoUnit}</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={scheduled ? "info" : "neutral"}>{d.code}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={ATT[d.att].variant}>{t[ATT[d.att].key]}</Badge>
      </TableCell>
      <TableCell className="font-mono whitespace-nowrap tabular-nums">
        {d.sleepMin ? (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              // hanya ditandai merah bila hari itu memang dijadwalkan —
              // di hari libur, tidur kurang bukan pelanggaran
              scheduled && !d.sleepOk && "text-danger-text"
            )}
          >
            <Moon className="size-3.5 opacity-70" />
            {fmtSleep(d.sleepMin, en)}
          </span>
        ) : (
          <span className="text-(--text-tertiary)">{t.prNoLog}</span>
        )}
      </TableCell>
      {/* hasil aturan Fit To Work atas jam tidur hari itu — inilah yang
          menentukan boleh/tidaknya mengoperasikan unit */}
      <TableCell className="whitespace-nowrap">
        <Badge variant={FTW[d.ftwStatus].variant}>
          {t[FTW[d.ftwStatus].key]}
          {d.restHours > 0 ? ` +${d.restHours}${t.hourShort}` : ""}
        </Badge>
      </TableCell>
      <TableCell className="font-mono tabular-nums">
        {d.clockIn ? (
          <span className={d.late ? "text-(--badge-warning-text)" : undefined}>
            {d.clockIn}
          </span>
        ) : (
          <span className="text-(--text-tertiary)">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={o.variant}>
          {d.outcome === "replacement" ? <Flame className="size-3" /> : null}
          {t[o.key]}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {d.points === 0 ? (
          <span className="inline-flex items-center gap-1 font-mono text-(--text-tertiary)">
            <Minus className="size-3.5" />0
          </span>
        ) : d.points > 0 ? (
          <b className="font-mono font-bold text-(--badge-success-text) tabular-nums">
            +{d.points}
          </b>
        ) : (
          <b className="inline-flex items-center gap-1 font-mono font-bold text-danger-text tabular-nums">
            <TrendingDown className="size-3.5" />
            {d.points}
          </b>
        )}
      </TableCell>
      <TableCell className="text-xs text-(--text-secondary) max-xl:hidden">
        {note}
      </TableCell>
    </TableRow>
  );
}
