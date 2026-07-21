"use client";

import * as React from "react";
import { Download, Lock, Pencil, Plus, Trash2, Upload } from "lucide-react";

import {
  umModules,
  type UmModule,
  type UmPerm,
  type UmRole,
} from "@/lib/data/users";
import { useI18n } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/id";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { usePermissions } from "@/components/providers/permissions";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogIcon,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FormGrid } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

import { downloadCsv } from "../users/_lib/csv";

/* Label modul RBAC = label menu di sidebar */
const MODULE_LABEL_KEYS: Record<UmModule, keyof Dict> = {
  dashboard: "navDashboard",
  display: "navDisplay",
  employees: "navEmployees",
  roster: "navRoster",
  ftw: "navFtw",
  asset: "navAsset",
  prestasi: "navPrestasi",
  master: "navMaster",
  users: "navUsers",
  settings: "navSettings",
};

const emptyPerms = () =>
  Object.fromEntries(umModules.map((m) => [m, "none"])) as Record<
    UmModule,
    UmPerm
  >;

export default function RolesPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { umRoles, setUmRoles, umUsers } = useAppStore();
  const { can } = usePermissions();
  /* Role adalah bagian modul "users" — mengubah role sama kuatnya dengan
     mengubah user, jadi ikut permission Kelola yang sama. */
  const canManage = can("users", "manage");
  const impRef = React.useRef<HTMLInputElement>(null);

  const [q, setQ] = React.useState("");
  const [rbacSel, setRbacSel] = React.useState("r2");

  /* dialog tambah/edit role */
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UmRole | null>(null);
  const [fName, setFName] = React.useState("");
  const [fDesc, setFDesc] = React.useState("");
  const [fPerms, setFPerms] =
    React.useState<Record<UmModule, UmPerm>>(emptyPerms);
  const [nameErr, setNameErr] = React.useState(false);

  /* dialog hapus role */
  const [delTarget, setDelTarget] = React.useState<UmRole | null>(null);

  const userCount = (roleId: string) =>
    umUsers.filter((u) => u.roles.includes(roleId)).length;

  const rows = umRoles.filter(
    (r) =>
      !q ||
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.desc.toLowerCase().includes(q.toLowerCase())
  );
  const pg = usePagination(rows);
  const rbacRole = umRoles.find((r) => r.id === rbacSel) ?? umRoles[0];
  /* Dialog jadi read-only bila role-nya terkunci (Superadmin) ATAU user
     hanya punya permission Lihat — keduanya menonaktifkan kontrol dan
     menyembunyikan tombol simpan lewat jalur yang sama. */
  const locked = !!editing?.locked || !canManage;

  const permStr = (r: UmRole) => {
    const vals = Object.values(r.perms);
    const m = vals.filter((p) => p === "manage").length;
    const v = vals.filter((p) => p === "view").length;
    return `${m} ${t.umPManage.toLowerCase()} · ${v} ${t.umPView.toLowerCase()}`;
  };

  function openAdd() {
    setEditing(null);
    setFName("");
    setFDesc("");
    setFPerms(emptyPerms());
    setNameErr(false);
    setDlgOpen(true);
  }

  function openEdit(r: UmRole) {
    setEditing(r);
    setFName(r.name);
    setFDesc(r.desc);
    setFPerms({ ...r.perms });
    setNameErr(false);
    setDlgOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!fName.trim()) {
      setNameErr(true);
      return;
    }
    const data = { name: fName.trim(), desc: fDesc.trim(), perms: fPerms };
    if (editing) {
      setUmRoles((prev) =>
        prev.map((r) => (r.id === editing.id ? { ...r, ...data } : r))
      );
      pushToast("success", t.umToastRoleEdit, data.name);
    } else {
      setUmRoles((prev) => [
        ...prev,
        { id: `r${prev.length + 1}`, locked: false, ...data },
      ]);
      pushToast("success", t.umToastRoleAdd, data.name);
    }
    setDlgOpen(false);
  }

  function delDo() {
    if (!delTarget) return;
    setUmRoles((prev) => prev.filter((r) => r.id !== delTarget.id));
    pushToast("success", t.umToastRoleDel, delTarget.name);
    setDelTarget(null);
  }

  function exportCsv() {
    const head = ["role", "deskripsi", ...umModules].join(";");
    const body = umRoles
      .map((r) =>
        [r.name, r.desc, ...umModules.map((m) => r.perms[m])].join(";")
      )
      .join("\n");
    const name = `roles_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(name, `${head}\n${body}`);
    pushToast("success", t.umToastExp, name);
  }

  function importChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    pushToast("success", t.umToastImp, `${file.name} — 1 ${t.umToastImpD}`);
    e.target.value = "";
  }

  const delUsed = delTarget ? userCount(delTarget.id) : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.umRolesT} sub={t.umRoleSub}>
        {canManage ? (
          <Button onClick={openAdd}>
            <Plus />
            {t.umRoleAdd}
          </Button>
        ) : (
          <Badge variant="neutral">{t.umReadOnly}</Badge>
        )}
      </PageTitle>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start gap-6 max-[1360px]:grid-cols-1">
        <Panel>
          <Toolbar>
            <ToolbarTitle>{t.umRoleListT}</ToolbarTitle>
            <ToolbarGroup>
              <SearchInput
                className="w-60"
                placeholder={t.umRoleSearchPh}
                aria-label={t.umRoleSearchPh}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {canManage ? (
                <Button
                  variant="secondary"
                  onClick={() => impRef.current?.click()}
                >
                  <Upload />
                  Import
                </Button>
              ) : null}
              <Button variant="secondary" onClick={exportCsv}>
                <Download />
                Export
              </Button>
              <input
                ref={impRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={importChange}
              />
            </ToolbarGroup>
          </Toolbar>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Role</TableHead>
                <TableHead className="max-xl:hidden">{t.umDesc}</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="w-27.5">{t.thAct}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pg.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="info">{r.name}</Badge>
                  </TableCell>
                  <TableCell className="text-(--text-secondary) max-xl:hidden">
                    {r.desc}
                  </TableCell>
                  <TableCell className="font-mono">{permStr(r)}</TableCell>
                  <TableCell className="font-mono">{userCount(r.id)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {/* tanpa Kelola, matriks tetap bisa dibuka read-only */}
                      <IconButton
                        aria-label={t.udbEditT}
                        onClick={() => openEdit(r)}
                      >
                        <Pencil />
                      </IconButton>
                      {canManage && !r.locked ? (
                        <IconButton
                          danger
                          aria-label={t.empDel}
                          onClick={() => setDelTarget(r)}
                        >
                          <Trash2 />
                        </IconButton>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PanelFoot>
            <FootSum>
              {t.attSumA} <b>{pg.range}</b> {t.attSumB} <b>{pg.total}</b> role
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

        {/* anotasi RBAC: efek role pada UI */}
        <Panel>
          <Toolbar>
            <ToolbarTitle>{t.umRbacT}</ToolbarTitle>
            <Select
              wrapperClassName="w-45"
              aria-label={t.umRbacT}
              value={rbacSel}
              onChange={(e) => setRbacSel(e.target.value)}
            >
              {umRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Toolbar>
          <div className="flex flex-col gap-2">
            {umModules.map((m) => {
              const perm = rbacRole.perms[m];
              return (
                <div
                  key={m}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm",
                    perm === "manage" &&
                      "bg-[rgba(0,212,255,.10)] text-(--text-primary)",
                    perm === "view" &&
                      "bg-(--fill-subtle) text-(--text-secondary)",
                    perm === "none" && "text-(--text-disabled)"
                  )}
                >
                  <span className="flex-1">{t[MODULE_LABEL_KEYS[m]]}</span>
                  <Badge
                    variant={perm === "manage" ? "info" : "neutral"}
                    className={perm === "none" ? "opacity-60" : undefined}
                  >
                    {perm === "manage"
                      ? t.umPManage
                      : perm === "view"
                        ? t.umPView
                        : t.umPNone}
                  </Badge>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-normal text-(--text-secondary)">
            {t.umRbacNote}
          </p>
        </Panel>
      </div>

      {/* dialog tambah/edit role + matriks RBAC */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        className="w-[min(620px,100%)]"
        labelledBy="umr-t"
      >
        <DialogIcon variant="info">
          <Lock />
        </DialogIcon>
        <DialogTitle id="umr-t">
          {editing ? `${t.umRoleEditT} — ${editing.name}` : t.umRoleAdd}
        </DialogTitle>
        <DialogBody>{t.umRoleDlgB}</DialogBody>
        <form onSubmit={save} noValidate>
          <FormGrid className="mt-4">
            <Field
              label={t.umRoleName}
              htmlFor="um-rname"
              required
              error={nameErr}
              errorMessage={t.mdErrName}
            >
              <Input
                id="um-rname"
                placeholder="Admin Roster"
                disabled={locked}
                value={fName}
                onChange={(e) => {
                  setFName(e.target.value);
                  if (e.target.value.trim()) setNameErr(false);
                }}
              />
            </Field>
            <Field label={t.umDesc} htmlFor="um-rdesc">
              <Input
                id="um-rdesc"
                value={fDesc}
                onChange={(e) => setFDesc(e.target.value)}
              />
            </Field>
          </FormGrid>
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium">{t.umMatrixT}</label>
              <span className="text-xs text-(--text-tertiary)">
                {t.umMatrixHint}
              </span>
            </div>
            <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {umModules.map((m) => (
                <div
                  key={m}
                  className="flex items-center gap-3 rounded-lg bg-(--fill-subtle) px-2.5 py-1.5"
                >
                  <span className="flex-1 text-sm font-medium">
                    {t[MODULE_LABEL_KEYS[m]]}
                  </span>
                  <Segmented role="group" aria-label={t[MODULE_LABEL_KEYS[m]]}>
                    {(
                      [
                        ["none", t.umPNone],
                        ["view", t.umPView],
                        ["manage", t.umPManage],
                      ] as [UmPerm, string][]
                    ).map(([p, label]) => (
                      <SegmentedButton
                        key={p}
                        type="button"
                        active={fPerms[m] === p}
                        disabled={locked}
                        className="px-2.5 py-1 text-xs disabled:cursor-not-allowed"
                        onClick={() =>
                          setFPerms((prev) => ({ ...prev, [m]: p }))
                        }
                      >
                        {label}
                      </SegmentedButton>
                    ))}
                  </Segmented>
                </div>
              ))}
            </div>
            {locked ? (
              <p className="mt-3 text-xs text-(--text-tertiary)">
                {editing?.locked ? t.umLockedNote : t.umReadOnlyB}
              </p>
            ) : null}
          </div>
          <DialogActions>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDlgOpen(false)}
            >
              {t.btnCancel}
            </Button>
            {!locked ? (
              <Button type="submit">
                {editing ? t.udbSaveEdit : t.umRoleSaveAdd}
              </Button>
            ) : null}
          </DialogActions>
        </form>
      </Dialog>

      {/* dialog hapus role — terblokir bila masih dipakai user */}
      <Dialog
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        labelledBy="umrd-t"
      >
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="umrd-t">{`${t.umRoleDelT} "${delTarget?.name ?? ""}"?`}</DialogTitle>
        <DialogBody>
          {delUsed > 0
            ? `${t.umRoleDelBlocked} ${delUsed} user.`
            : t.umRoleDelB}
        </DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDelTarget(null)}>
            {t.btnCancel}
          </Button>
          {delUsed === 0 ? (
            <Button variant="destructive" onClick={delDo}>
              {t.empDelDo}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </div>
  );
}
