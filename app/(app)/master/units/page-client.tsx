"use client";

import * as React from "react";
import {
  CircleAlert,
  Download,
  Pencil,
  Plus,
  Search,
  Truck,
  Upload,
} from "lucide-react";

import { errorDetail, fleetApi, masterApi } from "@/lib/api";
import { toUdb } from "@/lib/api/adapters";
import type { ApiUnitDb, UnitDbBody } from "@/lib/api/endpoints/fleet";
import { egiTypesForClass, eqClassDefs, typeOfEgi } from "@/lib/data/units-db";
import { useI18n } from "@/lib/i18n";
import { usePermissions } from "@/components/providers/permissions";
import { Badge } from "@/components/ui/badge";
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

import { downloadBlob } from "../../users/_lib/csv";

export default function UnitDbPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { can, user: me } = usePermissions();
  /* Data unit ada di modul RBAC `asset` (route /units/db) meski halaman ini
     bernaung di navigasi Master — tombol tulis mengikuti asset:manage. */
  const canManage = can("asset", "manage");

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
  /* Eq. class dipilih dulu — Type EGI sengaja kosong sampai class terisi. */
  const [fCls, setFCls] = React.useState("");
  const [fProd, setFProd] = React.useState("CATERPILLAR");
  const [errCode, setErrCode] = React.useState(false);
  const [errEgi, setErrEgi] = React.useState(false);
  const [errCls, setErrCls] = React.useState(false);

  /* dialog import */
  const [impOpen, setImpOpen] = React.useState(false);
  const [impBusy, setImpBusy] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  /* ── hidrasi dari GET /api/units/db (513+ unit sungguhan; bukan lagi seed
     equipment.json). Baris API mentah disimpan supaya PUT bisa mengirim body
     LENGKAP — backend meng-update semua kolomnya sekaligus. ── */
  const [apiRows, setApiRows] = React.useState<ApiUnitDb[] | null>(null);
  const [loadErr, setLoadErr] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  /* Opsi form dari Master Data (satu sumber kebenaran dengan menu Master):
     - Product / Merek  → GET /api/master/product
     - Eq. Class        → GET /api/master/eqclass  (name = kode, mis. "MH")
     - Type EGI         → GET /api/master/egi      (difilter eqClass)
     Master di balik permission master:view; akun asset-saja yang kena 403
     jatuh ke fallback lokal (eqClassDefs / egiTypesForClass / baris unit).
     Kontrak: docs/api/database-unit.md. */
  const [masterProds, setMasterProds] = React.useState<string[] | null>(null);
  const [masterEqClasses, setMasterEqClasses] = React.useState<string[] | null>(
    null
  );
  const [masterEgiRows, setMasterEgiRows] = React.useState<
    { name: string; eq: string }[] | null
  >(null);
  React.useEffect(() => {
    const ac = new AbortController();
    void fleetApi
      .listUnitDb(undefined, ac.signal)
      .then((rows) => {
        setApiRows(rows ?? []);
        setLoadErr(false);
      })
      .catch(() => {
        if (!ac.signal.aborted) setLoadErr(true);
      });
    void masterApi
      .listMaster("product", { perPage: 200 }, ac.signal)
      .then((res) => {
        setMasterProds(
          (res?.entries ?? [])
            .filter((e) => e.active)
            .map((e) => e.name.toUpperCase())
            .sort()
        );
      })
      .catch(() => {
        /* 403/putus — fallback turunan baris unit tetap dipakai */
      });
    void masterApi
      .listMaster("eqclass", { perPage: 200 }, ac.signal)
      .then((res) => {
        const codes = (res?.entries ?? [])
          .filter((e) => e.active)
          .map((e) => e.name.trim().toUpperCase())
          .filter(Boolean);
        if (codes.length) setMasterEqClasses(Array.from(new Set(codes)).sort());
      })
      .catch(() => {
        /* 403/putus — fallback eqClassDefs */
      });
    void masterApi
      .listMaster("egi", { perPage: 200 }, ac.signal)
      .then((res) => {
        const rows = (res?.entries ?? [])
          .filter((e) => e.active)
          .map((e) => ({
            name: e.name,
            eq:
              typeof e.eqClass === "string"
                ? e.eqClass.trim().toUpperCase()
                : "",
          }));
        if (rows.length) setMasterEgiRows(rows);
      })
      .catch(() => {
        /* 403/putus — fallback egiTypesForClass */
      });
    return () => ac.abort();
  }, [reloadKey]);
  const retry = React.useCallback(() => {
    setLoadErr(false);
    setReloadKey((k) => k + 1);
  }, []);
  const loaded = apiRows !== null;

  const all = React.useMemo(() => (apiRows ?? []).map(toUdb), [apiRows]);
  /* Eq. class form: master eqclass; fallback data unit + eqClassDefs. */
  const classes = React.useMemo(() => {
    if (masterEqClasses) {
      const set = new Set(masterEqClasses);
      if (fCls) set.add(fCls.trim().toUpperCase());
      return Array.from(set).sort();
    }
    const set = new Set(all.map((u) => u.cls).filter(Boolean));
    for (const [code] of eqClassDefs) set.add(code);
    if (fCls) set.add(fCls.trim().toUpperCase());
    return Array.from(set).sort();
  }, [masterEqClasses, all, fCls]);
  /* filter toolbar: hanya class yang benar-benar ada di baris */
  const filterClasses = React.useMemo(
    () => Array.from(new Set(all.map((u) => u.cls).filter(Boolean))).sort(),
    [all]
  );
  const products = Array.from(new Set(all.map((u) => u.product))).sort();
  /* opsi FORM: master Product/Merek; fallback turunan baris bila master 403.
     Nilai product baris yang diedit disisipkan bila tak ada di master supaya
     select tidak tampak kosong. */
  const prodOpts = React.useMemo(() => {
    const base =
      masterProds ??
      Array.from(new Set(all.map((u) => u.product.toUpperCase()))).sort();
    return fProd && !base.includes(fProd) ? [fProd, ...base].sort() : base;
  }, [masterProds, all, fProd]);
  /* Type EGI bergantung Eq. class — kosong sampai class dipilih.
     Sumber utama: master/egi difilter eqClass; fallback egiTypesForClass. */
  const egiTypeOpts = React.useMemo(() => {
    const cls = fCls.trim().toUpperCase();
    if (!cls) return [];
    if (masterEgiRows && masterEgiRows.some((r) => r.eq)) {
      const set = new Set(
        masterEgiRows.filter((r) => r.eq === cls).map((r) => r.name)
      );
      if (fEgi) set.add(typeOfEgi(fEgi));
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    }
    return egiTypesForClass(cls, all, fEgi || undefined);
  }, [fCls, masterEgiRows, all, fEgi]);

  const needle = q.trim().toLowerCase();
  const filtered = all.filter((u) => {
    if (cat && u.cls !== cat) return false;
    if (prod && u.product !== prod) return false;
    if (!needle) return true;
    return (
      u.code.toLowerCase().includes(needle) ||
      typeOfEgi(u.egi).toLowerCase().includes(needle) ||
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
    setFCls("");
    setFEgi("");
    setFProd(
      (masterProds ?? products.map((p) => p.toUpperCase())).includes(
        "CATERPILLAR"
      )
        ? "CATERPILLAR"
        : (masterProds?.[0] ?? products[0]?.toUpperCase() ?? "")
    );
    setErrCode(false);
    setErrCls(false);
    setErrEgi(false);
    setDlgOpen(true);
  }

  function openEdit(uid: string) {
    const u = all.find((x) => x.uid === uid);
    if (!u) return;
    setEditUid(uid);
    setFCode(u.code);
    /* class dulu, lalu Type EGI — urutan sama dengan form tambah */
    setFCls(u.cls);
    /* baris lama menyimpan model mentah — tampilkan Type EGI hasil
       pemetaannya supaya nilainya ada di daftar opsi (dan menyimpan ulang
       menormalkan baris itu ke kosakata kanonik) */
    setFEgi(typeOfEgi(u.egi));
    setFProd(u.product.toUpperCase());
    setErrCode(false);
    setErrCls(false);
    setErrEgi(false);
    setDlgOpen(true);
  }

  function onClsChange(cls: string) {
    setFCls(cls);
    if (cls.trim()) setErrCls(false);
    /* Ganti class → Type EGI dikosongkan; opsi baru muncul setelah pilih. */
    setFEgi("");
    setErrEgi(false);
  }

  /* ── mutasi pesimistis lewat API. PUT /units/db mengidentifikasi baris
     lewat `code` DI DALAM body dan meng-update semua kolom sekaligus, jadi
     body dibangun dari baris API mentah + field yang diedit; kode unit
     karena itu tidak bisa diganti pada mode edit. ── */
  function bodyOf(u: ApiUnitDb): UnitDbBody {
    return {
      code: u.code,
      egi: u.egi,
      product: u.product,
      cls: u.cls,
      cat: u.cat,
      area: u.area,
      active: u.active,
      standby: u.standby,
      breakdown: u.breakdown,
      loc: u.loc,
      upd: new Date().toISOString().slice(0, 10),
      by: me?.kar ?? "admin",
    };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const code = fCode.trim().toUpperCase();
    const dupe = all.some((u) => u.code === code && u.uid !== editUid);
    const badCode = !code || dupe;
    const cls = fCls.trim().toUpperCase();
    const badCls = !cls;
    const badEgi = !fEgi;
    setErrCode(badCode);
    setErrCls(badCls);
    setErrEgi(badEgi);
    if (badCode || badCls || badEgi || saving) return;
    setSaving(true);
    try {
      if (editUid) {
        const cur = (apiRows ?? []).find((u) => "u-" + u.id === editUid);
        if (!cur) return;
        const body = { ...bodyOf(cur), egi: fEgi, cls, product: fProd };
        await fleetApi.updateUnitDb(body);
        setApiRows((prev) =>
          (prev ?? []).map((u) => (u.id === cur.id ? { ...u, ...body } : u))
        );
      } else {
        const created = await fleetApi.createUnitDb({
          code,
          egi: fEgi,
          product: fProd,
          cls,
          cat: "",
          area: "",
          active: true,
          standby: false,
          breakdown: false,
          loc: "",
          upd: new Date().toISOString().slice(0, 10),
          by: me?.kar ?? "admin",
        });
        setApiRows((prev) => [...(prev ?? []), created]);
      }
      setDlgOpen(false);
      pushToast(
        "success",
        editUid ? t.udbEditToastT : t.udbToastT,
        `${code} — ${fEgi} · ${fProd}`
      );
    } catch (err) {
      /* dialog tetap terbuka — isian jangan hilang */
      pushToast("error", t.apErrT, errorDetail(err, t.udbLoadErrB));
    } finally {
      setSaving(false);
    }
  }

  /* ── impor .xlsx sungguhan (POST /units/db/import) — hasilnya
     {imported, skipped, errors}; daftar ditarik ulang setelah selesai. ── */
  async function uploadImport(file: File) {
    if (impBusy) return;
    setImpBusy(file.name);
    try {
      const res = (await fleetApi.importUnitDb(file)) as {
        imported: number;
        skipped: number;
        errors: string[] | null;
      };
      setImpOpen(false);
      pushToast(
        "success",
        t.udbImpToastT,
        `${res.imported} ${t.udbImpToastD}` +
          (res.skipped ? ` · ${res.skipped} ${t.udbImpSkipD}` : "")
      );
      retry();
    } catch (err) {
      pushToast("error", t.apErrT, errorDetail(err, t.udbLoadErrB));
    } finally {
      setImpBusy(null);
    }
  }

  function openImport() {
    setDragging(false);
    setImpOpen(true);
  }

  function closeImport() {
    if (!impBusy) setImpOpen(false);
  }

  async function doExport() {
    try {
      const blob = await fleetApi.exportUnitDb();
      const name = `units_db_${new Date().toISOString().slice(0, 10)}.xlsx`;
      downloadBlob(name, blob);
      pushToast("success", t.toastExportT, name);
    } catch (err) {
      pushToast("error", t.apErrT, errorDetail(err, t.udbLoadErrB));
    }
  }

  /* Kolom "EGI" (model mentah) DIHAPUS 29 Agu 2026 — asal datanya tidak
     terlacak dan form hanya mengisi Type EGI, jadi menampilkan keduanya
     hanya membingungkan. */
  const heads = [
    t.thUnitCode,
    "Eq. class",
    "Type EGI",
    "Product",
    t.thStatus,
    t.thLastUpd,
    t.thAct,
  ];

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.navUnitDb} sub={t.udbSub}>
        {canManage ? (
          <Button onClick={openAdd}>
            <Plus />
            {t.udbAdd}
          </Button>
        ) : null}
      </PageTitle>

      {loadErr && !loaded ? (
        <Panel>
          <StateBox
            icon={<CircleAlert className="text-danger-text" />}
            title={t.apLoadErrT}
            body={t.udbLoadErrB}
          >
            <Button onClick={retry}>{t.apRetry}</Button>
          </StateBox>
        </Panel>
      ) : !loaded ? (
        <Panel>
          <div className="grid place-items-center py-16">
            <Spinner className="size-6" />
          </div>
        </Panel>
      ) : (
        <Panel>
          <Toolbar>
            <ToolbarTitle>{t.udbListTitle}</ToolbarTitle>
            <ToolbarGroup>
              <SearchInput
                className="w-60 max-sm:w-full"
                placeholder={t.searchUnit}
                aria-label={t.searchUnit}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
              <Select
                wrapperClassName="w-42.5 max-sm:w-full"
                value={cat}
                onChange={(e) => {
                  setCat(e.target.value);
                  setPage(1);
                }}
                aria-label={t.allCats}
              >
                <option value="">{t.allCats}</option>
                {filterClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Select
                wrapperClassName="w-45 max-sm:w-full"
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
              <Button variant="secondary" onClick={() => void doExport()}>
                <Download />
                {t.export}
              </Button>
              {canManage ? (
                <Button variant="secondary" onClick={openImport}>
                  <Upload />
                  {t.udbImport}
                </Button>
              ) : null}
            </ToolbarGroup>
          </Toolbar>

          {rows.length ? (
            <Table>
              <TableHeader>
                <tr>
                  {heads.map((h, i) => (
                    <TableHead
                      key={h}
                      className={i === 5 ? "max-xl:hidden" : undefined}
                      style={i === 6 ? { width: 70 } : undefined}
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
                      {canManage ? (
                        <IconButton
                          aria-label={t.udbEditT}
                          onClick={() => openEdit(u.uid)}
                        >
                          <Pencil />
                        </IconButton>
                      ) : null}
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
      )}

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
              {/* PUT backend mengenali baris lewat code — kode tidak bisa
                  diganti pada mode edit */}
              <Input
                id="udb-code"
                className="font-mono"
                placeholder="DT-122"
                value={fCode}
                disabled={!!editUid}
                readOnly={!!editUid}
                onChange={(e) => setFCode(e.target.value)}
              />
            </Field>
            <Field
              label="Eq. Class"
              htmlFor="udb-cls"
              required
              error={errCls}
              errorMessage={t.udbErrCls}
            >
              <Select
                id="udb-cls"
                value={fCls}
                onChange={(e) => onClsChange(e.target.value)}
              >
                <option value="">{t.udbClsPh}</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            {/* Type EGI baru muncul setelah Eq. Class dipilih — opsi
                difilter per class. Nilai masuk ke kolom `egi` untuk
                pencocokan SIMPER auto-alokasi. */}
            <Field
              label="Type EGI"
              htmlFor="udb-egi"
              required
              error={errEgi}
              errorMessage={t.udbErrType}
              helper={fCls ? undefined : t.udbEgiNeedCls}
            >
              <Select
                id="udb-egi"
                value={fEgi}
                disabled={!fCls}
                onChange={(e) => {
                  setFEgi(e.target.value);
                  if (e.target.value) setErrEgi(false);
                }}
              >
                <option value="">{fCls ? t.udbEgiPh : t.udbEgiNeedCls}</option>
                {egiTypeOpts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            {/* opsi dari master Product / Merek — bukan turunan baris unit */}
            <Field label="Product" htmlFor="udb-prod">
              <Select
                id="udb-prod"
                value={fProd}
                onChange={(e) => setFProd(e.target.value)}
              >
                {prodOpts.map((c) => (
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
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner /> : null}
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
          {/* input file tersembunyi — Dropzone onPick tidak membuka pemilih
              berkas sendiri; drop langsung membawa File-nya */}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void uploadImport(f);
            }}
          />
          <Dropzone
            icon={<Upload />}
            title={t.udbImpDzTitle}
            hint=".xlsx"
            aria-label={t.udbImpDzTitle}
            dragging={dragging}
            onDragChange={setDragging}
            onPick={() => fileRef.current?.click()}
            onDropFile={(name, file) => {
              if (file) void uploadImport(file);
            }}
          />
          {impBusy ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-(--text-secondary)">
              <Spinner className="size-4" />
              <span className="font-semibold">{impBusy}</span> —{" "}
              {t.udbUploading}
            </div>
          ) : null}
        </div>
        <DialogActions>
          <Button variant="ghost" disabled={!!impBusy} onClick={closeImport}>
            {t.btnCancel}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
