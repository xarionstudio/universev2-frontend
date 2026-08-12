"use client";

import * as React from "react";
import { Search, Wrench } from "lucide-react";

import { fleetApi } from "@/lib/api/fleet";
import { statusDotColor, type UnitStatus } from "@/lib/data/unit-status";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/components/providers/app-store";
import { useRegisterRefresh } from "@/components/providers/refresh";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogIcon,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  Timeline,
  TimelineItem,
} from "@/components/ui/drawer";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
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
import { Segmented, SegmentedButton } from "@/components/ui/segmented";
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
import { useToast } from "@/components/ui/toast";

const statusBadge: Record<
  UnitStatus,
  { variant: BadgeVariant; label: string }
> = {
  ready: { variant: "success", label: "Ready" },
  breakdown: { variant: "danger", label: "Breakdown" },
  standby: { variant: "warning", label: "Standby" },
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function stampNow() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())} WITA`;
}

export default function UnitStatusPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { units, setUnits } = useAppStore();

  const [filter, setFilter] = React.useState<"all" | UnitStatus>("all");
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [per, setPer] = React.useState("10");
  const [freshTime, setFreshTime] = React.useState(stampNow);

  const [drawerCode, setDrawerCode] = React.useState<string | null>(null);
  const [dlgCode, setDlgCode] = React.useState<string | null>(null);
  const [newSt, setNewSt] = React.useState("Ready");
  const [reason, setReason] = React.useState("");
  const [apiHist, setApiHist] = React.useState<
    [string, string, string, string][]
  >([]);

  /* Fetch unit history dari API saat drawer dibuka. state dikunci ke
     drawerCode agar history unit lain yang pernah dibuka tidak tertampil,
     dan tidak perlu reset sinkron di dalam effect. */
  React.useEffect(() => {
    let cancelled = false;
    if (drawerCode) {
      fleetApi
        .getUnitHistory(drawerCode)
        .then((hist) => {
          if (!cancelled && hist && Array.isArray(hist)) {
            setApiHist(hist as [string, string, string, string][]);
          }
        })
        .catch(() => {
          if (!cancelled) setApiHist([]);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [drawerCode]);

  /* refresh dari topbar: perbarui stempel "data per" */
  useRegisterRefresh(() => setFreshTime(stampNow()));

  const needle = q.trim().toLowerCase();
  const rows = units.filter((u) => {
    if (filter !== "all" && u.status !== filter) return false;
    if (!needle) return true;
    return (
      u.code.toLowerCase().includes(needle) ||
      u.type.toLowerCase().includes(needle) ||
      u.loc.toLowerCase().includes(needle)
    );
  });
  const breakN = units.filter((u) => u.status === "breakdown").length;

  const perN = Number(per);
  const pageCount = Math.max(1, Math.ceil(rows.length / perN));
  const p = Math.min(page, pageCount);
  const pageRows = rows.slice((p - 1) * perN, p * perN);
  const range = rows.length
    ? `${(p - 1) * perN + 1}–${Math.min(rows.length, p * perN)}`
    : "0";

  const drawerUnit = drawerCode
    ? units.find((u) => u.code === drawerCode)
    : undefined;
  /* History murni dari API — tidak ada fallback data lokal */
  const drawerHist = apiHist;
  const dlgUnit = dlgCode ? units.find((u) => u.code === dlgCode) : undefined;

  function openDialog(code: string) {
    const u = units.find((x) => x.code === code);
    if (!u) return;
    setNewSt(statusBadge[u.status].label);
    setReason("");
    setDlgCode(code);
  }

  async function saveStatus() {
    if (!dlgUnit) return;
    const kind = newSt.toLowerCase() as UnitStatus;
    const why = reason.trim();
    try {
      await fleetApi.updateUnitStatus(dlgUnit.code, kind, why);
      // Apabila status baru adalah breakdown, laporkan juga lewat endpoint
      // status-report agar tercatat sebagai breakdown report (bukan hanya
      // ubah status biasa).
      if (kind === "breakdown") {
        try {
          await fleetApi.reportBreakdown(dlgUnit.code, {
            what: newSt,
            why,
            loc: dlgUnit.loc,
          });
        } catch {
          // Kegagalan report tidak menggagalkan ubah status — sudah tercatat
          // via updateUnitStatus di atas.
        }
      }
      const now = new Date();
      const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const when = `${now.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} ${hm}`;
      setUnits((prev) =>
        prev.map((u) =>
          u.code === dlgUnit.code
            ? {
                ...u,
                status: kind,
                upd: `${hm} — ${why}`,
                hist: [[when, newSt, why, kind], ...u.hist],
              }
            : u
        )
      );
      setDlgCode(null);
      pushToast("success", `${dlgUnit.code} → ${newSt}`, t.toastStD);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update unit status";
      pushToast("error", `${dlgUnit.code} → ${newSt}`, msg);
    }
  }

  const heads = [
    t.thUnitCode,
    t.thType,
    t.thStatus,
    t.thLoc,
    t.thLastUpd,
    t.thAct,
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.navUnitStatus} sub={t.usSub}>
        <Fresh>
          {t.dataAsOf}&nbsp;
          <b className="font-mono text-(--text-secondary)">{freshTime}</b>
        </Fresh>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.usListTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60"
              placeholder={t.searchUnit}
              aria-label={t.searchUnit}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Segmented role="group" aria-label="Filter status">
              {(
                [
                  ["all", t.segAll],
                  ["ready", "Ready"],
                  ["breakdown", "Breakdown"],
                  ["standby", "Standby"],
                ] as ["all" | UnitStatus, string][]
              ).map(([key, label]) => (
                <SegmentedButton
                  key={key}
                  active={filter === key}
                  onClick={() => {
                    setFilter(key);
                    setPage(1);
                  }}
                >
                  {label}
                </SegmentedButton>
              ))}
            </Segmented>
          </ToolbarGroup>
        </Toolbar>

        {rows.length ? (
          <Table>
            <TableHeader>
              <tr>
                {heads.map((h, i) => (
                  <TableHead
                    key={h}
                    className={i === 3 ? "max-xl:hidden" : undefined}
                    style={i === 5 ? { width: 220 } : undefined}
                  >
                    {h}
                  </TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {pageRows.map((u) => (
                <TableRow key={u.code}>
                  <TableCell>
                    <NameCell name={u.code} />
                  </TableCell>
                  <TableCell>{u.type}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadge[u.status].variant} dot>
                      {statusBadge[u.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-xl:hidden">{u.loc}</TableCell>
                  <TableCell className="text-[13px] text-(--text-secondary)">
                    {u.upd}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDrawerCode(u.code)}
                      >
                        {t.btnHist}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openDialog(u.code)}
                      >
                        {t.btnChangeSt}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <StateBox
            icon={<Search className="text-primary-bright" />}
            title={t.usEmptyT}
            body={t.usEmptyB}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{range}</b> {t.attSumB} <b>{rows.length}</b>{" "}
            {t.udbSumB} · <b>{breakN}</b> Breakdown
          </FootSum>
          <Pagination
            page={p}
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
      </Panel>

      {/* Drawer riwayat status */}
      <Drawer
        open={!!drawerUnit}
        onClose={() => setDrawerCode(null)}
        labelledBy="us-dw-t"
      >
        {drawerUnit ? (
          <>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 id="us-dw-t" className="text-xl font-semibold">
                  {drawerUnit.code}
                </h3>
                <span className="font-mono text-xs text-(--text-tertiary)">
                  {drawerUnit.type} · {drawerUnit.loc}
                </span>
              </div>
              <DrawerClose
                onClick={() => setDrawerCode(null)}
                aria-label={t.btnClose}
              />
            </div>
            <div className="mb-5">
              <Badge variant={statusBadge[drawerUnit.status].variant} dot>
                {statusBadge[drawerUnit.status].label}
              </Badge>
            </div>
            <h4 className="mb-4 text-xs font-semibold tracking-[.05em] text-(--text-tertiary) uppercase">
              {t.histTitle}
            </h4>
            <Timeline>
              {drawerHist.map(([when, what, why, kind], i) => (
                <TimelineItem
                  key={`${when}-${i}`}
                  dotColor={
                    statusDotColor[kind as UnitStatus] ?? "var(--text-tertiary)"
                  }
                  when={when}
                  what={what}
                  why={why}
                />
              ))}
            </Timeline>
          </>
        ) : null}
      </Drawer>

      {/* Dialog ubah status */}
      <Dialog
        open={!!dlgUnit}
        onClose={() => setDlgCode(null)}
        labelledBy="us-st-t"
      >
        <DialogIcon variant="warning">
          <Wrench />
        </DialogIcon>
        <DialogTitle id="us-st-t">
          {t.usDlgT} {dlgUnit?.code}
        </DialogTitle>
        <DialogBody>{t.usDlgB}</DialogBody>
        <Field label={t.lblNewSt} htmlFor="st-new" required className="mt-4">
          <Select
            id="st-new"
            value={newSt}
            onChange={(e) => setNewSt(e.target.value)}
          >
            <option>Ready</option>
            <option>Breakdown</option>
            <option>Standby</option>
          </Select>
        </Field>
        <Field
          label={t.lblReason2}
          htmlFor="st-reason"
          required
          helper={t.helpReasonSt}
          className="mt-4"
        >
          <Textarea
            id="st-reason"
            placeholder={t.phReasonSt}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDlgCode(null)}>
            {t.btnCancel}
          </Button>
          <Button onClick={saveStatus} disabled={!reason.trim()}>
            {t.btnSaveSt}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
