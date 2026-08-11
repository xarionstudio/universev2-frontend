"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { rosterApi } from "@/lib/api/roster";
import type { ShiftCodeGroup } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

/* Detail roster — matriks lengkap seperti preview upload, tapi hanya-baca */
export default function RosterDetailPage() {
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const router = useRouter();

  const key = useSearchParams().get("p");

  const [apiDetail, setApiDetail] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [legendGroups, setLegendGroups] = React.useState<ShiftCodeGroup[]>([]);

  React.useEffect(() => {
    if (key) {
      const numKey = Number(key);
      if (!isNaN(numKey)) {
        rosterApi
          .getRosterDetail(numKey)
          .then((res) => {
            if (res) setApiDetail(res);
          })
          .catch(() => {});
      }
    }
    rosterApi
      .getShiftCodes()
      .then((data) => {
        if (data && Array.isArray(data)) {
          setLegendGroups(data);
        }
      })
      .catch(() => {});
  }, [key]);

  const preview = apiDetail as {
    meta?: Record<string, unknown>;
    rows?: Record<string, unknown>[];
    days?: string[];
  } | null;
  const meta = {
    label: String(preview?.meta?.label || "Roster"),
    dept: String(preview?.meta?.dept || ""),
    file: String(preview?.meta?.file || "roster.xlsx"),
    emp: String(preview?.meta?.emp || "—"),
    rows: String(preview?.meta?.rows || "—"),
    by: String(preview?.meta?.by || "—"),
    date: String(preview?.meta?.date || "—"),
    status: String(preview?.meta?.status || "aktif") as "aktif" | "arsip",
  };
  const [q, setQ] = React.useState("");
  const needle = q.trim().toLowerCase();
  const rows = (preview?.rows || []).filter(
    (r) =>
      !needle ||
      String(r.name || "")
        .toLowerCase()
        .includes(needle) ||
      String(r.nik || "")
        .toLowerCase()
        .includes(needle)
  );
  const pg = usePagination(rows);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={`${t.rdDetailTitle} — ${meta.label} · ${meta.dept}`}
        sub={t.rdDetailSub}
      >
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push("/roster/data")}>
            <ArrowLeft />
            {t.upBack}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                if (key) {
                  await rosterApi.exportRoster(key);
                  pushToast("success", t.rdDlT, meta.file);
                }
              } catch {
                pushToast("error", t.rdDlT, meta.file);
              }
            }}
          >
            <Download />
            {t.rdDl}
          </Button>
        </div>
      </PageTitle>

      <Panel>
        <Toolbar className="mb-4">
          <ToolbarTitle>{meta.file}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60"
              placeholder={t.searchEmp}
              aria-label={t.searchEmp}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <span className="text-xs text-(--text-tertiary)">
              {meta.emp} {t.thEmpN.toLowerCase()} · {meta.rows}{" "}
              {t.thRows.toLowerCase()} · {meta.by} · {meta.date}
            </span>
            <Badge
              variant={meta.status === "aktif" ? "success" : "neutral"}
              dot
            >
              {meta.status === "aktif" ? t.stAktif : t.stArsip}
            </Badge>
          </ToolbarGroup>
        </Toolbar>
        <div className="overflow-x-auto pb-2">
          <Table className="min-w-400">
            <TableHeader>
              <tr>
                <TableHead className="w-27.5">NIK</TableHead>
                <TableHead className="w-47.5">{t.thNama}</TableHead>
                {(preview?.days || []).map((d) => (
                  <TableHead
                    key={d}
                    className="px-1.5 py-3 text-center font-mono"
                  >
                    {d}
                  </TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {(pg.rows as Record<string, unknown>[]).map((r) => (
                <TableRow key={String(r.nik)}>
                  <TableCell className="font-mono whitespace-nowrap">
                    {String(r.nik)}
                  </TableCell>
                  <TableCell className="font-semibold whitespace-nowrap">
                    {String(r.name)}
                  </TableCell>
                  {((r.codes as { color?: string; v?: string }[]) || []).map(
                    (c, i) => (
                      <TableCell
                        key={i}
                        className="px-1.5 py-3 text-center font-mono text-xs"
                        style={{ color: c.color }}
                      >
                        {c.v}
                      </TableCell>
                    )
                  )}
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

      <Panel>
        <Toolbar className="mb-4">
          <ToolbarTitle>{t.legendTitle}</ToolbarTitle>
          <span className="text-xs text-(--text-tertiary)">{t.legendNote}</span>
        </Toolbar>
        {legendGroups.map((g, gi) => (
          <div key={g.group}>
            <div
              className={`mb-2 text-xs font-semibold tracking-[.05em] text-(--text-tertiary) uppercase ${gi === 0 ? "" : "mt-4"}`}
            >
              {lang === "en" ? g.groupEn : g.group}
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
                  {lang === "en" ? c.vEn : c.v}
                </div>
              ))}
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
