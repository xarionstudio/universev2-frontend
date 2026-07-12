"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Camera,
  Briefcase,
  IdCard,
  House,
  Upload,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { useToast } from "@/components/ui/toast"
import { useAppStore } from "@/components/providers/app-store"
import type { Employee, Komp } from "@/lib/data/employees"
import { egiTypes } from "@/lib/data/units-db"
import { PageTitle, Panel, SectionTitle } from "@/components/ui/panel"
import { Field, FormGrid } from "@/components/ui/field"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button, IconButton, Spinner } from "@/components/ui/button"
import { Dropzone } from "@/components/ui/dropzone"
import { initialsOf } from "@/components/ui/avatar"
import {
  Dialog,
  DialogIcon,
  DialogTitle,
  DialogBody,
  DialogActions,
} from "@/components/ui/dialog"

type Fields = {
  nama: string
  nik: string
  company: string
  dept: string
  pos: string
  equip: string
  join: string
  exp: string
  license: string
  mcu: string
  medis: string
  mess: string
  kamar: string
}

export function EmployeeForm({ nik }: { nik?: string }) {
  const { t } = useI18n()
  const { pushToast } = useToast()
  const { empAll, saveEmployee } = useAppStore()
  const router = useRouter()

  const [record] = React.useState<Employee | undefined>(() =>
    nik ? empAll().find((r) => r.nik === nik) : undefined
  )

  const [f, setF] = React.useState<Fields>(() => ({
    nama: record?.name ?? "",
    nik: record?.nik ?? "",
    company: record?.company ?? "PT Unggul Dinamika Utama",
    dept: record?.dept ?? "Operation",
    pos: record?.pos ?? "",
    equip: record?.equip ?? "",
    join: record?.join ?? "",
    exp: record?.exp ?? "",
    license: record?.license ?? "",
    mcu: record?.mcu ?? "Fit",
    medis: record?.medis ?? "",
    mess: record?.mess ?? "",
    kamar: record?.kamar ?? "",
  }))
  const [kompRows, setKompRows] = React.useState<Komp[]>(() =>
    (record?.komp ?? []).map((k) => ({ ...k }))
  )
  const [dzLabel, setDzLabel] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [errors, setErrors] = React.useState<{
    nama?: boolean
    nik?: boolean
    exp?: boolean
  }>({})
  const [dirtyDlg, setDirtyDlg] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (nik && !record) router.replace("/employees")
  }, [nik, record, router])
  if (nik && !record) return null

  function up<K extends keyof Fields>(key: K, value: Fields[K]) {
    setF((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  function kompChange(i: number, key: keyof Komp, value: string) {
    setKompRows((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r))
    )
    setDirty(true)
  }

  function kompAdd() {
    setKompRows((rows) => [...rows, { cls: "", simper: "", exp: "" }])
    setDirty(true)
  }

  function kompDel(i: number) {
    setKompRows((rows) => rows.filter((_, idx) => idx !== i))
    setDirty(true)
  }

  function filePicked(name: string) {
    setDzLabel(`${name} ${t.efDzReady}`)
    setDirty(true)
  }

  function cancel() {
    if (dirty) setDirtyDlg(true)
    else router.back()
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const errs = {
      nama: !f.nama.trim(),
      nik: !/^\d{9}$/.test(f.nik.trim()),
      exp: !!(f.exp && f.join && f.exp <= f.join),
    }
    setErrors(errs)
    if (errs.nama || errs.nik || errs.exp) {
      pushToast("error", t.toastFormErrT, t.toastFormErrD)
      return
    }
    setBusy(true)
    setTimeout(() => {
      const nikVal = f.nik.trim()
      const name = f.nama.trim()
      const base = nik
        ? {}
        : {
            status: "aktif" as const,
            simper: "",
            simperExp: "",
            blood: "",
            bpjs: "",
            hp: "",
            emg: "",
          }
      saveEmployee(nik ?? null, {
        ...base,
        name,
        nik: nikVal,
        company: f.company,
        dept: f.dept,
        pos: f.pos,
        equip: f.equip,
        join: f.join,
        exp: f.exp,
        license: f.license,
        mcu: f.mcu,
        medis: f.medis,
        mess: f.mess,
        kamar: f.kamar,
        komp: kompRows.filter((k) => k.cls),
      })
      if (nik) pushToast("success", t.toastSaveT, `${name} ${t.toastSaveD}`)
      else pushToast("success", t.toastAddT, `${name} — NIK ${nikVal}`)
      router.push(`/employees/${nikVal}`)
    }, 900)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={nik ? `${t.efTitleEdit} — ${record?.name}` : t.efTitleAdd}
        sub={t.efSubAdd}
      />

      <form onSubmit={submit} noValidate>
        <div className="flex flex-col gap-6">
          <Panel>
            <SectionTitle>
              <Camera />
              {t.secPhoto}
            </SectionTitle>
            <div className="flex items-start gap-5">
              <div className="grid size-24 flex-none place-items-center rounded-card bg-linear-135 from-[#00D4FF] to-[#0091FF] text-[28px] font-bold text-(--color-on-cta) shadow-[0_0_0_3px_var(--ring-avatar),0_0_24px_rgba(0,212,255,.3)]">
                {initialsOf(f.nama || record?.name || "")}
              </div>
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
                  const name = e.target.files?.[0]?.name
                  if (name) filePicked(name)
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
                  <option>Operation</option>
                  <option>SDI</option>
                  <option>HRGA</option>
                  <option>Plant</option>
                </Select>
              </Field>
              <Field label={t.thPos} htmlFor="ef-pos" required>
                <Input
                  id="ef-pos"
                  value={f.pos}
                  onChange={(e) => up("pos", e.target.value)}
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
                      className="grid grid-cols-[150px_1fr_170px_40px] items-center gap-3"
                    >
                      <Select
                        value={k.cls}
                        onChange={(e) => kompChange(i, "cls", e.target.value)}
                        aria-label="Type EGI"
                      >
                        <option value=""></option>
                        {egiTypes.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={k.simper}
                        placeholder={t.efKompSimperPh}
                        onChange={(e) => kompChange(i, "simper", e.target.value)}
                        aria-label="SIMPER"
                      />
                      <Input
                        type="date"
                        className="font-mono"
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
                  <option>Mess Karang Joang — Blok A</option>
                  <option>Mess Karang Joang — Blok C</option>
                  <option>Mess KM 12 — Blok B</option>
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

          <div className="glass-panel sticky bottom-4 z-20 flex items-center justify-end gap-3 rounded-panel px-6 py-4">
            {dirty ? (
              <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-(--text-tertiary)">
                <span className="size-[7px] rounded-full bg-(--color-warning)" />
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

      <Dialog open={dirtyDlg} onClose={() => setDirtyDlg(false)} labelledBy="dirty-t">
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
  )
}
