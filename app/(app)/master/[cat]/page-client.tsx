"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";
import { Download, Pencil, Plus, Rows3, Search, Trash2 } from "lucide-react";

import { masterApi } from "@/lib/api/master";
import {
  mdCatLabels,
  mdCats,
  type MdCat,
  type MdEntry,
} from "@/lib/data/master-data";
import { isDiggerUnit } from "@/lib/data/units-db";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/components/providers/app-store";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
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

/** Field keys yang valid per kategori master (sesuai kolom database) */
type FieldKey =
  | "name"
  | "description"
  | "category"
  | "location"
  | "pickupType"
  | "egiType"
  | "departureTime"
  | "busCode"
  | "tempudoCode"
  | "block"
  | "targetDisplay"
  | "textColor";

type SortKey = FieldKey | "active";
type ColDef = {
  key: FieldKey;
  label: string;
  kind?: "text" | "time" | "select" | "color" | "readonly";
  opts?: string[];
  help?: string;
};

const colorVal: Record<string, string> = {
  Cyan: "#00D4FF",
  Oranye: "#E99B2A",
  Putih: "#FFFFFF",
  Merah: "#FC3C3B",
};

/** Ambil nilai field dari MdEntry (dengan fallback "") */
function getField(entry: MdEntry, key: FieldKey): string {
  const v = entry[key];
  return typeof v === "string" ? v : "";
}

/** Ambil daftar field yang dipakai untuk kategori tertentu */
function fieldsForCat(cat: MdCat): FieldKey[] {
  switch (cat) {
    case "egi":
    case "product":
      return ["name"];
    case "eqclass":
      return ["name", "description"];
    case "area":
      return ["name", "category"];
    case "tempudo":
      return ["name", "location", "pickupType"];
    case "bus":
      return ["name", "egiType", "departureTime"];
    case "lokasiex":
      return ["name", "busCode", "tempudoCode"];
    case "mess":
      return ["name", "block"];
    case "runtext":
      return ["name", "targetDisplay", "textColor"];
  }
}

