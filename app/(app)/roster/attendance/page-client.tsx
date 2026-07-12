"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";

import { attData, type AttStatus } from "@/lib/data/attendance";
import { useI18n } from "@/lib/i18n";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  NameCell,
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

  const rows = attData(lang).filter((r) => {
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
                className="w-[160px] font-mono"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-(--text-tertiary)">–</span>
              <Input
                id="att-to"
                type="date"
                className="w-[160px] font-mono"
                aria-label={t.lblDateTo}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <Select
              aria-label={t.allStatus}
              wrapperClassName="w-[170px]"
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
              wrapperClassName="w-[180px]"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
            >
              <option value="">{t.allDepts}</option>
              <option>Operation</option>
              <option>SDI</option>
              <option>HRGA</option>
              <option>Plant</option>
            </Select>
            <SearchInput
              className="w-[220px]"
              placeholder={t.searchEmp}
              aria-label={t.searchEmp}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={() =>
                pushToast("success", t.toastExportT, t.toastExportD)
              }
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
                <TableHead>{t.lblDate}</TableHead>
                <TableHead className="max-xl:hidden">{t.thDept}</TableHead>
                <TableHead>{t.thRoster}</TableHead>
                <TableHead>{t.thIn}</TableHead>
                <TableHead>{t.thOut}</TableHead>
                <TableHead>{t.thStatus}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.nik}-${r.date}-${i}`}>
                  <TableCell>
                    <NameCell name={r.name} sub={r.nik} />
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
            icon={<Search className="text-(--color-primary-bright)" />}
            title={t.noResTitle}
            body={t.attEmptyB}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{rows.length}</b> {t.attSumLog} · <b>{presentN}</b>{" "}
            {t.attSumD}
          </FootSum>
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
