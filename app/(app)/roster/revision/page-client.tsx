"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, Search } from "lucide-react";

import type { ApRow } from "@/lib/data/roster";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/components/providers/app-store";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogIcon,
  DialogTitle,
} from "@/components/ui/dialog";
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

type Group = { sid: string; rows: ApRow[] };

const stBadge: Record<ApRow["status"], BadgeVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export default function RosterRevisionPage() {
  const { t, lang } = useI18n();
  const { apRows } = useAppStore();
  const router = useRouter();
  const en = lang === "en";

  const [st, setSt] = React.useState("");
  const [q, setQ] = React.useState("");
  const [detailSid, setDetailSid] = React.useState<string | null>(null);

  const stLabel = (s: ApRow["status"]) =>
    s === "pending"
      ? t.stPending
      : s === "approved"
        ? t.stApproved
        : t.stRejected;

  /* kelompokkan per sid — urutan sesuai kemunculan pertama */
  const groups = React.useMemo(() => {
    const map = new Map<string, Group>();
    for (const r of apRows) {
      const g = map.get(r.sid);
      if (g) g.rows.push(r);
      else map.set(r.sid, { sid: r.sid, rows: [r] });
    }
    return Array.from(map.values());
  }, [apRows]);

  const shown = groups.filter((g) => {
    if (st && !g.rows.some((r) => r.status === st)) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return g.rows.some((r) => r.name.toLowerCase().includes(needle));
  });
  const pg = usePagination(shown);

  const pendingN = apRows.filter((r) => r.status === "pending").length;
  const detail = detailSid
    ? groups.find((g) => g.sid === detailSid)
    : undefined;

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.navR2} sub={t.revListSub}>
        <Button onClick={() => router.push("/roster/revision/new")}>
          <Plus />
          {t.revNewBtn}
        </Button>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.rvListTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60 max-sm:w-full"
              placeholder={t.searchEmp}
              aria-label={t.searchEmp}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              aria-label={t.allStatus}
              wrapperClassName="w-42.5 max-sm:w-full"
              value={st}
              onChange={(e) => setSt(e.target.value)}
            >
              <option value="">{t.allStatus}</option>
              <option value="pending">{t.stPending}</option>
              <option value="approved">{t.stApproved}</option>
              <option value="rejected">{t.stRejected}</option>
            </Select>
          </ToolbarGroup>
        </Toolbar>

        {shown.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-42.5">{t.thSubmission}</TableHead>
                <TableHead>{t.thEmp}</TableHead>
                <TableHead className="w-37.5 max-xl:hidden">
                  {t.thWhen}
                </TableHead>
                <TableHead className="w-45">{t.thStatus}</TableHead>
                <TableHead className="w-22.5">{t.thAct}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pg.rows.map((g) => {
                const statuses = Array.from(
                  new Set(g.rows.map((r) => r.status))
                );
                return (
                  <TableRow key={g.sid}>
                    <TableCell>
                      <NameCell
                        name={<span className="font-mono">{g.sid}</span>}
                        sub={`${g.rows.length} ${t.revCount}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-85">
                      {g.rows.map((r) => r.name).join(", ")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-(--text-secondary) max-xl:hidden">
                      {en ? g.rows[0].whenEn : g.rows[0].whenId}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {statuses.map((s) => (
                          <Badge key={s} variant={stBadge[s]} dot>
                            {stLabel(s)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDetailSid(g.sid)}
                      >
                        {t.rvDetail}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <StateBox
            icon={<Search className="text-primary-bright" />}
            title={t.noResTitle}
            body={t.apEmptyB}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{pg.range}</b> {t.attSumB} <b>{pg.total}</b>{" "}
            {t.rvSumB} · <b>{pendingN}</b> {t.apSumC}
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

      <Dialog
        open={!!detail}
        onClose={() => setDetailSid(null)}
        className="w-[min(620px,100%)]"
        labelledBy="rvd-t"
      >
        {detail ? (
          <>
            <DialogIcon variant="info">
              <CalendarDays />
            </DialogIcon>
            <DialogTitle id="rvd-t" className="font-mono">
              {detail.sid}
            </DialogTitle>
            <DialogBody>
              {detail.rows.length} {t.revCount} · {t.thWhen.toLowerCase()}{" "}
              {en ? detail.rows[0].whenEn : detail.rows[0].whenId}
            </DialogBody>
            <div className="mt-3 max-h-[50vh] overflow-y-auto">
              {detail.rows.map((r, i) => (
                <div key={i} className="border-b border-(--divider) py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-sm">{r.name}</b>
                    <span className="font-mono text-xs text-(--text-tertiary)">
                      {r.nik}
                    </span>
                    <Badge variant={stBadge[r.status]} dot className="ml-auto">
                      {stLabel(r.status)}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-(--text-secondary)">
                    {en ? r.whatEn : r.whatId}
                  </div>
                  <div className="mt-0.5 text-xs text-(--text-tertiary)">
                    {(en ? r.byEn : r.byId) ?? (en ? r.whenEn : r.whenId)}
                  </div>
                </div>
              ))}
            </div>
            <DialogActions>
              <Button variant="secondary" onClick={() => setDetailSid(null)}>
                {t.btnClose}
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