export default function MasterDataPage() {
  const params = useParams<{ cat: string }>();
  const cat = params.cat as MdCat;
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const { mdData, setMdData, udbAll } = useAppStore();

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
  const [fValues, setFValues] = React.useState<Record<string, string>>({});
  const [fActive, setFActive] = React.useState(true);
  const [errName, setErrName] = React.useState(false);

  /* dialog hapus */
  const [delTarget, setDelTarget] = React.useState<MdEntry | null>(null);

  if (!mdCats.includes(cat)) notFound();

  const en = lang === "en";
  const catLabel = mdCatLabels[cat][lang];
  const fields = fieldsForCat(cat);

  /* opsi dropdown dari Database Unit via API (bukan hardcoded):
     bus ← Database Unit class BUS; lokasi excavator ← digger + master bus/tempudo */
  const allUnits = React.useMemo(() => udbAll(), [udbAll]);
  const busCodeOpts = React.useMemo(() => {
    const used = new Set(
      (mdData?.bus || []).filter((r) => r.id !== editId).map((r) => r.name)
    );
    return allUnits
      .filter((u) => u.cls === "BUS" && u.active && !used.has(u.code))
      .map((u) => u.code);
  }, [mdData?.bus, editId, allUnits]);
  const diggerOpts = React.useMemo(() => {
    const used = new Set(
      (mdData?.lokasiex || []).filter((r) => r.id !== editId).map((r) => r.name)
    );
    return allUnits
      .filter((u) => isDiggerUnit(u) && !used.has(u.code))
      .map((u) => u.code);
  }, [mdData?.lokasiex, editId, allUnits]);
  const busOpts = React.useMemo(
    () => (mdData?.bus || []).filter((r) => r.active).map((r) => r.name),
    [mdData?.bus]
  );
  const tempudoOpts = React.useMemo(
    () => (mdData?.tempudo || []).filter((r) => r.active).map((r) => r.name),
    [mdData?.tempudo]
  );
  const busTypeOf = (code: string) =>
    allUnits.find((u) => u.code === code)?.egi ?? "";

  /* Opsi target & warna running text — dinamis dari data runtext yang sudah
     dimuat dari API, bukan daftar hardcoded */
  const runtextTargets = React.useMemo(
    () =>
      Array.from(
        new Set(
          (mdData?.runtext || [])
            .map((r) => r.targetDisplay)
            .filter((v): v is string => Boolean(v))
        )
      ).sort(),
    [mdData?.runtext]
  );
  const runtextColors = React.useMemo(
    () =>
      Array.from(
        new Set(
          (mdData?.runtext || [])
            .map((r) => r.textColor)
            .filter((v): v is string => Boolean(v))
        )
      ).sort(),
    [mdData?.runtext]
  );

  const cols: ColDef[] = React.useMemo(() => {
    switch (cat) {
      case "egi":
      case "product":
        return [{ key: "name", label: t.mdNama }];
      case "eqclass":
        return [
          { key: "name", label: "Kode" },
          { key: "description", label: t.mdDesc },
        ];
      case "area":
        return [
          { key: "name", label: t.mdNama },
          { key: "category", label: t.thCat },
        ];
      case "tempudo":
        return [
          { key: "name", label: "Kode" },
          { key: "location", label: t.thLoc },
          { key: "pickupType", label: t.thType },
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
            key: "egiType",
            label: en ? "Type" : "Tipe",
            kind: "readonly",
            help: en
              ? "Auto-filled from the selected unit."
              : "Terisi otomatis dari unit yang dipilih.",
          },
          { key: "departureTime", label: t.mdJam, kind: "time" },
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
          { key: "busCode", label: "Bus", kind: "select", opts: busOpts },
          {
            key: "tempudoCode",
            label: "Tempudo",
            kind: "select",
            opts: tempudoOpts,
          },
        ];
      case "mess":
        return [
          { key: "name", label: t.mdNama },
          { key: "block", label: en ? "Block" : "Blok" },
        ];
      case "runtext":
        return [
          { key: "name", label: en ? "Text" : "Teks" },
          {
            key: "targetDisplay",
            label: "Target",
            kind: "select",
            opts: runtextTargets,
          },
          {
            key: "textColor",
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
    runtextTargets,
    runtextColors,
  ]);

  const entries = mdData?.[cat] || [];
  const needle = q.trim().toLowerCase();
  const filtered = entries.filter((r) => {
    if (stF === "1" && !r.active) return false;
    if (stF === "0" && r.active) return false;
    if (!needle) return true;
    return fields.some((f) => getField(r, f).toLowerCase().includes(needle));
  });

  const sorted = sort
    ? [...filtered].sort((x, y) => {
        if (sort.key === "active")
          return (Number(x.active) - Number(y.active)) * sort.dir;
        return (
          getField(x, sort.key).localeCompare(getField(y, sort.key)) * sort.dir
        );
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
    const vals: Record<string, string> = { name };
    for (const c of cols) {
      if (c.key === "name") continue;
      if (c.kind === "select" || c.kind === "color") {
        vals[c.key] = c.opts?.[0] ?? "";
      } else if (c.kind === "readonly" && cat === "bus") {
        vals[c.key] = busTypeOf(name);
      } else {
        vals[c.key] = "";
      }
    }
    setFValues(vals);
    setFActive(true);
    setErrName(false);
    setDlgOpen(true);
  }

  function openEdit(r: MdEntry) {
    setEditId(r.id);
    const vals: Record<string, string> = {};
    for (const c of cols) {
      vals[c.key] = getField(r, c.key);
    }
    setFValues(vals);
    setFActive(r.active);
    setErrName(false);
    setDlgOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = (fValues.name || "").trim();
    if (!name) {
      setErrName(true);
      return;
    }
    // Build payload dengan field spesifik per kategori
    const payload: Record<string, unknown> = { name, active: fActive };
    for (const c of cols) {
      if (c.key === "name") continue;
      payload[c.key] = fValues[c.key] || "";
    }
    const editingEntry = editId
      ? (mdData?.[cat] || []).find((r) => r.id === editId)
      : undefined;
    const code = editingEntry?.code ?? name;
    if (editId) {
      try {
        await masterApi.update(cat, code, payload);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to update master entry";
        pushToast("error", t.mdEditToastT, msg);
        return;
      }
    } else {
      try {
        const created = await masterApi.create(cat, payload);
        setMdData((prev) => ({
          ...prev,
          [cat]: [
            ...(prev[cat] || []),
            { ...created, id: String(created.id) } as unknown as MdEntry,
          ],
        }));
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to create master entry";
        pushToast("error", t.mdAddToastT, msg);
        return;
      }
    }
    if (editId) {
      setMdData((prev) => ({
        ...prev,
        [cat]: (prev[cat] || []).map((r) =>
          r.id === editId ? { ...r, ...payload } : r
        ),
      }));
    }
    setDlgOpen(false);
    pushToast("success", editId ? t.mdEditToastT : t.mdAddToastT, name);
  }

  async function doDelete() {
    if (!delTarget) return;
    try {
      await masterApi.delete(cat, delTarget.code);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete master entry";
      pushToast("error", t.mdDelToastT, msg);
      setDelTarget(null);
      return;
    }
    setMdData((prev) => ({
      ...prev,
      [cat]: (prev[cat] || []).filter((r) => r.id !== delTarget.id),
    }));
    setDelTarget(null);
    pushToast("success", t.mdDelToastT, delTarget.name);
  }

  function fieldValue(key: FieldKey) {
    return fValues[key] || "";
  }
  function setFieldValue(key: FieldKey, v: string) {
    setFValues((prev) => ({ ...prev, [key]: v }));
    /* tipe bus mengikuti unit yang dipilih — bukan input manual */
    if (cat === "bus" && key === "name") {
      setFValues((prev) => ({ ...prev, egiType: busTypeOf(v) }));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={catLabel} sub={t.mdSub}>
        <Button onClick={openAdd}>
          <Plus />
          {t.mdAdd}
        </Button>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{catLabel}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60"
              placeholder={t.mdSearchPh}
              aria-label={t.mdSearchPh}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Select
              wrapperClassName="w-40"
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
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await masterApi.export(cat);
                  pushToast("success", t.toastExportT, `${cat}.xlsx`);
                } catch {
                  pushToast("error", t.toastExportT, t.toastExportD);
                }
              }}
            >
              <Download />
              {t.export}
            </Button>
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
                      className="inline-flex cursor-pointer items-center gap-1 [letter-spacing:inherit] text-inherit uppercase [font:inherit]"
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
                            style={{ background: colorVal[getField(r, c.key)] }}
                          />
                          {getField(r, c.key)}
                        </span>
                      ) : c.key === "name" ? (
                        <span className="font-semibold">{r.name}</span>
                      ) : (
                        <span className="text-(--text-secondary)">
                          {getField(r, c.key)}
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
                      {o}
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
            <Button type="submit">
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
          <Button variant="destructive" onClick={doDelete}>
            {t.empDelDo}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
