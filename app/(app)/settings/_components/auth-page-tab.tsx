"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  Image as ImageIcon,
  ListPlus,
  Pencil,
  Plus,
  Trash2,
  UserCog,
} from "lucide-react";

import { errorDetail, settingsApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { usePermissions } from "@/components/providers/permissions";
import { AuthSlideshow, authSlideSrc } from "@/components/ui/auth-slideshow";
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
import { Dropzone } from "@/components/ui/dropzone";
import { Field, FormGrid } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Panel,
  SectionTitle,
  Toolbar,
  ToolbarTitle,
} from "@/components/ui/panel";
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

type ApiAuthSlide = settingsApi.ApiAuthSlide;
type ApiAuthOption = settingsApi.ApiAuthOption;
type AuthOptionKind = settingsApi.AuthOptionKind;

/* Tab "Halaman Auth" — modul superadmin untuk hal-hal yang dikonsumsi alur
   auth publik:
   1. Gambar slideshow panel kiri halaman login/register (rotasi 5 detik) —
      lewat GET /api/auth/page-config.
   2. Opsi dropdown Posisi & Departemen pada formulir registrasi — idem.
   3. Role default pendaftar baru — dipakai POST /api/auth/register saat
      membuat akun (dulu hardcode Viewer). Superadmin tidak pernah ditawarkan.

   Berbeda dari tab lain yang masih mock-backed (app-store), tab ini menulis
   langsung ke backend — halaman register membaca datanya sebelum login, jadi
   perubahan harus benar-benar tersimpan. */

