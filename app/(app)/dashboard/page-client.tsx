"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock,
  MessageSquareMore,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/components/providers/app-store";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
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

type AttentionRow = {
  name: string;
  sub: string;
  dept: string;
  issue: string;
  badge: string;
  badgeVariant: BadgeVariant;
  route: string;
  action: string;
};

function attentionRows(en: boolean): AttentionRow[] {
  return [
    {
      name: "Budi Santoso",
      sub: "503264135",
      dept: "HRGA",
      issue: en
        ? "Slept 3 h 40 m — below the 4-hour threshold"
        : "Tidur 3 j 40 m — di bawah ambang 4 jam",
      badge: "Unfit",
      badgeVariant: "danger",
      route: "/fit-to-work",
      action: en ? "Open Fit To Work" : "Buka Fit To Work",
    },
    {
      name: "Agus Salim",
      sub: "503264141",
      dept: "Plant",
      issue: en
        ? "Slept 3 h 55 m — below the 4-hour threshold"
        : "Tidur 3 j 55 m — di bawah ambang 4 jam",
      badge: "Unfit",
      badgeVariant: "danger",
      route: "/fit-to-work",
      action: en ? "Open Fit To Work" : "Buka Fit To Work",
    },
    {
      name: "DT-114",
      sub: "Dump Truck 777D",
      dept: "—",
      issue: en
        ? "Hydraulic leak — reported 04:12 by night shift"
        : "Hidrolik bocor — dilaporkan 04:12 shift malam",
      badge: "Breakdown",
      badgeVariant: "danger",
      route: "/assets/status",
      action: en ? "Open Unit Status" : "Buka Status Unit",
    },
    {
      name: "GR-02",
      sub: "Grader 24M",
      dept: "—",
      issue: en
        ? "Waiting for spare parts — 2 days in workshop"
        : "Menunggu spare part — 2 hari di workshop",
      badge: "Breakdown",
      badgeVariant: "danger",
      route: "/assets/status",
      action: en ? "Open Unit Status" : "Buka Status Unit",
    },
    {
      name: "Joko Widodo S.",
      sub: "503264139",
      dept: "Operation",
      issue: en
        ? "Roster D12 — no check-in as of 06:15"
        : "Roster D12 — belum check-in per 06:15",
      badge: en ? "Not clocked in" : "Belum absen",
      badgeVariant: "warning",
      route: "/roster/attendance",
      action: en ? "View attendance" : "Lihat attendance",
    },
    {
      name: "REV-0711-02",
      sub: "3 entri",
      dept: "SDI",
      issue: en
        ? "3 revision entries pending more than 24 hours"
        : "3 entri revisi menunggu lebih dari 24 jam",
      badge: "Pending",
      badgeVariant: "info",
      route: "/roster/approval",
      action: en ? "Open Approval" : "Buka Approval",
    },
  ];
}

