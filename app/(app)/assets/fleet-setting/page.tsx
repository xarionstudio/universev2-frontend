"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, Truck } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { useAppStore } from "@/components/providers/app-store"
import { useToast } from "@/components/ui/toast"
import type { Fleet } from "@/lib/data/fleet"
import {
  PageTitle,
  Panel,
  PanelFoot,
  FootSum,
  DNote,
} from "@/components/ui/panel"
import { Button, IconButton } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Input, Textarea } from "@/components/ui/input"
import { Field, FormGrid } from "@/components/ui/field"
import { Checkbox, ToggleRow } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogIcon,
  DialogTitle,
  DialogBody,
  DialogActions,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  NameCell,
} from "@/components/ui/table"

export default function FleetSettingPage() {
  const { t } = useI18n()
  const { pushToast } = useToast()
  const { udbAll, mdData, fleets, setFleets } = useAppStore()

  /* dialog tambah/edit */
  const [dlgOpen, setDlgOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [fDigger, setFDigger] = React.useState("")
  const [fBus, setFBus] = React.useState("")
  const [fLoc, setFLoc] = React.useState("")
  const [fUnits, setFUnits] = React.useState("")
  const [fActive, setFActive] = React.useState(true)
  const [errDigger, setErrDigger] = React.useState(false)
  const [errUnits, setErrUnits] = React.useState("")

  /* dialog hapus */
  const [delTarget, setDelTarget] = React.useState<Fleet | null>(null)

  const all = udbAll()
  const diggerTypeOf = (code: string) => {
    const u = all.find((x) => x.code === code)
    return u ? `${u.egi} · ${u.product}` : "—"
  }

  const diggerOpts = Array.from(
    new Set(all.filter((u) => u.cls === "EX").map((u) => u.code))
  )
    .filter((code) => !fleets.some((f) => f.digger === code && f.id !== editId))
    .sort()
  const busOpts = mdData.bus.filter((b) => b.active).map((b) => b.name)

  function openAdd() {
    setEditId(null)
    setFDigger(diggerOpts[0] || "")
    setFBus(busOpts[0] || "")
    setFLoc("")
    setFUnits("")
    setFActive(true)
    setErrDigger(false)
    setErrUnits("")
    setDlgOpen(true)
  }

  function openEdit(f: Fleet) {
    setEditId(f.id)
    setFDigger(f.digger)
    setFBus(f.bus)
    setFLoc(f.loc)
    setFUnits(f.units.join(", "))
    setFActive(f.active)
    setErrDigger(false)
    setErrUnits("")
    setDlgOpen(true)
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    const digger = fDigger.trim()
    const badDigger =
      !digger || fleets.some((f) => f.digger === digger && f.id !== editId)
    setErrDigger(badDigger)

    const list = Array.from(
      new Set(
        fUnits
          .split(/[\n,]/)
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      )
    )
    const known = new Set(all.map((u) => u.code.toUpperCase()))
    const unknown = list.filter((c) => !known.has(c))
    const used = list.filter((c) =>
      fleets.some(
        (f) => f.id !== editId && f.units.some((x) => x.toUpperCase() === c)
      )
    )
    const unitsErr = unknown.length
      ? `${t.flErrUnknown} ${unknown.join(", ")}`
      : used.length
        ? `${t.flErrUsed} ${used.join(", ")}`
        : ""
    setErrUnits(unitsErr)
    if (badDigger || unitsErr) return

    const data = { digger, loc: fLoc.trim(), bus: fBus, units: list, active: fActive }
    setFleets((prev) =>
      editId
        ? prev.map((f) => (f.id === editId ? { ...f, ...data } : f))
        : [...prev, { id: `fl-${Date.now()}`, ...data }]
    )
    setDlgOpen(false)
    pushToast("success", editId ? t.flToastEdit : t.flToastAdd, digger)
  }

  function doDelete() {
    if (!delTarget) return
    setFleets((prev) => prev.filter((f) => f.id !== delTarget.id))
    setDelTarget(null)
    pushToast("success", t.flToastDel, delTarget.digger)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.navFleetSetting} sub={t.flSub}>
        <Button onClick={openAdd}>
          <Plus />
          {t.flAdd}
        </Button>
      </PageTitle>

      <Panel>
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Fleet</TableHead>
              <TableHead>{t.flLoc}</TableHead>
              <TableHead className="max-xl:hidden">{t.flBus}</TableHead>
              <TableHead>{t.flUnits}</TableHead>
              <TableHead>{t.thStatus}</TableHead>
              <TableHead style={{ width: 110 }}>{t.thAct}</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {fleets.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <NameCell name={f.digger} sub={diggerTypeOf(f.digger)} />
                </TableCell>
                <TableCell>{f.loc}</TableCell>
                <TableCell className="max-xl:hidden font-mono">{f.bus}</TableCell>
                <TableCell>
                  <div className="flex max-w-[320px] flex-wrap gap-1">
                    {f.units.map((u) => (
                      <Badge key={u} variant="info">
                        {u}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {f.active ? (
                    <Badge variant="success" dot>
                      {t.stAktif}
                    </Badge>
                  ) : (
                    <Badge variant="danger" dot>
                      {t.stNonaktif}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <IconButton aria-label={t.udbEditT} onClick={() => openEdit(f)}>
                      <Pencil />
                    </IconButton>
                    <IconButton
                      danger
                      aria-label={t.empDel}
                      onClick={() => setDelTarget(f)}
                    >
                      <Trash2 />
                    </IconButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{fleets.length}</b> {t.flSumB}
          </FootSum>
        </PanelFoot>
      </Panel>

      <DNote title={t.flNoteT}>{t.flNoteB}</DNote>

      {/* Dialog tambah/edit fleet */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        className="w-[min(560px,100%)]"
        labelledBy="fl-t"
      >
        <DialogIcon variant="info">
          <Truck />
        </DialogIcon>
        <DialogTitle id="fl-t">
          {editId ? `${t.flEditT} ${fDigger}` : t.flAdd}
        </DialogTitle>
        <DialogBody>{t.flDlgB}</DialogBody>
        <form onSubmit={save} noValidate>
          <FormGrid className="mt-4">
            <Field
              label="Digger (fleet leader)"
              htmlFor="fl-digger"
              required
              error={errDigger}
              errorMessage={t.flErrDigger}
            >
              <Select
                id="fl-digger"
                value={fDigger}
                onChange={(e) => setFDigger(e.target.value)}
              >
                {editId && !diggerOpts.includes(fDigger) ? (
                  <option value={fDigger}>{fDigger}</option>
                ) : null}
                {diggerOpts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.flBus} htmlFor="fl-bus">
              <Select
                id="fl-bus"
                value={fBus}
                onChange={(e) => setFBus(e.target.value)}
              >
                {busOpts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              className="col-span-full"
              label={t.flLoc}
              htmlFor="fl-loc"
              required
            >
              <Input
                id="fl-loc"
                placeholder="PANEL EAST - ATAS SELATAN"
                value={fLoc}
                onChange={(e) => setFLoc(e.target.value)}
              />
            </Field>
            <Field
              className="col-span-full"
              label={`${t.flUnits} (OHT)`}
              htmlFor="fl-units"
              helper={t.flUnitsHelp}
              error={!!errUnits}
              errorMessage={errUnits}
            >
              <Textarea
                id="fl-units"
                className="min-h-[72px]"
                placeholder="RD5001, RD5002, RD5003…"
                value={fUnits}
                onChange={(e) => setFUnits(e.target.value)}
              />
            </Field>
          </FormGrid>
          <ToggleRow className="mt-4" htmlFor="fl-active">
            <Checkbox
              id="fl-active"
              checked={fActive}
              onChange={(e) => setFActive(e.target.checked)}
            />
            {t.stAktif}
          </ToggleRow>
          <DialogActions>
            <Button type="button" variant="ghost" onClick={() => setDlgOpen(false)}>
              {t.btnCancel}
            </Button>
            <Button type="submit">{editId ? t.udbSaveEdit : t.flSaveAdd}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog hapus fleet */}
      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)} labelledBy="fld-t">
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="fld-t">
          {t.flDelT} {delTarget?.digger}?
        </DialogTitle>
        <DialogBody>{t.flDelB}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDelTarget(null)}>
            {t.btnCancel}
          </Button>
          <Button variant="destructive" onClick={doDelete}>
            {t.empDelDo}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
