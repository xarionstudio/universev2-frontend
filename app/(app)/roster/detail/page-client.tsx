"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { legendGroupsFor, rosterMeta, upPreviewData } from "@/lib/data/roster";
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
  const metas = rosterMeta(lang);
  const meta = metas.find((m) => m.key === key) ?? metas[0];

  const preview = React.useMemo(() => upPreviewData(), []);
  const [q, setQ] = React.useState("");
  const needle = q.trim().toLowerCase();
  const rows = preview.rows.filter(
    (r) =>
      !needle ||
      r.name.toLowerCase().includes(needle) ||
      r.nik.toLowerCase().includes(needle)
  );
  const pg = usePagination(rows);
  const legendGroups = legendGroupsFor(lang);

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle
        title={`${t.rdDetailTitle} — ${meta.label} · ${meta.dept}`}
        sub={t.rdDetailSub}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => router.push("/roster/data")}>
            <ArrowLeft />
            {t.upBack}
          </Button>
          <Button
            variant="secondary"
            onClick={() => pushToast("success", t.rdDlT, meta.file)}
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
              className="w-60 max-sm:w-full"
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
                {preview.days.map((d) => (
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
              {pg.rows.map((r) => (
                <TableRow key={r.nik}>
                  <TableCell className="font-mono whitespace-nowrap">
                    {r.nik}
                  </TableCell>
                  <TableCell className="font-semibold whitespace-nowrap">
                    {r.name}
                  </TableCell>
                  {r.codes.map((c, i) => (
                    <TableCell
                      key={i}
                      className="px-1.5 py-3 text-center font-mono text-xs"
                      style={{ color: c.color }}
                    >
                      {c.v}
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