export function AuthPageTab() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  /* Route /settings sudah menuntut `view`; kontrol role default di bawah
     hanya aktif untuk `manage` — penegakan aslinya tetap di backend. */
  const { can } = usePermissions();
  const canManage = can("settings", "manage");

  /* null = masih memuat */
  const [slides, setSlides] = React.useState<ApiAuthSlide[] | null>(null);
  const [opts, setOpts] = React.useState<ApiAuthOption[] | null>(null);
  const [loadErr, setLoadErr] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  /* Identitas harus stabil: array baru dari filter di setiap render membuat
     AuthSlideshow pratinjau me-reset indeksnya (pola prevSlides di sana)
     pada tiap ketikan/toast — pratinjau tak pernah sempat berputar. */
  const activeSlides = React.useMemo(
    () => (slides ?? []).filter((s) => s.active),
    [slides]
  );

  /* setState hanya di dalam callback .then/.catch — pola yang sama dengan
     weather provider, lolos react-hooks/set-state-in-effect. `reloadKey`
     menaikkan diri untuk memicu muat ulang dari tombol retry. */
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    const ac = new AbortController();
    void Promise.all([
      settingsApi.listAuthSlides(ac.signal),
      settingsApi.listAuthOptions(undefined, ac.signal),
    ])
      .then(([s, o]) => {
        setSlides(s);
        setOpts(o);
      })
      .catch(() => {
        if (!ac.signal.aborted) setLoadErr(true);
      });
    return () => ac.abort();
  }, [reloadKey]);

  /* ── role default pendaftar ──
     Dimuat TERPISAH dari Promise.all di atas: endpoint-nya lebih baru, dan
     kegagalannya tidak boleh ikut menjatuhkan pengelolaan slide/opsi yang
     sudah jalan. Gagal → StateBox kecil di panelnya sendiri. */
  const [roleCfg, setRoleCfg] =
    React.useState<settingsApi.ApiRegisterRoleConfig | null>(null);
  const [roleSel, setRoleSel] = React.useState("");
  const [roleErr, setRoleErr] = React.useState(false);

  React.useEffect(() => {
    const ac = new AbortController();
    void settingsApi
      .getRegisterRole(ac.signal)
      .then((cfg) => {
        setRoleCfg(cfg);
        setRoleSel(String(cfg.defaultRoleId));
      })
      .catch(() => {
        if (!ac.signal.aborted) setRoleErr(true);
      });
    return () => ac.abort();
  }, [reloadKey]);

  function retry() {
    setLoadErr(false);
    setSlides(null);
    setOpts(null);
    setRoleErr(false);
    setRoleCfg(null);
    setReloadKey((k) => k + 1);
  }

  async function saveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleCfg || !roleSel) return;
    /* Kirim id APA ADANYA dari respons GET (bukan hasil parse ulang) supaya
       tipenya — string atau angka — selalu sama dengan yang backend berikan. */
    const picked = roleCfg.roles.find((r) => String(r.id) === roleSel);
    if (!picked) return;
    setBusy(true);
    try {
      await settingsApi.updateRegisterRole(picked.id);
      setRoleCfg({ ...roleCfg, defaultRoleId: picked.id });
      pushToast(
        "success",
        t.apRoleToastT,
        `${picked.name} — ${t.apRoleToastD}`
      );
    } catch (e2) {
      toastErr(e2);
    } finally {
      setBusy(false);
    }
  }

  /* Pesan validasi per-field (mis. "nama sudah ada" dari unique constraint)
     dikirim backend di errors[], bukan message utama ("Validation failed") —
     errorDetail (lib/api/error.ts) yang merangkainya jadi satu kalimat. */
  function toastErr(e: unknown) {
    pushToast("error", t.apErrT, errorDetail(e, t.apLoadErrB));
  }

  /* ── dialog slide: tambah / edit / hapus ── */
  const [dlgAdd, setDlgAdd] = React.useState(false);
  const [fTitle, setFTitle] = React.useState("");
  const [fFile, setFFile] = React.useState<File | null>(null);
  const [fFileName, setFFileName] = React.useState("");
  const [fileErr, setFileErr] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [editing, setEditing] = React.useState<ApiAuthSlide | null>(null);
  const [eTitle, setETitle] = React.useState("");
  const [eActive, setEActive] = React.useState(true);

  const [delSlide, setDelSlide] = React.useState<ApiAuthSlide | null>(null);

  function openAdd() {
    setFTitle("");
    setFFile(null);
    setFFileName("");
    setFileErr(false);
    setDlgAdd(true);
  }

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    setFFile(f);
    setFFileName(f.name);
    setFileErr(false);
  }

  async function saveAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!fFile) {
      setFileErr(true);
      return;
    }
    setBusy(true);
    try {
      const created = await settingsApi.createAuthSlide(fFile, fTitle.trim());
      setSlides((prev) => [...(prev ?? []), created]);
      pushToast("success", t.apSlideToastAdd, created.title || fFileName);
      setDlgAdd(false);
    } catch (e2) {
      toastErr(e2);
    } finally {
      setBusy(false);
    }
  }

  function openEdit(s: ApiAuthSlide) {
    setEditing(s);
    setETitle(s.title);
    setEActive(s.active);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await settingsApi.updateAuthSlide(editing.id, {
        title: eTitle.trim(),
        sortOrder: editing.sortOrder,
        active: eActive,
      });
      setSlides((prev) =>
        (prev ?? []).map((s) =>
          s.id === editing.id
            ? { ...s, title: eTitle.trim(), active: eActive }
            : s
        )
      );
      pushToast("success", t.apSlideToastEdit);
      setEditing(null);
    } catch (e2) {
      toastErr(e2);
    } finally {
      setBusy(false);
    }
  }

  /* Tukar posisi dua slide bertetangga. sort_order lama bisa saja kembar
     (data seed/impor), jadi seluruh daftar ditulis ulang memakai indeks
     barunya — jumlah slide kecil, beberapa PUT tidak masalah. */
  async function moveSlide(idx: number, dir: -1 | 1) {
    if (!slides) return;
    const j = idx + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[idx], next[j]] = [next[j], next[idx]];
    setBusy(true);
    try {
      await Promise.all(
        next.map((s, k) =>
          s.sortOrder === k
            ? Promise.resolve()
            : settingsApi.updateAuthSlide(s.id, {
                title: s.title,
                sortOrder: k,
                active: s.active,
              })
        )
      );
      setSlides(next.map((s, k) => ({ ...s, sortOrder: k })));
    } catch (e2) {
      toastErr(e2);
      /* Batch PUT bisa gagal separuh — urutan di server tak lagi sama dengan
         yang tampil. Ambil ulang kebenaran server, jangan menebak. */
      try {
        setSlides(await settingsApi.listAuthSlides());
      } catch {
        /* server masih tak terjangkau — biarkan tampilan lama */
      }
    } finally {
      setBusy(false);
    }
  }

  async function delSlideDo() {
    if (!delSlide) return;
    setBusy(true);
    try {
      await settingsApi.deleteAuthSlide(delSlide.id);
      setSlides((prev) => (prev ?? []).filter((s) => s.id !== delSlide.id));
      pushToast("success", t.apSlideToastDel, delSlide.title || undefined);
      setDelSlide(null);
    } catch (e2) {
      toastErr(e2);
    } finally {
      setBusy(false);
    }
  }

  /* ── opsi registrasi ── */
  const [delOpt, setDelOpt] = React.useState<ApiAuthOption | null>(null);

  async function addOption(kind: AuthOptionKind, name: string) {
    const clean = name.trim().toUpperCase();
    if (!clean) return false;
    setBusy(true);
    try {
      const created = await settingsApi.createAuthOption({ kind, name: clean });
      setOpts((prev) => [...(prev ?? []), created]);
      pushToast("success", t.apOptToastAdd, clean);
      return true;
    } catch (e2) {
      toastErr(e2);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleOption(o: ApiAuthOption, active: boolean) {
    setBusy(true);
    try {
      await settingsApi.updateAuthOption(o.id, {
        name: o.name,
        sortOrder: o.sortOrder,
        active,
      });
      setOpts((prev) =>
        (prev ?? []).map((x) => (x.id === o.id ? { ...x, active } : x))
      );
      pushToast("success", t.apOptToastEdit, o.name);
    } catch (e2) {
      toastErr(e2);
    } finally {
      setBusy(false);
    }
  }

  async function delOptDo() {
    if (!delOpt) return;
    setBusy(true);
    try {
      await settingsApi.deleteAuthOption(delOpt.id);
      setOpts((prev) => (prev ?? []).filter((x) => x.id !== delOpt.id));
      pushToast("success", t.apOptToastDel, delOpt.name);
      setDelOpt(null);
    } catch (e2) {
      toastErr(e2);
    } finally {
      setBusy(false);
    }
  }

  /* ── render ── */
  if (loadErr) {
    return (
      <Panel>
        <StateBox
          icon={<CircleAlert className="text-danger-text" />}
          title={t.apLoadErrT}
          body={t.apLoadErrB}
        >
          <Button onClick={retry}>{t.apRetry}</Button>
        </StateBox>
      </Panel>
    );
  }

  if (slides === null || opts === null) {
    return (
      <Panel className="grid place-items-center py-16">
        <Spinner className="size-6" />
      </Panel>
    );
  }

  return (
    <>
      {/* ── gambar slideshow ── */}
      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.apSlidesTitle}</ToolbarTitle>
          <Button onClick={openAdd} disabled={busy}>
            <Plus />
            {t.apSlideAdd}
          </Button>
        </Toolbar>
        <p className="mb-4 text-sm text-(--text-secondary)">{t.apSlidesHelp}</p>

        {/* pratinjau hidup — persis komponen yang dipakai halaman auth */}
        {activeSlides.length ? (
          <div
            data-theme="dark"
            className="relative mb-5 h-40 overflow-hidden rounded-card border border-(--glass-1-border)"
          >
            <AuthSlideshow slides={activeSlides} />
          </div>
        ) : null}

        {slides.length === 0 ? (
          <StateBox icon={<ImageIcon />} title={t.apSlideEmpty} />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-30">{t.apThumb}</TableHead>
                <TableHead>{t.apSlideTitleL}</TableHead>
                <TableHead>{t.thStatus}</TableHead>
                <TableHead className="w-45">{t.thAct}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {slides.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={authSlideSrc(s)}
                      alt={s.title || t.apThumb}
                      loading="lazy"
                      className="h-13 w-24 rounded-lg border border-(--glass-1-border) object-cover object-center"
                    />
                  </TableCell>
                  <TableCell className="font-semibold">
                    {s.title || (
                      <span className="font-normal text-(--text-tertiary)">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.active ? "success" : "danger"} dot>
                      {s.active ? t.stAktif : t.stNonaktif}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <IconButton
                        aria-label={t.apSlideUp}
                        disabled={busy || i === 0}
                        onClick={() => void moveSlide(i, -1)}
                      >
                        <ArrowUp />
                      </IconButton>
                      <IconButton
                        aria-label={t.apSlideDown}
                        disabled={busy || i === slides.length - 1}
                        onClick={() => void moveSlide(i, 1)}
                      >
                        <ArrowDown />
                      </IconButton>
                      <IconButton
                        aria-label={t.udbEditT}
                        disabled={busy}
                        onClick={() => openEdit(s)}
                      >
                        <Pencil />
                      </IconButton>
                      <IconButton
                        danger
                        aria-label={t.empDel}
                        disabled={busy}
                        onClick={() => setDelSlide(s)}
                      >
                        <Trash2 />
                      </IconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {/* ── opsi formulir registrasi ── */}
      <Panel>
        <SectionTitle>
          <ListPlus />
          {t.apOptTitle}
        </SectionTitle>
        <p className="mb-5 text-sm text-(--text-secondary)">{t.apOptHelp}</p>
        <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
          <OptionColumn
            title={t.regPos}
            placeholder={t.apOptPosPh}
            options={opts.filter((o) => o.kind === "position")}
            busy={busy}
            onAdd={(name) => addOption("position", name)}
            onToggle={toggleOption}
            onDelete={setDelOpt}
          />
          <OptionColumn
            title={t.regDept}
            placeholder={t.apOptDeptPh}
            options={opts.filter((o) => o.kind === "department")}
            busy={busy}
            onAdd={(name) => addOption("department", name)}
            onToggle={toggleOption}
            onDelete={setDelOpt}
          />
        </div>
      </Panel>

      {/* ── role default pendaftar baru ── */}
      <Panel>
        <SectionTitle>
          <UserCog />
          {t.apRoleTitle}
        </SectionTitle>
        <p className="mb-5 text-sm text-(--text-secondary)">{t.apRoleHelp}</p>
        {roleErr ? (
          <StateBox
            icon={<CircleAlert className="text-danger-text" />}
            title={t.apLoadErrT}
            body={t.apLoadErrB}
          >
            <Button onClick={retry}>{t.apRetry}</Button>
          </StateBox>
        ) : roleCfg === null ? (
          <div className="grid place-items-center py-6">
            <Spinner className="size-5" />
          </div>
        ) : (
          <form
            onSubmit={saveRole}
            className="flex items-start gap-3 max-md:flex-col"
          >
            <Field
              label={t.apRoleLabel}
              htmlFor="ap-role"
              className="w-full max-w-90"
              helper={
                roleCfg.roles.find((r) => String(r.id) === roleSel)?.description
              }
            >
              <Select
                id="ap-role"
                value={roleSel}
                disabled={!canManage || busy}
                onChange={(e) => setRoleSel(e.target.value)}
              >
                {roleCfg.roles.map((r) => (
                  <option key={String(r.id)} value={String(r.id)}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            {/* mt-7.5 menyejajarkan tombol dengan kontrol di bawah label */}
            <Button
              type="submit"
              className="mt-7.5 max-md:mt-0"
              disabled={
                !canManage ||
                busy ||
                !roleSel ||
                roleSel === String(roleCfg.defaultRoleId)
              }
            >
              {busy ? <Spinner className="size-4" /> : null}
              {t.stSave}
            </Button>
          </form>
        )}
      </Panel>

      {/* dialog tambah gambar */}
      <Dialog
        open={dlgAdd}
        onClose={() => setDlgAdd(false)}
        className="w-[min(520px,100%)]"
        labelledBy="aps-add-t"
      >
        <DialogIcon variant="info">
          <ImageIcon />
        </DialogIcon>
        <DialogTitle id="aps-add-t">{t.apSlideAdd}</DialogTitle>
        <DialogBody>{t.apSlideDlgB}</DialogBody>
        <form onSubmit={saveAdd} noValidate>
          <FormGrid className="mt-4">
            <Field
              className="col-span-full"
              label={t.apSlideTitleL}
              htmlFor="aps-title"
            >
              <Input
                id="aps-title"
                value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
                placeholder={t.apSlideTitlePh}
                maxLength={100}
              />
            </Field>
            <Field
              className="col-span-full"
              label={t.apSlideFile}
              required
              error={fileErr}
              errorMessage={t.apSlideErrFile}
            >
              {/* Dropzone hanya meneruskan NAMA file saat drop; File aslinya
                  ditangkap wrapper ini via onDrop yang menggelembung */}
              <div onDrop={(e) => pickFile(e.dataTransfer.files?.[0])}>
                <Dropzone
                  icon={<ImageIcon />}
                  title={fFileName || t.apSlideFilePh}
                  hint="JPG/PNG/WEBP/AVIF · maks 5 MB"
                  className="p-4"
                  onPick={() => fileRef.current?.click()}
                  onDropFile={setFFileName}
                  dragging={dragging}
                  onDragChange={setDragging}
                  aria-label={t.apSlideFile}
                />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </Field>
          </FormGrid>
          <DialogActions>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDlgAdd(false)}
            >
              {t.btnCancel}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Spinner className="size-4" /> : null}
              {t.apSlideAdd}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* dialog edit gambar */}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        labelledBy="aps-edit-t"
      >
        <DialogIcon variant="info">
          <Pencil />
        </DialogIcon>
        <DialogTitle id="aps-edit-t">{t.apSlideEditT}</DialogTitle>
        <form onSubmit={saveEdit} noValidate>
          <FormGrid className="mt-4">
            <Field
              className="col-span-full"
              label={t.apSlideTitleL}
              htmlFor="aps-etitle"
            >
              <Input
                id="aps-etitle"
                value={eTitle}
                onChange={(e) => setETitle(e.target.value)}
                placeholder={t.apSlideTitlePh}
                maxLength={100}
              />
            </Field>
          </FormGrid>
          <ToggleRow className="mt-4" htmlFor="aps-eactive">
            <Checkbox
              id="aps-eactive"
              checked={eActive}
              onChange={(e) => setEActive(e.target.checked)}
            />
            {t.stAktif}
          </ToggleRow>
          <DialogActions>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(null)}
            >
              {t.btnCancel}
            </Button>
            <Button type="submit" disabled={busy}>
              {t.udbSaveEdit}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* dialog hapus gambar */}
      <Dialog
        open={delSlide !== null}
        onClose={() => setDelSlide(null)}
        labelledBy="aps-del-t"
      >
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="aps-del-t">{`${t.apSlideDelT} "${delSlide?.title || delSlide?.imageUrl || ""}"?`}</DialogTitle>
        <DialogBody>{t.apSlideDelB}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDelSlide(null)}>
            {t.btnCancel}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={delSlideDo}>
            {t.empDelDo}
          </Button>
        </DialogActions>
      </Dialog>

      {/* dialog hapus opsi */}
      <Dialog
        open={delOpt !== null}
        onClose={() => setDelOpt(null)}
        labelledBy="apo-del-t"
      >
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="apo-del-t">{`${t.apOptDelT} "${delOpt?.name ?? ""}"?`}</DialogTitle>
        <DialogBody>{t.apOptDelB}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDelOpt(null)}>
            {t.btnCancel}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={delOptDo}>
            {t.empDelDo}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/* satu kolom opsi (Posisi ATAU Departemen): form tambah + daftar toggle */
function OptionColumn({
  title,
  placeholder,
  options,
  busy,
  onAdd,
  onToggle,
  onDelete,
}: {
  title: string;
  placeholder: string;
  options: ApiAuthOption[];
  busy: boolean;
  onAdd: (name: string) => Promise<boolean>;
  onToggle: (o: ApiAuthOption, active: boolean) => void;
  onDelete: (o: ApiAuthOption) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await onAdd(name)) setName("");
  }

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      <form onSubmit={submit} className="flex gap-2">
        {/* opsi dikunci HURUF KAPITAL — CSS untuk tampilan, nilai final
            dikapitalkan di addOption; backend menormalkan ulang */}
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          maxLength={100}
          className="uppercase"
        />
        <Button type="submit" disabled={busy || !name.trim()}>
          <Plus />
          {t.apOptAdd}
        </Button>
      </form>
      <div className="flex flex-col gap-2">
        {options.length === 0 ? (
          <p className="py-2 text-sm text-(--text-tertiary)">{t.apOptEmpty}</p>
        ) : (
          options.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between gap-3 rounded-control border border-(--divider) bg-(--fill-input) px-3 py-2"
            >
              <span
                className={
                  o.active
                    ? "text-sm font-medium"
                    : "text-sm font-medium text-(--text-tertiary) line-through"
                }
              >
                {o.name}
              </span>
              <span className="flex items-center gap-2">
                <ToggleRow>
                  <Checkbox
                    checked={o.active}
                    disabled={busy}
                    onChange={(e) => onToggle(o, e.target.checked)}
                    aria-label={`${o.name} — ${t.stAktif}`}
                  />
                </ToggleRow>
                <IconButton
                  danger
                  aria-label={`${t.apOptDelT} ${o.name}`}
                  disabled={busy}
                  onClick={() => onDelete(o)}
                >
                  <Trash2 />
                </IconButton>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
