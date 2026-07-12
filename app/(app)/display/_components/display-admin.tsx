"use client"

import * as React from "react"
import { Monitor, Plus, Eye, Pencil, Trash2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { useToast } from "@/components/ui/toast"
import { useAppStore } from "@/components/providers/app-store"
import { useKiosk } from "@/components/providers/kiosk-provider"
import type { Display, DisplayKind } from "@/lib/data/settings-data"
import {
  PageTitle,
  Panel,
  Toolbar,
  ToolbarTitle,
  PanelFoot,
  FootSum,
  DNote,
} from "@/components/ui/panel"
import { Button, IconButton } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  NameCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogIcon,
  DialogTitle,
  DialogBody,
  DialogActions,
} from "@/components/ui/dialog"
import { Field, FormGrid } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Checkbox, ToggleRow } from "@/components/ui/checkbox"

const CONTENT_LABELS: Record<DisplayKind, string> = {
  att: "Attendance",
  fleet: "Fleet",
  ftw: "Fit To Work",
  finger: "Fingerprint",
}

const CONTENT_OPTS: Record<"att" | "fleet", { key: DisplayKind; label: string }[]> = {
  att: [
    { key: "att", label: "Attendance" },
    { key: "ftw", label: "Fit To Work" },
    { key: "finger", label: "Monitoring Fingerprint" },
  ],
  fleet: [{ key: "fleet", label: "Status Unit" }],
}

/* layar kiosk sungguhan (route dark-only 1920×1080) — ditampilkan fullscreen via iframe */
const KIOSK_URLS: Record<DisplayKind, string> = {
  att: "/kiosk/attendance",
  fleet: "/kiosk/fleet",
  ftw: "/kiosk/fitwork",
  finger: "/kiosk/fingerprint",
}

