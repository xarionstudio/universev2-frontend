"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CircleAlert, Download } from "lucide-react";

import { errorDetail, rosterApi } from "@/lib/api";
import type {
  ApiRosterDetail,
  ApiRosterMeta,
} from "@/lib/api/endpoints/roster";
import { legendGroupsFor } from "@/lib/data/roster";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button, Spinner } from "@/components/ui/button";
import { Pagination, usePagination } from "@/components/ui/pagination";
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
import { StateBox } from "@/components/ui/state-box";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

import { downloadBlob } from "../../users/_lib/csv";

function colorOf(c: string) {
  const u = c.toUpperCase();
  if (u === "S" || u === "A") return "var(--color-danger-text)";
  if (u.startsWith("MCU") || u === "ISM" || u === "OBC" || u === "KRT")
    return "var(--badge-warning-text)";
  if (u === "D" || u === "N" || u === "R") return "var(--badge-success-text)";
  if (u === "OFF" || u === "CR" || u === "AL") return "var(--text-tertiary)";
  return "var(--text-secondary)";
}

/* Detail roster — matriks dari GET /api/rosters/:key/detail */
export default function RosterDetailPage() {
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const router = useRouter();

  const key = useSearchParams().get("p") ?? "";

  const [meta, setMeta] = React.useState<ApiRosterMeta | null>(null);
  const [detail, setDetail] = React.useState<ApiRosterDetail | null>(null);
  const [loadErr, setLoadErr] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    /* key kosong = kondisi TURUNAN dari URL, dinilai langsung saat render
       (`loadErr || !key`) — bukan setState sinkron di badan effect
       (dilarang react-hooks/set-state-in-effect; memblokir pre-commit). */
    if (!key) return;
    const ac = new AbortController();
    void Promise.all([
      rosterApi.listRosters({ perPage: 200 }, ac.signal),
      rosterApi.getRosterDetail(key, ac.signal),
    ])
      .then(([list, det]) => {
        const m =
          (list.items ?? []).find((x) => String(x.key) === String(key)) ?? null;
        setMeta(m);
        /* Urutkan hari ascending */
        const days = [...(det.days ?? [])].sort();
        const rows = (det.rows ?? []).map((r) => {
          const byDate = new Map(r.codes.map((c) => [c.date, c.code]));
          return {
            ...r,
            codes: days.map((d) => ({
              date: d,
              code: byDate.get(d) ?? "—",
            })),
          };
        });
        setDetail({ ...det, days, rows });
        setLoadErr(false);
      })
      .catch(() => {
        if (!ac.signal.aborted) setLoadErr(true);
      });
    return () => ac.abort();
  }, [key, reloadKey]);

  const [q, setQ] = React.useState("");
  const needle = q.trim().toLowerCase();
  const rows = (detail?.rows ?? []).filter(
    (r) =>
      !needle ||
      r.name.toLowerCase().includes(needle) ||
      r.nik.toLowerCase().includes(needle)
  );
  const pg = usePagination(rows);
  const legendGroups = legendGroupsFor(lang);

  async function doExport() {
    if (!key) return;
    try {
      const blob = await rosterApi.exportRoster(key);
      downloadBlob(meta?.file || `roster-${key}.xlsx`, blob);
      pushToast("success", t.rdDlT, meta?.file ?? key);
    } catch (err) {
      pushToast("error", t.apErrT, errorDetail(err, t.apErrT));
    }
  }

  const title = meta
    ? `${t.rdDetailTitle} — ${meta.label} · ${meta.dept}`
    : t.rdDetailTitle;

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={title} sub={t.rdDetailSub}>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => router.push("/roster/data")}>
            <ArrowLeft />
            {t.upBack}
          </Button>
          <Button variant="secondary" onClick={() => void doExport()}>
            <Download />
            {t.rdDl}
          </Button>
        </div>
      </PageTitle>

      {loadErr || !key ? (
        <StateBox
          icon={<CircleAlert className="text-danger-text" />}
          title={t.apLoadErrT}
          body={t.apErrT}
        >
          <Button onClick={() => setReloadKey((k) => k + 1)}>
            {t.apRetry}
          </Button>
        </StateBox>
      ) : !detail ? (
        <div className="grid place-items-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : (
        <Panel>
          <Toolbar className="mb-4">
            <ToolbarTitle>{meta?.file ?? `Roster #${key}`}</ToolbarTitle>
            <ToolbarGroup>
              <SearchInput
                className="w-60 max-sm:w-full"
                placeholder={t.searchEmp}
                aria-label={t.searchEmp}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {meta ? (
                <span className="text-xs text-(--text-tertiary)">
                  {meta.emp} {t.thEmpN.toLowerCase()} · {meta.rows}{" "}
                  {t.thRows.toLowerCase()} · {meta.by} · {meta.dateISO}
                </span>
              ) : null}
              {meta ? (
                <Badge
                  variant={meta.status === "aktif" ? "success" : "neutral"}
                  dot
                >
                  {meta.status === "aktif" ? t.stAktif : t.stArsip}
                </Badge>
              ) : null}
            </ToolbarGroup>
          </Toolbar>
          <div className="overflow-x-auto pb-2">
            <Table className="min-w-400">
              <TableHeader>
                <tr>
                  <TableHead className="w-27.5">NIK</TableHead>
                  <TableHead className="w-47.5">{t.thNama}</TableHead>
                  {detail.days.map((d) => (
                    <TableHead
                      key={d}
                      className="px-1.5 py-3 text-center font-mono"
                    >
                      {d.slice(8) || d}
                    </TableHead>
                  ))}
                </tr>
              </TableHeader>
              <TableBody>
                {pg.rows.map((r) => (
                  <TableRow key={r.nik}>
                    <TableCell className="font-mono whitespace-nowrap">
                      {r.nik}
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      {r.name}
                    </TableCell>
                    {r.codes.map((c) => (
                      <TableCell
                        key={c.date}
                        className="px-1.5 py-3 text-center font-mono text-xs"
                        style={{ color: colorOf(c.code) }}
                      >
                        {c.code}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PanelFoot>
            <FootSum>
              {t.rdSumA} <b>{pg.range}</b> {t.rdDetailFootB}
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
      )}

      <Panel>
        <Toolbar className="mb-4">
          <ToolbarTitle>{t.legendTitle}</ToolbarTitle>
          <span className="text-xs text-(--text-tertiary)">{t.legendNote}</span>
        </Toolbar>
        {legendGroups.map((g, gi) => (
          <div key={g.label}>
            <div
              className={`mb-2 text-xs font-semibold tracking-[.05em] text-(--text-tertiary) uppercase ${gi === 0 ? "" : "mt-4"}`}
            >
              {g.label}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
              {g.codes.map((c) => (
                <div
                  key={c.k}
                  className="flex items-center gap-2 rounded-lg border border-(--divider) bg-(--fill-subtle) px-2 py-1.5 text-xs text-(--text-secondary)"
                >
                  <b className="min-w-9.5 flex-none rounded-md border border-[rgba(0,212,255,.3)] bg-[rgba(0,212,255,.12)] px-1 py-0.75 text-center font-mono text-[11px] font-bold text-primary-bright">
                    {c.k}
                  </b>
                  {c.v}
                </div>
              ))}
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
