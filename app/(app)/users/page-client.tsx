"use client";

import * as React from "react";
import {
  Ban,
  CheckCircle2,
  CircleAlert,
  Download,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";

import { employeesApi, errorDetail, usersApi } from "@/lib/api";
import {
  toEmployees,
  toUmRoles,
  toUmUser,
  toUmUsers,
} from "@/lib/api/adapters";
import type { UmUser } from "@/lib/data/users";
import { useI18n } from "@/lib/i18n";
import { passwordIssues, type PwIssue } from "@/lib/password";
import { effectivePerms, can as rbacCan } from "@/lib/rbac";
import { useAppStore } from "@/components/providers/app-store";
import { usePermissions } from "@/components/providers/permissions";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton, Spinner } from "@/components/ui/button";
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
  ToolbarTitle,
} from "@/components/ui/panel";
import { PasswordInput } from "@/components/ui/password-input";
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

import { downloadBlob } from "./_lib/csv";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/* NIK persis 9 digit — aturan yang sama dengan IsValidNIK di backend */
const NIK_RE = /^\d{9}$/;

/* Opsi tautan dikodekan "Nama — NIK". NIK selalu segmen TERAKHIR: nama
   (terutama nama manual akun kiosk) boleh mengandung " — ", jadi decode
   dengan lastIndexOf, bukan split() yang mengambil segmen pertama. */
function splitLinked(v: string): [string, string] {
  const i = v.lastIndexOf(" — ");
  return i === -1 ? [v, ""] : [v.slice(0, i), v.slice(i + 3)];
}

/* Label akun untuk toast/judul dialog: email bila ada, kalau tidak NIK,
   lalu nama — akun kini boleh tanpa email (identitas login = NIK). */
function userLabel(u: {
  email: string;
  nik?: string | null;
  kar?: string | null;
}): string {
  return u.email || (u.nik ? `NIK ${u.nik}` : (u.kar ?? ""));
}

