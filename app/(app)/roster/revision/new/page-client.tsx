"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Plus, Send, Trash2 } from "lucide-react";

import { revCodeList, type ApRow } from "@/lib/data/roster";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/components/providers/app-store";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Checkbox, ToggleRow } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogIcon,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
  FootSum,
  PageTitle,
  Panel,
  PanelFoot,
  Toolbar,
  ToolbarTitle,
} from "@/components/ui/panel";
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

type Entry = {
  name: string;
  nik: string;
  tgl: string;
  kode: string;
  jam: string;
  alasan: string;
};

function yesterdayISO() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

export default function RosterRevisionNewPage() {
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const { empAll, setApRows } = useAppStore();
  const router = useRouter();

  const employees = empAll().filter((e) => e.status === "aktif");
  const codes = revCodeList(lang);

  const [emp, setEmp] = React.useState("");
  const [tgl, setTgl] = React.useState(yesterdayISO);
  const [kode, setKode] = React.useState("");
  const [withJam, setWithJam] = React.useState(false);
  const [jin, setJin] = React.useState("05:45");
  const [jout, setJout] = React.useState("17:30");
  const [alasan, setAlasan] = React.useState("");
  const [errs, setErrs] = React.useState<{
    emp?: boolean;
    tgl?: boolean;
    kode?: boolean;
    alasan?: boolean;
  }>({});

  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const pg = usePagination(entries, "5");
  /* offset indeks asli — baris pada halaman aktif adalah slice dari entries */
  const baseIdx = (pg.page - 1) * Number(pg.per);

  function addEntry() {
    const next = {
      emp: !emp,
      tgl: !tgl,
      kode: !kode,
      alasan: !alasan.trim(),
    };
    setErrs(next);
    if (next.emp || next.tgl || next.kode || next.alasan) return;
    const e = employees.find((x) => x.nik === emp);
    if (!e) return;
    setEntries((prev) => [
      ...prev,
      {
        name: e.name,
        nik: e.nik,
        tgl,
        kode: kode.split(" — ")[0],
        jam: withJam ? `${jin}–${jout}` : "",
        alasan: alasan.trim(),
      },
    ]);
    setEmp("");
    setKode("");
    setAlasan("");
    setWithJam(false);
    setJin("05:45");
    setJout("17:30");
  }

  function sendAll() {
    const d = new Date();
    const sid = `REV-${d.getMonth() + 1 < 10 ? "0" : ""}${d.getMonth() + 1}${d.getDate() < 10 ? "0" : ""}${d.getDate()}-01`;
    const rows: ApRow[] = entries.map((e) => {
      const what = `${e.tgl} — kode ${e.kode} · ${e.alasan}`;
      return {
        sid,
        name: e.name,
        nik: e.nik,
        whatId: what,
        whatEn: what,
        whenId: "baru saja",
        whenEn: "just now",
        status: "pending",
      };
    });
    setApRows((prev) => [...prev, ...rows]);
    pushToast("success", `${entries.length} ${t.toastRevT}`, t.toastRevD);
    setEntries([]);
    setReviewOpen(false);
    router.push("/roster/revision");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.revNewTitle} sub={t.revSub}>
        <Button variant="ghost" onClick={() => router.push("/roster/revision")}>
          <ArrowLeft />
          {t.revBack}
        </Button>
      </PageTitle>

      <div className="grid grid-cols-[420px_minmax(0,1fr)] items-start gap-6 max-[1360px]:grid-cols-1">
        <Panel>
          <Toolbar className="mb-4">
            <ToolbarTitle>{t.revFormTitle}</ToolbarTitle>
          </Toolbar>
          <div className="flex flex-col gap-4">
            <Field
              label={t.lblEmp}
              htmlFor="rev-kar"
              required
              error={errs.emp}
              errorMessage={t.errEmp}
            >
              <Select
                id="rev-kar"
                value={emp}
                onChange={(e) => setEmp(e.target.value)}
              >
                <option value="">{t.phEmp}</option>
                {employees.map((e) => (
                  <option key={e.nik} value={e.nik}>
                    {e.name} — {e.nik}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={t.lblDate}
              htmlFor="rev-tgl"
              required
              error={errs.tgl}
            >
              <Input
                id="rev-tgl"
                type="date"
                className="font-mono"
                value={tgl}
                onChange={(e) => setTgl(e.target.value)}
              />
            </Field>

            <Field
              label={t.lblCode}
              htmlFor="rev-kode"
              required
              error={errs.kode}
              errorMessage={t.errCode}
              helper={
                <>
                  {t.helpCode1} <Link href="/roster/upload">{t.navR1}</Link>.
                </>
              }
            >
              <Select
                id="rev-kode"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
              >
                <option value="">{t.phCode}</option>
                {codes.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>

            <ToggleRow htmlFor="rev-withjam">
              <Checkbox
                id="rev-withjam"
                checked={withJam}
                onChange={(e) => setWithJam(e.target.checked)}
              />
              {t.withJam}
            </ToggleRow>

            {withJam ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label={t.lblIn} htmlFor="rev-jin">
                  <Input
                    id="rev-jin"
                    type="time"
                    className="font-mono"
                    value={jin}
                    onChange={(e) => setJin(e.target.value)}
                  />
                </Field>
                <Field label={t.lblOut} htmlFor="rev-jout">
                  <Input
                    id="rev-jout"
                    type="time"
                    className="font-mono"
                    value={jout}
                    onChange={(e) => setJout(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}

            <Field
              label={t.lblReason}
              htmlFor="rev-alasan"
              required
              error={errs.alasan}
              errorMessage={t.errReason}
              helper={t.helpReason}
            >
              <Textarea
                id="rev-alasan"
                placeholder={t.phReason}
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
              />
            </Field>

            <Button
              variant="secondary"
              className="self-start"
              onClick={addEntry}
            >
              <Plus />
              {t.addEntry}
            </Button>
          </div>
        </Panel>

        <Panel>
          <Toolbar className="mb-4">
            <ToolbarTitle>{t.revListTitle}</ToolbarTitle>
            <span className="text-xs text-(--text-tertiary)">
              {entries.length} {t.revCount}
            </span>
          </Toolbar>
          {entries.length === 0 ? (
            <StateBox
              icon={<CalendarDays className="text-(--color-primary-bright)" />}
              title={t.revEmptyT}
              body={t.revEmptyB}
            />
          ) : (
            <div>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>{t.thEmp}</TableHead>
                    <TableHead>{t.lblDate}</TableHead>
                    <TableHead>{t.thChange}</TableHead>
                    <TableHead className="w-[60px]">{t.thAct}</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {pg.rows.map((e, i) => (
                    <TableRow key={baseIdx + i}>
                      <TableCell>
                        <NameCell name={e.name} sub={e.nik} />
                      </TableCell>
                      <TableCell className="font-mono">{e.tgl}</TableCell>
                      <TableCell>
                        <Badge variant="info">{e.kode}</Badge>{" "}
                        {e.jam ? (
                          <span className="font-mono text-xs text-(--text-secondary)">
                            {e.jam}
                          </span>
                        ) : null}
                        <div className="mt-0.5 text-xs text-(--text-tertiary)">
                          {e.alasan}
                        </div>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          danger
                          aria-label={t.delEntry}
                          onClick={() =>
                            /* hapus pakai indeks asli, bukan indeks slice */
                            setEntries((prev) =>
                              prev.filter((_, j) => j !== baseIdx + i)
                            )
                          }
                        >
                          <Trash2 />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PanelFoot>
                <FootSum>{t.revFootNote}</FootSum>
                <div className="flex flex-wrap items-center gap-4">
                  <Pagination
                    page={pg.page}
                    pageCount={pg.pageCount}
                    onPage={pg.setPage}
                    per={pg.per}
                    perOptions={["5", "10", "25"]}
                    onPer={pg.setPer}
                  />
                  <Button onClick={() => setReviewOpen(true)}>{t.send}</Button>
                </div>
              </PanelFoot>
            </div>
          )}
        </Panel>
      </div>

      <Dialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        labelledBy="rev-t"
      >
        <DialogIcon variant="info">
          <Send />
        </DialogIcon>
        <DialogTitle id="rev-t">
          {t.revDlgT1} {entries.length} {t.revDlgT2}
        </DialogTitle>
        <DialogBody>{t.revDlgBody}</DialogBody>
        <ul className="mt-3 list-none p-0">
          {entries.map((e, i) => (
            <li
              key={i}
              className="flex justify-between gap-3 border-b border-(--divider) py-1.5 text-sm"
            >
              <span>
                {e.name} · <span className="font-mono">{e.tgl}</span>
              </span>
              <Badge variant="info">{e.kode}</Badge>
            </li>
          ))}
        </ul>
        <DialogActions>
          <Button variant="ghost" onClick={() => setReviewOpen(false)}>
            {t.revCancel}
          </Button>
          <Button onClick={sendAll}>{t.send}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
