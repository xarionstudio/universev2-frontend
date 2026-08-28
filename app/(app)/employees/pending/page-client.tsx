"use client";

import * as React from "react";
import { CircleAlert, Inbox, Pencil, Trash2 } from "lucide-react";

import { employeesApi, errorDetail } from "@/lib/api";
import type { ApiPendingRegistration } from "@/lib/api/endpoints/employees";
import { useAuthPageConfig } from "@/lib/auth-page-config";
import { useI18n } from "@/lib/i18n";
import { usePermissions } from "@/components/providers/permissions";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton, Spinner } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogIcon,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageTitle, Panel } from "@/components/ui/panel";
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

/* Sub-menu Karyawan → Pending Registrasi: baris impor Excel yang DITAHAN
   karena departemennya tidak dikenal sistem (daftar terkontrol di Settings →
   Halaman Auth). Superadmin bisa MEMPERBAIKI entrinya di sini — memilih
   departemen resmi langsung mengimpornya sebagai karyawan. Entri juga hilang
   otomatis begitu NIK-nya berhasil diimpor ulang; tombol hapus hanya
   membersihkan daftar — karyawan TIDAK dibuat. */
export default function PendingRegistrationsPage() {
  const { t, lang } = useI18n();
  const { can } = usePermissions();
  const { pushToast } = useToast();
  const canManage = can("employees", "manage");
  /* daftar departemen RESMI (aktif) — sumber yang sama dengan form register */
  const { departments } = useAuthPageConfig();

  const [rows, setRows] = React.useState<ApiPendingRegistration[] | null>(null);
  const [loadErr, setLoadErr] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    const ac = new AbortController();
    void employeesApi
      .listPendingRegistrations(ac.signal)
      .then((data) => {
        setRows(data);
        setLoadErr(false);
      })
      .catch(() => {
        if (!ac.signal.aborted) setLoadErr(true);
      });
    return () => ac.abort();
  }, [reloadKey]);

  const retry = React.useCallback(() => {
    setLoadErr(false);
    setReloadKey((k) => k + 1);
  }, []);

  const [busy, setBusy] = React.useState(false);

  /* ── perbaiki entri ── */
  const [editTarget, setEditTarget] =
    React.useState<ApiPendingRegistration | null>(null);
  const [eNik, setENik] = React.useState("");
  const [eName, setEName] = React.useState("");
  const [eDept, setEDept] = React.useState("");
  const [ePos, setEPos] = React.useState("");
  const [editErr, setEditErr] = React.useState(false);

  function openEdit(r: ApiPendingRegistration) {
    setEditTarget(r);
    setENik(r.nik);
    setEName(r.name);
    setEDept(r.dept);
    setEPos(r.pos);
    setEditErr(false);
  }

  async function editDo() {
    if (!editTarget) return;
    const nik = eNik.trim();
    const name = eName.trim().toUpperCase();
    if (!/^\d{1,50}$/.test(nik) || !name) {
      setEditErr(true);
      return;
    }
    setBusy(true);
    try {
      const res = await employeesApi.updatePendingRegistration(editTarget.id, {
        nik,
        name,
        dept: eDept.trim().toUpperCase(),
        pos: ePos.trim().toUpperCase(),
      });
      if (res.resolved) {
        setRows((prev) => (prev ?? []).filter((r) => r.id !== editTarget.id));
        pushToast("success", t.pendResolvedToast, `${name} — ${nik}`);
      } else if (res.entry) {
        const entry = res.entry;
        setRows((prev) =>
          (prev ?? []).map((r) => (r.id === editTarget.id ? entry : r))
        );
        pushToast("info", t.pendUpdatedToast, `${name} — ${nik}`);
      }
      setEditTarget(null);
    } catch (e) {
      pushToast("error", t.apErrT, errorDetail(e, t.pendLoadErrB));
    } finally {
      setBusy(false);
    }
  }

  /* ── hapus entri ── */
  const [delTarget, setDelTarget] =
    React.useState<ApiPendingRegistration | null>(null);
  async function delDo() {
    if (!delTarget) return;
    setBusy(true);
    try {
      await employeesApi.deletePendingRegistration(delTarget.id);
      setRows((prev) => (prev ?? []).filter((r) => r.id !== delTarget.id));
      pushToast(
        "success",
        t.pendDelToast,
        `${delTarget.name} — ${delTarget.nik}`
      );
      setDelTarget(null);
    } catch (e) {
      pushToast("error", t.apErrT, errorDetail(e, t.pendLoadErrB));
    } finally {
      setBusy(false);
    }
  }

  /* alasan dari backend adalah konstanta teknis — petakan ke label i18n */
  const reasonLabel = (reason: string) =>
    reason.toLowerCase().includes("department") ? t.pendReasonDept : reason;

  const dateLabel = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(lang === "en" ? "en-GB" : "id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* departemen lama (tak dikenal) tetap ditawarkan sebagai opsi pertama —
     memilihnya berarti "hanya memperbaiki field lain, tetap pending" */
  const deptOptions =
    editTarget && !departments.includes(eDept) && eDept !== ""
      ? [eDept, ...departments]
      : departments;

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.navEmpPending} sub={t.pendSub} />

      <Panel>
        {loadErr ? (
          <StateBox
            icon={<CircleAlert className="text-danger-text" />}
            title={t.apLoadErrT}
            body={t.pendLoadErrB}
          >
            <Button onClick={retry}>{t.apRetry}</Button>
          </StateBox>
        ) : rows === null ? (
          <div className="grid place-items-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : rows.length === 0 ? (
          <StateBox
            icon={<Inbox className="text-primary-bright" />}
            title={t.pendEmptyT}
            body={t.pendEmptyB}
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>NIK</TableHead>
                <TableHead>{t.thEmp}</TableHead>
                <TableHead>{t.thDept}</TableHead>
                <TableHead className="max-xl:hidden">{t.thPos}</TableHead>
                <TableHead>{t.thReason}</TableHead>
                <TableHead className="max-xl:hidden">{t.lblDate}</TableHead>
                {canManage ? (
                  <TableHead className="w-28">{t.thAct}</TableHead>
                ) : null}
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-(--text-secondary) tabular-nums">
                    {r.nik}
                  </TableCell>
                  <TableCell className="font-semibold">{r.name}</TableCell>
                  <TableCell>
                    {/* departemen bermasalah — inilah yang harus diperbaiki */}
                    <Badge variant="warning" dot>
                      {r.dept || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-xl:hidden">
                    {r.pos || <span className="text-(--text-tertiary)">—</span>}
                  </TableCell>
                  <TableCell>{reasonLabel(r.reason)}</TableCell>
                  <TableCell className="font-mono whitespace-nowrap text-(--text-secondary) max-xl:hidden">
                    {dateLabel(r.createdAt)}
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <div className="flex gap-1.5">
                        <IconButton
                          aria-label={`${t.pendEditT} — ${r.name}`}
                          title={t.pendEditT}
                          onClick={() => openEdit(r)}
                        >
                          <Pencil />
                        </IconButton>
                        <IconButton
                          danger
                          aria-label={`${t.pendDelT} — ${r.name}`}
                          title={t.pendDelT}
                          onClick={() => setDelTarget(r)}
                        >
                          <Trash2 />
                        </IconButton>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {/* perbaiki entri */}
      <Dialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        labelledBy="pend-edit-t"
      >
        <DialogIcon variant="info">
          <Pencil />
        </DialogIcon>
        <DialogTitle id="pend-edit-t">
          {`${t.pendEditT} — ${editTarget?.nik ?? ""}`}
        </DialogTitle>
        <DialogBody>{t.pendEditB}</DialogBody>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void editDo();
          }}
          noValidate
        >
          <Field
            className="mt-4"
            label="NIK"
            htmlFor="pend-nik"
            required
            error={editErr && !/^\d{1,50}$/.test(eNik.trim())}
            errorMessage={t.errNik}
          >
            <Input
              id="pend-nik"
              className="font-mono"
              inputMode="numeric"
              value={eNik}
              onChange={(e) =>
                setENik(e.target.value.replace(/\D/g, "").slice(0, 50))
              }
            />
          </Field>
          <Field
            className="mt-4"
            label={t.thEmp}
            htmlFor="pend-name"
            required
            error={editErr && !eName.trim()}
            errorMessage={t.errNama}
          >
            <Input
              id="pend-name"
              className="uppercase"
              maxLength={100}
              value={eName}
              onChange={(e) => setEName(e.target.value)}
            />
          </Field>
          <Field className="mt-4" label={t.thDept} htmlFor="pend-dept">
            <Select
              id="pend-dept"
              value={eDept}
              onChange={(e) => setEDept(e.target.value)}
            >
              {deptOptions.map((d) => (
                <option key={d} value={d}>
                  {departments.includes(d) ? d : `${d} — ${t.pendReasonDept}`}
                </option>
              ))}
            </Select>
          </Field>
          <Field className="mt-4" label={t.thPos} htmlFor="pend-pos">
            <Input
              id="pend-pos"
              className="uppercase"
              maxLength={100}
              value={ePos}
              onChange={(e) => setEPos(e.target.value)}
            />
          </Field>
          <DialogActions>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditTarget(null)}
            >
              {t.btnCancel}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Spinner /> : null}
              {t.pendSaveBtn}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* konfirmasi hapus */}
      <Dialog
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        labelledBy="pend-del-t"
      >
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="pend-del-t">
          {`${t.pendDelT} — ${delTarget?.name ?? ""} (${delTarget?.nik ?? ""})?`}
        </DialogTitle>
        <DialogBody>{t.pendDelB}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDelTarget(null)}>
            {t.btnCancel}
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => void delDo()}
          >
            {t.pendDelBtn}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
