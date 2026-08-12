"use client";

import * as React from "react";
import { Download, Pencil, Plus, Search, Truck, Upload } from "lucide-react";

import { fleetApi } from "@/lib/api/fleet";
import { typeOfEgi } from "@/lib/data/units-db";
import { useI18n } from "@/lib/i18n";
import { reportFileName } from "@/lib/report/logo";
import { downloadXlsx } from "@/lib/report/xlsx";
import { useAppStore } from "@/components/providers/app-store";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
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
import { Pagination } from "@/components/ui/pagination";
import {
  FootSum,
  PageTitle,
  Panel,
  PanelFoot,
  Toolbar,
  ToolbarGroup,
  ToolbarTitle,
} from "@/components/ui/panel";
import { Progress } from "@/components/ui/progress";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StateBox } from "@/components/ui/state-box";
import {
  NameCell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

type ImpState = {
  stage: "idle" | "progress" | "done";
  pct: number;
  name: string;
};

export default function UnitDbPage() {
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const { udbAll, saveUdb, setUdbAdded } = useAppStore();

  const [cat, setCat] = React.useState("");
  const [prod, setProd] = React.useState("");
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [per, setPer] = React.useState("10");

  /* dialog tambah/edit */
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editUid, setEditUid] = React.useState<string | null>(null);
  const [fCode, setFCode] = React.useState("");
  const [fEgi, setFEgi] = React.useState("");
  const [fCls, setFCls] = React.useState("HD");
  const [fProd, setFProd] = React.useState("CATERPILLAR");
  const [errCode, setErrCode] = React.useState(false);
  const [errEgi, setErrEgi] = React.useState(false);

  /* dialog import */
  const [impOpen, setImpOpen] = React.useState(false);
  const [imp, setImp] = React.useState<ImpState>({
    stage: "idle",
    pct: 0,
    name: "",
  });
  const [dragging, setDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const impFileRef = React.useRef<File | null>(null);

  const all = udbAll();
  const classes = Array.from(new Set(all.map((u) => u.cls))).sort();
  const products = Array.from(new Set(all.map((u) => u.product))).sort();
  const egis = Array.from(new Set(all.map((u) => u.egi))).sort();

  const needle = q.trim().toLowerCase();
  const filtered = all.filter((u) => {
    if (cat && u.cls !== cat) return false;
    if (prod && u.product !== prod) return false;
    if (!needle) return true;
    return (
      u.code.toLowerCase().includes(needle) ||
      u.egi.toLowerCase().includes(needle) ||
      u.product.toLowerCase().includes(needle)
    );
  });

  const perN = Number(per);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perN));
  const p = Math.min(page, pageCount);
  const rows = filtered.slice((p - 1) * perN, p * perN);
  const range = filtered.length
    ? `${(p - 1) * perN + 1}–${Math.min(filtered.length, p * perN)}`
    : "0";

  function openAdd() {
    setEditUid(null);
    setFCode("");
    setFEgi(egis[0] || "");
    setFCls("HD");
    setFProd("CATERPILLAR");
    setErrCode(false);
    setErrEgi(false);
    setDlgOpen(true);
  }

  function openEdit(uid: string) {
    const u = all.find((x) => x.uid === uid);
    if (!u) return;
    setEditUid(uid);
    setFCode(u.code);
    setFEgi(u.egi);
    setFCls(u.cls);
    setFProd(u.product);
    setErrCode(false);
    setErrEgi(false);
    setDlgOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const code = fCode.trim();
    const dupe = all.some((u) => u.code === code && u.uid !== editUid);
    const badCode = !code || dupe;
    const badEgi = !fEgi;
    setErrCode(badCode);
    setErrEgi(badEgi);
    if (badCode || badEgi) return;
    const data = { code, egi: fEgi, cls: fCls, product: fProd };
    try {
      if (editUid) {
        await fleetApi.updateUnitDB(code, data);
      } else {
        await fleetApi.createUnitDB(data);
      }
      saveUdb(editUid, data);
      setDlgOpen(false);
      pushToast(
        "success",
        editUid ? t.udbEditToastT : t.udbToastT,
        `${code} — ${fEgi} · ${fProd}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save unit";
      pushToast("error", editUid ? t.udbEditToastT : t.udbToastT, msg);
    }
  }

  async function startImport(name: string, file?: File) {
    if (!file) return;
    impFileRef.current = file;
    setImp({ stage: "progress", pct: 0, name: file.name });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fleetApi.importUnitDBWithProgress(formData, (pct) => {
        setImp({ stage: "progress", pct, name: file.name });
      });
      setImp({ stage: "done", pct: 100, name: file.name });
      pushToast(
        "success",
        t.udbImpToastT,
        `${res.imported || 1} ${t.udbImpToastD}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import gagal";
      pushToast("error", "Import Gagal", msg);
      setImp({ stage: "idle", pct: 0, name: "" });
    }
  }

  function openImport() {
    setImp({ stage: "idle", pct: 0, name: "" });
    setDragging(false);
    setImpOpen(true);
  }

  function closeImport() {
    setImpOpen(false);
  }

  async function doImport() {
    setImpOpen(false);
    try {
      const fresh = await fleetApi.getUnitDB();
      if (fresh && Array.isArray(fresh)) {
        setUdbAdded(
          fresh.map((u) => ({
            uid: String(u.id || u.code),
            code: u.code,
            cat: u.cat || "",
            cls: u.cls || "",
            egi: u.egi || "",
            product: u.product || "",
            active: u.active !== false,
            standby: !!u.standby,
            breakdown: !!u.breakdown,
            loc: u.loc || "",
            upd: u.upd || "",
            by: u.by || "",
          }))
        );
      }
    } catch {}
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
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.navUnitDb} sub={t.udbSub}>
        <Button onClick={openAdd}>
          <Plus />
          {t.udbAdd}
        </Button>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.udbListTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60"
              placeholder={t.searchUnit}
              aria-label={t.searchUnit}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Select
              wrapperClassName="w-42.5"
              value={cat}
              onChange={(e) => {
                setCat(e.target.value);
                setPage(1);
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
              wrapperClassName="w-45"
              value={prod}
              onChange={(e) => {
                setProd(e.target.value);
                setPage(1);
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
            <Button
              variant="secondary"
              onClick={async () => {
                if (!filtered.length) {
                  pushToast("info", t.expEmptyT, t.expEmptyD);
                  return;
                }
                try {
                  const name = reportFileName("unit-database", "xlsx");
                  await downloadXlsx(name, {
                    name: t.navUnitDb,
                    title: t.navUnitDb,
                    meta: [
                      `${t.expPrintedAt}: ${new Date().toLocaleString(lang === "en" ? "en-GB" : "id-ID")}`,
                      `${t.expRows}: ${filtered.length}`,
                    ],
                    columns: [
                      { header: t.thUnitCode, width: 14 },
                      { header: "Eq. class", width: 12 },
                      { header: "EGI", width: 16 },
                      { header: "Type EGI", width: 18 },
                      { header: "Product", width: 18 },
                      { header: t.thStatus, width: 20 },
                      { header: t.thLastUpd, width: 16 },
                    ],
                    rows: filtered.map((u) => [
                      u.code,
                      u.cls,
                      u.egi,
                      typeOfEgi(u.egi),
                      u.product,
                      u.active
                        ? t.stAktif
                        : u.breakdown
                          ? "Breakdown"
                          : u.standby
                            ? "Standby"
                            : t.stNonaktif,
                      `${u.upd}${u.by ? ` — ${u.by}` : ""}`,
                    ]),
                  });
                  pushToast("success", t.toastExportT, name);
                } catch {
                  pushToast("error", t.toastExportT, t.toastExportD);
                }
              }}
            >
              <Download />
              {t.export}
            </Button>
            <Button variant="secondary" onClick={openImport}>
              <Upload />
              {t.udbImport}
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
            icon={<Search className="text-primary-bright" />}
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
              setPer(v);
              setPage(1);
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDlgOpen(false)}
            >
              {t.btnCancel}
            </Button>
            <Button type="submit">
              {editUid ? t.udbSaveEdit : t.udbAddDo}
            </Button>
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
            onPick={() => fileInputRef.current?.click()}
            onDropFile={(name, file) => startImport(name, file)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) startImport(file.name, file);
              e.target.value = "";
            }}
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
  );
}
