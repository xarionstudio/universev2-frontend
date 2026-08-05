"use client";

import * as React from "react";
import { Music, Pencil, Plus, Trash2, Volume2 } from "lucide-react";

import type { Audio, DisplayKind } from "@/lib/data/settings-data";
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
import { Dropzone } from "@/components/ui/dropzone";
import { Field, FormGrid } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
  FootSum,
  Panel,
  PanelFoot,
  Toolbar,
  ToolbarGroup,
  ToolbarTitle,
} from "@/components/ui/panel";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

const FREQS: Audio["freq"][] = ["sekali", "harian", "perjam", "per30"];
const DISPLAY_KINDS: DisplayKind[] = ["att", "fleet", "ftw", "finger"];

export function AudioTab() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { audios, setAudios } = useAppStore();

  const [q, setQ] = React.useState("");
  const [statusF, setStatusF] = React.useState("");
  const filtered = audios.filter((a) => {
    const okQ = a.title.toLowerCase().includes(q.trim().toLowerCase());
    const okS = statusF === "" || a.active === (statusF === "aktif");
    return okQ && okS;
  });
  const pg = usePagination(filtered, "5");

  const freqLabel: Record<Audio["freq"], string> = {
    sekali: t.auFreqOnce,
    harian: t.auFreqDaily,
    perjam: t.auFreqHourly,
    per30: t.auFreq30,
  };
  const dispLabel: Record<DisplayKind, string> = {
    att: t.navDispAtt,
    fleet: t.navDispFleet,
    monitor: t.navDispMonitor,
    ftw: "Display Fit To Work",
    finger: "Monitoring Fingerprint",
  };

  /* dialog tambah/edit */
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Audio | null>(null);
  const [fTitle, setFTitle] = React.useState("");
  const [fWhen, setFWhen] = React.useState("06:00");
  const [fFreq, setFFreq] = React.useState<Audio["freq"]>("sekali");
  const [fFile, setFFile] = React.useState("");
  const [fDisplays, setFDisplays] = React.useState<DisplayKind[]>([]);
  const [fActive, setFActive] = React.useState(true);
  const [titleErr, setTitleErr] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  /* dialog hapus */
  const [delTarget, setDelTarget] = React.useState<Audio | null>(null);

  function openAdd() {
    setEditing(null);
    setFTitle("");
    setFWhen("06:00");
    setFFreq("sekali");
    setFFile("");
    setFDisplays([]);
    setFActive(true);
    setTitleErr(false);
    setDlgOpen(true);
  }

  function openEdit(a: Audio) {
    setEditing(a);
    setFTitle(a.title);
    setFWhen(a.when);
    setFFreq(a.freq);
    setFFile(a.file);
    setFDisplays([...a.displays]);
    setFActive(a.active);
    setTitleErr(false);
    setDlgOpen(true);
  }

  function toggleDisplay(k: DisplayKind, on: boolean) {
    setFDisplays((prev) => (on ? [...prev, k] : prev.filter((d) => d !== k)));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!fTitle.trim()) {
      setTitleErr(true);
      return;
    }
    const data = {
      title: fTitle.trim(),
      when: fWhen,
      freq: fFreq,
      file: fFile || "audio.mp3",
      displays: fDisplays,
      active: fActive,
    };
    if (editing) {
      setAudios((prev) =>
        prev.map((a) => (a.id === editing.id ? { ...a, ...data } : a))
      );
      pushToast("success", t.auToastEdit);
    } else {
      setAudios((prev) => [...prev, { id: `au${Date.now()}`, ...data }]);
      pushToast("success", t.auToastAdd);
    }
    setDlgOpen(false);
  }

  function delDo() {
    if (!delTarget) return;
    setAudios((prev) => prev.filter((a) => a.id !== delTarget.id));
    pushToast("success", t.auToastDel);
    setDelTarget(null);
  }

  return (
    <>
      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.stAudioTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60 max-sm:w-full"
              placeholder={t.stAudioSearchPh}
              aria-label={t.stAudioSearchPh}
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
              <option value="aktif">{t.stAktif}</option>
              <option value="nonaktif">{t.stNonaktif}</option>
            </Select>
            <Button onClick={openAdd}>
              <Plus />
              {t.auAdd}
            </Button>
          </ToolbarGroup>
        </Toolbar>
        <Table>
          <TableHeader>
            <tr>
              <TableHead>{t.auTitle}</TableHead>
              <TableHead>{t.auWhen}</TableHead>
              <TableHead>{t.auFreq}</TableHead>
              <TableHead className="max-xl:hidden">{t.auFile}</TableHead>
              <TableHead>{t.auDisplays}</TableHead>
              <TableHead>{t.thStatus}</TableHead>
              <TableHead className="w-27.5">{t.thAct}</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pg.rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-semibold">{a.title}</TableCell>
                <TableCell className="font-mono">{a.when}</TableCell>
                <TableCell>{freqLabel[a.freq]}</TableCell>
                <TableCell className="max-xl:hidden">
                  <span className="inline-flex items-center gap-2 text-(--text-secondary)">
                    <Volume2 className="size-3.5 flex-none text-primary-bright" />
                    {a.file}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex max-w-50 flex-wrap gap-1">
                    {a.displays.map((d) => (
                      <Badge key={d} variant="info">
                        {dispLabel[d]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={a.active ? "success" : "danger"} dot>
                    {a.active ? t.stAktif : t.stNonaktif}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <IconButton
                      aria-label={t.udbEditT}
                      onClick={() => openEdit(a)}
                    >
                      <Pencil />
                    </IconButton>
                    <IconButton
                      danger
                      aria-label={t.empDel}
                      onClick={() => setDelTarget(a)}
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
            {t.attSumA} <b>{audios.length}</b> {t.auSumB}
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

      {/* dialog tambah/edit audio */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        className="w-[min(560px,100%)]"
        labelledBy="au-t"
      >
        <DialogIcon variant="info">
          <Volume2 />
        </DialogIcon>
        <DialogTitle id="au-t">
          {editing ? `${t.auEditT} — ${editing.title}` : t.auAdd}
        </DialogTitle>
        <DialogBody>{t.auDlgB}</DialogBody>
        <form onSubmit={save} noValidate>
          <FormGrid className="mt-4">
            <Field
              className="col-span-full"
              label={t.auTitle}
              htmlFor="au-title"
              required
              error={titleErr}
              errorMessage={t.mdErrName}
            >
              <Input
                id="au-title"
                value={fTitle}
                onChange={(e) => {
                  setFTitle(e.target.value);
                  if (e.target.value.trim()) setTitleErr(false);
                }}
              />
            </Field>
            <Field label={t.auWhen} htmlFor="au-when">
              <Input
                id="au-when"
                type="time"
                className="font-mono"
                value={fWhen}
                onChange={(e) => setFWhen(e.target.value)}
              />
            </Field>
            <Field label={t.auFreq} htmlFor="au-freq">
              <Select
                id="au-freq"
                value={fFreq}
                onChange={(e) => setFFreq(e.target.value as Audio["freq"])}
              >
                {FREQS.map((f) => (
                  <option key={f} value={f}>
                    {freqLabel[f]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field className="col-span-full" label={t.auFile}>
              <Dropzone
                icon={<Music />}
                title={fFile || t.auFilePh}
                hint="MP3/WAV · maks 5 MB"
                className="p-4"
                onPick={() => fileRef.current?.click()}
                onDropFile={setFFile}
                dragging={dragging}
                onDragChange={setDragging}
                aria-label={t.auFile}
              />
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => setFFile(e.target.files?.[0]?.name ?? "")}
              />
            </Field>
            <Field className="col-span-full" label={t.auDisplays}>
              <div className="grid grid-cols-2 gap-2">
                {DISPLAY_KINDS.map((k) => (
                  <ToggleRow key={k}>
                    <Checkbox
                      checked={fDisplays.includes(k)}
                      onChange={(e) => toggleDisplay(k, e.target.checked)}
                    />
                    {dispLabel[k]}
                  </ToggleRow>
                ))}
              </div>
            </Field>
          </FormGrid>
          <ToggleRow className="mt-4" htmlFor="au-active">
            <Checkbox
              id="au-active"
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
              {editing ? t.udbSaveEdit : t.auSaveAdd}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* dialog hapus audio */}
      <Dialog
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        labelledBy="aud-t"
      >
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="aud-t">{`${t.auDelT} "${delTarget?.title ?? ""}"?`}</DialogTitle>
        <DialogBody>{t.auDelB}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDelTarget(null)}>
            {t.btnCancel}
          </Button>
          <Button variant="destructive" onClick={delDo}>
            {t.empDelDo}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
