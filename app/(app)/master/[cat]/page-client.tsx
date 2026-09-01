"use client";

import * as React from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import {
  CircleAlert,
  Download,
  Pencil,
  Plus,
  Rows3,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { errorDetail, fleetApi, masterApi } from "@/lib/api";
import { mdEntryBody, toMdEntry } from "@/lib/api/adapters";
import type { ApiUnitDb } from "@/lib/api/endpoints/fleet";
import { hasGuidedImport } from "@/lib/api/endpoints/master";
import {
  mdCatLabels,
  mdCats,
  type MdCat,
  type MdEntry,
} from "@/lib/data/master-data";
import { unitsDb } from "@/lib/data/units-db";
import { useI18n } from "@/lib/i18n";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

import { downloadBlob } from "../../users/_lib/csv";

type ColKey = "name" | "a" | "b";
type SortKey = ColKey | "active";
type ColDef = {
  key: ColKey;
  label: string;
  kind?: "text" | "time" | "select" | "color" | "readonly";
  opts?: string[];
  /* label opsi dropdown bila berbeda dari nilainya (mis. kode Eq. Class
     "HD" berlabel "HD — Heavy Dump Truck") — nilai tersimpan tetap opts */
  optLabel?: (v: string) => string;
  help?: string;
};

const runtextTargets = [
  "Semua kiosk",
  "Display Attendance",
  "Display Fleet",
  "Display Monitor",
];
const runtextColors = ["Cyan", "Oranye", "Putih", "Merah"];
const colorVal: Record<string, string> = {
  Cyan: "#00D4FF",
  Oranye: "#E99B2A",
  Putih: "#FFFFFF",
  Merah: "#FC3C3B",
};

export default function MasterDataPage() {
  const params = useParams<{ cat: string }>();
  const cat = params.cat as MdCat;
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const { can } = usePermissions();
  const router = useRouter();
  const canManage = can("master", "manage");
  /* Store mdData tetap jadi rumah datanya: konsumen lain (dropdown bus/area
     Fleet Setting, mess di form karyawan, running text di admin display)
     membacanya juga — hidrasi halaman ini sekalian menyegarkan mereka. */
  const { mdData, setMdData } = useAppStore();

  const [q, setQ] = React.useState("");
  const [stF, setStF] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [per, setPer] = React.useState("10");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 } | null>(
    null
  );

  /* dialog tambah/edit */
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [fName, setFName] = React.useState("");
  const [fA, setFA] = React.useState("");
  const [fB, setFB] = React.useState("");
  const [fActive, setFActive] = React.useState(true);
  const [errName, setErrName] = React.useState(false);

  /* dialog hapus */
  const [delTarget, setDelTarget] = React.useState<MdEntry | null>(null);

  if (!mdCats.includes(cat)) notFound();

  const en = lang === "en";
  const catLabel = mdCatLabels[cat][lang];

  /* ── hidrasi dari GET /api/master/:category (sekali per kunjungan; master
     bukan papan hidup, tidak perlu poll — reloadKey menyegarkan setelah
     mutasi gagal). Kategori pendukung ikut ditarik: lokasiex butuh opsi
     bus+tempudo; bus/lokasiex butuh Database Unit (modul asset — 403 pada
     akun master-saja didegradasi ke seed statis). ── */
  const [loaded, setLoaded] = React.useState(false);
  const [loadErr, setLoadErr] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [apiUnits, setApiUnits] = React.useState<ApiUnitDb[] | null>(null);
  React.useEffect(() => {
    const ac = new AbortController();
    void masterApi
      .listMaster(cat, { perPage: 200 }, ac.signal)
      .then((res) => {
        setMdData((prev) => ({
          ...prev,
          [cat]: (res.entries ?? []).map((e) => toMdEntry(cat, e)),
        }));
        setLoaded(true);
        setLoadErr(false);
      })
      .catch(() => {
        if (!ac.signal.aborted) setLoadErr(true);
      });
    if (cat === "egi") {
      /* form Type EGI butuh opsi klasifikasi Eq. Class */
      void masterApi
        .listMaster("eqclass", { perPage: 200 }, ac.signal)
        .then((res) =>
          setMdData((prev) => ({
            ...prev,
            eqclass: (res.entries ?? []).map((e) => toMdEntry("eqclass", e)),
          }))
        )
        .catch(() => {
          /* dropdown jatuh ke isi store */
        });
    }
    if (cat === "lokasiex") {
      for (const dep of ["bus", "tempudo"] as const) {
        void masterApi
          .listMaster(dep, { perPage: 200 }, ac.signal)
          .then((res) =>
            setMdData((prev) => ({
              ...prev,
              [dep]: (res.entries ?? []).map((e) => toMdEntry(dep, e)),
            }))
          )
          .catch(() => {
            /* dropdown jatuh ke isi store */
          });
      }
    }
    if (cat === "bus" || cat === "lokasiex") {
      void fleetApi
        .listUnitDb(undefined, ac.signal)
        .then((units) => setApiUnits(units ?? []))
        .catch(() => {
          /* seed statis tetap jadi sumber opsi */
        });
    }
    return () => ac.abort();
  }, [cat, reloadKey, setMdData]);
  const retry = React.useCallback(() => {
    setLoadErr(false);
    setReloadKey((k) => k + 1);
  }, []);

  /* opsi dropdown dari sumber yang benar (bukan teks bebas):
     bus ← Database Unit class BUS; lokasi excavator ← digger + master bus/tempudo */
  const unitsSrc = React.useMemo(
    () =>
      apiUnits ??
      unitsDb.map((u) => ({
        code: u.code,
        cls: u.cls,
        cat: u.cat,
        egi: u.egi,
        active: u.active,
      })),
    [apiUnits]
  );
  const busCodeOpts = React.useMemo(() => {
    const used = new Set(
      mdData.bus.filter((r) => r.id !== editId).map((r) => r.name)
    );
    return unitsSrc
      .filter((u) => u.cls === "BUS" && u.active && !used.has(u.code))
      .map((u) => u.code);
  }, [mdData.bus, editId, unitsSrc]);
  const diggerOpts = React.useMemo(() => {
    const used = new Set(
      mdData.lokasiex.filter((r) => r.id !== editId).map((r) => r.name)
    );
    return unitsSrc
      .filter(
        (u) =>
          (u.cat === "BIG_DIGGER" || u.cat === "MEDIUM_DIGGER") &&
          u.active &&
          !used.has(u.code)
      )
      .map((u) => u.code);
  }, [mdData.lokasiex, editId, unitsSrc]);
  const busOpts = React.useMemo(
    () => mdData.bus.filter((r) => r.active).map((r) => r.name),
    [mdData.bus]
  );
  const tempudoOpts = React.useMemo(
    () => mdData.tempudo.filter((r) => r.active).map((r) => r.name),
    [mdData.tempudo]
  );
  const busTypeOf = (code: string) =>
    unitsSrc.find((u) => u.code === code)?.egi ?? "";

  /* opsi klasifikasi Type EGI: kode Eq. Class aktif dari master; "" di depan
     = belum terklasifikasi (mis. SPARE). Label menyertakan kepanjangannya. */
  const eqClassOpts = React.useMemo(
    () => ["", ...mdData.eqclass.filter((r) => r.active).map((r) => r.name)],
    [mdData.eqclass]
  );
  const eqClassLabel = React.useCallback(
    (v: string) => {
      if (!v) return "—";
      const d = mdData.eqclass.find((r) => r.name === v)?.a;
      return d ? `${v} — ${d}` : v;
    },
    [mdData.eqclass]
  );

  const cols: ColDef[] = React.useMemo(() => {
    switch (cat) {
      case "egi":
        /* Eq. Class DULU (dropdown klasifikasi), baru ketik nama Type EGI */
        return [
          {
            key: "a",
            label: "Eq. Class",
            kind: "select",
            opts: eqClassOpts,
            optLabel: eqClassLabel,
            help: t.mdEgiEqHelp,
          },
          { key: "name", label: "Type EGI" },
        ];
      case "product":
        return [{ key: "name", label: t.mdNama }];
      case "eqclass":
        return [
          { key: "name", label: "Kode" },
          { key: "a", label: t.mdDesc },
        ];
      case "area":
        return [
          { key: "name", label: t.mdNama },
          { key: "a", label: t.thCat },
        ];
      case "tempudo":
        return [
          { key: "name", label: "Kode" },
          { key: "a", label: t.thLoc },
          { key: "b", label: t.thType },
        ];
      case "bus":
        return [
          {
            key: "name",
            label: "Kode",
            kind: "select",
            opts: busCodeOpts,
            help: en
              ? "From Unit Database (BUS class) — registered buses are hidden."
              : "Dari Database Unit (class BUS) — bus yang sudah terdaftar tidak muncul.",
          },
          {
            key: "a",
            label: en ? "Type" : "Tipe",
            kind: "readonly",
            help: en
              ? "Auto-filled from the selected unit."
              : "Terisi otomatis dari unit yang dipilih.",
          },
          { key: "b", label: t.mdJam, kind: "time" },
        ];
      case "lokasiex":
        return [
          {
            key: "name",
            label: "Excavator",
            kind: "select",
            opts: diggerOpts,
            help: en
              ? "Big/medium diggers from the Unit Database — mapped ones are hidden."
              : "Big/medium digger dari Database Unit — yang sudah dipetakan tidak muncul.",
          },
          { key: "a", label: "Bus", kind: "select", opts: busOpts },
          { key: "b", label: "Tempudo", kind: "select", opts: tempudoOpts },
        ];
      case "mess":
        return [
          { key: "name", label: t.mdNama },
          { key: "a", label: en ? "Block" : "Blok" },
        ];
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
        ];
    }
  }, [
    cat,
    t,
    en,
    busCodeOpts,
    diggerOpts,
    busOpts,
    tempudoOpts,
    eqClassOpts,
    eqClassLabel,
  ]);

  const entries = mdData[cat];
  const needle = q.trim().toLowerCase();
  const filtered = entries.filter((r) => {
    if (stF === "1" && !r.active) return false;
    if (stF === "0" && r.active) return false;
    if (!needle) return true;
    return (
      r.name.toLowerCase().includes(needle) ||
      r.a.toLowerCase().includes(needle) ||
      r.b.toLowerCase().includes(needle)
    );
  });

  const sorted = sort
    ? [...filtered].sort((x, y) => {
        if (sort.key === "active")
          return (Number(x.active) - Number(y.active)) * sort.dir;
        return x[sort.key].localeCompare(y[sort.key]) * sort.dir;
      })
    : filtered;

  const perN = Number(per);
  const pageCount = Math.max(1, Math.ceil(sorted.length / perN));
  const p = Math.min(page, pageCount);
  const rows = sorted.slice((p - 1) * perN, p * perN);
  const range = sorted.length
    ? `${(p - 1) * perN + 1}–${Math.min(sorted.length, p * perN)}`
    : "0";

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === 1 ? -1 : 1 }
        : { key, dir: 1 }
    );
  }

  function openAdd() {
    setEditId(null);
    const nameCol = cols.find((c) => c.key === "name");
    const name = nameCol?.kind === "select" ? (nameCol.opts?.[0] ?? "") : "";
    setFName(name);
    setFA(
      cat === "bus"
        ? busTypeOf(name)
        : (cols.find((c) => c.key === "a")?.opts?.[0] ?? "")
    );
    setFB(cols.find((c) => c.key === "b")?.opts?.[0] ?? "");
    setFActive(true);
    setErrName(false);
    setDlgOpen(true);
  }

  function openEdit(r: MdEntry) {
    setEditId(r.id);
    setFName(r.name);
    setFA(r.a);
    setFB(r.b);
    setFActive(r.active);
    setErrName(false);
    setDlgOpen(true);
  }

  /* ── mutasi pesimistis: POST/PUT/DELETE dulu, refleksi store setelah 2xx.
     id baris = CODE entri (identitas path backend); entri baru memakai code
     balasan server. ── */
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = fName.trim();
    if (!name) {
      setErrName(true);
      return;
    }
    if (saving) return;
    setSaving(true);
    const data = { name, a: fA, b: fB, active: fActive };
    try {
      if (editId) {
        await masterApi.updateMasterEntry(cat, editId, mdEntryBody(cat, data));
        setMdData((prev) => ({
          ...prev,
          [cat]: prev[cat].map((r) =>
            r.id === editId ? { ...r, ...data } : r
          ),
        }));
      } else {
        const created = await masterApi.createMasterEntry(
          cat,
          mdEntryBody(cat, data)
        );
        setMdData((prev) => ({
          ...prev,
          [cat]: [...prev[cat], toMdEntry(cat, created)],
        }));
      }
      setDlgOpen(false);
      pushToast("success", editId ? t.mdEditToastT : t.mdAddToastT, name);
    } catch (err) {
      /* dialog tetap terbuka — isian jangan hilang */
      pushToast("error", t.apErrT, errorDetail(err, t.mdLoadErrB));
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!delTarget || saving) return;
    setSaving(true);
    try {
      await masterApi.deleteMasterEntry(cat, delTarget.id);
      setMdData((prev) => ({
        ...prev,
        [cat]: prev[cat].filter((r) => r.id !== delTarget.id),
      }));
      setDelTarget(null);
      pushToast("success", t.mdDelToastT, delTarget.name);
    } catch (err) {
      pushToast("error", t.apErrT, errorDetail(err, t.mdLoadErrB));
    } finally {
      setSaving(false);
    }
  }

  function fieldValue(key: ColKey) {
    return key === "name" ? fName : key === "a" ? fA : fB;
  }
  function setFieldValue(key: ColKey, v: string) {
    if (key === "name") {
      setFName(v);
      /* tipe bus mengikuti unit yang dipilih — bukan input manual */
      if (cat === "bus") setFA(busTypeOf(v));
    } else if (key === "a") setFA(v);
    else setFB(v);
  }

  /* Export dirakit backend (GET /api/master/:category/export). Sengaja
     tanpa query: filter cari/status di layar ini disaring di klien, jadi
     yang diekspor selalu seluruh kategori supaya isinya tidak diam-diam
     berbeda dengan yang tampak tersaring. */
  async function exportNow() {
    try {
      const blob = await masterApi.exportMaster(cat);
      const name = `master-${cat}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      downloadBlob(name, blob);
      pushToast("success", t.empToastExp, name);
    } catch (e) {
      pushToast("error", t.apErrT, errorDetail(e, t.apErrT));
    }
  }

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={catLabel} sub={t.mdSub}>
        <div className="flex flex-wrap gap-2">
          {/* Import hanya untuk kategori yang punya impor terpandu
              (Eq. Class & Type EGI). Kategori lain belum punya layarnya,
              jadi tombolnya tidak ditampilkan alih-alih mengantar ke 404. */}
          {canManage && hasGuidedImport(cat) ? (
            <Button
              variant="secondary"
              onClick={() => router.push(`/master/${cat}/import`)}
            >
              <Upload />
              {t.upImportShort}
            </Button>
          ) : null}
          {/* Export tersedia untuk permission Lihat — hanya membaca */}
          <Button variant="secondary" onClick={() => void exportNow()}>
            <Download />
            {t.export}
          </Button>
          {canManage ? (
            <Button onClick={openAdd}>
              <Plus />
              {t.mdAdd}
            </Button>
          ) : null}
        </div>
      </PageTitle>

      {loadErr && !loaded ? (
        <Panel>
          <StateBox
            icon={<CircleAlert className="text-danger-text" />}
            title={t.apLoadErrT}
            body={t.mdLoadErrB}
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
            <ToolbarTitle>{catLabel}</ToolbarTitle>
            <ToolbarGroup>
              <SearchInput
                className="w-60 max-sm:w-full"
                placeholder={t.mdSearchPh}
                aria-label={t.mdSearchPh}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
              <Select
                wrapperClassName="w-40 max-sm:w-full"
                value={stF}
                onChange={(e) => {
                  setStF(e.target.value);
                  setPage(1);
                }}
                aria-label={t.allStatus}
              >
                <option value="">{t.allStatus}</option>
                <option value="1">{t.stAktif}</option>
                <option value="0">{t.stNonaktif}</option>
              </Select>
            </ToolbarGroup>
          </Toolbar>

          {rows.length ? (
            <Table>
              <TableHeader>
                <tr>
                  {[
                    ...cols.map((c) => ({
                      key: c.key as SortKey,
                      label: c.label,
                    })),
                    { key: "active" as SortKey, label: t.thStatus },
                  ].map((h) => (
                    <TableHead key={h.key}>
                      <button
                        type="button"
                        onClick={() => toggleSort(h.key)}
                        className="inline-flex cursor-pointer items-center gap-1 tracking-[inherit] text-inherit uppercase [font:inherit]"
                      >
                        {h.label}
                        <span className="font-mono">
                          {sort?.key === h.key
                            ? sort.dir === 1
                              ? "↑"
                              : "↓"
                            : ""}
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
                      <TableCell key={c.key} className="max-w-105">
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
                          <span className="text-(--text-secondary)">
                            {r[c.key]}
                          </span>
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
                      {canManage ? (
                        <div className="flex gap-2">
                          <IconButton
                            aria-label={t.mdEditT}
                            onClick={() => openEdit(r)}
                          >
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
              body={t.mdEmptyB}
            />
          )}

          <PanelFoot>
            <FootSum>
              {t.attSumA} <b>{range}</b> {t.attSumB} <b>{sorted.length}</b>{" "}
              {t.mdSumB} — {catLabel}
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

      {/* Dialog tambah/edit entri */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        labelledBy="md-t"
      >
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
              helper={c.help}
              error={c.key === "name" && errName}
              errorMessage={c.key === "name" ? t.mdErrName : undefined}
            >
              {c.kind === "select" || c.kind === "color" ? (
                <Select
                  id={`md-f-${c.key}`}
                  value={fieldValue(c.key)}
                  onChange={(e) => setFieldValue(c.key, e.target.value)}
                >
                  {/* nilai lama yang tak lagi ada di sumber tetap bisa dipertahankan */}
                  {fieldValue(c.key) &&
                  !(c.opts ?? []).includes(fieldValue(c.key)) ? (
                    <option value={fieldValue(c.key)}>
                      {fieldValue(c.key)}
                    </option>
                  ) : null}
                  {(c.opts ?? []).map((o) => (
                    <option key={o} value={o}>
                      {c.optLabel ? c.optLabel(o) : o}
                    </option>
                  ))}
                </Select>
              ) : c.kind === "readonly" ? (
                <Input
                  id={`md-f-${c.key}`}
                  value={fieldValue(c.key)}
                  disabled
                  readOnly
                />
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDlgOpen(false)}
            >
              {t.btnCancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner /> : null}
              {editId ? t.udbSaveEdit : t.mdSaveAdd}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog hapus entri */}
      <Dialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        labelledBy="mdd-t"
      >
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
          <Button
            variant="destructive"
            disabled={saving}
            onClick={() => void doDelete()}
          >
            {saving ? <Spinner /> : null}
            {t.empDelDo}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
