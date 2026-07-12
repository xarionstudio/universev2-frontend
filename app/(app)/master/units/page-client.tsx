"use client"

import * as React from "react"
import { Download, Pencil, Plus, Search, Truck, Upload } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { useAppStore } from "@/components/providers/app-store"
import { useToast } from "@/components/ui/toast"
import { typeOfEgi } from "@/lib/data/units-db"
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
import { Select } from "@/components/ui/select"
import { SearchInput } from "@/components/ui/search-input"
import { Input } from "@/components/ui/input"
import { Field, FormGrid } from "@/components/ui/field"
import {
  Dialog,
  DialogIcon,
  DialogTitle,
  DialogBody,
  DialogActions,
} from "@/components/ui/dialog"
import { Dropzone } from "@/components/ui/dropzone"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  NameCell,
} from "@/components/ui/table"
import { StateBox } from "@/components/ui/state-box"
import { Pagination } from "@/components/ui/pagination"

type ImpState = { stage: "idle" | "progress" | "done"; pct: number; name: string }

export default function UnitDbPage() {
  const { t } = useI18n()
  const { pushToast } = useToast()
  const { udbAll, saveUdb } = useAppStore()

  const [cat, setCat] = React.useState("")
  const [prod, setProd] = React.useState("")
  const [q, setQ] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [per, setPer] = React.useState("10")

  /* dialog tambah/edit */
  const [dlgOpen, setDlgOpen] = React.useState(false)
  const [editUid, setEditUid] = React.useState<string | null>(null)
  const [fCode, setFCode] = React.useState("")
  const [fEgi, setFEgi] = React.useState("")
  const [fCls, setFCls] = React.useState("HD")
  const [fProd, setFProd] = React.useState("CATERPILLAR")
  const [errCode, setErrCode] = React.useState(false)
  const [errEgi, setErrEgi] = React.useState(false)

  /* dialog import */
  const [impOpen, setImpOpen] = React.useState(false)
  const [imp, setImp] = React.useState<ImpState>({ stage: "idle", pct: 0, name: "" })
  const [dragging, setDragging] = React.useState(false)
  const impTimer = React.useRef<ReturnType<typeof setInterval> | null>(null)

  React.useEffect(() => {
    return () => {
      if (impTimer.current) clearInterval(impTimer.current)
    }
  }, [])

  const all = udbAll()
  const classes = Array.from(new Set(all.map((u) => u.cls))).sort()
  const products = Array.from(new Set(all.map((u) => u.product))).sort()
  const egis = Array.from(new Set(all.map((u) => u.egi))).sort()

  const needle = q.trim().toLowerCase()
  const filtered = all.filter((u) => {
    if (cat && u.cls !== cat) return false
    if (prod && u.product !== prod) return false
    if (!needle) return true
    return (
      u.code.toLowerCase().includes(needle) ||
      u.egi.toLowerCase().includes(needle) ||
      u.product.toLowerCase().includes(needle)
    )
  })

  const perN = Number(per)
  const pageCount = Math.max(1, Math.ceil(filtered.length / perN))
  const p = Math.min(page, pageCount)
  const rows = filtered.slice((p - 1) * perN, p * perN)
  const range = filtered.length
    ? `${(p - 1) * perN + 1}–${Math.min(filtered.length, p * perN)}`
    : "0"

  function openAdd() {
    setEditUid(null)
    setFCode("")
    setFEgi(egis[0] || "")
    setFCls("HD")
    setFProd("CATERPILLAR")
    setErrCode(false)
    setErrEgi(false)
    setDlgOpen(true)
  }

  function openEdit(uid: string) {
    const u = all.find((x) => x.uid === uid)
    if (!u) return
    setEditUid(uid)
    setFCode(u.code)
    setFEgi(u.egi)
    setFCls(u.cls)
    setFProd(u.product)
    setErrCode(false)
    setErrEgi(false)
    setDlgOpen(true)
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    const code = fCode.trim()
    const dupe = all.some((u) => u.code === code && u.uid !== editUid)
    const badCode = !code || dupe
    const badEgi = !fEgi
    setErrCode(badCode)
    setErrEgi(badEgi)
    if (badCode || badEgi) return
    saveUdb(editUid, { code, egi: fEgi, cls: fCls, product: fProd })
    setDlgOpen(false)
    pushToast(
      "success",
      editUid ? t.udbEditToastT : t.udbToastT,
      `${code} — ${fEgi} · ${fProd}`
    )
  }

  function startImport(name: string) {
    if (impTimer.current) clearInterval(impTimer.current)
    setImp({ stage: "progress", pct: 0, name: name || "unit_import.xlsx" })
    impTimer.current = setInterval(() => {
      setImp((prev) => {
        const pct = prev.pct + 15 + Math.random() * 12
        if (pct >= 100) {
          if (impTimer.current) clearInterval(impTimer.current)
          impTimer.current = null
          return { ...prev, pct: 100, stage: "done" }
        }
        return { ...prev, pct }
      })
    }, 130)
  }

  function openImport() {
    if (impTimer.current) clearInterval(impTimer.current)
    impTimer.current = null
    setImp({ stage: "idle", pct: 0, name: "" })
    setDragging(false)
    setImpOpen(true)
  }

  function closeImport() {
    if (impTimer.current) clearInterval(impTimer.current)
    impTimer.current = null
    setImpOpen(false)
  }

  function doImport() {
    setImpOpen(false)
    pushToast("success", t.udbImpToastT, `10 ${t.udbImpToastD}`)
  }

  const heads = [
    t.thUnitCode,
    "Eq. class",
    "EGI",
    "Type EGI",
    "Product",
    t.thStatus,
    t.thLastUpd,
    t.thAct,
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.navUnitDb} sub={t.udbSub} />

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.udbListTitle}</ToolbarTitle>
          <ToolbarGroup>
            <Select
              wrapperClassName="w-[170px]"
              value={cat}
              onChange={(e) => {
                setCat(e.target.value)
                setPage(1)
              }}
              aria-label={t.allCats}
            >
              <option value="">{t.allCats}</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              wrapperClassName="w-[180px]"
              value={prod}
              onChange={(e) => {
                setProd(e.target.value)
                setPage(1)
              }}
              aria-label={t.allProds}
            >
              <option value="">{t.allProds}</option>
              {products.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <SearchInput
              className="w-55"
              placeholder={t.searchUnit}
              aria-label={t.searchUnit}
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
            />
            <Button
              variant="secondary"
              onClick={() => pushToast("info", t.toastExportT, "unit_database.xlsx")}
            >
              <Download />
              {t.export}
            </Button>
            <Button variant="secondary" onClick={openImport}>
              <Upload />
              {t.udbImport}
            </Button>
            <Button onClick={openAdd}>
              <Plus />
              {t.udbAdd}
            </Button>
          </ToolbarGroup>
        </Toolbar>

        {rows.length ? (
          <Table>
            <TableHeader>
              <tr>
                {heads.map((h, i) => (
                  <TableHead
                    key={h}
                    className={i === 6 ? "max-xl:hidden" : undefined}
                    style={i === 7 ? { width: 70 } : undefined}
                  >
                    {h}
                  </TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.uid}>
                  <TableCell>
                    <NameCell name={u.code} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">{u.cls}</Badge>
                  </TableCell>
                  <TableCell>{u.egi}</TableCell>
                  <TableCell className="text-(--text-secondary)">
                    {typeOfEgi(u.egi)}
                  </TableCell>
                  <TableCell>{u.product}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {u.active ? (
                        <Badge variant="success" dot>
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="danger" dot>
                          Nonaktif
                        </Badge>
                      )}
                      {u.standby ? (
                        <Badge variant="warning" dot>
                          Standby
                        </Badge>
                      ) : null}
                      {u.breakdown ? (
                        <Badge variant="danger" dot>
                          Breakdown
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="max-xl:hidden">
                    <NameCell
                      name={<span className="font-medium">{u.upd}</span>}
                      sub={u.by}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      aria-label={t.udbEditT}
                      onClick={() => openEdit(u.uid)}
                    >
                      <Pencil />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <StateBox
            icon={<Search className="text-(--color-primary-bright)" />}
            title={t.noResTitle}
            body={t.usEmptyB}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{range}</b> {t.attSumB} <b>{filtered.length}</b>{" "}
            {t.udbSumB}
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

      {/* Dialog tambah/edit unit */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        className="w-[min(560px,100%)]"
        labelledBy="udb-t"
      >
        <DialogIcon variant="info">
          <Truck />
        </DialogIcon>
        <DialogTitle id="udb-t">
          {editUid ? `${t.udbEditT} ${fCode}` : t.udbAdd}
        </DialogTitle>
        <DialogBody>{editUid ? t.udbEditB : t.udbAddB}</DialogBody>
        <form onSubmit={save} noValidate>
          <FormGrid className="mt-4">
            <Field
              label={t.thUnitCode}
              htmlFor="udb-code"
              required
              error={errCode}
              errorMessage={t.udbErrCode}
            >
              <Input
                id="udb-code"
                className="font-mono"
                placeholder="DT-122"
                value={fCode}
                onChange={(e) => setFCode(e.target.value)}
              />
            </Field>
            <Field
              label="EGI"
              htmlFor="udb-egi"
              required
              error={errEgi}
              errorMessage={t.udbErrType}
            >
              <Select
                id="udb-egi"
                value={fEgi}
                onChange={(e) => setFEgi(e.target.value)}
              >
                {egis.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Eq. class" htmlFor="udb-cls">
              <Select
                id="udb-cls"
                value={fCls}
                onChange={(e) => setFCls(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Product" htmlFor="udb-prod">
              <Select
                id="udb-prod"
                value={fProd}
                onChange={(e) => setFProd(e.target.value)}
              >
                {products.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
          <DialogActions>
            <Button type="button" variant="ghost" onClick={() => setDlgOpen(false)}>
              {t.btnCancel}
            </Button>
            <Button type="submit">{editUid ? t.udbSaveEdit : t.udbAddDo}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog import unit massal */}
      <Dialog
        open={impOpen}
        onClose={closeImport}
        className="w-[min(560px,100%)]"
        labelledBy="udbi-t"
      >
        <DialogIcon variant="info">
          <Upload />
        </DialogIcon>
        <DialogTitle id="udbi-t">{t.udbImpT}</DialogTitle>
        <DialogBody>{t.udbImpB}</DialogBody>
        <div className="mt-4">
          <Dropzone
            icon={<Upload />}
            title={t.udbImpDzTitle}
            hint=".xlsx"
            aria-label={t.udbImpDzTitle}
            dragging={dragging}
            onDragChange={setDragging}
            onPick={() => startImport("unit_import.xlsx")}
            onDropFile={(name) => startImport(name)}
          />
          {imp.stage === "progress" ? (
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-semibold">{imp.name}</span>
                <span className="font-mono text-(--text-secondary)">
                  {Math.round(imp.pct)}%
                </span>
              </div>
              <Progress value={imp.pct} />
            </div>
          ) : null}
          {imp.stage === "done" ? (
            <div className="mt-4 flex items-start gap-2 rounded-control border border-(--badge-success-border) bg-(--badge-success-fill) px-4 py-3 text-sm leading-normal text-(--badge-success-text)">
              <svg
                viewBox="0 0 24 24"
                className="mt-0.5 size-4 flex-none"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
                <path d="m9 11 3 3L22 4" />
              </svg>
              <span>
                {imp.name} — {t.udbImpSummary}
              </span>
            </div>
          ) : null}
        </div>
        <DialogActions>
          <Button variant="ghost" onClick={closeImport}>
            {t.btnCancel}
          </Button>
          {imp.stage === "done" ? (
            <Button onClick={doImport}>{t.udbImpDoBtn}</Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </div>
  )
}