export function DisplayAdmin({ kind }: { kind: "att" | "fleet" }) {
  const { t } = useI18n()
  const { pushToast } = useToast()
  const store = useAppStore()

  const rows = kind === "att" ? store.dspAtt : store.dspFleet
  const setRows = kind === "att" ? store.setDspAtt : store.setDspFleet
  const runtextOpts = store.mdData.runtext.filter((e) => e.active).map((e) => e.name)
  const contentOpts = CONTENT_OPTS[kind]

  /* dialog tambah/edit */
  const [dlgOpen, setDlgOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Display | null>(null)
  const [fName, setFName] = React.useState("")
  const [fLoc, setFLoc] = React.useState("")
  const [fContent, setFContent] = React.useState<DisplayKind>(contentOpts[0].key)
  const [fRuntext, setFRuntext] = React.useState("")
  const [fActive, setFActive] = React.useState(true)
  const [nameErr, setNameErr] = React.useState(false)

  /* dialog hapus */
  const [delTarget, setDelTarget] = React.useState<Display | null>(null)

  /* layar kiosk fullscreen — overlay global (Esc menutup) */
  const { openKiosk } = useKiosk()
  const pageKioskUrl = KIOSK_URLS[kind]

  function openAdd() {
    setEditing(null)
    setFName("")
    setFLoc("")
    setFContent(contentOpts[0].key)
    setFRuntext(runtextOpts[0] ?? "")
    setFActive(true)
    setNameErr(false)
    setDlgOpen(true)
  }

  function openEdit(d: Display) {
    setEditing(d)
    setFName(d.name)
    setFLoc(d.loc)
    setFContent(d.content)
    setFRuntext(d.runtext)
    setFActive(d.active)
    setNameErr(false)
    setDlgOpen(true)
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!fName.trim()) {
      setNameErr(true)
      return
    }
    const data = {
      name: fName.trim(),
      loc: fLoc.trim(),
      content: fContent,
      runtext: fRuntext,
      active: fActive,
    }
    if (editing) {
      setRows((prev) =>
        prev.map((d) => (d.id === editing.id ? { ...d, ...data } : d))
      )
      pushToast("success", t.dspToastEdit)
    } else {
      const prefix = kind === "att" ? "DSP-A" : "DSP-F"
      const id = `${prefix}${String(rows.length + 1).padStart(2, "0")}`
      setRows((prev) => [...prev, { id, online: true, hb: "baru saja", ...data }])
      pushToast("success", t.dspToastAdd)
    }
    setDlgOpen(false)
  }

  function delDo() {
    if (!delTarget) return
    setRows((prev) => prev.filter((d) => d.id !== delTarget.id))
    pushToast("success", t.dspToastDel)
    setDelTarget(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={kind === "att" ? t.navDispAtt : t.navDispFleet}
        sub={kind === "att" ? t.dspSubAtt : t.dspSubFleet}
      >
        <Button onClick={() => openKiosk(pageKioskUrl)}>
          <Monitor />
          {t.dspOpenKiosk}
        </Button>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.dspListTitle}</ToolbarTitle>
          <Button variant="secondary" onClick={openAdd}>
            <Plus />
            {t.dspAdd}
          </Button>
        </Toolbar>
        <Table>
          <TableHeader>
            <tr>
              <TableHead>{t.dspName}</TableHead>
              <TableHead>{t.dspLoc}</TableHead>
              <TableHead>{t.dspContent}</TableHead>
              <TableHead className="max-xl:hidden">{t.dspRuntext}</TableHead>
              <TableHead>{t.dspConn}</TableHead>
              <TableHead>{t.thStatus}</TableHead>
              <TableHead className="w-[110px]">{t.thAct}</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <NameCell name={d.name} sub={d.id} />
                </TableCell>
                <TableCell>{d.loc}</TableCell>
                <TableCell>
                  <Badge variant="info">{CONTENT_LABELS[d.content]}</Badge>
                </TableCell>
                <TableCell className="max-w-[280px] text-(--text-secondary) max-xl:hidden">
                  {d.runtext}
                </TableCell>
                <TableCell>
                  <Badge variant={d.online ? "success" : "danger"} dot>
                    {d.online ? "Online" : "Offline"}
                  </Badge>
                  <div className="mt-1 font-mono text-xs text-(--text-tertiary)">
                    {d.hb}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={d.active ? "success" : "danger"} dot>
                    {d.active ? t.stAktif : t.stNonaktif}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <IconButton
                      aria-label={t.dspPreview}
                      onClick={() => openKiosk(KIOSK_URLS[d.content])}
                    >
                      <Eye />
                    </IconButton>
                    <IconButton aria-label={t.udbEditT} onClick={() => openEdit(d)}>
                      <Pencil />
                    </IconButton>
                    <IconButton
                      danger
                      aria-label={t.empDel}
                      onClick={() => setDelTarget(d)}
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
            {t.attSumA} <b>{rows.length}</b> {t.dspSumB}
          </FootSum>
        </PanelFoot>
      </Panel>

      <DNote title={t.dspNoteT}>{t.dspNoteB}</DNote>

      {/* dialog tambah/edit display */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        className="w-[min(560px,100%)]"
        labelledBy="dsp-t"
      >
        <DialogIcon variant="info">
          <Monitor />
        </DialogIcon>
        <DialogTitle id="dsp-t">
          {editing ? `${t.dspEditT} — ${editing.name}` : t.dspAdd}
        </DialogTitle>
        <DialogBody>{t.dspDlgB}</DialogBody>
        <form onSubmit={save} noValidate>
          <FormGrid className="mt-4">
            <Field
              label={t.dspName}
              htmlFor="dsp-name"
              required
              error={nameErr}
              errorMessage={t.mdErrName}
            >
              <Input
                id="dsp-name"
                placeholder="TV Gate Utara"
                value={fName}
                onChange={(e) => {
                  setFName(e.target.value)
                  if (e.target.value.trim()) setNameErr(false)
                }}
              />
            </Field>
            <Field label={t.dspLoc} htmlFor="dsp-loc">
              <Input
                id="dsp-loc"
                placeholder="Gate utara / Mess / Workshop"
                value={fLoc}
                onChange={(e) => setFLoc(e.target.value)}
              />
            </Field>
            <Field label={t.dspContent} htmlFor="dsp-content">
              <Select
                id="dsp-content"
                value={fContent}
                onChange={(e) => setFContent(e.target.value as DisplayKind)}
              >
                {contentOpts.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.dspRuntext} htmlFor="dsp-runtext" helper={t.dspRuntextHelp}>
              <Select
                id="dsp-runtext"
                value={fRuntext}
                onChange={(e) => setFRuntext(e.target.value)}
              >
                {runtextOpts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
          <ToggleRow className="mt-4" htmlFor="dsp-active">
            <Checkbox
              id="dsp-active"
              checked={fActive}
              onChange={(e) => setFActive(e.target.checked)}
            />
            {t.stAktif}
          </ToggleRow>
          <DialogActions>
            <Button type="button" variant="ghost" onClick={() => setDlgOpen(false)}>
              {t.btnCancel}
            </Button>
            <Button type="submit">{editing ? t.udbSaveEdit : t.dspSaveAdd}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* dialog hapus display */}
      <Dialog
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        labelledBy="dspd-t"
      >
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="dspd-t">{`${t.dspDelT} "${delTarget?.name ?? ""}"?`}</DialogTitle>
        <DialogBody>{t.dspDelB}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDelTarget(null)}>
            {t.btnCancel}
          </Button>
          <Button variant="destructive" onClick={delDo}>
            {t.empDelDo}
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  )
}
