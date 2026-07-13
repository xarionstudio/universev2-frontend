"use client";

import * as React from "react";
import {
  Ban,
  CheckCircle2,
  Download,
  Pencil,
  Plus,
  Search,
  Upload,
  UserPlus,
} from "lucide-react";

import type { UmUser } from "@/lib/data/users";
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
import { Input } from "@/components/ui/input";
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
  FootSum,
  PageTitle,
  Panel,
  PanelFoot,
  Toolbar,
  ToolbarGroup,
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

import { downloadCsv } from "./_lib/csv";

export default function UsersPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { umUsers, setUmUsers, umRoles, empAll } = useAppStore();
  const impRef = React.useRef<HTMLInputElement>(null);

  const [q, setQ] = React.useState("");
  const [statusF, setStatusF] = React.useState("all");
  const [roleF, setRoleF] = React.useState("all");

  /* dialog tambah/edit user */
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UmUser | null>(null);
  const [fEmail, setFEmail] = React.useState("");
  const [fKar, setFKar] = React.useState("");
  const [fRoles, setFRoles] = React.useState<Record<string, boolean>>({});
  const [fActive, setFActive] = React.useState(true);
  const [err, setErr] = React.useState(false);

  /* dialog nonaktifkan */
  const [offTarget, setOffTarget] = React.useState<UmUser | null>(null);

  const roleName = (id: string) => umRoles.find((r) => r.id === id)?.name ?? id;
  const karOpts = empAll().map((e) => `${e.name} — ${e.nik}`);

  const rows = umUsers.filter((u) => {
    const needle = q.toLowerCase();
    if (
      needle &&
      !u.email.toLowerCase().includes(needle) &&
      !(u.kar ?? "").toLowerCase().includes(needle) &&
      !u.roles.some((r) => roleName(r).toLowerCase().includes(needle))
    )
      return false;
    if (statusF === "on" && !u.on) return false;
    if (statusF === "off" && u.on) return false;
    if (roleF !== "all" && !u.roles.includes(roleF)) return false;
    return true;
  });
  const activeN = umUsers.filter((u) => u.on).length;
  const pg = usePagination(rows);

  function openAdd() {
    setEditing(null);
    setFEmail("");
    setFKar("");
    setFRoles({});
    setFActive(true);
    setErr(false);
    setDlgOpen(true);
  }

  function openEdit(u: UmUser) {
    setEditing(u);
    setFEmail(u.email);
    setFKar(u.kar ? `${u.kar} — ${u.nik}` : "");
    setFRoles(Object.fromEntries(u.roles.map((r) => [r, true])));
    setFActive(u.on);
    setErr(false);
    setDlgOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const roles = Object.keys(fRoles).filter((r) => fRoles[r]);
    const email = fEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || roles.length === 0) {
      setErr(true);
      return;
    }
    const [kar, nik] = fKar ? fKar.split(" — ") : [null, null];
    const data = { email, kar, nik, roles, on: fActive };
    if (editing) {
      setUmUsers((prev) =>
        prev.map((u) => (u.id === editing.id ? { ...u, ...data } : u))
      );
      pushToast("success", t.umToastUserEdit, email);
    } else {
      setUmUsers((prev) => [...prev, { id: `u${prev.length + 1}`, ...data }]);
      pushToast("success", t.umToastInvite, `${email} — ${t.umToastInviteD}`);
    }
    setDlgOpen(false);
  }

  function offDo() {
    if (!offTarget) return;
    setUmUsers((prev) =>
      prev.map((u) => (u.id === offTarget.id ? { ...u, on: false } : u))
    );
    pushToast("info", t.umToastOff, `${offTarget.email} — ${t.umToastOffD}`);
    setOffTarget(null);
  }

  function onDo(u: UmUser) {
    setUmUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, on: true } : x))
    );
    pushToast("success", t.umToastOn, `${u.email} — ${t.umToastOnD}`);
  }

  function exportCsv() {
    const head = "email;karyawan;nik;roles;status";
    const body = umUsers
      .map((u) =>
        [
          u.email,
          u.kar ?? "",
          u.nik ?? "",
          u.roles.map(roleName).join(","),
          u.on ? "aktif" : "nonaktif",
        ].join(";")
      )
      .join("\n");
    const name = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(name, `${head}\n${body}`);
    pushToast("success", t.umToastExp, name);
  }

  function importChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    pushToast("success", t.umToastImp, `${file.name} — 3 ${t.umToastImpD}`);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.umUsersT} sub={t.umSub}>
        <Button onClick={openAdd}>
          <Plus />
          {t.umUserAdd}
        </Button>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarGroup className="justify-start">
            <SearchInput
              className="w-55"
              placeholder={t.umSearchPh}
              aria-label={t.umSearchPh}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              wrapperClassName="w-[150px]"
              aria-label={t.thStatus}
              value={statusF}
              onChange={(e) => setStatusF(e.target.value)}
            >
              <option value="all">{t.umFAll}</option>
              <option value="on">{t.stAktif}</option>
              <option value="off">{t.stNonaktif}</option>
            </Select>
            <Select
              wrapperClassName="w-[170px]"
              aria-label="Role"
              value={roleF}
              onChange={(e) => setRoleF(e.target.value)}
            >
              <option value="all">{t.umFAllRoles}</option>
              {umRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </ToolbarGroup>
          <ToolbarGroup>
            <Button variant="secondary" onClick={() => impRef.current?.click()}>
              <Upload />
              Import
            </Button>
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

        {rows.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Email</TableHead>
                <TableHead className="max-xl:hidden">{t.umLinked}</TableHead>
                <TableHead className="max-xl:hidden">NIK</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>{t.thStatus}</TableHead>
                <TableHead className="w-[110px]">{t.thAct}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pg.rows.map((u) => (
                <TableRow
                  key={u.id}
                  className={u.on ? undefined : "opacity-60"}
                >
                  <TableCell>
                    <b className="font-semibold">{u.email}</b>
                  </TableCell>
                  <TableCell className="max-xl:hidden">
                    {u.kar ? (
                      <span className="font-semibold">{u.kar}</span>
                    ) : (
                      <span className="text-(--text-tertiary)">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-(--text-secondary) tabular-nums max-xl:hidden">
                    {u.nik ?? <span className="text-(--text-tertiary)">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="info">
                          {roleName(r)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.on ? "success" : "danger"} dot>
                      {u.on ? t.stAktif : t.stNonaktif}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <IconButton
                        aria-label={t.udbEditT}
                        onClick={() => openEdit(u)}
                      >
                        <Pencil />
                      </IconButton>
                      {u.on ? (
                        <IconButton
                          danger
                          aria-label={t.umOff}
                          onClick={() => setOffTarget(u)}
                        >
                          <Ban />
                        </IconButton>
                      ) : (
                        <IconButton aria-label={t.umOn} onClick={() => onDo(u)}>
                          <CheckCircle2 />
                        </IconButton>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <StateBox
            icon={<Search className="text-(--color-primary-bright)" />}
            title={t.noResTitle}
            body={t.empEmptyB}
          />
        )}
        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{pg.range}</b> {t.attSumB} <b>{pg.total}</b> user ·{" "}
            <b>{activeN}</b> {t.umActiveSum}
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

      {/* dialog tambah/edit user */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        className="w-[min(520px,100%)]"
        labelledBy="umu-t"
      >
        <DialogIcon variant="info">
          <UserPlus />
        </DialogIcon>
        <DialogTitle id="umu-t">
          {editing ? `${t.umUserEditT} — ${editing.email}` : t.umUserAdd}
        </DialogTitle>
        <DialogBody>{t.umUserDlgB}</DialogBody>
        <form onSubmit={save} noValidate>
          <Field
            className="mt-4"
            label="Email"
            htmlFor="um-email"
            required
            error={err}
            errorMessage={t.umErrEmail}
          >
            <Input
              id="um-email"
              type="email"
              placeholder="nama@unggul.co.id"
              value={fEmail}
              onChange={(e) => setFEmail(e.target.value)}
            />
          </Field>
          <Field className="mt-4" label={t.umLinked} htmlFor="um-kar">
            <Select
              id="um-kar"
              value={fKar}
              onChange={(e) => setFKar(e.target.value)}
            >
              <option value="">{t.umNoLink}</option>
              {karOpts.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </Field>
          <Field className="mt-4" label="Roles" required>
            <div className="grid grid-cols-2 gap-2">
              {umRoles.map((r) => (
                <ToggleRow key={r.id}>
                  <Checkbox
                    checked={!!fRoles[r.id]}
                    onChange={(e) =>
                      setFRoles((prev) => ({
                        ...prev,
                        [r.id]: e.target.checked,
                      }))
                    }
                  />
                  {r.name}
                </ToggleRow>
              ))}
            </div>
          </Field>
          <ToggleRow className="mt-4" htmlFor="um-active">
            <Checkbox
              id="um-active"
              checked={fActive}
              onChange={(e) => setFActive(e.target.checked)}
            />
            {t.stAktif}
          </ToggleRow>
          <DialogActions>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDlgOpen(false)}
            >
              {t.btnCancel}
            </Button>
            <Button type="submit">
              {editing ? t.udbSaveEdit : t.umUserSaveAdd}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* dialog nonaktifkan user */}
      <Dialog
        open={offTarget !== null}
        onClose={() => setOffTarget(null)}
        labelledBy="umo-t"
      >
        <DialogIcon variant="danger">
          <Ban />
        </DialogIcon>
        <DialogTitle id="umo-t">{`${t.umOff} ${offTarget?.email ?? ""}?`}</DialogTitle>
        <DialogBody>{t.umOffB}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setOffTarget(null)}>
            {t.btnCancel}
          </Button>
          <Button variant="destructive" onClick={offDo}>
            {t.umOff}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
