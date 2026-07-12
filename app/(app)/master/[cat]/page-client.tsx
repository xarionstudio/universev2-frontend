"use client"

import * as React from "react"
import { notFound, useParams } from "next/navigation"
import { Plus, Pencil, Rows3, Search, Trash2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { useAppStore } from "@/components/providers/app-store"
import { useToast } from "@/components/ui/toast"
import { mdCats, mdCatLabels, type MdCat, type MdEntry } from "@/lib/data/master-data"
import {
  PageTitle,
  Panel,
  Toolbar,
  ToolbarTitle,
  ToolbarGroup,
  PanelFoot,
  FootSum,
} from "@/components/ui/panel"
import { Button, IconButton } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"
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
} from "@/components/ui/table"
import { StateBox } from "@/components/ui/state-box"
import { Pagination } from "@/components/ui/pagination"

type ColKey = "name" | "a" | "b"
type SortKey = ColKey | "active"
type ColDef = {
  key: ColKey
  label: string
  kind?: "text" | "time" | "select" | "color"
  opts?: string[]
}

const runtextTargets = ["Semua kiosk", "Display Attendance", "Display Fleet"]
const runtextColors = ["Cyan", "Oranye", "Putih", "Merah"]
const colorVal: Record<string, string> = {
  Cyan: "#00D4FF",
  Oranye: "#E99B2A",
  Putih: "#FFFFFF",
  Merah: "#FC3C3B",
}

