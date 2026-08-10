"use client";

import * as React from "react";
import { CheckCircle2, PenLine, TriangleAlert } from "lucide-react";

import { rosterApi } from "@/lib/api/roster";
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
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
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
import { useToast } from "@/components/ui/toast";

type Filter = "pending" | "approved" | "rejected" | "all";

const stBadge: Record<ApRow["status"], BadgeVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export default function RosterApprovalPage() {
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const { userName, apRows, setApRows } = useAppStore();
  const en = lang === "en";

  const [filter, setFilter] = React.useState<Filter>("pending");
  const [q, setQ] = React.useState("");
  const [noteFor, setNoteFor] = React.useState<number | null>(null);
  const [note, setNote] = React.useState("");
  const [noFor, setNoFor] = React.useState<number | null>(null);
  const [reason, setReason] = React.useState("");

  const stLabel = (s: ApRow["status"]) =>
    s === "pending"
      ? t.stPending
      : s === "approved"
        ? t.stApproved
        : t.stRejected;

  const pendingN = apRows.filter((r) => r.status === "pending").length;
  const needle = q.trim().toLowerCase();
  const list = apRows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => filter === "all" || r.status === filter)
    .filter(
      ({ r }) =>
        !needle ||
        r.name.toLowerCase().includes(needle) ||
        r.nik.toLowerCase().includes(needle) ||
        (en ? r.whatEn : r.whatId).toLowerCase().includes(needle)
    );
  const pg = usePagination(list);

  async function decide(i: number | null, ok: boolean, extra?: string) {
    if (i === null || i === undefined) return;
    const r = apRows[i];
    if (!r) return;
    const revId =
      typeof (r as Record<string, unknown>).id === "number"
        ? ((r as Record<string, unknown>).id as number)
        : i + 1;
    try {
      if (ok && extra) {
        await rosterApi.approveRevisionWithNote(revId, extra);
      } else if (ok) {
        await rosterApi.approveRevision(revId);
      } else {
        await rosterApi.rejectRevision(revId, extra);
      }
      // Refetch revisions from API after decision
      const fresh = await rosterApi.getRevisions();
      if (fresh && Array.isArray(fresh)) {
        setApRows(
          fresh.map((rev) => ({
            sid: String(rev.sid || ""),
            name: String(rev.name || rev.nik || ""),
            nik: String(rev.nik || ""),
            whatId: String(rev.whatId || ""),
            whatEn: String(rev.whatEn || rev.whatId || ""),
            whenId: String(rev.whenId || ""),
            whenEn: String(rev.whenEn || rev.whenId || ""),
            status: (rev.status || "pending") as ApRow["status"],
            byId: rev.byId ? String(rev.byId) : undefined,
            byEn: rev.byEn ? String(rev.byEn) : undefined,
          }))
        );
      }
    } catch {
      // Fallback local state update
      const who = userName.trim().split(/\s+/).slice(0, 2).join(" ");
      const by = `${who} · ${t.justNow}${extra ? ` — ${extra}` : ""}`;
      setApRows((prev) =>
        prev.map((row, j) =>
          j === i
            ? {
                ...row,
                status: ok ? "approved" : "rejected",
                byId: by,
                byEn: by,
              }
            : row
        )
      );
    }
    const what = (en ? r.whatEn : r.whatId).split(" · ")[0];
    if (ok) pushToast("success", t.toastOkT, `${r.name} — ${what}.`);
    else pushToast("info", t.toastNoT, `${r.name} — ${t.toastNoD}`);
  }

  const noteRow = noteFor !== null ? apRows[noteFor] : undefined;
  const noRow = noFor !== null ? apRows[noFor] : undefined;

  const segs: { f: Filter; label: React.ReactNode }[] = [
    {
      f: "pending",
      label: (
        <>
          {t.segPending} <span className="font-mono">{pendingN}</span>
        </>
      ),
    },
    { f: "approved", label: t.segApproved },
    { f: "rejected", label: t.segRejected },
    { f: "all", label: t.segAll },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.apTitle} sub={t.apSub} />

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.apQueue}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60"
              placeholder={t.searchEmp}
              aria-label={t.searchEmp}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Segmented role="group" aria-label="Filter status">
              {segs.map((s) => (
                <SegmentedButton
                  key={s.f}
                  active={filter === s.f}
                  onClick={() => setFilter(s.f)}
                >
                  {s.label}
                </SegmentedButton>
              ))}
            </Segmented>
          </ToolbarGroup>
        </Toolbar>

        {list.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>{t.thEmp}</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>{t.thSubmission}</TableHead>
                <TableHead>{t.thWhen}</TableHead>
                <TableHead>{t.thStatus}</TableHead>
                <TableHead className="w-82.5">{t.thAct}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pg.rows.map(({ r, i }) => (
                <TableRow key={i}>
                  <TableCell className="font-semibold">{r.name}</TableCell>
                  <TableCell className="font-mono text-(--text-secondary) tabular-nums">
                    {r.nik}
                  </TableCell>
                  <TableCell className="max-w-90">
                    {en ? r.whatEn : r.whatId}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-(--text-secondary)">
                    {en ? r.whenEn : r.whenId}
                  </TableCell>
                  <TableCell>
                    <Badge variant={stBadge[r.status]} dot>
                      {stLabel(r.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => decide(i, true)}>
                          {t.btnOk}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setNote("");
                            setNoteFor(i);
                          }}
                        >
                          {t.btnNote}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setReason("");
                            setNoFor(i);
                          }}
                        >
                          {t.btnNo}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-(--text-tertiary)">
                        {en ? r.byEn : r.byId}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <StateBox
            icon={<CheckCircle2 className="text-(--badge-success-text)" />}
            title={t.apEmptyT}
            body={t.apEmptyB}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{pg.range}</b> {t.attSumB} <b>{pg.total}</b>{" "}
            {t.apSumB} · <b>{pendingN}</b> {t.apSumC}
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
        open={noteFor !== null}
        onClose={() => setNoteFor(null)}
        labelledBy="note-t"
      >
        <DialogIcon variant="info">
          <PenLine />
        </DialogIcon>
        <DialogTitle id="note-t">
          {t.noteDlgT1} {noteRow?.name} {t.noteDlgT2}
        </DialogTitle>
        <DialogBody>{t.noteDlgB}</DialogBody>
        <Field label={t.lblNote} htmlFor="ap-note" className="mt-4">
          <Textarea
            id="ap-note"
            placeholder={t.phNote}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <DialogActions>
          <Button variant="ghost" onClick={() => setNoteFor(null)}>
            {t.btnCancel}
          </Button>
          <Button
            onClick={() => {
              decide(noteFor, true, note.trim() || undefined);
              setNoteFor(null);
            }}
          >
            {t.btnOk}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={noFor !== null}
        onClose={() => setNoFor(null)}
        labelledBy="no-t"
      >
        <DialogIcon variant="warning">
          <TriangleAlert />
        </DialogIcon>
        <DialogTitle id="no-t">
          {t.noDlgT1} {noRow?.name}?
        </DialogTitle>
        <DialogBody>{t.noDlgB}</DialogBody>
        <Field
          label={t.lblWhy}
          htmlFor="ap-reason"
          required
          helper={t.helpWhy}
          className="mt-4"
        >
          <Textarea
            id="ap-reason"
            placeholder={t.phWhy}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <DialogActions>
          <Button variant="ghost" onClick={() => setNoFor(null)}>
            {t.btnCancel}
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => {
              decide(noFor, false, reason.trim());
              setNoFor(null);
            }}
          >
            {t.btnNoDo}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
