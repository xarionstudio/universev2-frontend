"use client";

import * as React from "react";
import { Eye, Monitor, Pencil, Plus, Trash2 } from "lucide-react";

import { settingsApi } from "@/lib/api/settings";
import type { Display, DisplayKind } from "@/lib/data/settings-data";
import { useI18n } from "@/lib/i18n";
import { openDisplay } from "@/lib/open-display";
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

/* layar display sungguhan (route dark-only 1920×1080) — dibuka di tab baru, fullscreen */
const DISPLAY_URLS: Record<DisplayKind, string> = {
  att: "/display/attendance",
  fleet: "/display/fleet",
  ftw: "/display/fitwork",
  finger: "/display/fingerprint",
};

/* buka layar + bawa nama display terdaftar (dan fleet-nya) agar tampil di layarnya */
function openNamedDisplay(kind: DisplayKind, name?: string, fleetId?: string) {
  const q = new URLSearchParams();
  if (name) q.set("name", name);
  if (fleetId) q.set("fleet", fleetId);
  const qs = q.toString();
  openDisplay(qs ? `${DISPLAY_URLS[kind]}?${qs}` : DISPLAY_URLS[kind]);
}

export function DisplayAdmin({ kind }: { kind: "att" | "fleet" }) {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const store = useAppStore();

  const rows = kind === "att" ? store.dspAtt : store.dspFleet;
  const setRows = kind === "att" ? store.setDspAtt : store.setDspFleet;
  const runtextOpts = store.mdData.runtext
    .filter((e) => e.active)
    .map((e) => e.name);

  /* display fleet terikat formasi dari Setting Fleet — nama & jumlah unit
     mengikuti fleet yang dipilih (digger dihitung sebagai unit) */
  const fleetOf = (d: Display) => store.fleets.find((f) => f.id === d.fleetId);
  const displayNameOf = (d: Display) => {
    const fl = fleetOf(d);
    return fl ? `Fleet ${fl.digger}` : d.name;
  };
  const displaySubOf = (d: Display) => {
    const fl = fleetOf(d);
    return fl ? `${fl.units.length + 1} unit · ${d.id}` : d.id;
  };

  const [q, setQ] = React.useState("");
  const [statusF, setStatusF] = React.useState("");
  const filtered = rows.filter((d) => {
    const needle = q.trim().toLowerCase();
    const okQ =
      !needle ||
      displayNameOf(d).toLowerCase().includes(needle) ||
      d.id.toLowerCase().includes(needle) ||
      d.runtext.toLowerCase().includes(needle);
    const okS = statusF === "" || d.active === (statusF === "1");
    return okQ && okS;
  });
  const pg = usePagination(filtered, "5");

  /* dialog tambah/edit — satu site, tanpa lokasi & konten */
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Display | null>(null);
  const [fName, setFName] = React.useState("");
  const [fFleetId, setFFleetId] = React.useState("");
  const [fRuntext, setFRuntext] = React.useState("");
  const [fActive, setFActive] = React.useState(true);
  const [nameErr, setNameErr] = React.useState(false);

  /* dialog hapus */
  const [delTarget, setDelTarget] = React.useState<Display | null>(null);

  function openAdd() {
    setEditing(null);
    setFName("");
    setFFleetId(store.fleets[0]?.id ?? "");
    setFRuntext(runtextOpts[0] ?? "");
    setFActive(true);
    setNameErr(false);
    setDlgOpen(true);
  }

  function openEdit(d: Display) {
    setEditing(d);
    setFName(d.name);
    setFFleetId(d.fleetId ?? store.fleets[0]?.id ?? "");
    setFRuntext(d.runtext);
    setFActive(d.active);
    setNameErr(false);
    setDlgOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const fleet = store.fleets.find((f) => f.id === fFleetId);
    if (kind === "fleet" ? !fleet : !fName.trim()) {
      setNameErr(true);
      return;
    }
    const data =
      kind === "fleet"
        ? {
            name: `Fleet ${fleet!.digger}`,
            fleetId: fleet!.id,
            runtext: fRuntext,
            active: fActive,
          }
        : { name: fName.trim(), runtext: fRuntext, active: fActive };
    const apiData = {
      name: data.name,
      runtext: data.runtext,
      active: data.active,
      fleetId: fleet
        ? Number(fleet.id.replace("fl-", "")) || undefined
        : undefined,
    };
    if (editing) {
      const numId = Number(editing.id);
      if (!isNaN(numId)) {
        try {
          await settingsApi.updateDisplay(numId, apiData);
        } catch {
          // Fallback local update
        }
      }
      setRows((prev) =>
        prev.map((d) => (d.id === editing.id ? { ...d, ...data } : d))
      );
      pushToast("success", t.dspToastEdit);
    } else {
      try {
        await settingsApi.createDisplay(apiData);
      } catch {
        // Fallback local addition
      }
      const prefix = kind === "att" ? "DSP-A" : "DSP-F";
      const id = `${prefix}${String(rows.length + 1).padStart(2, "0")}`;
      setRows((prev) => [
        ...prev,
        {
          id,
          online: true,
          hb: "baru saja",
          loc: "",
          content: kind === "att" ? "att" : "fleet",
          ...data,
        },
      ]);
      pushToast("success", t.dspToastAdd);
    }
    setDlgOpen(false);
  }

  async function delDo() {
    if (!delTarget) return;
    const numId = Number(delTarget.id);
    if (!isNaN(numId)) {
      try {
        await settingsApi.deleteDisplay(numId);
      } catch {
        // Fallback local deletion
      }
    }
    setRows((prev) => prev.filter((d) => d.id !== delTarget.id));
    pushToast("success", t.dspToastDel);
    setDelTarget(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={kind === "att" ? t.navDispAtt : t.navDispFleet}
        sub={kind === "att" ? t.dspSubAtt : t.dspSubFleet}
      >
        <Button onClick={openAdd}>
          <Plus />
          {t.dspAdd}
        </Button>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.dspListTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60"
              placeholder={t.dspSearchPh}
              aria-label={t.dspSearchPh}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              wrapperClassName="w-40"
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
        <Table>
          <TableHeader>
            <tr>
              <TableHead>{t.dspName}</TableHead>
              <TableHead>{t.dspRuntext}</TableHead>
              <TableHead>{t.dspConn}</TableHead>
              <TableHead>{t.thStatus}</TableHead>
              <TableHead className="w-27.5">{t.thAct}</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pg.rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <NameCell name={displayNameOf(d)} sub={displaySubOf(d)} />
                </TableCell>
                <TableCell className="max-w-90 text-(--text-secondary)">
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
                      onClick={() =>
                        openNamedDisplay(d.content, displayNameOf(d), d.fleetId)
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
            ))}
          </TableBody>
        </Table>
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
          {editing ? `${t.dspEditT} — ${displayNameOf(editing)}` : t.dspAdd}
        </DialogTitle>
        <DialogBody>{t.dspDlgB}</DialogBody>
        <form onSubmit={save} noValidate>
          <FormGrid className="mt-4">
            {kind === "fleet" ? (
              /* nama display mengikuti fleet — pilih dari Setting Fleet, bukan input manual */
              <Field
                label="Fleet"
                htmlFor="dsp-fleet"
                required
                helper={t.dspFleetHelp}
                error={nameErr}
                errorMessage={t.dspErrFleet}
              >
                <Select
                  id="dsp-fleet"
                  value={fFleetId}
                  onChange={(e) => {
                    setFFleetId(e.target.value);
                    if (e.target.value) setNameErr(false);
                  }}
                >
                  {store.fleets.map((f) => (
                    <option key={f.id} value={f.id}>
                      {`Fleet ${f.digger} — ${f.units.length + 1} unit`}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
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
                    setFName(e.target.value);
                    if (e.target.value.trim()) setNameErr(false);
                  }}
                />
              </Field>
            )}
            <Field
              label={t.dspRuntext}
              htmlFor="dsp-runtext"
              helper={t.dspRuntextHelp}
            >
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDlgOpen(false)}
            >
              {t.btnCancel}
            </Button>
            <Button type="submit">
              {editing ? t.udbSaveEdit : t.dspSaveAdd}
            </Button>
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
  );
}
