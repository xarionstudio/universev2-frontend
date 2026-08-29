"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Eye,
  Monitor,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { errorDetail, fleetApi, settingsApi } from "@/lib/api";
import { toFleet } from "@/lib/api/adapters";
import type { ApiDisplayDevice } from "@/lib/api/endpoints/settings";
import {
  MONITOR_MAX_FLEETS,
  MONITOR_PER_PAGE,
  type Display,
} from "@/lib/data/settings-data";
import { unitLabel } from "@/lib/data/units-db";
import { useI18n } from "@/lib/i18n";
import { openDisplay } from "@/lib/open-display";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
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
import { Field, FormGrid } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination, usePagination } from "@/components/ui/pagination";
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

/* Pengelolaan display monitor — satu layar, banyak formasi fleet.

   Sengaja TIDAK memakai <DisplayAdmin> yang sama dengan Display Attendance /
   Display Fleet: di sana satu baris = satu fleet dan namanya diturunkan dari
   fleet itu, sedangkan di sini satu baris = daftar fleet berurut + durasi
   giliran. Menyatukannya berarti setiap kolom harus bercabang dua arti, dan
   kolom "11 unit" pada display fleet akan berdampingan dengan "6 fleet" di
   tabel yang sama — sumber salah baca yang tidak sepadan dengan kode yang
   dihemat. */

const ROTATE_OPTIONS = ["5", "8", "10", "15", "20", "30"];

/* Kode display baru: lanjutan nomor DSP-M tertinggi yang ada. Kode dipakai
   URL kiosk (?monitor=) dan route heartbeat, jadi harus stabil & terbaca. */