export default function UsersPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { umUsers, setUmUsers, umRoles, setUmRoles, emps, setEmps } =
    useAppStore();
  const { user: me, can } = usePermissions();
  const impRef = React.useRef<HTMLInputElement>(null);

  /* Modul "users": Kelola = boleh ubah, Lihat = hanya baca.
     Halaman ini hanya bisa dibuka kalau minimal punya Lihat (dijaga layout). */
  const canManage = can("users", "manage");

  /* Hidrasi dari backend — pola halaman Mesin Fingerprint: setState hanya di
     callback .then/.catch, `reloadKey` menaikkan diri untuk memuat ulang
     (tombol retry, atau setelah import yang menambah baris di server).
     Role ikut ditarik di sini juga: kolom Roles, filter, dan pagar Superadmin
     membutuhkannya, dan halaman Roles belum tentu pernah dibuka. */
  const [loaded, setLoaded] = React.useState(false);
  const [loadErr, setLoadErr] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    const ac = new AbortController();
    void Promise.all([
      usersApi.listUsers(ac.signal),
      usersApi.listRoles(ac.signal),
    ])
      .then(([users, roles]) => {
        setUmUsers(toUmUsers(users));
        setUmRoles(toUmRoles(roles));
        setLoaded(true);
        /* muat ulang yang sukses harus menghapus jejak error sebelumnya */
        setLoadErr(false);
      })
      .catch(() => {
        if (!ac.signal.aborted) setLoadErr(true);
      });
    return () => ac.abort();
  }, [reloadKey, setUmUsers, setUmRoles]);

  function retry() {
    setLoadErr(false);
    setReloadKey((k) => k + 1);
  }

  /* Dropdown "Karyawan tertaut" membaca master karyawan hasil hidrasi backend
     (NIK 9 digit asli dari DB, ADR 0014) — dimuat SEKALI saat halaman dibuka,
     terpisah dari Promise.all di atas dan sengaja non-fatal: daftar user harus
     tetap bisa dikelola walau akun ini tidak punya permission employees:view
     (403) atau daftar karyawannya sedang tidak bisa diambil. Saat gagal,
     dropdown hanya menawarkan "tanpa tautan" + nilai lama user yang diedit. */
  React.useEffect(() => {
    const ac = new AbortController();
    void employeesApi
      .listAllEmployees(ac.signal)
      .then((rows) => setEmps(toEmployees(rows)))
      .catch(() => {
        /* non-fatal — lihat catatan di atas */
      });
    return () => ac.abort();
  }, [setEmps]);

  /* Pesan per-field dari 422 (mis. NIK bukan 9 digit, email kembar) lebih
     berguna daripada pesan umumnya — errorDetail menggabungkannya, pola yang
     sama dengan halaman register & Mesin Fingerprint. */
  function toastErr(e: unknown) {
    pushToast("error", t.apErrT, errorDetail(e, t.umLoadErrB));
  }

  const [q, setQ] = React.useState("");
  const [statusF, setStatusF] = React.useState("all");
  const [roleF, setRoleF] = React.useState("all");

  /* dialog tambah/edit user */
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UmUser | null>(null);
  const [fEmail, setFEmail] = React.useState("");
  const [fKar, setFKar] = React.useState("");
  /* Nama & NIK MANUAL — dipakai saat akun tidak ditautkan ke karyawan master
     (akun eksternal/kiosk). NIK tetap wajib: ia identitas login; tanpa jalur
     manual ini akun semacam itu tidak bisa dibuat maupun dipulihkan. */
  const [fName, setFName] = React.useState("");
  const [fNik, setFNik] = React.useState("");
  const [fRoles, setFRoles] = React.useState<Record<string, boolean>>({});
  const [fActive, setFActive] = React.useState(true);
  const [err, setErr] = React.useState(false);
  /* password awal — hanya diminta saat menambah (backend mewajibkannya) */
  const [fPw, setFPw] = React.useState("");
  const [fPwErr, setFPwErr] = React.useState<PwIssue | null>(null);

  /* satu penanda untuk seluruh tulisan CRUD — tombol simpan/hapus dimatikan
     selama menunggu server, seperti `saving` di halaman Mesin Fingerprint */
  const [saving, setSaving] = React.useState(false);

  /* dialog nonaktifkan + hapus */
  const [offTarget, setOffTarget] = React.useState<UmUser | null>(null);
  const [delTarget, setDelTarget] = React.useState<UmUser | null>(null);

  /* dialog atur ulang password */
  const [pwTarget, setPwTarget] = React.useState<UmUser | null>(null);
  const [pwNew, setPwNew] = React.useState("");
  const [pwConf, setPwConf] = React.useState("");
  const [pwErr, setPwErr] = React.useState<PwIssue | "conf" | null>(null);
  const [pwBusy, setPwBusy] = React.useState(false);

  const roleName = (id: string) => umRoles.find((r) => r.id === id)?.name ?? id;
  const karOpts = emps.map((e) => `${e.name} — ${e.nik}`);

  /* ---- Pagar pengaman RBAC ----
     Mencegah admin mengunci dirinya sendiri atau menghapus Superadmin
     terakhir sehingga tidak ada lagi yang bisa mengelola user. */
  const superRoleIds = umRoles.filter((r) => r.locked).map((r) => r.id);
  const isSuperUser = (u: UmUser) =>
    u.roles.some((r) => superRoleIds.includes(r));
  const activeSupers = umUsers.filter((u) => u.on && isSuperUser(u));
  const isLastActiveSuper = (u: UmUser) =>
    activeSupers.length <= 1 && activeSupers[0]?.id === u.id;

  /* Mengembalikan pesan penolakan, atau null bila perubahan boleh dilakukan */
  function guard(
    target: UmUser,
    nextRoles: string[],
    nextOn: boolean
  ): string | null {
    const isSelf = me?.id === target.id;
    if (isSelf && !nextOn) return t.umGuardSelfOff;
    if (isSelf) {
      const after = effectivePerms(
        { ...target, roles: nextRoles, on: nextOn },
        umRoles
      );
      if (!rbacCan(after, "users", "manage")) return t.umGuardSelfRole;
    }
    if (isLastActiveSuper(target)) {
      const stillSuper =
        nextOn && nextRoles.some((r) => superRoleIds.includes(r));
      if (!stillSuper)
        return nextOn ? t.umGuardLastSuperRole : t.umGuardLastSuper;
    }
    return null;
  }

  /* keadaan error per-field form (dievaluasi ulang tiap render) */
  const fEmailBad = fEmail.trim() !== "" && !EMAIL_RE.test(fEmail.trim());
  const fRolesEmpty = !Object.values(fRoles).some(Boolean);
  const fNikBad = editing
    ? fNik.trim() !== "" && !NIK_RE.test(fNik.trim())
    : !NIK_RE.test(fNik.trim());
  /* tautan yang NIK-nya tidak terdecode 9 digit — jangan gagal bisu */
  const fLinkedNikBad = fKar !== "" && !NIK_RE.test(splitLinked(fKar)[1]);

  const rows = umUsers.filter((u) => {
    const needle = q.toLowerCase();
    if (
      needle &&
      !u.email.toLowerCase().includes(needle) &&
      !(u.nik ?? "").includes(needle) &&
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
    setFName("");
    setFNik("");
    setFRoles({});
    setFActive(true);
    setFPw("");
    setFPwErr(null);
    setErr(false);
    setDlgOpen(true);
  }

  function openEdit(u: UmUser) {
    setEditing(u);
    setFEmail(u.email);
    /* prefill hanya bila pasangan nama+NIK lengkap — kar tanpa NIK (akun
       eksternal yang tetap bernama di backend) jatuh ke "tanpa tautan"
       supaya NIK "null" tidak pernah ikut terkirim */
    setFKar(u.kar && u.nik ? `${u.kar} — ${u.nik}` : "");
    /* akun tanpa tautan: nama & NIK tersimpannya masuk ke field manual */
    setFName(u.kar ?? "");
    setFNik(u.nik ?? "");
    setFRoles(Object.fromEntries(u.roles.map((r) => [r, true])));
    setFActive(u.on);
    setFPw("");
    setFPwErr(null);
    setErr(false);
    setDlgOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const roles = Object.keys(fRoles).filter((r) => fRoles[r]);
    const email = fEmail.trim();
    /* Nama & NIK dari karyawan tertaut, atau dari field manual bila tanpa
       tautan. Email opsional (format diperiksa bila diisi). NIK wajib untuk
       akun BARU — identitas login; saat mengedit, NIK manual kosong berarti
       pertahankan yang tersimpan (backend mengabaikan nik ""). */
    const manual = !fKar;
    const [karLinked, nikLinked] = fKar ? splitLinked(fKar) : ["", ""];
    const kar = manual ? fName.trim() || null : karLinked || null;
    const nik = manual ? fNik.trim() || null : nikLinked || null;
    const emailOk = email === "" || EMAIL_RE.test(email);
    /* NIK null hanya sah saat mengedit akun manual (= pertahankan yang
       tersimpan); selain itu — termasuk hasil decode tautan — harus 9 digit */
    const nikOk = nik === null ? editing !== null && manual : NIK_RE.test(nik);
    const nameOk = !manual || editing !== null || kar !== null;
    if (!emailOk || !nikOk || !nameOk || roles.length === 0) {
      setErr(true);
      return;
    }
    if (!editing) {
      const issues = passwordIssues(fPw);
      if (issues.length) {
        setFPwErr(issues[0]);
        return;
      }
      setFPwErr(null);
    }

    if (editing) {
      const blocked = guard(editing, roles, fActive);
      if (blocked) {
        pushToast("error", t.umUserEditT, blocked);
        return;
      }
      /* Tanpa tautan karyawan, nama & NIK lama dipertahankan: backend
         mewajibkan `name` non-kosong dan mengabaikan NIK kosong, jadi
         "melepas tautan" memang tidak menghapus keduanya di server. */
      const nextKar = kar ?? editing.kar;
      const nextNik = nik ?? editing.nik;
      setSaving(true);
      try {
        await usersApi.updateUser(editing.id, {
          name: nextKar ?? userLabel(editing),
          email,
          nik: nik ?? "",
          roles,
        });
        /* PUT sudah tersimpan di server — pantulkan dulu ke state supaya
           tabel tidak basi bila langkah status di bawah gagal */
        setUmUsers((prev) =>
          prev.map((u) =>
            u.id === editing.id
              ? { ...u, email, kar: nextKar, nik: nextNik, roles }
              : u
          )
        );
        /* status aktif bukan bagian PUT — endpoint-nya terpisah, dan hanya
           dipanggil bila memang berubah supaya niatnya selalu tersurat */
        if (fActive !== editing.on) {
          await usersApi.toggleUserStatus(editing.id, fActive);
          setUmUsers((prev) =>
            prev.map((u) => (u.id === editing.id ? { ...u, on: fActive } : u))
          );
        }
        pushToast(
          "success",
          t.umToastUserEdit,
          userLabel({ email, nik: nextNik, kar: nextKar })
        );
        setDlgOpen(false);
      } catch (e2) {
        toastErr(e2);
      } finally {
        setSaving(false);
      }
    } else {
      setSaving(true);
      try {
        /* nama dari karyawan tertaut atau field manual (divalidasi di atas) */
        const created = await usersApi.createUser({
          name: kar ?? "",
          email,
          nik: nik ?? "",
          password: fPw,
          roles,
        });
        const mapped = toUmUser(created);
        if (mapped) setUmUsers((prev) => [...prev, mapped]);
        pushToast("success", t.umToastUserAdd, userLabel({ email, nik, kar }));
        setDlgOpen(false);
        /* backend selalu membuat user aktif — checkbox nonaktif dieksekusi
           sebagai langkah kedua lewat endpoint status */
        if (!fActive) {
          await usersApi.toggleUserStatus(created.id, false);
          setUmUsers((prev) =>
            prev.map((u) =>
              u.id === String(created.id) ? { ...u, on: false } : u
            )
          );
        }
      } catch (e2) {
        toastErr(e2);
      } finally {
        setSaving(false);
      }
    }
  }

  async function offDo() {
    if (!offTarget) return;
    const blocked = guard(offTarget, offTarget.roles, false);
    if (blocked) {
      pushToast("error", t.umOff, blocked);
      setOffTarget(null);
      return;
    }
    setSaving(true);
    try {
      await usersApi.toggleUserStatus(offTarget.id, false);
      setUmUsers((prev) =>
        prev.map((u) => (u.id === offTarget.id ? { ...u, on: false } : u))
      );
      pushToast(
        "info",
        t.umToastOff,
        `${userLabel(offTarget)} — ${t.umToastOffD}`
      );
      setOffTarget(null);
    } catch (e2) {
      toastErr(e2);
    } finally {
      setSaving(false);
    }
  }

  async function onDo(u: UmUser) {
    try {
      await usersApi.toggleUserStatus(u.id, true);
      setUmUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, on: true } : x))
      );
      pushToast("success", t.umToastOn, `${userLabel(u)} — ${t.umToastOnD}`);
    } catch (e2) {
      toastErr(e2);
    }
  }

  /* ---- Hapus user ----
     Pagar yang sama dengan nonaktif, ditambah larangan hapus diri sendiri:
     akun yang hilang tidak bisa "diaktifkan lagi kapan pun". */
  function delGuard(u: UmUser): string | null {
    if (me?.id === u.id) return t.umGuardSelfDel;
    if (isLastActiveSuper(u)) return t.umGuardLastSuperDel;
    return null;
  }

  function askDel(u: UmUser) {
    const blocked = delGuard(u);
    if (blocked) {
      pushToast("error", t.umUserDelT, blocked);
      return;
    }
    setDelTarget(u);
  }

  async function delDo() {
    if (!delTarget) return;
    setSaving(true);
    try {
      await usersApi.deleteUser(delTarget.id);
      setUmUsers((prev) => prev.filter((u) => u.id !== delTarget.id));
      pushToast("success", t.umToastUserDel, userLabel(delTarget));
      setDelTarget(null);
    } catch (e2) {
      toastErr(e2);
    } finally {
      setSaving(false);
    }
  }

  /* ---- Atur ulang password (khusus permission Kelola) ----
     Tidak ada endpoint reset password tersendiri — PUT /api/users/:id
     menerima `password` opsional, jadi field lain dikirim balik apa adanya.
     Password tidak pernah di-hash di klien: hashing milik server. */
  function openPw(u: UmUser) {
    setPwTarget(u);
    setPwNew("");
    setPwConf("");
    setPwErr(null);
  }

  async function pwSave(e: React.FormEvent) {
    e.preventDefault();
    if (!pwTarget) return;
    const issues = passwordIssues(pwNew);
    if (issues.length) {
      setPwErr(issues[0]);
      return;
    }
    if (pwNew !== pwConf) {
      setPwErr("conf");
      return;
    }
    setPwErr(null);
    setPwBusy(true);
    try {
      await usersApi.updateUser(pwTarget.id, {
        /* backend menolak name kosong — akun tanpa nama memakai email-nya */
        name: pwTarget.kar ?? userLabel(pwTarget),
        email: pwTarget.email,
        nik: pwTarget.nik ?? "",
        roles: pwTarget.roles,
        password: pwNew,
      });
      setUmUsers((prev) =>
        prev.map((u) =>
          u.id === pwTarget.id ? { ...u, pwAt: new Date().toISOString() } : u
        )
      );
      setPwTarget(null);
      setPwNew("");
      setPwConf("");
      pushToast(
        "success",
        t.umPwToastT,
        `${userLabel(pwTarget)} — ${t.umPwToastD}`
      );
    } catch (e2) {
      toastErr(e2);
    } finally {
      setPwBusy(false);
    }
  }

  const pwIssueText = (issue: PwIssue | "conf" | null): string | undefined =>
    issue === "len"
      ? t.umPwErrLen
      : issue === "num"
        ? t.umPwErrNum
        : issue === "letter"
          ? t.umPwErrLetter
          : issue === "conf"
            ? t.umPwErrConf
            : undefined;

  /* Export CSV dirakit backend (GET /api/users/export) — tersedia juga untuk
     permission Lihat karena hanya membaca. */
  async function exportCsv() {
    try {
      const blob = await usersApi.exportUsers();
      const name = `users_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadBlob(name, blob);
      pushToast("success", t.umToastExp, name);
    } catch (e2) {
      toastErr(e2);
    }
  }

  function importChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    /* reset dulu supaya file yang sama bisa dipilih ulang setelah gagal */
    e.target.value = "";
    if (!file) return;
    void (async () => {
      try {
        const res = await usersApi.importUsers(file);
        pushToast("success", t.umToastImp, `${res.imported} ${t.umToastImpD}`);
        /* baris baru lahir di server — daftar dimuat ulang, bukan ditebak */
        setReloadKey((k) => k + 1);
      } catch (e2) {
        toastErr(e2);
      }
    })();
  }

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.umUsersT} sub={t.umSub}>
        {canManage ? (
          <Button onClick={openAdd}>
            <Plus />
            {t.umUserAdd}
          </Button>
        ) : (
          <Badge variant="neutral">{t.umReadOnly}</Badge>
        )}
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.umUserListT}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60 max-sm:w-full"
              placeholder={t.umSearchPh}
              aria-label={t.umSearchPh}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              wrapperClassName="w-37.5 max-sm:w-full"
              aria-label={t.thStatus}
              value={statusF}
              onChange={(e) => setStatusF(e.target.value)}
            >
              <option value="all">{t.umFAll}</option>
              <option value="on">{t.stAktif}</option>
              <option value="off">{t.stNonaktif}</option>
            </Select>
            <Select
              wrapperClassName="w-42.5 max-sm:w-full"
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
            {canManage ? (
              <Button
                variant="secondary"
                onClick={() => impRef.current?.click()}
              >
                <Upload />
                Import
              </Button>
            ) : null}
            {/* Export tetap tersedia untuk permission Lihat — hanya membaca */}
            <Button variant="secondary" onClick={() => void exportCsv()}>
              <Download />
              Export
            </Button>
            <input
              ref={impRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={importChange}
            />
          </ToolbarGroup>
        </Toolbar>

        {loadErr ? (
          <StateBox
            icon={<CircleAlert className="text-danger-text" />}
            title={t.apLoadErrT}
            body={t.umLoadErrB}
          >
            <Button onClick={retry}>{t.apRetry}</Button>
          </StateBox>
        ) : !loaded ? (
          <div className="grid place-items-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : rows.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Email</TableHead>
                <TableHead className="max-xl:hidden">{t.umLinked}</TableHead>
                <TableHead className="max-xl:hidden">NIK</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="max-xl:hidden">{t.umPwCol}</TableHead>
                <TableHead>{t.thStatus}</TableHead>
                {canManage ? (
                  <TableHead className="w-45">{t.thAct}</TableHead>
                ) : null}
              </tr>
            </TableHeader>
            <TableBody>
              {pg.rows.map((u) => (
                <TableRow
                  key={u.id}
                  className={u.on ? undefined : "opacity-60"}
                >
                  <TableCell>
                    {u.email ? (
                      <b className="font-semibold">{u.email}</b>
                    ) : (
                      <span className="text-(--text-tertiary)">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-xl:hidden">
                    {u.kar ? (
                      <span className="font-semibold">{u.kar}</span>
                    ) : (
                      <span className="text-(--text-tertiary)">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-(--text-secondary) tabular-nums max-xl:hidden">
                    {u.nik ?? (
                      /* tanpa NIK = tidak bisa login — beri tanda, bukan "—" */
                      <Badge variant="warning" dot>
                        {t.umNoNik}
                      </Badge>
                    )}
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
                  {/* stempel ganti password terakhir (pwAt backend) — nilai
                      password sendiri tidak pernah sampai ke klien */}
                  <TableCell className="max-xl:hidden">
                    {u.pwAt ? (
                      <span
                        className="text-(--text-secondary)"
                        title={new Date(u.pwAt).toLocaleString()}
                      >
                        {t.umPwSet}
                        <span className="text-(--text-tertiary)">
                          {" · "}
                          {new Date(u.pwAt).toLocaleDateString()}
                        </span>
                      </span>
                    ) : (
                      <span className="text-(--text-tertiary)">
                        {t.umPwNever}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.on ? "success" : "danger"} dot>
                      {u.on ? t.stAktif : t.stNonaktif}
                    </Badge>
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <div className="flex gap-2">
                        <IconButton
                          aria-label={t.udbEditT}
                          onClick={() => openEdit(u)}
                        >
                          <Pencil />
                        </IconButton>
                        <IconButton
                          aria-label={`${t.umPwT} — ${userLabel(u)}`}
                          title={t.umPwT}
                          onClick={() => openPw(u)}
                        >
                          <KeyRound />
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
                          <IconButton
                            aria-label={t.umOn}
                            onClick={() => void onDo(u)}
                          >
                            <CheckCircle2 />
                          </IconButton>
                        )}
                        <IconButton
                          danger
                          aria-label={`${t.umUserDelT} — ${userLabel(u)}`}
                          title={t.umUserDelT}
                          onClick={() => askDel(u)}
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
        ) : (
          <StateBox
            icon={<Search className="text-primary-bright" />}
            title={t.noResTitle}
            body={t.empEmptyB}
          />
        )}
        {/* ringkasan "0 user" selama memuat/gagal hanya membingungkan —
            kaki tabel ikut menunggu datanya */}
        {loaded && !loadErr ? (
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
        ) : null}
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
          {editing ? `${t.umUserEditT} — ${userLabel(editing)}` : t.umUserAdd}
        </DialogTitle>
        <DialogBody>{t.umUserDlgB}</DialogBody>
        <form onSubmit={save} noValidate>
          <Field
            className="mt-4"
            label={t.umEmailOptional}
            htmlFor="um-email"
            error={err && fEmailBad}
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
          <Field
            className="mt-4"
            label={t.umLinked}
            htmlFor="um-kar"
            error={err && fLinkedNikBad}
            errorMessage={t.regNikErr}
          >
            <Select
              id="um-kar"
              value={fKar}
              onChange={(e) => setFKar(e.target.value)}
            >
              <option value="">{t.umNoLink}</option>
              {/* tautan lama user yang karyawannya tidak ada di daftar (mis.
                  daftar gagal dimuat, atau karyawannya sudah dihapus) tetap
                  ditawarkan supaya nilai tersimpannya tidak diam-diam lepas */}
              {fKar && !karOpts.includes(fKar) ? (
                <option value={fKar}>{fKar}</option>
              ) : null}
              {karOpts.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </Field>
          {/* tanpa tautan: nama & NIK diisi manual — NIK identitas login */}
          {!fKar ? (
            <>
              <Field
                className="mt-4"
                label={t.umNameManual}
                htmlFor="um-name"
                required={!editing}
                error={err && !editing && !fName.trim()}
                errorMessage={t.errNama}
              >
                <Input
                  id="um-name"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder={t.regNamePh}
                  maxLength={100}
                />
              </Field>
              <Field
                className="mt-4"
                label={t.umNikManual}
                htmlFor="um-nik"
                required={!editing}
                helper={t.umNikManualHelp}
                error={err && fNikBad}
                errorMessage={t.regNikErr}
              >
                <Input
                  id="um-nik"
                  value={fNik}
                  onChange={(e) =>
                    setFNik(e.target.value.replace(/\D/g, "").slice(0, 9))
                  }
                  inputMode="numeric"
                  placeholder={t.regNikPh}
                  className="font-mono"
                />
              </Field>
            </>
          ) : null}
          {!editing ? (
            <Field
              className="mt-4"
              label={t.umPwInit}
              htmlFor="um-pw"
              required
              helper={t.umPwHelp}
              error={fPwErr !== null}
              errorMessage={pwIssueText(fPwErr)}
            >
              <PasswordInput
                id="um-pw"
                value={fPw}
                onChange={setFPw}
                autoComplete="new-password"
                toggleLabel={t.umPwShow}
              />
            </Field>
          ) : null}
          <Field
            className="mt-4"
            label="Roles"
            required
            error={err && fRolesEmpty}
            errorMessage={t.umErrRoles}
          >
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
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner className="size-4" /> : null}
              {editing ? t.udbSaveEdit : t.umUserSaveAdd}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* dialog atur ulang password — hanya untuk permission Kelola */}
      <Dialog
        open={pwTarget !== null}
        onClose={() => setPwTarget(null)}
        className="w-[min(480px,100%)]"
        labelledBy="umpw-t"
      >
        <DialogIcon variant="warning">
          <KeyRound />
        </DialogIcon>
        <DialogTitle id="umpw-t">
          {`${t.umPwT} — ${pwTarget ? userLabel(pwTarget) : ""}`}
        </DialogTitle>
        <DialogBody>{t.umPwB}</DialogBody>
        <form onSubmit={pwSave} noValidate>
          <Field
            className="mt-4"
            label={t.umPwNew}
            htmlFor="um-pw-new"
            required
            helper={t.umPwHelp}
            error={pwErr !== null && pwErr !== "conf"}
            errorMessage={pwIssueText(pwErr)}
          >
            <PasswordInput
              id="um-pw-new"
              value={pwNew}
              onChange={setPwNew}
              autoComplete="new-password"
              toggleLabel={t.umPwShow}
            />
          </Field>
          <Field
            className="mt-4"
            label={t.umPwConf}
            htmlFor="um-pw-conf"
            required
            error={pwErr === "conf"}
            errorMessage={t.umPwErrConf}
          >
            <PasswordInput
              id="um-pw-conf"
              value={pwConf}
              onChange={setPwConf}
              autoComplete="new-password"
              toggleLabel={t.umPwShow}
            />
          </Field>
          <DialogActions>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPwTarget(null)}
            >
              {t.btnCancel}
            </Button>
            <Button type="submit" disabled={pwBusy}>
              {pwBusy ? <Spinner className="size-4" /> : null}
              {t.umPwSave}
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
        <DialogTitle id="umo-t">
          {`${t.umOff} ${offTarget ? userLabel(offTarget) : ""}?`}
        </DialogTitle>
        <DialogBody>{t.umOffB}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setOffTarget(null)}>
            {t.btnCancel}
          </Button>
          <Button
            variant="destructive"
            disabled={saving}
            onClick={() => void offDo()}
          >
            {t.umOff}
          </Button>
        </DialogActions>
      </Dialog>

      {/* dialog hapus user */}
      <Dialog
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        labelledBy="umd-t"
      >
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="umd-t">
          {`${t.umUserDelT} ${delTarget ? userLabel(delTarget) : ""}?`}
        </DialogTitle>
        <DialogBody>{t.umUserDelB}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDelTarget(null)}>
            {t.btnCancel}
          </Button>
          <Button
            variant="destructive"
            disabled={saving}
            onClick={() => void delDo()}
          >
            {t.empDelDo}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
