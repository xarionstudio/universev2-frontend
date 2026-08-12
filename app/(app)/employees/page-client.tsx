"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  Eye,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { employeesApi } from "@/lib/api/employees";
import type { Employee, Komp } from "@/lib/data/employees";
import { useI18n } from "@/lib/i18n";
import { downloadBlob } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Checkbox, ToggleRow } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogIcon,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropMenu,
  DropMenuHeading,
  DropMenuWrap,
} from "@/components/ui/drop-menu";
import { Pagination } from "@/components/ui/pagination";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

function kompVariant(exp: string): BadgeVariant {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${exp}T00:00:00`);
  if (d.getTime() < today.getTime()) return "danger";
  const days = (d.getTime() - today.getTime()) / 86400000;
  return days <= 60 ? "warning" : "info";
}

export default function EmployeesPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { empAll, deleteEmployee } = useAppStore();
  const router = useRouter();

  const [q, setQ] = React.useState("");
  const [fOpen, setFOpen] = React.useState(false);
  const [fStatus, setFStatus] = React.useState("");
  const [fDepts, setFDepts] = React.useState<Record<string, boolean>>({});
  const [per, setPer] = React.useState("10");
  const [page, setPage] = React.useState(1);
  const [sel, setSel] = React.useState<Record<string, boolean>>({});
  const [delAsk, setDelAsk] = React.useState<{
    nik: string;
    name: string;
  } | null>(null);
  const selAllRef = React.useRef<HTMLInputElement>(null);

  /* Departemen dinamis — dari data karyawan yang dimuat dari API */
  const depts = React.useMemo(
    () =>
      Array.from(
        new Set(
          empAll()
            .map((r) => r.dept)
            .filter(Boolean)
        )
      ).sort(),
    [empAll]
  );
  const fN = depts.filter((d) => fDepts[d]).length;

  const filtered = empAll().filter((r) => {
    const needle = q.trim().toLowerCase();
    const okQ =
      !needle ||
      r.name.toLowerCase().includes(needle) ||
      r.nik.includes(needle);
    const okD = fN === 0 || !!fDepts[r.dept];
    const okS = fStatus === "" || r.status === fStatus;
    return okQ && okD && okS;
  });

  const perN = parseInt(per, 10);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / perN));
  const cur = Math.min(page, pageCount);
  const shown = filtered.slice((cur - 1) * perN, cur * perN);
  const start = total === 0 ? 0 : (cur - 1) * perN + 1;
  const end = Math.min(total, cur * perN);

  const allShownSel = shown.length > 0 && shown.every((r) => sel[r.nik]);
  const someShownSel = shown.some((r) => sel[r.nik]);

  React.useEffect(() => {
    if (selAllRef.current)
      selAllRef.current.indeterminate = !allShownSel && someShownSel;
  }, [allShownSel, someShownSel]);

  function toggleDept(d: string) {
    setFDepts((prev) => ({ ...prev, [d]: !prev[d] }));
    setPage(1);
  }

  function toggleSelAll() {
    setSel((prev) => {
      const next = { ...prev };
      for (const r of shown) next[r.nik] = !allShownSel;
      return next;
    });
  }

  async function exportNow() {
    try {
      const blob = await employeesApi.export("xlsx");
      const name = `karyawan_${new Date().toISOString().slice(0, 10)}.xlsx`;
      downloadBlob(blob, name);
      pushToast("success", t.toastExportT, name);
    } catch {
      pushToast("error", t.toastExportT, t.empExportErr);
    }
  }

  function resetFilters() {
    setQ("");
    setFStatus("");
    setFDepts({});
    setPage(1);
  }

  async function delDo() {
    if (!delAsk) return;
    try {
      await employeesApi.delete(delAsk.nik);
      deleteEmployee(delAsk.nik);
      pushToast("success", t.toastDelT, `${delAsk.name} ${t.toastDelD}`);
      setDelAsk(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete employee";
      pushToast("error", t.toastDelT, msg);
    }
  }

  function statusBadge(r: Employee) {
    const map: Record<Employee["status"], { v: BadgeVariant; l: string }> = {
      aktif: { v: "success", l: "Aktif" },
      cuti: { v: "neutral", l: t.stCuti },
      nonaktif: { v: "danger", l: t.stNonaktif },
    };
    const m = map[r.status];
    return (
      <Badge variant={m.v} dot>
        {m.l}
      </Badge>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.navEmployees} sub={t.empSub}>
        <Button onClick={() => router.push("/employees/new")}>
          <Plus />
          {t.empAdd}
        </Button>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.empListTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60"
              placeholder={t.searchEmp}
              aria-label={t.searchEmp}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              onClear={() => {
                setQ("");
                setPage(1);
              }}
              clearLabel={t.clearSearch}
            />
            <Select
              wrapperClassName="w-40"
              aria-label={t.thStatus}
              value={fStatus}
              onChange={(e) => {
                setFStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t.allStatus}</option>
              <option value="aktif">{t.stAktif}</option>
              <option value="cuti">{t.stCuti}</option>
              <option value="nonaktif">{t.stNonaktif}</option>
            </Select>
            <DropMenuWrap open={fOpen} onClose={() => setFOpen(false)}>
              <Button
                variant="secondary"
                onClick={() => setFOpen((v) => !v)}
                aria-expanded={fOpen}
              >
                <Filter />
                {t.filter}
              </Button>
              {fN > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 z-10 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1.25 text-[11px] font-bold text-on-cta">
                  {fN}
                </span>
              ) : null}
              <DropMenu open={fOpen} className="w-55 p-3 text-left">
                <DropMenuHeading className="px-1 pt-0 pb-2">
                  {t.thDept}
                </DropMenuHeading>
                {depts.map((d) => (
                  <ToggleRow key={d} className="rounded-md px-1 py-1.5">
                    <Checkbox
                      checked={!!fDepts[d]}
                      onChange={() => toggleDept(d)}
                    />
                    {d}
                  </ToggleRow>
                ))}
              </DropMenu>
            </DropMenuWrap>
            <Button variant="secondary" onClick={exportNow}>
              <Download />
              {t.export}
            </Button>
          </ToolbarGroup>
        </Toolbar>

        {shown.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-10">
                  <Checkbox
                    ref={selAllRef}
                    checked={allShownSel}
                    onChange={toggleSelAll}
                    aria-label={t.selAll}
                  />
                </TableHead>
                <TableHead>{t.thNama}</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead className="max-xl:hidden">{t.thDept}</TableHead>
                <TableHead>{t.thPos}</TableHead>
                <TableHead>SIMPER</TableHead>
                <TableHead>{t.thStatus}</TableHead>
                <TableHead className="w-35">{t.thAct}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {shown.map((r) => {
                const komps: Komp[] = r.komp ?? [];
                return (
                  <TableRow key={r.nik} selected={!!sel[r.nik]}>
                    <TableCell>
                      <Checkbox
                        checked={!!sel[r.nik]}
                        onChange={() =>
                          setSel((prev) => ({ ...prev, [r.nik]: !prev[r.nik] }))
                        }
                        aria-label={r.name}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/employees/${r.nik}`}
                        className="font-semibold text-inherit"
                      >
                        {r.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-(--text-secondary) tabular-nums">
                      {r.nik}
                    </TableCell>
                    <TableCell className="max-xl:hidden">{r.dept}</TableCell>
                    <TableCell>{r.pos}</TableCell>
                    <TableCell>
                      {komps.length ? (
                        <div className="flex max-w-55 flex-wrap gap-1">
                          {komps.map((k) => (
                            <Badge
                              key={k.cls}
                              variant={kompVariant(k.exp)}
                              title={`SIMPER ${k.simper} · s/d ${k.exp}`}
                            >
                              {k.cls}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-(--text-tertiary)">—</span>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(r)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <IconButton
                          aria-label={t.empSee}
                          onClick={() => router.push(`/employees/${r.nik}`)}
                        >
                          <Eye />
                        </IconButton>
                        <IconButton
                          aria-label={t.empChange}
                          onClick={() =>
                            router.push(`/employees/${r.nik}/edit`)
                          }
                        >
                          <Pencil />
                        </IconButton>
                        <IconButton
                          danger
                          aria-label={t.empDel}
                          onClick={() =>
                            setDelAsk({ nik: r.nik, name: r.name })
                          }
                        >
                          <Trash2 />
                        </IconButton>
                      </div>
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
            body={t.empEmptyB}
          >
            <Button
              variant="secondary"
              className="mx-auto"
              onClick={resetFilters}
            >
              {t.empResetF}
            </Button>
          </StateBox>
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{`${start}–${end}`}</b> {t.attSumB} <b>{total}</b>{" "}
            {t.empSumB}
          </FootSum>
          <Pagination
            page={cur}
            pageCount={pageCount}
            onPage={setPage}
            per={per}
            perOptions={["5", "10", "25"]}
            onPer={(v) => {
              setPer(v);
              setPage(1);
            }}
          />
        </PanelFoot>
      </Panel>

      <Dialog
        open={!!delAsk}
        onClose={() => setDelAsk(null)}
        labelledBy="del-t"
      >
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="del-t">{`${t.empDelT1} ${delAsk?.name}?`}</DialogTitle>
        <DialogBody>{t.empDelBody}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDelAsk(null)}>
            {t.btnCancel}
          </Button>
          <Button variant="destructive" onClick={delDo}>
            {t.empDelDo}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