export default function DashboardPage() {
  const { t, lang } = useI18n();
  const { userName } = useAppStore();
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
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

  function refresh() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      updateFresh();
    }, 900);
  }

  const hour = new Date().getHours();
  const greet =
    hour < 11
      ? t.greetMorning
      : hour < 15
        ? t.greetNoon
        : hour < 19
          ? t.greetAfternoon
          : t.greetEvening;
  const firstName = userName.trim().split(/\s+/).slice(0, 2).join(" ");
  const dateLine = `${new Date().toLocaleDateString(lang === "en" ? "en-GB" : "id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${t.shiftNote}`;

  const rows = attentionRows(lang === "en").filter((r) => {
    const needle = q.toLowerCase();
    return (
      r.name.toLowerCase().includes(needle) ||
      r.sub.toLowerCase().includes(needle) ||
      r.issue.toLowerCase().includes(needle)
    );
  });

  const heads = [t.thName, t.thDept, t.thIssue, t.thStatus, t.thAction];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={`${greet}, ${firstName} 👋`} sub={dateLine}>
        <Fresh>
          {t.dataAsOf}&nbsp;
          <b className="font-mono text-(--text-secondary)">{freshTime}</b>
        </Fresh>
      </PageTitle>

      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2">
        <StatCard
          href="/fit-to-work"
          icon={<XCircle />}
          iconStyle={{
            background: "var(--badge-danger-fill)",
            borderColor: "var(--badge-danger-border)",
            color: "var(--color-danger-text)",
          }}
          value="2"
          label={t.statUnfit}
          detail={
            <>
              {t.dUnfit1} <b>{t.dUnfit2}</b>
            </>
          }
        />
        <StatCard
          href="/roster/attendance"
          icon={<Clock />}
          iconStyle={{
            background: "var(--badge-warning-fill)",
            borderColor: "var(--badge-warning-border)",
            color: "var(--badge-warning-text)",
          }}
          value="9"
          label={t.statAbsent}
          detail={
            <>
              {t.dAbsent1} <b>247</b> {t.dAbsent2}
            </>
          }
        />
        <StatCard
          href="/assets/allocation"
          icon={<Truck />}
          iconStyle={{
            background: "var(--badge-danger-fill)",
            borderColor: "var(--badge-danger-border)",
            color: "var(--color-danger-text)",
          }}
          value="3"
          label={t.statBreakdown}
          detail={
            <>
              <b>DT-114</b> · EX-07 · GR-02
            </>
          }
        />
        <StatCard
          href="/roster/approval"
          icon={<MessageSquareMore />}
          iconStyle={{
            background: "rgba(0,212,255,.14)",
            borderColor: "rgba(0,212,255,.4)",
            color: "var(--color-primary-bright)",
          }}
          value="14"
          label={t.statApproval}
          detail={
            <>
              <b>3</b> {t.dApproval2}
            </>
          }
        />
      </div>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.panelTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              placeholder={t.searchPh}
              aria-label={t.searchPh}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button variant="secondary" onClick={refresh} disabled={loading}>
              <RefreshCw />
              {t.refresh}
            </Button>
          </ToolbarGroup>
        </Toolbar>

        {loading ? (
          <Table>
            <TableHeader>
              <tr>
                {heads.map((h, i) => (
                  <TableHead
                    key={h}
                    className={i === 1 ? "max-xl:hidden" : undefined}
                  >
                    {h}
                  </TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {[75, 65, 80].map((w, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton style={{ width: `${w}%`, height: 14 }} />
                  </TableCell>
                  <TableCell className="max-xl:hidden">
                    <Skeleton style={{ width: "55%", height: 14 }} />
                  </TableCell>
                  <TableCell>
                    <Skeleton style={{ width: "80%", height: 14 }} />
                  </TableCell>
                  <TableCell>
                    <Skeleton
                      style={{ width: 64, height: 20, borderRadius: 10 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Skeleton style={{ width: "65%", height: 14 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : rows.length ? (
          <>
            <Table>
              <TableHeader>
                <tr>
                  {heads.map((h, i) => (
                    <TableHead
                      key={h}
                      className={i === 1 ? "max-xl:hidden" : undefined}
                    >
                      {h}
                    </TableHead>
                  ))}
                </tr>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell>
                      <NameCell name={r.name} sub={r.sub} />
                    </TableCell>
                    <TableCell className="max-xl:hidden">{r.dept}</TableCell>
                    <TableCell>{r.issue}</TableCell>
                    <TableCell>
                      <Badge variant={r.badgeVariant} dot>
                        {r.badge}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={r.route}>{r.action}</Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PanelFoot>
              <FootSum>
                {t.showing} <b>{rows.length}</b> {t.sumRest}
              </FootSum>
              <Link href="/roster/attendance" className="text-sm">
                {t.viewAll}
              </Link>
            </PanelFoot>
          </>
        ) : (
          <StateBox
            icon={<Search className="text-(--text-tertiary)" />}
            title={t.noResTitle}
            body={t.noResBody}
          />
        )}
      </Panel>
    </div>
  );
}
