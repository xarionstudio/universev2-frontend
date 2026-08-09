"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, Truck, X } from "lucide-react";

import { fleetApi } from "@/lib/api/fleet";
import { FLEET_MAX_UNITS, type Fleet } from "@/lib/data/fleet";
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
import { Field, FormGrid } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import {
  DNote,
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

export default function FleetSettingPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { udbAll, mdData, fleets, setFleets } = useAppStore();

  /* dialog tambah/edit */
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [fDigger, setFDigger] = React.useState("");
  const [fBus, setFBus] = React.useState("");
  const [fLoc, setFLoc] = React.useState("");
  const [fUnits, setFUnits] = React.useState<string[]>([]);
  const [unitQ, setUnitQ] = React.useState("");
  const [fActive, setFActive] = React.useState(true);
  const [errDigger, setErrDigger] = React.useState(false);
  const [errUnits, setErrUnits] = React.useState("");

  /* dialog hapus */
  const [delTarget, setDelTarget] = React.useState<Fleet | null>(null);

  /* pencarian + pagination daftar fleet */
  const [listQ, setListQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [per, setPer] = React.useState("5");
  const listNeedle = listQ.trim().toLowerCase();
  const listRows = listNeedle
    ? fleets.filter(
        (f) =>
          f.digger.toLowerCase().includes(listNeedle) ||
          f.loc.toLowerCase().includes(listNeedle) ||
          f.bus.toLowerCase().includes(listNeedle)
      )
    : fleets;
  const perN = Number(per);
  const pageCount = Math.max(1, Math.ceil(listRows.length / perN));
  const p = Math.min(page, pageCount);
  const pageRows = listRows.slice((p - 1) * perN, p * perN);
  const range = listRows.length
    ? `${(p - 1) * perN + 1}–${Math.min(listRows.length, p * perN)}`
    : "0";

  const all = udbAll();
  const diggerTypeOf = (code: string) => {
    const u = all.find((x) => x.code === code);
    return u ? `${u.egi} · ${u.product}` : "—";
  };

  /* digger = big/medium digger dari Database Unit (bukan semua excavator) */
  const diggerOpts = Array.from(
    new Set(
      all
        .filter(
          (u) =>
            (u.cat === "BIG_DIGGER" || u.cat === "MEDIUM_DIGGER") && u.active
        )
        .map((u) => u.code)
    )
  )
    .filter((code) => !fleets.some((f) => f.digger === code && f.id !== editId))
    .sort();
  const busOpts = mdData.bus.filter((b) => b.active).map((b) => b.name);
  const areaOpts = mdData.area.filter((a) => a.active).map((a) => a.name);

  /* pilihan unit OHT — langsung dari Database Unit, unit milik fleet lain disembunyikan */
  const usedElsewhere = new Set(
    fleets.filter((f) => f.id !== editId).flatMap((f) => f.units)
  );
  const unitOpts = Array.from(
    new Map(
      all
        .filter((u) => u.cls === "HD" && u.active && !usedElsewhere.has(u.code))
        .map((u) => [u.code, u])
    ).values()
  ).sort((a, b) => a.code.localeCompare(b.code));
  const unitOptsFiltered = unitOpts.filter((u) =>
    u.code.toUpperCase().includes(unitQ.trim().toUpperCase())
  );

  function toggleUnit(code: string) {
    if (fUnits.includes(code)) {
      setFUnits(fUnits.filter((c) => c !== code));
      setErrUnits("");
      return;
    }
    if (fUnits.length >= FLEET_MAX_UNITS) {
      setErrUnits(t.flErrMax);
      return;
    }
    setFUnits([...fUnits, code]);
    setErrUnits("");
  }

  function openAdd() {
    setEditId(null);
    setFDigger(diggerOpts[0] || "");
    setFBus(busOpts[0] || "");
    setFLoc(areaOpts[0] || "");
    setFUnits([]);
    setUnitQ("");
    setFActive(true);
    setErrDigger(false);
    setErrUnits("");
    setDlgOpen(true);
  }

  function openEdit(f: Fleet) {
    setEditId(f.id);
    setFDigger(f.digger);
    setFBus(f.bus);
    setFLoc(f.loc);
    setFUnits(f.units);
    setUnitQ("");
    setFActive(f.active);
    setErrDigger(false);
    setErrUnits("");
    setDlgOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const digger = fDigger.trim();
    const badDigger =
      !digger || fleets.some((f) => f.digger === digger && f.id !== editId);
    setErrDigger(badDigger);

    const unitsErr = fUnits.length > FLEET_MAX_UNITS ? t.flErrMax : "";
    setErrUnits(unitsErr);
    if (badDigger || unitsErr) return;

    const data = {
      digger,
      loc: fLoc.trim(),
      bus: fBus,
      units: fUnits,
      active: fActive,
    };
    const numId = Number(editId);
    if (editId && !isNaN(numId)) {
      try {
        await fleetApi.updateFleetSetting(numId, data);
      } catch {
        // Fallback local update
      }
    } else {
      try {
        await fleetApi.createFleetSetting(data);
      } catch {
        // Fallback local create
      }
    }
    setFleets((prev) =>
      editId
        ? prev.map((f) => (f.id === editId ? { ...f, ...data } : f))
        : [...prev, { id: `fl-${Date.now()}`, ...data }]
    );
    setDlgOpen(false);
    pushToast("success", editId ? t.flToastEdit : t.flToastAdd, digger);
  }

  async function doDelete() {
    if (!delTarget) return;
    const numId = Number(delTarget.id);
    if (!isNaN(numId)) {
      try {
        await fleetApi.deleteFleetSetting(numId);
      } catch {
        // Fallback local delete
      }
    }
    setFleets((prev) => prev.filter((f) => f.id !== delTarget.id));
    setDelTarget(null);
    pushToast("success", t.flToastDel, delTarget.digger);
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
        <Toolbar>
          <ToolbarTitle>{t.flListTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60"
              placeholder={t.flSearchPh}
              aria-label={t.flSearchPh}
              value={listQ}
              onChange={(e) => {
                setListQ(e.target.value);
                setPage(1);
              }}
            />
          </ToolbarGroup>
        </Toolbar>
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
            {pageRows.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <NameCell name={f.digger} sub={diggerTypeOf(f.digger)} />
                </TableCell>
                <TableCell>{f.loc}</TableCell>
                <TableCell className="font-mono max-xl:hidden">
                  {f.bus}
                </TableCell>
                <TableCell>
                  <div className="flex max-w-80 flex-wrap gap-1">
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
                    <IconButton
                      aria-label={t.udbEditT}
                      onClick={() => openEdit(f)}
                    >
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
            {t.attSumA} <b>{range}</b> {t.attSumB} <b>{listRows.length}</b>{" "}
            {t.flSumB}
          </FootSum>
          <Pagination
            page={p}
            pageCount={pageCount}
            onPage={setPage}
            per={per}
            perOptions={["5", "10", "25"]}
            onPer={(v) => {
              setPer(v);
              setPage(1);
            }}
          />
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
            {/* lokasi kerja dari master Area — bukan teks bebas */}
            <Field
              className="col-span-full"
              label={t.flLoc}
              htmlFor="fl-loc"
              required
            >
              <Select
                id="fl-loc"
                value={fLoc}
                onChange={(e) => setFLoc(e.target.value)}
              >
                {fLoc && !areaOpts.includes(fLoc) ? (
                  <option value={fLoc}>{fLoc}</option>
                ) : null}
                {areaOpts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              className="col-span-full"
              label={`${t.flUnits} (OHT) — ${fUnits.length}/${FLEET_MAX_UNITS}`}
              htmlFor="fl-unit-search"
              helper={t.flUnitsHelp}
              error={!!errUnits}
              errorMessage={errUnits}
            >
              <div className="flex flex-col gap-2">
                {fUnits.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {fUnits.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => toggleUnit(c)}
                        aria-label={`${t.empDel} ${c}`}
                        className="flex cursor-pointer items-center gap-1 rounded-chip border border-(--badge-info-border) bg-(--badge-info-fill) px-2 py-1 font-mono text-xs font-semibold text-primary-bright hover:border-(--badge-danger-border) hover:text-danger-text"
                      >
                        {c}
                        <X className="size-3" />
                      </button>
                    ))}
                  </div>
                ) : null}
                <SearchInput
                  id="fl-unit-search"
                  placeholder={t.flUnitSearchPh}
                  value={unitQ}
                  onChange={(e) => setUnitQ(e.target.value)}
                />
                <div className="max-h-44 overflow-y-auto rounded-control border border-(--divider) bg-(--fill-subtle) p-1.5">
                  {unitOptsFiltered.length ? (
                    unitOptsFiltered.map((u) => (
                      <label
                        key={u.code}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-(--fill-hover)"
                      >
                        <Checkbox
                          checked={fUnits.includes(u.code)}
                          onChange={() => toggleUnit(u.code)}
                        />
                        <span className="font-mono text-sm font-semibold">
                          {u.code}
                        </span>
                        <span className="text-xs text-(--text-tertiary)">
                          {u.egi} · {u.product}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="px-2 py-1.5 text-xs text-(--text-tertiary)">
                      {t.noResTitle}
                    </p>
                  )}
                </div>
              </div>
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDlgOpen(false)}
            >
              {t.btnCancel}
            </Button>
            <Button type="submit">
              {editId ? t.udbSaveEdit : t.flSaveAdd}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog hapus fleet */}
      <Dialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        labelledBy="fld-t"
      >
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
  );
}