export default function MasterDataPage() {
  const params = useParams<{ cat: string }>()
  const cat = params.cat as MdCat
  const { t, lang } = useI18n()
  const { pushToast } = useToast()
  const { mdData, setMdData } = useAppStore()

  const [q, setQ] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [per, setPer] = React.useState("10")
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 } | null>(null)

  /* dialog tambah/edit */
  const [dlgOpen, setDlgOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [fName, setFName] = React.useState("")
  const [fA, setFA] = React.useState("")
  const [fB, setFB] = React.useState("")
  const [fActive, setFActive] = React.useState(true)
  const [errName, setErrName] = React.useState(false)

  /* dialog hapus */
  const [delTarget, setDelTarget] = React.useState<MdEntry | null>(null)

  if (!mdCats.includes(cat)) notFound()

  const en = lang === "en"
  const catLabel = mdCatLabels[cat][lang]

  const cols: ColDef[] = React.useMemo(() => {
    switch (cat) {
      case "egi":
      case "product":
        return [{ key: "name", label: t.mdNama }]
      case "eqclass":
        return [
          { key: "name", label: "Kode" },
          { key: "a", label: t.mdDesc },
        ]
      case "area":
        return [
          { key: "name", label: t.mdNama },
          { key: "a", label: t.thCat },
        ]
      case "tempudo":
        return [
          { key: "name", label: "Kode" },
          { key: "a", label: t.thLoc },
          { key: "b", label: t.thType },
        ]
      case "bus":
        return [
          { key: "name", label: "Kode" },
          { key: "a", label: en ? "Type" : "Tipe" },
          { key: "b", label: t.mdJam, kind: "time" },
        ]
      case "lokasiex":
        return [
          { key: "name", label: "Excavator" },
          { key: "a", label: "Bus" },
          { key: "b", label: "Tempudo" },
        ]
      case "runtext":
        return [
          { key: "name", label: en ? "Text" : "Teks" },
          { key: "a", label: "Target", kind: "select", opts: runtextTargets },
          {
            key: "b",
            label: en ? "Color" : "Warna",
            kind: "color",
            opts: runtextColors,
          },
        ]
    }
  }, [cat, t, en])

  const entries = mdData[cat]
  const needle = q.trim().toLowerCase()
  const filtered = entries.filter((r) => {
    if (!needle) return true
    return (
      r.name.toLowerCase().includes(needle) ||
      r.a.toLowerCase().includes(needle) ||
      r.b.toLowerCase().includes(needle)
    )
  })

  const sorted = sort
    ? [...filtered].sort((x, y) => {
        if (sort.key === "active")
          return (Number(x.active) - Number(y.active)) * sort.dir
        return x[sort.key].localeCompare(y[sort.key]) * sort.dir
      })
    : filtered

  const perN = Number(per)
  const pageCount = Math.max(1, Math.ceil(sorted.length / perN))
  const p = Math.min(page, pageCount)
  const rows = sorted.slice((p - 1) * perN, p * perN)
  const range = sorted.length
    ? `${(p - 1) * perN + 1}–${Math.min(sorted.length, p * perN)}`
    : "0"

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }
    )
  }

  function openAdd() {
    setEditId(null)
    setFName("")
    setFA(cols.find((c) => c.key === "a")?.opts?.[0] ?? "")
    setFB(cols.find((c) => c.key === "b")?.opts?.[0] ?? "")
    setFActive(true)
    setErrName(false)
    setDlgOpen(true)
  }

  function openEdit(r: MdEntry) {
    setEditId(r.id)
    setFName(r.name)
    setFA(r.a)
    setFB(r.b)
    setFActive(r.active)
    setErrName(false)
    setDlgOpen(true)
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    const name = fName.trim()
    if (!name) {
      setErrName(true)
      return
    }
    const data = { name, a: fA, b: fB, active: fActive }
    setMdData((prev) => ({
      ...prev,
      [cat]: editId
        ? prev[cat].map((r) => (r.id === editId ? { ...r, ...data } : r))
        : [...prev[cat], { id: `${cat}-${Date.now()}`, ...data }],
    }))
    setDlgOpen(false)
    pushToast("success", editId ? t.mdEditToastT : t.mdAddToastT, name)
  }

  function doDelete() {
    if (!delTarget) return
    setMdData((prev) => ({
      ...prev,
      [cat]: prev[cat].filter((r) => r.id !== delTarget.id),
    }))
    setDelTarget(null)
    pushToast("success", t.mdDelToastT, delTarget.name)
  }

  function fieldValue(key: ColKey) {
    return key === "name" ? fName : key === "a" ? fA : fB
  }
  function setFieldValue(key: ColKey, v: string) {
    if (key === "name") setFName(v)
    else if (key === "a") setFA(v)
    else setFB(v)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={catLabel} sub={t.mdSub} />

      <Panel>
        <Toolbar>
          <ToolbarTitle>{catLabel}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              placeholder={t.mdSearchPh}
              aria-label={t.mdSearchPh}
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
            />
            <Button onClick={openAdd}>
              <Plus />
              {t.mdAdd}
            </Button>
          </ToolbarGroup>
        </Toolbar>

        {rows.length ? (
          <Table>
            <TableHeader>
              <tr>
                {[
                  ...cols.map((c) => ({ key: c.key as SortKey, label: c.label })),
                  { key: "active" as SortKey, label: t.thStatus },
                ].map((h) => (
                  <TableHead key={h.key}>
                    <button
                      type="button"
                      onClick={() => toggleSort(h.key)}
                      className="inline-flex cursor-pointer items-center gap-1 text-inherit uppercase [font:inherit] [letter-spacing:inherit]"
                    >
                      {h.label}
                      <span className="font-mono">
                        {sort?.key === h.key ? (sort.dir === 1 ? "↑" : "↓") : ""}
                      </span>
                    </button>
                  </TableHead>
                ))}
                <TableHead style={{ width: 110 }}>{t.thAct}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  {cols.map((c) => (
                    <TableCell key={c.key} className="max-w-[420px]">
                      {c.kind === "color" ? (
                        <span className="inline-flex items-center gap-2">
                          <i
                            className="inline-block size-3 rounded"
                            style={{ background: colorVal[r[c.key]] }}
                          />
                          {r[c.key]}
                        </span>
                      ) : c.key === "name" ? (
                        <span className="font-semibold">{r.name}</span>
                      ) : (
                        <span className="text-(--text-secondary)">{r[c.key]}</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    {r.active ? (
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
                      <IconButton aria-label={t.mdEditT} onClick={() => openEdit(r)}>
                        <Pencil />
                      </IconButton>
                      <IconButton
                        danger
                        aria-label={t.empDel}
                        onClick={() => setDelTarget(r)}
                      >
                        <Trash2 />
                      </IconButton>
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
            body={t.mdEmptyB}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{range}</b> {t.attSumB} <b>{sorted.length}</b> {t.mdSumB} —{" "}
            {catLabel}
          </FootSum>
          <Pagination
            page={p}
            pageCount={pageCount}
            onPage={setPage}
            per={per}
            perOptions={["10", "25", "50"]}
            onPer={(v) => {
              setPer(v)
              setPage(1)
            }}
          />
        </PanelFoot>
      </Panel>

      {/* Dialog tambah/edit entri */}
      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} labelledBy="md-t">
        <DialogIcon variant="info">
          <Rows3 />
        </DialogIcon>
        <DialogTitle id="md-t">{editId ? t.mdEditT : t.mdAdd}</DialogTitle>
        <DialogBody>{t.mdDlgB}</DialogBody>
        <form onSubmit={save} noValidate>
          {cols.map((c) => (
            <Field
              key={c.key}
              className="mt-4"
              label={c.label}
              htmlFor={`md-f-${c.key}`}
              required={c.key === "name"}
              error={c.key === "name" && errName}
              errorMessage={c.key === "name" ? t.mdErrName : undefined}
            >
              {c.kind === "select" || c.kind === "color" ? (
                <Select
                  id={`md-f-${c.key}`}
                  value={fieldValue(c.key)}
                  onChange={(e) => setFieldValue(c.key, e.target.value)}
                >
                  {(c.opts ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : c.kind === "time" ? (
                <Input
                  id={`md-f-${c.key}`}
                  type="time"
                  className="font-mono"
                  value={fieldValue(c.key)}
                  onChange={(e) => setFieldValue(c.key, e.target.value)}
                />
              ) : (
                <Input
                  id={`md-f-${c.key}`}
                  value={fieldValue(c.key)}
                  onChange={(e) => setFieldValue(c.key, e.target.value)}
                />
              )}
            </Field>
          ))}
          <ToggleRow className="mt-4" htmlFor="md-active">
            <Checkbox
              id="md-active"
              checked={fActive}
              onChange={(e) => setFActive(e.target.checked)}
            />
            {t.stAktif}
          </ToggleRow>
          <DialogActions>
            <Button type="button" variant="ghost" onClick={() => setDlgOpen(false)}>
              {t.btnCancel}
            </Button>
            <Button type="submit">{editId ? t.udbSaveEdit : t.mdSaveAdd}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog hapus entri */}
      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)} labelledBy="mdd-t">
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="mdd-t">
          {t.mdDelT} &ldquo;{delTarget?.name}&rdquo;?
        </DialogTitle>
        <DialogBody>{t.mdDelB}</DialogBody>
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
