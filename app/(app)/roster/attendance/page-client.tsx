"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";

import { attendanceApi } from "@/lib/api/attendance";
import type { AttStatus } from "@/lib/data/attendance";
import { useI18n } from "@/lib/i18n";
import { reportFileName } from "@/lib/report/logo";
import { downloadXlsx } from "@/lib/report/xlsx";
import { useRegisterRefresh } from "@/components/providers/refresh";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, usePagination } from "@/components/ui/pagination";
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
import { StateBox } from "@/components/ui/state-box";
import {
  IOCell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

const stBadge: Record<AttStatus, BadgeVariant> = {
  hadir: "success",
  terlambat: "warning",
  belum: "neutral",
  unfit: "danger",
  off: "neutral",
};

function AttendanceInner() {
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const searchParams = useSearchParams();

  const initialDate =
    searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const [from, setFrom] = React.useState(initialDate);
  const [to, setTo] = React.useState(initialDate);
  const [status, setStatus] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [q, setQ] = React.useState("");
  const [freshTime, setFreshTime] = React.useState("");

  const updateFresh = React.useCallback(() => {
    const d = new Date();
    setFreshTime(
      `${d.getHours() < 10 ? "0" : ""}${d.getHours()}:${d.getMinutes() < 10 ? "0" : ""}${d.getMinutes()} WITA`
    );
  }, []);

  React.useEffect(() => {
    const id = setTimeout(updateFresh, 0);
    return () => clearTimeout(id);
  }, [updateFresh]);

  /* refresh dari topbar: perbarui stempel "data per" */
  useRegisterRefresh(updateFresh);

  const stLabel = (s: AttStatus) =>
    s === "hadir"
      ? t.bHadir
      : s === "terlambat"
        ? t.bLate
        : s === "belum"
          ? t.bBelum
          : s === "unfit"
            ? t.bUnfit
            : t.bOff;

  const [apiAtt, setApiAtt] = React.useState<Record<string, unknown>[]>([]);

  React.useEffect(() => {
    if (from && to) {
      attendanceApi
        .getRange(from, to)
        .then((res) => {
          if (res && Array.isArray(res))
            setApiAtt(res as Record<string, unknown>[]);
        })
        .catch(() => {});
    }
  }, [from, to]);

  /* API sebagai satu-satunya sumber data */
  const allRows = apiAtt.map((r) => {
    const raw = r as Record<string, unknown>;
    return {
      name: String(raw.name || raw.nik || ""),
      nik: String(raw.nik || ""),
      dept: String(raw.dept || ""),
      code: String(raw.code || raw.shift || "D"),
      in: String(raw.in || raw.checkIn || ""),
      inM: String(raw.inM || ""),
      out: String(raw.out || raw.checkOut || ""),
      outM: String(raw.outM || ""),
      st: String(raw.st || raw.status || "belum") as AttStatus,
      date: String(raw.date || ""),
      dLabel: String(raw.dLabel || raw.date || ""),
    };
  });
  const rows = allRows.filter((r) => {
    if (from && (r.date ?? "") < from) return false;
    if (to && (r.date ?? "") > to) return false;
    if (status && r.st !== status) return false;
    if (dept && r.dept !== dept) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return r.name.toLowerCase().includes(needle) || r.nik.includes(needle);
  });

  const presentN = rows.filter(
    (r) => r.st === "hadir" || r.st === "terlambat"
  ).length;
  const pg = usePagination(rows);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={t.navR4}
        sub={
          <>
            {t.attSubA} <Link href="/roster/revision">{t.flowRevisi}</Link>
            {t.attSubB}
          </>
        }
      >
        <Fresh>
          {t.dataAsOf}&nbsp;
          <b className="font-mono text-(--text-secondary)">{freshTime}</b>
        </Fresh>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.attLog}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60"
              placeholder={t.searchEmp}
              aria-label={t.searchEmp}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              aria-label={t.allStatus}
              wrapperClassName="w-42.5"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">{t.allStatus}</option>
              <option value="hadir">{t.bHadir}</option>
              <option value="terlambat">{t.bLate}</option>
              <option value="belum">{t.bBelum}</option>
              <option value="unfit">{t.bUnfit}</option>
              <option value="off">{t.bOff}</option>
            </Select>
            <Select
              aria-label={t.allDepts}
              wrapperClassName="w-45"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
            >
              <option value="">{t.allDepts}</option>
              {Array.from(new Set(allRows.map((r) => r.dept)))
                .sort()
                .map((d) => (
                  <option key={d}>{d}</option>
                ))}
            </Select>
            <div className="flex items-center gap-2">
              <label
                htmlFor="att-from"
                className="text-xs text-(--text-tertiary)"
              >
                {t.lblDate}
              </label>
              <Input
                id="att-from"
                type="date"
                className="w-40 font-mono"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-(--text-tertiary)">–</span>
              <Input
                id="att-to"
                type="date"
                className="w-40 font-mono"
                aria-label={t.lblDateTo}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!rows.length) {
                  pushToast("info", t.expEmptyT, t.expEmptyD);
                  return;
                }
                try {
                  const name = reportFileName("attendance-log", "xlsx");
                  await downloadXlsx(name, {
                    name: t.navR4,
                    title: t.navR4,
                    meta: [
                      `${t.expPrintedAt}: ${new Date().toLocaleString(lang === "en" ? "en-GB" : "id-ID")}`,
                      `${t.expRows}: ${rows.length}`,
                      `${t.lblDate}: ${from} — ${to}`,
                    ],
                    columns: [
                      { header: t.thEmp, width: 26 },
                      { header: "NIK", width: 14 },
                      { header: t.lblDate, width: 14 },
                      { header: t.thDept, width: 16 },
                      { header: t.thRoster, width: 10 },
                      { header: t.thIn, width: 12 },
                      { header: t.thOut, width: 12 },
                      { header: t.thStatus, width: 16 },
                    ],
                    rows: rows.map((r) => [
                      r.name,
                      r.nik,
                      r.dLabel,
                      r.dept,
                      r.code,
                      r.in,
                      r.out,
                      stLabel(r.st),
                    ]),
                  });
                  pushToast("success", t.toastExportT, name);
                } catch {
                  pushToast("error", t.toastExportT, t.toastExportD);
                }
              }}
            >
              <Download />
              {t.export}
            </Button>
          </ToolbarGroup>
        </Toolbar>

        {rows.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>{t.thEmp}</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>{t.lblDate}</TableHead>
                <TableHead className="max-xl:hidden">{t.thDept}</TableHead>
                <TableHead>{t.thRoster}</TableHead>
                <TableHead>{t.thIn}</TableHead>
                <TableHead>{t.thOut}</TableHead>
                <TableHead>{t.thStatus}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pg.rows.map((r, i) => (
                <TableRow key={`${r.nik}-${r.date}-${i}`}>
                  <TableCell className="font-semibold">{r.name}</TableCell>
                  <TableCell className="font-mono text-(--text-secondary) tabular-nums">
                    {r.nik}
                  </TableCell>
                  <TableCell className="font-mono whitespace-nowrap">
                    {r.dLabel}
                  </TableCell>
                  <TableCell className="max-xl:hidden">{r.dept}</TableCell>
                  <TableCell>
                    <Badge variant="info">{r.code}</Badge>
                  </TableCell>
                  <TableCell>
                    <IOCell time={r.in} machine={r.inM} />
                  </TableCell>
                  <TableCell>
                    <IOCell time={r.out} machine={r.outM} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={stBadge[r.st]} dot>
                      {stLabel(r.st)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <StateBox
            icon={<Search className="text-primary-bright" />}
            title={t.noResTitle}
            body={t.attEmptyB}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{pg.range}</b> {t.attSumB} <b>{pg.total}</b>{" "}
            {t.attSumLog} · <b>{presentN}</b> {t.attSumD}
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
    </div>
  );
}

export default function AttendancePage() {
  return (
    <React.Suspense>
      <AttendanceInner />
    </React.Suspense>
  );
}
