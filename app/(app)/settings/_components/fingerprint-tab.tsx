"use client";

import * as React from "react";
import { Fingerprint, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { fingerprintApi } from "@/lib/api/fingerprint";
import type { FingerprintDevice } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n";
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
  FootSum,
  Panel,
  PanelFoot,
  Toolbar,
  ToolbarGroup,
  ToolbarTitle,
} from "@/components/ui/panel";
import { SearchInput } from "@/components/ui/search-input";
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

const DEFAULT_PORT = 4370; // default ZKTeco/Solution

function onlineBadge(dev: FingerprintDevice): "success" | "danger" | "neutral" {
  if (!dev.isActive) return "neutral";
  return dev.isOnline ? "success" : "danger";
}

export function FingerprintTab() {
  const { t } = useI18n();
  const { pushToast } = useToast();

  const [devices, setDevices] = React.useState<FingerprintDevice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [q, setQ] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const data = await fingerprintApi.getDevices();
      if (Array.isArray(data)) setDevices(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuat perangkat";
      pushToast("error", "Fingerprint", msg);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  React.useEffect(() => {
    const id = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  /* ---- dialog tambah/edit ---- */
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FingerprintDevice | null>(null);
  const [fCode, setFCode] = React.useState("");
  const [fName, setFName] = React.useState("");
  const [fIp, setFIp] = React.useState("");
  const [fPort, setFPort] = React.useState(String(DEFAULT_PORT));
  const [fComKey, setFComKey] = React.useState("0");
  const [fLoc, setFLoc] = React.useState("");
  const [fActive, setFActive] = React.useState(true);
  const [errBase, setErrBase] = React.useState(false);

  function openAdd() {
    setEditing(null);
    setFCode("");
    setFName("");
    setFIp("");
    setFPort(String(DEFAULT_PORT));
    setFComKey("0");
    setFLoc("");
    setFActive(true);
    setErrBase(false);
    setDlgOpen(true);
  }

  function openEdit(d: FingerprintDevice) {
    setEditing(d);
    setFCode(d.code ?? "");
    setFName(d.name ?? "");
    setFIp(d.ipAddress ?? "");
    setFPort(String(d.port ?? DEFAULT_PORT));
    setFComKey(String(d.comKey ?? 0));
    setFLoc(d.location ?? "");
    setFActive(d.isActive ?? true);
    setErrBase(false);
    setDlgOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!fCode.trim() || !fIp.trim()) {
      setErrBase(true);
      return;
    }
    const payload: Partial<FingerprintDevice> = {
      code: fCode.trim(),
      name: fName.trim(),
      ipAddress: fIp.trim(),
      port: parseInt(fPort, 10) || DEFAULT_PORT,
      comKey: parseInt(fComKey, 10) || 0,
      location: fLoc.trim(),
      isActive: fActive,
    };
    try {
      if (editing) {
        await fingerprintApi.updateDevice(editing.id, payload);
      } else {
        await fingerprintApi.createDevice(payload);
        pushToast("success", "Fingerprint", "Perangkat ditambahkan");
      }
      setDlgOpen(false);
      await load();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal menyimpan perangkat";
      pushToast("error", "Fingerprint", msg);
    }
  }

  /* ---- dialog hapus ---- */
  const [delTarget, setDelTarget] = React.useState<FingerprintDevice | null>(
    null
  );

  async function delDo() {
    if (!delTarget) return;
    try {
      await fingerprintApi.deleteDevice(delTarget.id);
      pushToast("success", "Fingerprint", "Perangkat dihapus");
      setDelTarget(null);
      await load();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal menghapus perangkat";
      pushToast("error", "Fingerprint", msg);
    }
  }

  async function doSync() {
    setSyncing(true);
    try {
      const res = await fingerprintApi.syncNow();
      const n = res.totalSynced ?? 0;
      pushToast("success", "Fingerprint", `Sync selesai (${n})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync gagal";
      pushToast("error", "Fingerprint", msg);
    } finally {
      setSyncing(false);
    }
  }

  const filtered = devices.filter((d) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      (d.code ?? "").toLowerCase().includes(needle) ||
      (d.name ?? "").toLowerCase().includes(needle) ||
      (d.ipAddress ?? "").toLowerCase().includes(needle) ||
      (d.location ?? "").toLowerCase().includes(needle)
    );
  });
  const pg = usePagination(filtered, "10");

  return (
    <>
      <Panel>
        <Toolbar>
          <ToolbarTitle>Perangkat Fingerprint</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-64"
              placeholder="Cari kode / nama / IP"
              aria-label="Cari perangkat fingerprint"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button variant="secondary" onClick={doSync} disabled={syncing}>
              {syncing ? <Spinner /> : <RefreshCw />}
              Sync Sekarang
            </Button>
            <Button onClick={openAdd}>
              <Plus />
              Tambah Perangkat
            </Button>
          </ToolbarGroup>
        </Toolbar>

        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Spinner />
            <span className="ml-3 text-sm text-(--text-secondary)">
              Memuat…
            </span>
          </div>
        ) : filtered.length ? (
          <>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sync Terakhir</TableHead>
                  <TableHead />
                </tr>
              </TableHeader>
              <TableBody>
                {pg.rows.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono">{d.code}</TableCell>
                    <TableCell className="font-semibold">
                      {d.name || "—"}
                    </TableCell>
                    <TableCell className="font-mono">{d.ipAddress}</TableCell>
                    <TableCell className="font-mono">{d.port}</TableCell>
                    <TableCell>{d.location || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={onlineBadge(d)} dot>
                        {!d.isActive
                          ? "Nonaktif"
                          : d.isOnline
                            ? "Online"
                            : "Offline"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {d.lastSync
                        ? new Date(d.lastSync).toLocaleString("id-ID")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <IconButton
                          aria-label="Edit"
                          onClick={() => openEdit(d)}
                        >
                          <Pencil />
                        </IconButton>
                        <IconButton
                          danger
                          aria-label="Hapus"
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
                Menampilkan <b>{pg.range}</b> dari <b>{pg.total}</b> perangkat
              </FootSum>
              <Pagination
                page={pg.page}
                pageCount={pg.pageCount}
                onPage={pg.setPage}
                per={pg.per}
                perOptions={["10", "25", "50"]}
                onPer={pg.setPer}
              />
            </PanelFoot>
          </>
        ) : (
          <StateBox
            icon={<Fingerprint className="text-primary-bright" />}
            title="Tidak ada perangkat"
            body="Belum ada mesin fingerprint terdaftar. Tambahkan melalui tombol di atas."
          />
        )}
      </Panel>

      {/* dialog tambah/edit */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        labelledBy="fp-t"
      >
        <DialogIcon variant="info">
          <Fingerprint />
        </DialogIcon>
        <DialogTitle id="fp-t">
          {editing
            ? "Edit Perangkat Fingerprint"
            : "Tambah Perangkat Fingerprint"}
        </DialogTitle>
        <DialogBody>
          <form onSubmit={save} noValidate>
            <FormGrid>
              <Field
                label="Kode"
                htmlFor="fp-code"
                required
                error={errBase && !fCode.trim()}
                errorMessage="Kode wajib diisi"
              >
                <Input
                  id="fp-code"
                  className="font-mono"
                  placeholder="FP-01"
                  value={fCode}
                  onChange={(e) => {
                    setFCode(e.target.value);
                    if (e.target.value.trim()) setErrBase(false);
                  }}
                />
              </Field>
              <Field label="Nama" htmlFor="fp-name">
                <Input
                  id="fp-name"
                  placeholder="Gate Utara"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                />
              </Field>
              <Field
                label="IP Address"
                htmlFor="fp-ip"
                required
                error={errBase && !fIp.trim()}
                errorMessage="IP wajib diisi"
              >
                <Input
                  id="fp-ip"
                  className="font-mono"
                  placeholder="192.168.1.100"
                  value={fIp}
                  onChange={(e) => {
                    setFIp(e.target.value);
                    if (e.target.value.trim()) setErrBase(false);
                  }}
                />
              </Field>
              <Field label="Port" htmlFor="fp-port" className="max-w-42">
                <Input
                  id="fp-port"
                  type="number"
                  className="font-mono"
                  value={fPort}
                  onChange={(e) => setFPort(e.target.value)}
                />
              </Field>
              <Field label="ComKey" htmlFor="fp-comkey" className="max-w-42">
                <Input
                  id="fp-comkey"
                  type="number"
                  className="font-mono"
                  value={fComKey}
                  onChange={(e) => setFComKey(e.target.value)}
                />
              </Field>
              <Field label="Lokasi" htmlFor="fp-loc" className="col-span-full">
                <Input
                  id="fp-loc"
                  placeholder="Gate Utara / Mess 31"
                  value={fLoc}
                  onChange={(e) => setFLoc(e.target.value)}
                />
              </Field>
            </FormGrid>
            <ToggleRow className="mt-4" htmlFor="fp-active">
              <Checkbox
                id="fp-active"
                checked={fActive}
                onChange={(e) => setFActive(e.target.checked)}
              />
              Aktif
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
                {editing ? t.udbSaveEdit : "Simpan"}
              </Button>
            </DialogActions>
          </form>
        </DialogBody>
      </Dialog>

      {/* dialog hapus */}
      <Dialog
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        labelledBy="fpd-t"
      >
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="fpd-t">
          Hapus perangkat &ldquo;{delTarget?.code ?? ""}&rdquo;?
        </DialogTitle>
        <DialogBody>
          Perangkat ini tidak akan lagi disinkron & ditampilkan di layar
          fingerprint.
        </DialogBody>
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
