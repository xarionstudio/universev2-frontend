"use client";

import * as React from "react";
import { Eye, Monitor, Pencil, Plus, Trash2 } from "lucide-react";

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
import {
  DNote,
  FootSum,
  PageTitle,
  Panel,
  PanelFoot,
  Toolbar,
  ToolbarTitle,
} from "@/components/ui/panel";
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

/* buka layar + bawa nama display terdaftar agar tampil di layarnya */
function openNamedDisplay(kind: DisplayKind, name?: string) {
  const url = DISPLAY_URLS[kind];
  openDisplay(name ? `${url}?name=${encodeURIComponent(name)}` : url);
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

  /* dialog tambah/edit — satu site, tanpa lokasi & konten */
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Display | null>(null);
  const [fName, setFName] = React.useState("");
  const [fRuntext, setFRuntext] = React.useState("");
  const [fActive, setFActive] = React.useState(true);
  const [nameErr, setNameErr] = React.useState(false);

  /* dialog hapus */
  const [delTarget, setDelTarget] = React.useState<Display | null>(null);

  function openAdd() {
    setEditing(null);
    setFName("");
    setFRuntext(runtextOpts[0] ?? "");
    setFActive(true);
    setNameErr(false);
    setDlgOpen(true);
  }

  function openEdit(d: Display) {
    setEditing(d);
    setFName(d.name);
    setFRuntext(d.runtext);
    setFActive(d.active);
    setNameErr(false);
    setDlgOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!fName.trim()) {
      setNameErr(true);
      return;
    }
    const data = {
      name: fName.trim(),
      runtext: fRuntext,
      active: fActive,
    };
    if (editing) {
      setRows((prev) =>
        prev.map((d) => (d.id === editing.id ? { ...d, ...data } : d))
      );
      pushToast("success", t.dspToastEdit);
    } else {
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

  function delDo() {
    if (!delTarget) return;
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
        <Button onClick={() => openNamedDisplay(kind)}>
          <Monitor />
          {t.dspOpen}
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
              <TableHead>{t.dspRuntext}</TableHead>
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
                <TableCell className="max-w-[360px] text-(--text-secondary)">
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
                      onClick={() => openNamedDisplay(d.content, d.name)}
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
                  setFName(e.target.value);
                  if (e.target.value.trim()) setNameErr(false);
                }}
              />
            </Field>
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