function nextMonitorCode(rows: Display[]): string {
  let max = 0;
  for (const d of rows) {
    const m = /^DSP-M(\d+)$/.exec(d.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `DSP-M${String(max + 1).padStart(2, "0")}`;
}

export function MonitorAdmin() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const store = useAppStore();

  const rows = store.dspMonitor;
  const setRows = store.setDspMonitor;
  const setFleets = store.setFleets;
  const runtextOpts = store.mdData.runtext
    .filter((e) => e.active)
    .map((e) => e.name);

  /* ── hidrasi dari server: GET /api/settings/displays?kind=monitor +
     GET /api/fleets/settings. Fleet ikut ditarik karena fleetIds server
     berupa id NUMERIK fleet_settings, sedangkan UI memakai id "fl-<digger>"
     milik store — pemetaan butuh dbId dari daftar fleet yang sama. Store
     dspMonitor DIGANTI penuh hasil server; seed mock hanya tampil sekejap
     sebagai kerangka sebelum data tiba (loaded menahan tabelnya). */
  const [loaded, setLoaded] = React.useState(false);
  const [loadErr, setLoadErr] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    const ac = new AbortController();
    void Promise.all([
      fleetApi.listFleetSettings(ac.signal),
      settingsApi.listDisplays("monitor", ac.signal),
    ])
      .then(([fleetRows, displays]) => {
        const mappedFleets = (fleetRows ?? []).map(toFleet);
        setFleets(() => mappedFleets);
        const byDbId = new Map<number, string>();
        for (const f of mappedFleets) if (f.dbId) byDbId.set(f.dbId, f.id);
        const toRow = (d: ApiDisplayDevice): Display => ({
          dbId: d.id,
          id: d.code,
          name: d.name,
          loc: d.loc,
          content: "monitor",
          fleetIds: (d.fleetIds ?? []).flatMap((n) => {
            const fid = byDbId.get(n);
            return fid ? [fid] : [];
          }),
          rotateSec: d.rotateSec || 10,
          runtext: d.runtext,
          online: d.online,
          hb: d.hb || "—",
          active: d.active,
        });
        setRows(() => (displays ?? []).map(toRow));
        setLoaded(true);
        setLoadErr(false);
      })
      .catch(() => {
        if (!ac.signal.aborted) setLoadErr(true);
      });
    return () => ac.abort();
  }, [reloadKey, setFleets, setRows]);

  const retry = React.useCallback(() => {
    setLoadErr(false);
    setReloadKey((k) => k + 1);
  }, []);

  const fleetsOf = (d: Display) =>
    (d.fleetIds ?? []).flatMap((id) => {
      const f = store.fleets.find((x) => x.id === id);
      return f ? [f] : [];
    });

  const [q, setQ] = React.useState("");
  const [statusF, setStatusF] = React.useState("");
  const filtered = rows.filter((d) => {
    const needle = q.trim().toLowerCase();
    const okQ =
      !needle ||
      d.name.toLowerCase().includes(needle) ||
      d.id.toLowerCase().includes(needle) ||
      d.loc.toLowerCase().includes(needle) ||
      fleetsOf(d).some((f) => f.digger.toLowerCase().includes(needle));
    const okS = statusF === "" || d.active === (statusF === "1");
    return okQ && okS;
  });
  const pg = usePagination(filtered, "5");

  /* dialog tambah/edit */
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Display | null>(null);
  const [fName, setFName] = React.useState("");
  const [fLoc, setFLoc] = React.useState("");
  const [fFleetIds, setFFleetIds] = React.useState<string[]>([]);
  const [fRotate, setFRotate] = React.useState("10");
  const [fRuntext, setFRuntext] = React.useState("");
  const [fActive, setFActive] = React.useState(true);
  const [nameErr, setNameErr] = React.useState(false);
  const [locErr, setLocErr] = React.useState(false);
  const [fleetErr, setFleetErr] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [delTarget, setDelTarget] = React.useState<Display | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  function openAdd() {
    setEditing(null);
    setFName("");
    setFLoc("");
    setFFleetIds([]);
    setFRotate("10");
    setFRuntext(runtextOpts[0] ?? "");
    setFActive(true);
    setNameErr(false);
    setLocErr(false);
    setFleetErr(false);
    setDlgOpen(true);
  }

  function openEdit(d: Display) {
    setEditing(d);
    setFName(d.name);
    setFLoc(d.loc);
    setFFleetIds(d.fleetIds ?? []);
    setFRotate(String(d.rotateSec ?? 10));
    setFRuntext(d.runtext);
    setFActive(d.active);
    setNameErr(false);
    setLocErr(false);
    setFleetErr(false);
    setDlgOpen(true);
  }

  /* Centang MENAMBAH ke akhir daftar, bukan menyisipkan sesuai urutan master.
     Urutan array adalah urutan tayangan di layar, jadi admin yang mencentang
     fleet paling penting lebih dulu langsung masuk tayangan pertama.
     Penuh di MONITOR_MAX_FLEETS: centang ke-13 diabaikan diam-diam akan
     membingungkan, jadi checkbox-nya yang dinonaktifkan (lihat render). */
  function toggleFleet(id: string) {
    setFFleetIds((prev) => {
      if (!prev.includes(id) && prev.length >= MONITOR_MAX_FLEETS) return prev;
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (next.length) setFleetErr(false);
      return next;
    });
  }

  function moveFleet(id: string, dir: -1 | 1) {
    setFFleetIds((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  /* Simpan ke server — POST /api/settings/displays (baru) atau PUT :id (edit).
     `loc` ikut wajib: service backend menolak display tanpa lokasi. fleetIds
     dikirim sebagai dbId numerik fleet_settings dalam urutan centang (server
     menyimpannya ke display_fleets ber-sort_order). PUT wajib menyertakan
     `code` — kolomnya ikut di-update server; tanpa itu kode terhapus. */
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const badName = !fName.trim();
    const badLoc = !fLoc.trim();
    const badFleet = fFleetIds.length === 0;
    setNameErr(badName);
    setLocErr(badLoc);
    setFleetErr(badFleet);
    if (badName || badLoc || badFleet || saving) return;

    const fleetDbIds = fFleetIds.flatMap((id) => {
      const f = store.fleets.find((x) => x.id === id);
      return f?.dbId ? [f.dbId] : [];
    });
    const body = {
      name: fName.trim(),
      loc: fLoc.trim(),
      content: "monitor",
      fleetIds: fleetDbIds,
      rotateSec: Number(fRotate),
      runtext: fRuntext,
      /* online milik heartbeat TV, bukan form — kirim balik apa adanya */
      online: editing ? editing.online : false,
      active: fActive,
    };
    const local = {
      name: body.name,
      loc: body.loc,
      fleetIds: fFleetIds,
      rotateSec: body.rotateSec,
      runtext: body.runtext,
      active: body.active,
    };
    setSaving(true);
    try {
      if (editing) {
        if (!editing.dbId) return;
        await settingsApi.updateDisplay(editing.dbId, {
          ...body,
          code: editing.id,
        });
        setRows((prev) =>
          prev.map((d) => (d.id === editing.id ? { ...d, ...local } : d))
        );
        pushToast("success", t.dspToastEdit);
      } else {
        const code = nextMonitorCode(rows);
        const created = await settingsApi.createDisplay({ ...body, code });
        setRows((prev) => [
          ...prev,
          {
            ...local,
            dbId: created.id,
            id: created.code || code,
            content: "monitor",
            online: created.online ?? false,
            hb: created.hb || "—",
          },
        ]);
        pushToast("success", t.dspToastAdd);
      }
      setDlgOpen(false);
    } catch (err) {
      pushToast("error", t.apErrT, errorDetail(err, t.dspLoadErrB));
    } finally {
      setSaving(false);
    }
  }

  async function delDo() {
    if (!delTarget?.dbId || deleting) return;
    setDeleting(true);
    try {
      await settingsApi.deleteDisplay(delTarget.dbId);
      setRows((prev) => prev.filter((d) => d.id !== delTarget.id));
      pushToast("success", t.dspToastDel);
      setDelTarget(null);
    } catch (err) {
      pushToast("error", t.apErrT, errorDetail(err, t.dspLoadErrB));
    } finally {
      setDeleting(false);
    }
  }

  /* urutan pilihan fleet di dialog: yang sudah dicentang naik ke atas dalam
     urutan gilirannya, sisanya menyusul menurut nama */
  const fleetPicker = React.useMemo(() => {
    const chosen = fFleetIds.flatMap((id) => {
      const f = store.fleets.find((x) => x.id === id);
      return f ? [f] : [];
    });
    const rest = store.fleets
      .filter((f) => !fFleetIds.includes(f.id))
      .sort((a, b) => a.digger.localeCompare(b.digger));
    return [...chosen, ...rest];
  }, [fFleetIds, store.fleets]);

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.navDispMonitor} sub={t.dspSubMonitor}>
        <Button onClick={openAdd}>
          <Plus />
          {t.dspMonAdd}
        </Button>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.dspListTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60 max-sm:w-full"
              placeholder={t.dspMonSearchPh}
              aria-label={t.dspMonSearchPh}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              wrapperClassName="w-40 max-sm:w-full"
              aria-label={t.thStatus}
              value={statusF}
              onChange={(e) => setStatusF(e.target.value)}
            >
              <option value="">{t.allStatus}</option>
              <option value="1">{t.stAktif}</option>
              <option value="0">{t.stNonaktif}</option>
            </Select>
          </ToolbarGroup>
        </Toolbar>
        {loadErr ? (
          <StateBox
            icon={<CircleAlert className="text-danger-text" />}
            title={t.apLoadErrT}
            body={t.dspLoadErrB}
          >
            <Button onClick={retry}>{t.apRetry}</Button>
          </StateBox>
        ) : !loaded ? (
          <div className="grid place-items-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>{t.dspName}</TableHead>
                <TableHead>{t.dspMonFleets}</TableHead>
                <TableHead>{t.dspMonRotateCol}</TableHead>
                <TableHead>{t.dspConn}</TableHead>
                <TableHead>{t.thStatus}</TableHead>
                <TableHead className="w-27.5">{t.thAct}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pg.rows.map((d) => {
                const fl = fleetsOf(d);
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <NameCell name={d.name} sub={`${d.loc} · ${d.id}`} />
                    </TableCell>
                    <TableCell className="max-w-90">
                      <b className="font-semibold">
                        {fl.length} {t.dspMonUnit} ·{" "}
                        {Math.max(1, Math.ceil(fl.length / MONITOR_PER_PAGE))}{" "}
                        {t.dspMonPages}
                      </b>
                      {/* leader tiap fleet ditulis apa adanya seperti di layar
                        (EXCA-7001), supaya yang dilihat admin dan yang dilihat
                        kru di TV adalah kosakata yang sama */}
                      <div className="mt-0.5 font-mono text-xs text-(--text-tertiary)">
                        {fl.length
                          ? fl.map((f) => unitLabel(f.digger)).join(" · ")
                          : "—"}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {d.rotateSec ?? 10}s
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
                          onClick={() =>
                            openDisplay(
                              `/display/monitor?monitor=${encodeURIComponent(d.id)}&name=${encodeURIComponent(d.name)}`
                            )
                          }
                        >
                          <Eye />
                        </IconButton>
                        <IconButton
                          aria-label={t.udbEditT}
                          onClick={() => openEdit(d)}
                        >
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
                );
              })}
            </TableBody>
          </Table>
        )}
        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{pg.range}</b> {t.attSumB} <b>{pg.total}</b>{" "}
            {t.dspSumB}
          </FootSum>
          <Pagination
            page={pg.page}
            pageCount={pg.pageCount}
            onPage={pg.setPage}
            per={pg.per}
            perOptions={["5", "10", "25"]}
            onPer={pg.setPer}
          />
        </PanelFoot>
      </Panel>

      <DNote title={t.dspMonNoteT}>{t.dspMonNoteB}</DNote>

      {/* dialog tambah/edit monitor */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        className="w-[min(640px,100%)]"
        labelledBy="dspm-t"
      >
        <DialogIcon variant="info">
          <Monitor />
        </DialogIcon>
        <DialogTitle id="dspm-t">
          {editing ? `${t.dspEditT} — ${editing.name}` : t.dspMonAdd}
        </DialogTitle>
        <DialogBody>{t.dspDlgB}</DialogBody>
        {/* min-h-0 + overflow: daftar fleet bisa panjang, tapi tombol simpan
            harus tetap terlihat di layar pendek */}
        <form
          onSubmit={save}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <FormGrid className="mt-4">
              <Field
                label={t.dspName}
                htmlFor="dspm-name"
                required
                error={nameErr}
                errorMessage={t.mdErrName}
              >
                <Input
                  id="dspm-name"
                  value={fName}
                  onChange={(e) => {
                    setFName(e.target.value);
                    if (e.target.value.trim()) setNameErr(false);
                  }}
                  placeholder="Display Monitor 3"
                />
              </Field>
              <Field
                label={t.dspLoc}
                htmlFor="dspm-loc"
                required
                error={locErr}
                errorMessage={t.dspErrLoc}
              >
                <Input
                  id="dspm-loc"
                  value={fLoc}
                  onChange={(e) => {
                    setFLoc(e.target.value);
                    if (e.target.value.trim()) setLocErr(false);
                  }}
                  placeholder="Kantin — meja tengah"
                />
              </Field>
              <Field
                label={t.dspMonRotate}
                htmlFor="dspm-rot"
                helper={t.dspMonRotateHelp}
              >
                <Select
                  id="dspm-rot"
                  value={fRotate}
                  onChange={(e) => setFRotate(e.target.value)}
                >
                  {ROTATE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s} detik
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={t.dspRuntext}
                htmlFor="dspm-rt"
                helper={t.dspRuntextHelp}
              >
                <Select
                  id="dspm-rt"
                  value={fRuntext}
                  onChange={(e) => setFRuntext(e.target.value)}
                >
                  {runtextOpts.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                className="col-span-full"
                label={`${t.dspMonFleets} (${fFleetIds.length}/${MONITOR_MAX_FLEETS})`}
                required
                helper={t.dspMonFleetsHelp}
                error={fleetErr}
                errorMessage={t.dspMonErrFleets}
              >
                <div className="max-h-64 overflow-y-auto rounded-card border border-(--divider) bg-(--fill-subtle) p-2">
                  {fleetPicker.map((f) => {
                    const pos = fFleetIds.indexOf(f.id);
                    const on = pos >= 0;
                    const penuh = fFleetIds.length >= MONITOR_MAX_FLEETS;
                    return (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 rounded-lg px-1 py-0.5"
                      >
                        <ToggleRow
                          className={cn(
                            "min-w-0 flex-1 rounded-md px-1 py-1.5",
                            !on && penuh && "opacity-45"
                          )}
                        >
                          <Checkbox
                            checked={on}
                            disabled={!on && penuh}
                            onChange={() => toggleFleet(f.id)}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            <b className="font-mono font-semibold">
                              {unitLabel(f.digger)}
                            </b>
                            <span className="text-(--text-tertiary)">
                              {" "}
                              · {unitLabel(f.bus)} · {f.units.length + 1} unit ·{" "}
                              {f.loc}
                            </span>
                          </span>
                        </ToggleRow>
                        {on ? (
                          <span className="flex flex-none items-center gap-1">
                            <span className="w-6 text-center font-mono text-xs text-(--text-tertiary) tabular-nums">
                              {pos + 1}
                            </span>
                            <IconButton
                              type="button"
                              aria-label="Naikkan urutan"
                              disabled={pos === 0}
                              onClick={() => moveFleet(f.id, -1)}
                            >
                              <ChevronUp />
                            </IconButton>
                            <IconButton
                              type="button"
                              aria-label="Turunkan urutan"
                              disabled={pos === fFleetIds.length - 1}
                              onClick={() => moveFleet(f.id, 1)}
                            >
                              <ChevronDown />
                            </IconButton>
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Field>

              <ToggleRow className="col-span-full">
                <Checkbox
                  checked={fActive}
                  onChange={() => setFActive((v) => !v)}
                />
                {t.stAktif}
              </ToggleRow>
            </FormGrid>
          </div>
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
              {editing ? t.udbSaveEdit : t.dspSaveAdd}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* dialog hapus */}
      <Dialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        labelledBy="dspm-del"
      >
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="dspm-del">{t.dspDelT}</DialogTitle>
        <DialogBody>{t.dspDelB}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDelTarget(null)}>
            {t.btnCancel}
          </Button>
          <Button variant="destructive" onClick={delDo} disabled={deleting}>
            {deleting ? <Spinner /> : null}
            {t.dspDelT}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
