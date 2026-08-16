"use client";

import * as React from "react";
import Link from "next/link";
import { Award, Flame, Moon, Search, Target, Trophy } from "lucide-react";

import { prestasiApi } from "@/lib/api/prestasi";
import type { PrestasiRecord } from "@/lib/api/types";
import {
  fmtSleep,
  PERIOD_DAYS,
  usePrestasiPoints,
  type PrestasiBadgeKey,
  type PrestasiPeriod,
} from "@/lib/data/prestasi";
import { useI18n } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/id";
import { Avatar, initialsOf } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
  DNote,
  FootSum,
  PageTitle,
  Panel,
  PanelFoot,
  SectionTitle,
  Toolbar,
  ToolbarGroup,
  ToolbarTitle,
} from "@/components/ui/panel";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented, SegmentedButton } from "@/components/ui/segmented";
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

import { Podium } from "./_components/podium";

const BADGE_LABEL: Record<PrestasiBadgeKey, keyof Dict> = {
  streak7: "prBadgeStreak7",
  streak14: "prBadgeStreak14",
  perfectSleep: "prBadgePerfectSleep",
  neverLate: "prBadgeNeverLate",
  noPenalty: "prBadgeNoPenalty",
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function PrestasiPage() {
  const { t, lang } = useI18n();

  /* Poin aturan dinamis dari backend (business_rules) — kartu aturan di bawah
     memakai nilai yang sama dengan mesin poin Prestasi sesungguhnya. */
  const { ptsBase, ptsOntime, ptsSleep, ptsStreakStep, ptsCover, ptsPenalty } =
    usePrestasiPoints();

  const [period, setPeriod] = React.useState<PrestasiPeriod>("month");
  const [q, setQ] = React.useState("");

  /* Definisi "operator" disamakan dengan modul Fleet Allocation: karyawan
     aktif yang punya kompetensi unit. Kalau dibedakan, dua modul akan
     menampilkan daftar orang yang berbeda untuk hal yang sama. */
  const [apiBoard, setApiBoard] = React.useState<PrestasiRecord[] | null>(null);

  /* Ambil leaderboard dari backend API — bila gagal/kosong, tampilkan state kosong. */
  React.useEffect(() => {
    let cancelled = false;
    const days = PERIOD_DAYS[period];
    prestasiApi
      .getLeaderboard({ days })
      .then((records) => {
        if (!cancelled && records && records.length > 0) {
          setApiBoard(records);
        } else if (!cancelled) {
          setApiBoard(null);
        }
      })
      .catch(() => {
        if (!cancelled) setApiBoard(null);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const board = React.useMemo(() => {
    if (apiBoard && apiBoard.length > 0) {
      /* Adaptasi data API ke bentuk yang dipakai tabel (PrestasiEntry-like) */
      return apiBoard.map((r) => ({
        rank: r.rank,
        nik: r.nik,
        name: r.name,
        dept: r.dept,
        pos: r.pos,
        foto: r.foto,
        points: r.points,
        qualifiedDays: r.qualifiedDays,
        scheduledDays: r.scheduledDays,
        penaltyDays: r.penaltyDays,
        coverDays: r.coverDays,
        bestStreak: r.bestStreak,
        currentStreak: r.currentStreak,
        attRate: r.attRate,
        sleepRate: r.sleepRate,
        avgSleepMin: r.avgSleepMin,
        badges: (r.badges || []) as PrestasiBadgeKey[],
        days: (r.days ||
          []) as unknown as import("@/lib/data/prestasi").PrestasiDay[],
      }));
    }
    return [];
  }, [apiBoard]);

  const top3 = board.slice(0, 3);

  const rows = board.filter((e) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      e.name.toLowerCase().includes(needle) ||
      e.dept.toLowerCase().includes(needle) ||
      e.pos.toLowerCase().includes(needle) ||
      e.nik.includes(needle)
    );
  });
  const pg = usePagination(rows);

  const totalPoints = board.reduce((s, e) => s + e.points, 0);
  const totalQualified = board.reduce((s, e) => s + e.qualifiedDays, 0);
  const avgCompliance = board.length
    ? board.reduce((s, e) => s + (e.attRate + e.sleepRate) / 2, 0) /
      board.length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.navPrestasi} sub={t.prSub}>
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

      {/* ringkasan periode */}
      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2">
        <StatCard
          icon={<Trophy />}
          iconStyle={{
            background: "rgba(0,212,255,.14)",
            borderColor: "rgba(0,212,255,.4)",
            color: "var(--color-primary-bright)",
          }}
          value={String(totalPoints)}
          label={t.prStatTotal}
          detail={
            <>
              {PERIOD_DAYS[period]} {t.prDays}
            </>
          }
        />
        <StatCard
          icon={<Target />}
          iconStyle={{
            background: "var(--badge-success-fill)",
            borderColor: "var(--badge-success-border)",
            color: "var(--badge-success-text)",
          }}
          value={String(totalQualified)}
          label={t.prStatQualified}
        />
        <StatCard
          icon={<Award />}
          iconStyle={{
            background: "var(--badge-warning-fill)",
            borderColor: "var(--badge-warning-border)",
            color: "var(--badge-warning-text)",
          }}
          value={pct(avgCompliance)}
          label={t.prStatCompliance}
        />
        <StatCard
          icon={<Flame />}
          iconStyle={{
            background: "var(--badge-info-fill)",
            borderColor: "var(--badge-info-border)",
            color: "var(--color-primary-bright)",
          }}
          value={String(board[0]?.points ?? 0)}
          label={t.prStatTop}
          detail={board[0] ? <b>{board[0].name}</b> : undefined}
        />
      </div>

      {/* podium tiga besar */}
      {top3.length ? (
        <div className="flex flex-col gap-4">
          <SectionTitle>{t.prPodiumT}</SectionTitle>
          <Podium top={top3} />
        </div>
      ) : null}

      {/* klasemen lengkap */}
      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.prBoardT}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60"
              placeholder={t.prSearchPh}
              aria-label={t.prSearchPh}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </ToolbarGroup>
        </Toolbar>

        {pg.rows.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-14">#</TableHead>
                <TableHead>{t.prOperator}</TableHead>
                <TableHead className="max-xl:hidden">{t.thDept}</TableHead>
                <TableHead>{t.prPoints}</TableHead>
                <TableHead className="max-lg:hidden">{t.prQualified}</TableHead>
                <TableHead className="max-lg:hidden">
                  {t.prPenaltyDays}
                </TableHead>
                <TableHead className="max-lg:hidden">{t.prStreak}</TableHead>
                <TableHead className="max-xl:hidden">{t.prAttRate}</TableHead>
                <TableHead className="max-xl:hidden">{t.prAvgSleep}</TableHead>
                <TableHead className="max-2xl:hidden">{t.prBadgesT}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pg.rows.map((e) => (
                <TableRow key={e.nik}>
                  <TableCell className="font-mono font-bold tabular-nums">
                    {e.rank <= 3 ? (
                      <span className="text-primary-bright">{e.rank}</span>
                    ) : (
                      <span className="text-(--text-tertiary)">{e.rank}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={e.foto}
                        alt={e.name}
                        className="size-8 flex-none text-[11px]"
                      >
                        {initialsOf(e.name)}
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        {/* nama membuka jejak audit poin operator ini */}
                        <Link
                          href={`/prestasi/${e.nik}`}
                          className="truncate font-semibold text-inherit hover:text-primary-bright"
                        >
                          {e.name}
                        </Link>
                        <span className="truncate text-xs text-(--text-tertiary)">
                          {e.pos}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-(--text-secondary) max-xl:hidden">
                    {e.dept}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-primary-bright tabular-nums">
                    {e.points}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums max-lg:hidden">
                    {e.qualifiedDays}
                    <span className="text-(--text-tertiary)">
                      /{e.scheduledDays}
                    </span>
                  </TableCell>
                  {/* potongan ikut terlihat di klasemen, bukan hanya di riwayat */}
                  <TableCell className="font-mono tabular-nums max-lg:hidden">
                    {e.penaltyDays > 0 ? (
                      <span className="text-danger-text">−{e.penaltyDays}</span>
                    ) : (
                      <span className="text-(--text-tertiary)">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-lg:hidden">
                    {e.bestStreak > 1 ? (
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Flame className="size-3.5 text-(--badge-warning-text)" />
                        {e.bestStreak}
                      </span>
                    ) : (
                      <span className="text-(--text-tertiary)">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums max-xl:hidden">
                    {pct(e.attRate)}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums max-xl:hidden">
                    <span className="inline-flex items-center gap-1">
                      <Moon className="size-3.5 text-(--text-tertiary)" />
                      {fmtSleep(e.avgSleepMin, lang === "en")}
                    </span>
                  </TableCell>
                  <TableCell className="max-2xl:hidden">
                    <div className="flex flex-wrap gap-1.5">
                      {e.badges.map((b) => (
                        <Badge key={b} variant="neutral">
                          {t[BADGE_LABEL[b]]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <StateBox
            icon={<Search className="text-primary-bright" />}
            title={t.noResTitle}
            body={t.prNoData}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{pg.range}</b> {t.attSumB} <b>{pg.total}</b>{" "}
            {t.prOperator}
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

      {/* aturan poin + catatan kejujuran data.
          Kartu aturan tidak memakai <DNote> karena isinya <ul> — DNote
          membungkus children dalam <p>, dan <ul> di dalam <p> itu HTML tidak
          valid sehingga memicu hydration error. Gayanya disamakan manual. */}
      <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
        <div className="rounded-card border border-(--divider) bg-(--fill-subtle) p-4">
          <b className="mb-1 block text-[13px] font-semibold">{t.prHowT}</b>
          <p className="mb-3 text-xs leading-relaxed text-(--text-secondary)">
            {t.prHowB}
          </p>
          <ul className="flex flex-col gap-1.5 text-xs text-(--text-secondary)">
            {(
              [
                [t.prRuleBase, `+${ptsBase}`],
                [t.prRuleOntime, `+${ptsOntime}`],
                [t.prRuleSleep, `+${ptsSleep}`],
                [t.prRuleStreak, `+${ptsStreakStep}`],
                [t.prRuleSpare, `+${ptsBase}`],
                [t.prRuleCover, `+${ptsCover}`],
                [t.prRulePenalty, String(ptsPenalty)],
                [t.prRuleNotScheduled, "0"],
              ] as [string, string][]
            ).map(([label, pts]) => (
              <li
                key={label}
                className="flex items-center justify-between gap-3"
              >
                <span>{label}</span>
                <b className="flex-none font-mono text-primary-bright">{pts}</b>
              </li>
            ))}
          </ul>
        </div>
        <DNote title={t.prDataNoteT}>{t.prDataNoteB}</DNote>
      </div>
    </div>
  );
}
