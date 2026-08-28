"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Camera,
  CircleAlert,
  House,
  IdCard,
  Plus,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";

import { assetUrl, employeesApi, errorDetail, isApiError } from "@/lib/api";
import { toEmployee, toKomp } from "@/lib/api/adapters";
import type { Employee, Komp } from "@/lib/data/employees";
import { egiTypes } from "@/lib/data/units-db";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { RbacDenied } from "@/components/layout/rbac-denied";
import { useAppStore } from "@/components/providers/app-store";
import { usePermissions } from "@/components/providers/permissions";
import { initialsOf } from "@/components/ui/avatar";
import { Button, IconButton, Spinner } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogIcon,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dropzone } from "@/components/ui/dropzone";
import { Field, FormGrid } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PageTitle, Panel, SectionTitle } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { StateBox } from "@/components/ui/state-box";
import { useToast } from "@/components/ui/toast";

type Fields = {
  nama: string;
  nik: string;
  company: string;
  dept: string;
  pos: string;
  equip: string;
  join: string;
  exp: string;
  simper: string;
  simperExp: string;
  license: string;
  mcu: string;
  medis: string;
  mess: string;
  kamar: string;
};

/* batas unggah foto mengikuti validasi backend (handler UploadPhoto) */
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export function EmployeeForm({ nik }: { nik?: string }) {
  const { t } = useI18n();
  const { can } = usePermissions();
  const { pushToast } = useToast();
  const { upsertEmp, mdData } = useAppStore();
  const router = useRouter();

  /* Mode edit memuat record-nya sendiri dari backend (bukan dari store)
     supaya refresh dan deep-link /employees/:nik/edit tetap bekerja — pola
     yang sama dengan halaman detail. Mode tambah tidak butuh apa pun. */
  const [record, setRecord] = React.useState<Employee | null>(null);
  const [loaded, setLoaded] = React.useState(!nik);
  const [loadErr, setLoadErr] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [f, setF] = React.useState<Fields>(() => ({
    nama: "",
    nik: "",
    company: "PT Unggul Dinamika Utama",
    dept: "Operation",
    pos: "",
    equip: "",
    join: "",
    exp: "",
    simper: "",
    simperExp: "",
    license: "",
    mcu: "Fit",
    medis: "",
    mess: "",
    kamar: "",
  }));
  const [kompRows, setKompRows] = React.useState<Komp[]>([]);
  /* opsi mess dari master data (Master Data → Mess) — bukan daftar hardcoded */
  const messOpts = React.useMemo(
    () =>
      mdData.mess
        .filter((r) => r.active)
        .map((r) => (r.a ? `${r.name} — ${r.a}` : r.name)),
    [mdData.mess]
  );
  const [dzLabel, setDzLabel] = React.useState<string | null>(null);
  /* berkas foto yang dipilih — baru dikirim ke POST /:nik/photo SETELAH
     record pokoknya tersimpan, karena endpoint-nya butuh NIK yang sudah ada */
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    nama?: boolean;
    nik?: boolean;
    exp?: boolean;
    /* penanda "submit terakhir punya baris kompetensi tanpa masa berlaku" —
       baris mana yang disorot dihitung ulang saat render dari kompRows,
       jadi sorotannya hilang sendiri begitu tanggalnya diisi/di-hapus */
    kompExp?: boolean;
  }>({});
  const [dirtyDlg, setDirtyDlg] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!nik) return;
    let cancelled = false;
    void Promise.all([
      employeesApi.getEmployee(nik),
      employeesApi.getCompetencies(nik),
    ])
      .then(([e, comps]) => {
        if (cancelled) return;
        const emp = { ...toEmployee(e), komp: (comps ?? []).map(toKomp) };
        setRecord(emp);
        setF({
          nama: emp.name,
          nik: emp.nik,
          company: emp.company,
          dept: emp.dept,
          pos: emp.pos,
          equip: emp.equip,
          join: emp.join,
          exp: emp.exp,
          simper: emp.simper,
          simperExp: emp.simperExp,
          license: emp.license,
          mcu: emp.mcu,
          medis: emp.medis,
          mess: emp.mess,
          kamar: emp.kamar,
        });
        setKompRows((emp.komp ?? []).map((k) => ({ ...k })));
        setLoaded(true);
        setLoadErr(false);
      })
      .catch((e2) => {
        if (cancelled) return;
        if (isApiError(e2) && (e2.status === 404 || e2.isValidation)) {
          router.replace("/employees");
          return;
        }
        setLoadErr(true);
      });
    return () => {
      cancelled = true;
    };
  }, [nik, reloadKey, router]);

  function toastErr(e: unknown) {
    /* PUT backend menimpa seluruh kolom tanggal sekaligus dan menolak nilai
       kosong pada kolom DATE (SQLSTATE 22007) — pesan SQL mentahnya tidak
       menolong siapa pun, jadi diterjemahkan ke penjelasan yang bisa
       ditindaklanjuti. Deteksinya lewat isi pesan karena backend memulangkan
       500 generik. */
    if (
      isApiError(e) &&
      e.message.includes("invalid input syntax for type date")
    ) {
      pushToast("error", t.apErrT, t.efErrDateEmpty);
      return;
    }
    pushToast("error", t.apErrT, errorDetail(e, t.empLoadErrB));
  }

  function up<K extends keyof Fields>(key: K, value: Fields[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function kompChange(i: number, key: keyof Komp, value: string) {
    setKompRows((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r))
    );
    setDirty(true);
  }

  function kompAdd() {
    setKompRows((rows) => [...rows, { cls: "", simper: "", exp: "" }]);
    setDirty(true);
  }

  function kompDel(i: number) {
    setKompRows((rows) => rows.filter((_, idx) => idx !== i));
    setDirty(true);
  }

  function filePicked(name: string, file?: File) {
    if (file) {
      /* validasi tipe & ukuran DI SINI, bukan hanya `accept` di input:
         drag&drop tidak melewati accept sama sekali, dan backend menolak
         selain JPEG/PNG ≤ 5MB — lebih baik tahu sebelum submit */
      const okType = file.type === "image/jpeg" || file.type === "image/png";
      if (!okType || file.size > PHOTO_MAX_BYTES) {
        pushToast("error", t.efPhotoFailT, t.efPhotoTypeErr);
        return;
      }
      setPhotoFile(file);
    }
    setDzLabel(`${name} ${t.efDzReady}`);
    setDirty(true);
  }

  function cancel() {
    if (dirty) setDirtyDlg(true);
    else router.back();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs = {
      nama: !f.nama.trim(),
      nik: !/^\d{1,50}$/.test(f.nik.trim()),
      exp: !!(f.exp && f.join && f.exp <= f.join),
      /* baris kompetensi ber-Type EGI wajib punya masa berlaku: kolom
         expiry_date DATE NOT NULL di DB, dan PUT kompetensi berjalan dalam
         SATU transaksi — satu baris tanpa tanggal menggagalkan seluruhnya */
      kompExp: kompRows.some((k) => k.cls && !k.exp),
    };
    setErrors(errs);
    if (errs.nama || errs.nik || errs.exp || errs.kompExp) {
      pushToast("error", t.toastFormErrT, t.toastFormErrD);
      return;
    }
    setBusy(true);
    const nikVal = f.nik.trim();
    const name = f.nama.trim();
    const komp = kompRows.filter((k) => k.cls);
    /* Field tanpa input di form (status, darah, BPJS, kontak, foto) dikirim
       balik dari record hasil muat: PUT backend menimpa SEMUA kolom (repo
       memakai Select penuh, bukan partial), jadi melewatkannya berarti
       mengosongkannya diam-diam — pelajaran kasus IsActive fingerprint.
       Status khususnya: string kosong di-default-kan backend ke "aktif",
       yang akan diam-diam mengaktifkan karyawan cuti/nonaktif. */
    const body = {
      /* dikunci HURUF KAPITAL — backend menormalkan ulang (UpperTrim) */
      name: name.toUpperCase(),
      dept: f.dept.trim().toUpperCase(),
      pos: f.pos.trim().toUpperCase(),
      company: f.company,
      equip: f.equip,
      join: f.join,
      exp: f.exp,
      license: f.license,
      mcu: f.mcu,
      medis: f.medis,
      mess: f.mess,
      kamar: f.kamar,
      status: record?.status ?? ("aktif" as const),
      simper: f.simper.trim(),
      simperExp: f.simperExp,
      blood: record?.blood ?? "",
      bpjs: record?.bpjs ?? "",
      hp: record?.hp ?? "",
      emg: record?.emg ?? "",
      foto: record?.foto ?? "",
    };
    try {
      if (nik) {
        await employeesApi.updateEmployee(nik, body);
      } else {
        await employeesApi.createEmployee({ ...body, nik: nikVal });
      }
    } catch (e2) {
      toastErr(e2);
      setBusy(false);
      return;
    }

    /* Toast sukses record pokok tampil SEBELUM langkah lanjutan supaya
       urutan pesannya runtut: "tersimpan" dulu, baru peringatan bagian yang
       gagal (pesan gagalnya sendiri sudah berbunyi "data karyawan sudah
       tersimpan, tetapi…"). */
    if (nik) pushToast("success", t.toastSaveT, `${name} ${t.toastSaveD}`);
    else pushToast("success", t.toastAddT, `${name} — NIK ${nikVal}`);

    /* Langkah lanjutan setelah record pokok tersimpan. Kegagalan di sini
       TIDAK membatalkan simpanan utama — pengguna diberi tahu bagian mana
       yang tertinggal lalu tetap diantar ke halaman detail. Kompetensi
       dikirim juga saat daftarnya kosong pada edit: PUT-nya mengganti
       seluruh daftar, jadi mengosongkan berarti menghapus. Store hanya
       boleh menerima HASIL AKTUAL tiap langkah — komp/foto yang gagal
       tersimpan tidak boleh tampil di list seolah-olah ada di server. */
    let fotoPath = record?.foto;
    let kompSaved = komp;
    if (nik || komp.length) {
      try {
        await employeesApi.updateCompetencies(nikVal, komp);
      } catch {
        /* server masih memegang daftar lama (edit) atau belum punya (tambah) */
        kompSaved = nik ? (record?.komp ?? []) : [];
        pushToast("error", t.efKompFailT, t.efKompFailD);
      }
    }
    if (photoFile) {
      try {
        const res = (await employeesApi.uploadPhoto(nikVal, photoFile)) as
          { photoUrl?: string } | undefined;
        if (res?.photoUrl) fotoPath = res.photoUrl;
      } catch {
        pushToast("error", t.efPhotoFailT, t.efPhotoFailD);
      }
    }

    upsertEmp({
      ...body,
      nik: nikVal,
      foto: fotoPath || undefined,
      komp: kompSaved,
    });
    router.push(`/employees/${nikVal}`);
  }

  /* Guard layout hanya memeriksa employees:view — rute /new dan /edit bisa
     dibuka langsung lewat URL oleh user Lihat-saja, jadi form-nya sendiri
     yang menolak (API toh akan menolak juga; ini supaya jelas alasannya). */
  if (!can("employees", "manage")) return <RbacDenied />;

  if (loadErr) {
    return (
      <Panel>
        <StateBox
          icon={<CircleAlert className="text-danger-text" />}
          title={t.apLoadErrT}
          body={t.empLoadErrB}
        >
          <Button
            onClick={() => {
              setLoadErr(false);
              setReloadKey((k) => k + 1);
            }}
          >
            {t.apRetry}
          </Button>
        </StateBox>
      </Panel>
    );
  }

  if (!loaded)
    return (
      <div className="grid place-items-center py-16">
        <Spinner className="size-6" />
      </div>
    );

  const fotoSrc = assetUrl(record?.foto);

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle
        title={nik ? `${t.efTitleEdit} — ${record?.name}` : t.efTitleAdd}
        sub={t.efSubAdd}
      />

      <form onSubmit={submit} noValidate>
        <div className="flex flex-col gap-6 max-sm:gap-4">
          <Panel>
            <SectionTitle>
              <Camera />
              {t.secPhoto}
            </SectionTitle>
            <div className="flex items-start gap-5">
              {fotoSrc ? (
                /* foto tersimpan dari /uploads backend — pola <img> yang sama
                   dengan slideshow halaman auth */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoSrc}
                  alt={record?.name ?? ""}
                  className="size-24 flex-none rounded-card object-cover shadow-[0_0_0_3px_var(--ring-avatar),0_0_24px_rgba(0,212,255,.3)]"
                />
              ) : (
                <div className="grid size-24 flex-none place-items-center rounded-card bg-(image:--gradient-cta) text-[28px] font-bold text-on-cta shadow-[0_0_0_3px_var(--ring-avatar),0_0_24px_rgba(0,212,255,.3)]">
                  {initialsOf(f.nama || record?.name || "")}
                </div>
              )}
              <Dropzone
                className="flex-1"
                icon={<Upload />}
                title={dzLabel ?? t.efDzTitle}
                hint={t.efDzHint}
                aria-label={t.efDzTitle}
                onPick={() => fileRef.current?.click()}
                onDropFile={filePicked}
                dragging={dragging}
                onDragChange={setDragging}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  /* reset supaya file yang sama bisa dipilih ulang */
                  e.target.value = "";
                  if (file) filePicked(file.name, file);
                }}
              />
            </div>
          </Panel>

          <Panel>
            <SectionTitle>
              <Briefcase />
              {t.secEmployment}
            </SectionTitle>
            <FormGrid>
              <Field
                label={t.kFullName}
                htmlFor="ef-nama"
                required
                error={errors.nama}
                errorMessage={t.errNama}
              >
                <Input
                  id="ef-nama"
                  value={f.nama}
                  onChange={(e) => up("nama", e.target.value)}
                  className="uppercase"
                />
              </Field>
              <Field
                label="NIK"
                htmlFor="ef-nik"
                required
                helper={t.helpNik}
                error={errors.nik}
                errorMessage={t.errNik}
              >
                <Input
                  id="ef-nik"
                  className="font-mono"
                  inputMode="numeric"
                  value={f.nik}
                  disabled={!!nik}
                  onChange={(e) => up("nik", e.target.value)}
                />
              </Field>
              <Field label={t.kCompany} htmlFor="ef-comp">
                <Select
                  id="ef-comp"
                  value={f.company}
                  onChange={(e) => up("company", e.target.value)}
                >
                  <option>PT Unggul Dinamika Utama</option>
                  <option>PT Unggul Mitra Energi</option>
                </Select>
              </Field>
              <Field label={t.thDept} htmlFor="ef-dept" required>
                <Select
                  id="ef-dept"
                  value={f.dept}
                  onChange={(e) => up("dept", e.target.value)}
                >
                  {/* nilai KAPITAL — selaras data pasca-migrasi 000021 */}
                  <option>OPERATION</option>
                  <option>SDI</option>
                  <option>HRGA</option>
                  <option>PLANT</option>
                </Select>
              </Field>
              <Field label={t.thPos} htmlFor="ef-pos" required>
                <Input
                  id="ef-pos"
                  value={f.pos}
                  onChange={(e) => up("pos", e.target.value)}
                  className="uppercase"
                />
              </Field>
              <Field label="Equipment type" htmlFor="ef-equip">
                <Input
                  id="ef-equip"
                  value={f.equip}
                  onChange={(e) => up("equip", e.target.value)}
                />
              </Field>
              <Field label={t.kJoin} htmlFor="ef-join" required>
                <Input
                  id="ef-join"
                  type="date"
                  className="font-mono"
                  value={f.join}
                  onChange={(e) => up("join", e.target.value)}
                />
              </Field>
              <Field
                label={t.kExp}
                htmlFor="ef-exp"
                helper={t.helpExp}
                error={errors.exp}
                errorMessage={t.errExp}
              >
                <Input
                  id="ef-exp"
                  type="date"
                  className="font-mono"
                  value={f.exp}
                  onChange={(e) => up("exp", e.target.value)}
                />
              </Field>
            </FormGrid>
          </Panel>

          <Panel>
            <SectionTitle>
              <IdCard />
              SIMPER &amp; {t.secMedical}
            </SectionTitle>
            <FormGrid>
              <Field
                label={t.efKompT}
                helper={t.efKompHelp}
                className="col-span-full"
              >
                <div className="flex flex-col gap-3">
                  {kompRows.map((k, i) => (
                    <div
                      key={i}
                      /* 150+1fr+170+40 plus tiga gap butuh >420px; di ponsel
                         barisnya jadi 2x2 (tipe EGI | SIMPER, masa berlaku |
                         hapus) agar tetap terbaca sebagai satu kesatuan. */
                      className="grid grid-cols-[150px_1fr_170px_40px] items-center gap-3 max-sm:grid-cols-2 max-sm:gap-2 max-sm:*:min-w-0"
                    >
                      <Select
                        value={k.cls}
                        onChange={(e) => kompChange(i, "cls", e.target.value)}
                        aria-label="Type EGI"
                      >
                        <option value=""></option>
                        {/* nilai lawas dari DB (mis. kode seed "DT") tetap
                            tampil walau tak ada di egiTypes — agar edit
                            tidak diam-diam mengosongkannya */}
                        {k.cls &&
                        !(egiTypes as readonly string[]).includes(k.cls) ? (
                          <option value={k.cls}>{k.cls}</option>
                        ) : null}
                        {egiTypes.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={k.simper}
                        placeholder={t.efKompSimperPh}
                        onChange={(e) =>
                          kompChange(i, "simper", e.target.value)
                        }
                        aria-label="SIMPER"
                      />
                      <Input
                        type="date"
                        /* sorot per baris (bukan lewat prop error Field, yang
                           akan memerahkan SEMUA kontrol di dalamnya) — gaya
                           merahnya meniru selector data-error milik Field */
                        className={cn(
                          "font-mono",
                          errors.kompExp &&
                            k.cls &&
                            !k.exp &&
                            "border-danger shadow-[0_0_0_3px_rgba(252,60,59,.18)]"
                        )}
                        value={k.exp}
                        onChange={(e) => kompChange(i, "exp", e.target.value)}
                        aria-label={t.kValidity}
                      />
                      <IconButton
                        type="button"
                        danger
                        onClick={() => kompDel(i)}
                        aria-label={t.empDel}
                      >
                        <Trash2 />
                      </IconButton>
                    </div>
                  ))}
                  {errors.kompExp && kompRows.some((k) => k.cls && !k.exp) ? (
                    <span className="inline-flex items-center gap-1.25 text-xs text-danger-text">
                      <CircleAlert
                        className="size-3 flex-none"
                        strokeWidth={2.5}
                      />
                      {t.efErrKompExp}
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    className="self-start"
                    onClick={kompAdd}
                  >
                    <Plus />
                    {t.efKompAdd}
                  </Button>
                </div>
              </Field>
              {/* SIMPER umum milik record karyawan — BUKAN kompetensi per Type
                  EGI di atas. Input ini wajib ada: PUT backend menimpa
                  simper_exp tanpa nullIfEmpty, jadi tanpa input ini tanggal
                  yang kosong sejak create tidak pernah bisa dilengkapi dari UI
                  dan SETIAP edit karyawan buatan UI tertolak (SQLSTATE 22007,
                  lihat ADR 0014). */}
              <Field
                label={t.kSimperCat}
                htmlFor="ef-simper"
                helper={t.helpSimper}
              >
                <Input
                  id="ef-simper"
                  value={f.simper}
                  onChange={(e) => up("simper", e.target.value)}
                />
              </Field>
              <Field
                label={t.kSimperExp}
                htmlFor="ef-simperexp"
                helper={t.helpSimperExp}
              >
                <Input
                  id="ef-simperexp"
                  type="date"
                  className="font-mono"
                  value={f.simperExp}
                  onChange={(e) => up("simperExp", e.target.value)}
                />
              </Field>
              <Field label="License type" htmlFor="ef-lisensi">
                <Input
                  id="ef-lisensi"
                  value={f.license}
                  onChange={(e) => up("license", e.target.value)}
                />
              </Field>
              <Field label={t.kMcu} htmlFor="ef-mcu">
                <Select
                  id="ef-mcu"
                  value={f.mcu}
                  onChange={(e) => up("mcu", e.target.value)}
                >
                  <option>Fit</option>
                  <option>Fit dengan catatan</option>
                  <option>Unfit sementara</option>
                  {/* nilai MCU lama di luar tiga opsi baku (seed DB memakai
                      bentuk "Fit — 12 Feb 2026") tetap dipertahankan supaya
                      membuka form tidak diam-diam menggantinya */}
                  {f.mcu &&
                  !["Fit", "Fit dengan catatan", "Unfit sementara"].includes(
                    f.mcu
                  ) ? (
                    <option value={f.mcu}>{f.mcu}</option>
                  ) : null}
                </Select>
              </Field>
              <Field
                label={t.kMedHistory}
                htmlFor="ef-medis"
                helper={t.helpMedis}
                className="col-span-full"
              >
                <Textarea
                  id="ef-medis"
                  placeholder={t.phMedis}
                  value={f.medis}
                  onChange={(e) => up("medis", e.target.value)}
                />
              </Field>
            </FormGrid>
          </Panel>

          <Panel>
            <SectionTitle>
              <House />
              Mess
            </SectionTitle>
            <FormGrid>
              <Field label="Mess" htmlFor="ef-mess">
                <Select
                  id="ef-mess"
                  value={f.mess}
                  onChange={(e) => up("mess", e.target.value)}
                >
                  <option value="">{t.optNoMess}</option>
                  {/* nilai lama yang tak lagi ada di master tetap dipertahankan */}
                  {f.mess && !messOpts.includes(f.mess) ? (
                    <option value={f.mess}>{f.mess}</option>
                  ) : null}
                  {messOpts.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.kRoom} htmlFor="ef-kamar">
                <Input
                  id="ef-kamar"
                  className="font-mono"
                  value={f.kamar}
                  onChange={(e) => up("kamar", e.target.value)}
                />
              </Field>
            </FormGrid>
          </Panel>

          <div className="sticky bottom-4 z-20 flex items-center justify-end gap-3 rounded-panel px-6 py-4 glass-panel">
            {dirty ? (
              <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-(--text-tertiary)">
                <span className="size-1.75 rounded-full bg-warning" />
                {t.efUnsaved}
              </span>
            ) : null}
            <Button type="button" variant="ghost" onClick={cancel}>
              {t.btnCancel}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Spinner />
                  {t.efSaving}
                </>
              ) : nik ? (
                t.efSaveEdit
              ) : (
                t.efSaveAdd
              )}
            </Button>
          </div>
        </div>
      </form>

      <Dialog
        open={dirtyDlg}
        onClose={() => setDirtyDlg(false)}
        labelledBy="dirty-t"
      >
        <DialogIcon variant="warning">
          <TriangleAlert />
        </DialogIcon>
        <DialogTitle id="dirty-t">{t.dirtyTitle}</DialogTitle>
        <DialogBody>{t.dirtyBody}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDirtyDlg(false)}>
            {t.dirtyStay}
          </Button>
          <Button variant="destructive" onClick={() => router.back()}>
            {t.dirtyLeave}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
