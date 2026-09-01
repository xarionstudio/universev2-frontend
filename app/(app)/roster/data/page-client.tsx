"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Download, Eye, Search, Upload } from "lucide-react";

import { errorDetail, rosterApi } from "@/lib/api";
import type { ApiRosterMeta } from "@/lib/api/endpoints/roster";
import { useAuthPageConfig } from "@/lib/auth-page-config";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton, Spinner } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/toast";

import { downloadBlob } from "../../users/_lib/csv";

export default function RosterDataPage() {
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const router = useRouter();
  const { departments } = useAuthPageConfig();

  const [month, setMonth] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [q, setQ] = React.useState("");
  const [st, setSt] = React.useState("");

  const [rows, setRows] = React.useState<ApiRosterMeta[] | null>(null);
  const [loadErr, setLoadErr] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    const ac = new AbortController();
    void rosterApi
      .listRosters({ perPage: 200 }, ac.signal)
      .then((res) => {
        setRows(res.items ?? []);
        setLoadErr(false);
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setLoadErr(true);
          setRows([]);
        }
      });
    return () => ac.abort();
  }, [reloadKey]);

  const monthNames = React.useMemo(() => {
    const loc = lang === "en" ? "en-GB" : "id-ID";
    return Array.from({ length: 12 }, (_, i) =>
      new Date(2026, i, 1).toLocaleDateString(loc, { month: "long" })
    );
  }, [lang]);

  const depts = React.useMemo(() => {
    const fromData = (rows ?? []).map((r) => r.dept);
    return Array.from(new Set([...departments, ...fromData])).sort();
  }, [rows, departments]);

  const filtered = (rows ?? []).filter((r) => {
    if (st && r.status !== st) return false;
    if (dept && r.dept !== dept) return false;
    if (month && r.month.slice(5) !== month) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      r.label.toLowerCase().includes(needle) ||
      r.file.toLowerCase().includes(needle) ||
      r.dept.toLowerCase().includes(needle) ||
      r.by.toLowerCase().includes(needle)
    );
  });
  const pg = usePagination(filtered);

  async function exportOne(r: ApiRosterMeta) {
    try {
      const blob = await rosterApi.exportRoster(r.key);
      downloadBlob(r.file || `roster-${r.key}.xlsx`, blob);
      pushToast("success", t.rdDlT, r.file);
    } catch (err) {
      pushToast("error", t.apErrT, errorDetail(err, t.apErrT));
    }
  }

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.navRD} sub={t.rdSub}>
        <Button onClick={() => router.push("/roster/upload")}>
          <Upload />
          {t.rdUpload}
        </Button>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.rdListTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60 max-sm:w-full"
              placeholder={t.rdSearchPh}
              aria-label={t.rdSearchPh}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              aria-label={t.allDepts}
              wrapperClassName="w-45 max-sm:w-full"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
            >
              <option value="">{t.allDepts}</option>
              {depts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Select
              aria-label={t.allStatus}
              wrapperClassName="w-42.5 max-sm:w-full"
              value={st}
              onChange={(e) => setSt(e.target.value)}
            >
              <option value="">{t.allStatus}</option>
              <option value="aktif">{t.stAktif}</option>
              <option value="arsip">{t.stArsip}</option>
            </Select>
            <Select
              aria-label={t.lblMonth}
              wrapperClassName="w-40 max-sm:w-full"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">{t.allMonths}</option>
              {monthNames.map((m, i) => (
                <option key={m} value={String(i + 1).padStart(2, "0")}>
                  {m}
                </option>
              ))}
            </Select>
          </ToolbarGroup>
        </Toolbar>

        {loadErr ? (
          <StateBox
            icon={<CircleAlert className="text-danger-text" />}
            title={t.apLoadErrT}
            body={t.apErrT}
          >
            <Button onClick={() => setReloadKey((k) => k + 1)}>
              {t.apRetry}
            </Button>
          </StateBox>
        ) : rows === null ? (
          <div className="grid place-items-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : filtered.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>{t.thPeriod}</TableHead>
                <TableHead>{t.thDept}</TableHead>
                <TableHead className="max-xl:hidden">{t.thUploaded}</TableHead>
                <TableHead>{t.thEmpN}</TableHead>
                <TableHead>{t.thRows}</TableHead>
                <TableHead>{t.thStatus}</TableHead>
                <TableHead>{t.thAct}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pg.rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell>
                    <NameCell name={r.label} sub={r.file} />
                  </TableCell>
                  <TableCell>{r.dept}</TableCell>
                  <TableCell className="max-xl:hidden">
                    <NameCell
                      name={<span className="font-medium">{r.by}</span>}
                      sub={r.dateISO}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{r.emp}</TableCell>
                  <TableCell className="font-mono">{r.rows}</TableCell>
                  <TableCell>
                    <Badge
                      variant={r.status === "aktif" ? "success" : "neutral"}
                      dot
                    >
                      {r.status === "aktif" ? t.stAktif : t.stArsip}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/roster/attendance?date=${r.dateISO}`}
                        className="text-sm whitespace-nowrap"
                      >
                        {t.rdView}
                      </Link>
                      <IconButton
                        aria-label={t.rdDetail}
                        onClick={() => router.push(`/roster/detail?p=${r.key}`)}
                      >
                        <Eye />
                      </IconButton>
                      <IconButton
                        aria-label={t.rdDl}
                        onClick={() => void exportOne(r)}
                      >
                        <Download />
                      </IconButton>
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
            body={t.rdEmptyB}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{pg.range}</b> {t.attSumB} <b>{pg.total}</b>{" "}
            {t.rdSumB}
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
