"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Fingerprint,
  Pencil,
  Plus,
  Radio,
  Search,
  Trash2,
  WifiOff,
} from "lucide-react";

import {
  FP_DEFAULT_PORT,
  isIpv4,
  isPort,
  nextFpId,
  type FpMachine,
  type FpPingResult,
} from "@/lib/data/fingerprint";
import { useI18n } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/id";
import { openDisplay } from "@/lib/open-display";
import { cn } from "@/lib/utils";
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
import { Skeleton } from "@/components/ui/skeleton";
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

/* Sebab hasil ping -> teks i18n. Dipetakan lewat Record ber-tipe, bukan
   if-berantai: menambah kode baru di FpPingResult langsung ketahuan saat
   kompilasi kalau lupa menyediakan terjemahannya. */
const PING_CODE_KEY: Record<FpPingResult["code"], keyof Dict> = {
  "tcp-open": "fpCodeTcpOpen",
  "icmp-only": "fpCodeIcmpOnly",
  unreachable: "fpCodeUnreachable",
  timeout: "fpCodeTimeout",
  refused: "fpCodeRefused",
  "invalid-ip": "fpCodeInvalidIp",
  "invalid-port": "fpCodeInvalidPort",
  error: "fpCodeError",
};

const PING_METHOD_KEY: Record<FpPingResult["method"], keyof Dict> = {
  tcp: "fpMethodTcp",
  icmp: "fpMethodIcmp",
  none: "fpMethodNone",
};

const NET_ERROR: FpPingResult = {
  ok: false,
  service: false,
  method: "none",
  ms: null,
  code: "error",
};

/* Batas atas di sisi klien supaya tombol tidak pernah menggantung selamanya
   bila route handler-nya sendiri yang macet. Lebih longgar dari total timeout
   server (TCP 2 dtk + ICMP ~3,5 dtk) agar hasil sungguhan tetap sempat tiba. */
const PING_CLIENT_TIMEOUT_MS = 9000;

async function pingMachine(m: FpMachine): Promise<FpPingResult> {
  try {
    const res = await fetch("/api/fingerprint/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: m.ip, port: m.port }),
      signal: AbortSignal.timeout(PING_CLIENT_TIMEOUT_MS),
    });
    /* status 400 (IP/port ditolak server) tetap membawa body FpPingResult —
       hanya kegagalan transport yang jatuh ke catch */
    return (await res.json()) as FpPingResult;
  } catch {
    return NET_ERROR;
  }
}

function clockNow(): string {
  const d = new Date();
  const two = (n: number) => (n < 10 ? "0" : "") + n;
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

/* Cincin sonar di belakang ikon dialog selama ping berjalan. Tiga cincin
   berdelay sepertiga siklus supaya terbaca sebagai denyut yang menyusul,
   bukan satu cincin yang berkedip.

   Animasinya SENGAJA tidak menggambarkan progres. Uji koneksi punya dua tahap
   (TCP lalu ICMP) dan server tahu persis sedang di tahap mana, tetapi tahapan
   itu tidak bisa dikirim ke browser: pemindai web endpoint menahan seluruh
   respons sampai selesai, jadi progres per tahap baru tiba justru ketika ping
   sudah berakhir (ADR 0010). Yang jujur untuk ditampilkan hanya "sedang
   berlangsung". */
const SONAR_DELAYS = ["0s", "0.63s", "1.26s"];

type PingView = {
  machine: FpMachine;
  result: FpPingResult | null;
  /* uji dari dalam form memakai nilai yang BELUM tersimpan — hasilnya tidak
     boleh dicatat ke baris mana pun, kolom "Ping terakhir" harus selalu
     merujuk alamat yang benar-benar tersimpan */
  record: boolean;
};

export default function FingerprintMachinesPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { fpAll, saveFpMachine, deleteFpMachine, recordFpPing } = useAppStore();
  /* layout (app) hanya menjaga "view"; aksi ubah dijaga di sini, sama seperti
     halaman User Management */
  const { can } = usePermissions();
  const canManage = can("fingerprint", "manage");

  const [q, setQ] = React.useState("");
  const [statusF, setStatusF] = React.useState("");

  /* dialog tambah/edit */
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FpMachine | null>(null);
  const [fCode, setFCode] = React.useState("");
  const [fLoc, setFLoc] = React.useState("");
  const [fIp, setFIp] = React.useState("");
  const [fPort, setFPort] = React.useState(String(FP_DEFAULT_PORT));
  const [fActive, setFActive] = React.useState(true);
  const [err, setErr] = React.useState({
    code: false,
    loc: false,
    ip: false,
    dupe: false,
    port: false,
  });

  /* dialog hapus + pop-up hasil ping */
  const [delTarget, setDelTarget] = React.useState<FpMachine | null>(null);
  const [ping, setPing] = React.useState<PingView | null>(null);
  /* id mesin yang sedang diuji — dipakai spinner per baris & anti klik ganda */
  const [busy, setBusy] = React.useState<string[]>([]);

  /* setelah await, komponen bisa saja sudah dilepas (admin pindah halaman
     sementara ping berjalan) — setState di titik itu percuma */
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const machines = fpAll();
  const needle = q.trim().toLowerCase();
  const filtered = machines.filter((m) => {
    const okQ =
      !needle ||
      m.id.toLowerCase().includes(needle) ||
      m.loc.toLowerCase().includes(needle) ||
      m.ip.includes(needle);
    const okS = statusF === "" || m.active === (statusF === "1");
    return okQ && okS;
  });
  const pg = usePagination(filtered, "10");

  function openAdd() {
    setEditing(null);
    setFCode(nextFpId(machines));
    setFLoc("");
    setFIp("");
    setFPort(String(FP_DEFAULT_PORT));
    setFActive(true);
    setErr({ code: false, loc: false, ip: false, dupe: false, port: false });
    setDlgOpen(true);
  }

  function openEdit(m: FpMachine) {
    setEditing(m);
    setFCode(m.id);
    setFLoc(m.loc);
    setFIp(m.ip);
    setFPort(String(m.port));
    setFActive(m.active);
    setErr({ code: false, loc: false, ip: false, dupe: false, port: false });
    setDlgOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const code = fCode.trim();
    const loc = fLoc.trim();
    const ip = fIp.trim();
    const port = Number(fPort);
    const others = machines.filter((m) => m.id !== editing?.id);

    const next = {
      code: !code || others.some((m) => m.id === code),
      loc: !loc,
      ip: !isIpv4(ip),
      /* IP kembar bukan sekadar rapi-rapian: dua baris dengan IP sama membuat
         hasil ping tidak bisa lagi dikaitkan ke mesin fisik yang mana */
      dupe: isIpv4(ip) && others.some((m) => m.ip === ip),
      port: !isPort(port),
    };
    setErr(next);
    if (next.code || next.loc || next.ip || next.dupe || next.port) return;

    if (editing) {
      saveFpMachine(editing.id, { id: code, loc, ip, port, active: fActive });
      pushToast("success", t.fpToastEdit, `${code} — ${ip}:${port}`);
    } else {
      saveFpMachine(null, { id: code, loc, ip, port, active: fActive });
      pushToast("success", t.fpToastAdd, `${code} — ${ip}:${port}`);
    }
    setDlgOpen(false);
  }

  function delDo() {
    if (!delTarget) return;
    deleteFpMachine(delTarget.id);
    pushToast("success", t.fpToastDel, `${delTarget.id} — ${delTarget.loc}`);
    setDelTarget(null);
  }

  /* Satu uji koneksi: catat hasilnya di mesin (kolom "Ping terakhir") dan
     kembalikan supaya pemanggil bisa membuka pop-up atau menghitung ringkasan. */
  const runPing = React.useCallback(
    async (m: FpMachine, record: boolean): Promise<FpPingResult> => {
      if (record)
        setBusy((prev) => (prev.includes(m.id) ? prev : [...prev, m.id]));
      const result = await pingMachine(m);
      if (alive.current && record)
        recordFpPing(m.id, { at: clockNow(), ok: result.ok, ms: result.ms });
      if (record) setBusy((prev) => prev.filter((id) => id !== m.id));
      return result;
    },
    [recordFpPing]
  );

  async function pingOne(m: FpMachine, record = true) {
    setPing({ machine: m, result: null, record });
    const result = await runPing(m, record);
    if (!alive.current) return;
    /* jangan timpa pop-up yang sudah diganti mesin lain sementara menunggu */
    setPing((prev) =>
      prev && prev.machine.id === m.id ? { ...prev, result } : prev
    );
  }

  /* nada pop-up: hijau hanya bila port mesin benar-benar menjawab */
  const tone = !ping?.result
    ? "wait"
    : ping.result.ok && ping.result.service
      ? "ok"
      : ping.result.ok
        ? "warn"
        : "fail";

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.navFingerprint} sub={t.fpSub}>
        <div className="flex flex-wrap gap-2">
          {/* tidak ada "Ping semua": uji koneksi dilakukan satu per satu, per
              mesin, supaya admin selalu tahu alamat mana yang sedang diuji dan
              hasil mana milik siapa */}
          <Button
            variant="secondary"
            onClick={() => openDisplay("/display/fingerprint")}
          >
            <Eye />
            {t.dspPreview}
          </Button>
          {canManage ? (
            <Button onClick={openAdd}>
              <Plus />
              {t.fpAdd}
            </Button>
          ) : null}
        </div>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.fpListTitle}</ToolbarTitle>
          <ToolbarGroup>
            <SearchInput
              className="w-60 max-sm:w-full"
              placeholder={t.fpSearchPh}
              aria-label={t.fpSearchPh}
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

        {pg.rows.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>{t.fpCode}</TableHead>
                <TableHead>{t.fpIp}</TableHead>
                <TableHead>{t.fpConn}</TableHead>
                <TableHead className="max-xl:hidden">{t.fpLastPing}</TableHead>
                <TableHead>{t.thStatus}</TableHead>
                <TableHead className="w-45">{t.thAct}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pg.rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <NameCell name={m.id} sub={m.loc} />
                  </TableCell>
                  <TableCell>
                    <NameCell
                      name={<span className="font-mono">{m.ip}</span>}
                      sub={`port ${m.port}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.online ? "success" : "danger"} dot>
                      {m.online ? "Online" : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-xl:hidden">
                    {m.lastPing ? (
                      <NameCell
                        name={
                          <span
                            className={cn(
                              "font-mono font-semibold tabular-nums",
                              m.lastPing.ok
                                ? "text-(--badge-success-text)"
                                : "text-danger-text"
                            )}
                          >
                            {m.lastPing.at}
                          </span>
                        }
                        sub={
                          m.lastPing.ok && m.lastPing.ms !== null
                            ? `${Math.round(m.lastPing.ms)} ms`
                            : ""
                        }
                      />
                    ) : (
                      <span className="text-(--text-tertiary)">
                        {t.fpNever}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.active ? "success" : "danger"} dot>
                      {m.active ? t.stAktif : t.stNonaktif}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        /* nama aksesibilitas HARUS memuat teks yang terlihat
                           ("Ping"), kalau tidak perintah suara "klik Ping"
                           tidak menemukan tombol ini (WCAG 2.5.3) */
                        aria-label={`${t.fpPing} ${m.id}`}
                        title={`${t.fpPingT} ${m.id}`}
                        disabled={busy.includes(m.id)}
                        onClick={() => pingOne(m)}
                      >
                        {busy.includes(m.id) ? <Spinner /> : <Radio />}
                        {t.fpPing}
                      </Button>
                      {canManage ? (
                        <>
                          <IconButton
                            aria-label={t.fpEditT}
                            onClick={() => openEdit(m)}
                          >
                            <Pencil />
                          </IconButton>
                          <IconButton
                            danger
                            aria-label={t.fpDelT}
                            onClick={() => setDelTarget(m)}
                          >
                            <Trash2 />
                          </IconButton>
                        </>
                      ) : null}
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
            body={t.fpEmptyB}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.attSumA} <b>{pg.range}</b> {t.attSumB} <b>{pg.total}</b>{" "}
            {t.fpSumB}
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
      </Panel>

      <DNote title={t.fpNoteT}>{t.fpNoteB}</DNote>
      <DNote title={t.fpNoteTvT}>{t.fpNoteTvB}</DNote>

      {/* dialog tambah/edit mesin */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        className="w-[min(560px,100%)]"
        labelledBy="fp-t"
      >
        <DialogIcon variant="info">
          <Fingerprint />
        </DialogIcon>
        <DialogTitle id="fp-t">
          {editing ? `${t.fpEditT} — ${editing.id}` : t.fpAdd}
        </DialogTitle>
        <DialogBody>{editing ? t.fpEditB : t.fpAddB}</DialogBody>
        <form onSubmit={save} noValidate>
          <FormGrid className="mt-4">
            <Field
              label={t.fpCode}
              htmlFor="fp-code"
              required
              error={err.code}
              errorMessage={t.fpErrCode}
            >
              <Input
                id="fp-code"
                className="font-mono"
                placeholder="FP-13"
                value={fCode}
                onChange={(e) => setFCode(e.target.value)}
              />
            </Field>
            <Field
              label={t.fpLoc}
              htmlFor="fp-loc"
              required
              error={err.loc}
              errorMessage={t.fpErrLoc}
            >
              <Input
                id="fp-loc"
                placeholder="Gate utara"
                value={fLoc}
                onChange={(e) => setFLoc(e.target.value)}
              />
            </Field>
            <Field
              label={t.fpIp}
              htmlFor="fp-ip"
              required
              helper={t.fpIpHelp}
              error={err.ip || err.dupe}
              errorMessage={err.dupe ? t.fpErrIpDupe : t.fpErrIp}
            >
              <Input
                id="fp-ip"
                className="font-mono"
                inputMode="decimal"
                placeholder="10.10.20.11"
                value={fIp}
                onChange={(e) => setFIp(e.target.value)}
              />
            </Field>
            <Field
              label={t.fpPort}
              htmlFor="fp-port"
              required
              helper={t.fpPortHelp}
              error={err.port}
              errorMessage={t.fpErrPort}
            >
              <Input
                id="fp-port"
                className="font-mono"
                inputMode="numeric"
                placeholder={String(FP_DEFAULT_PORT)}
                value={fPort}
                onChange={(e) => setFPort(e.target.value)}
              />
            </Field>
          </FormGrid>
          <ToggleRow className="mt-4" htmlFor="fp-active">
            <Checkbox
              id="fp-active"
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
            {/* uji koneksi langsung dari form — tidak perlu simpan dulu untuk
                tahu alamat yang baru diketik sudah benar */}
            <Button
              type="button"
              variant="secondary"
              disabled={!isIpv4(fIp) || !isPort(Number(fPort))}
              onClick={() =>
                pingOne(
                  {
                    id: fCode.trim() || "—",
                    loc: fLoc.trim(),
                    ip: fIp.trim(),
                    port: Number(fPort),
                    active: fActive,
                    online: false,
                    meta: "",
                  },
                  /* nilai form belum tersimpan — jangan dicatat ke baris mana pun */
                  false
                )
              }
            >
              <Radio />
              {t.fpPing}
            </Button>
            {canManage ? (
              <Button type="submit">
                {editing ? t.udbSaveEdit : t.fpAddDo}
              </Button>
            ) : null}
          </DialogActions>
        </form>
      </Dialog>

      {/* dialog hapus mesin */}
      <Dialog
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        labelledBy="fpd-t"
      >
        <DialogIcon variant="danger">
          <Trash2 />
        </DialogIcon>
        <DialogTitle id="fpd-t">{`${t.fpDelT} "${delTarget?.id ?? ""}"?`}</DialogTitle>
        <DialogBody>{t.fpDelB}</DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setDelTarget(null)}>
            {t.btnCancel}
          </Button>
          <Button variant="destructive" onClick={delDo}>
            {t.fpDelDo}
          </Button>
        </DialogActions>
      </Dialog>

      {/* pop-up hasil uji koneksi */}
      <Dialog
        open={ping !== null}
        onClose={() => setPing(null)}
        className="w-[min(480px,100%)]"
        labelledBy="fpp-t"
      >
        <DialogIcon
          variant={
            tone === "ok"
              ? "success"
              : tone === "warn"
                ? "warning"
                : tone === "fail"
                  ? "danger"
                  : "info"
          }
          /* relative hanya saat menunggu — cincin sonar diposisikan terhadap
             kotak ikon ini, dan tidak ada gunanya membuat stacking context
             baru pada tiga keadaan hasil yang diam */
          className={tone === "wait" ? "relative" : undefined}
        >
          {tone === "ok" ? (
            <CheckCircle2 />
          ) : tone === "warn" ? (
            <AlertTriangle />
          ) : tone === "fail" ? (
            <WifiOff />
          ) : (
            <>
              {/* aria-hidden: keadaan "sedang menghubungi" sudah diumumkan
                  lewat judul dialog, cincin ini murni visual */}
              {SONAR_DELAYS.map((delay) => (
                <span
                  key={delay}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 animate-sonar rounded-icon border border-primary-bright"
                  style={{ animationDelay: delay }}
                />
              ))}
              <Radio className="relative" />
            </>
          )}
        </DialogIcon>
        <DialogTitle id="fpp-t">
          {tone === "ok"
            ? t.fpPingOkT
            : tone === "warn"
              ? t.fpPingWarnT
              : tone === "fail"
                ? t.fpPingFailT
                : t.fpPingWaitT}
        </DialogTitle>
        <DialogBody>
          {tone === "ok"
            ? t.fpPingOkB
            : tone === "warn"
              ? t.fpPingWarnB
              : tone === "fail"
                ? t.fpPingFailB
                : t.fpPingWaitB}
        </DialogBody>

        <dl className="mt-4 flex flex-col gap-2 rounded-card border border-(--divider) bg-(--fill-subtle) px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-(--text-secondary)">{t.fpCode}</dt>
            <dd className="font-semibold">
              {ping?.machine.id}
              {ping?.machine.loc ? (
                <span className="font-normal text-(--text-tertiary)">
                  {" "}
                  · {ping.machine.loc}
                </span>
              ) : null}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-(--text-secondary)">{t.fpIp}</dt>
            <dd className="font-mono font-semibold">
              {ping?.machine.ip}:{ping?.machine.port}
            </dd>
          </div>
          {/* Selagi menunggu, kedua nilai ini memakai skeleton berkilau, bukan
              "…" dan "—" yang diam: keduanya adalah tanda "tidak ada nilai"
              yang sah SETELAH hasil tiba (metode none, ms null pada mesin tak
              terjangkau), jadi memakainya juga untuk keadaan menunggu membuat
              "belum tahu" dan "sudah tahu, hasilnya kosong" terlihat sama. */}
          <div className="flex items-center justify-between gap-4">
            <dt className="text-(--text-secondary)">{t.fpPingVia}</dt>
            <dd className="font-semibold">
              {ping?.result ? (
                t[PING_METHOD_KEY[ping.result.method]]
              ) : (
                <Skeleton className="inline-block h-4 w-12 align-middle" />
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-(--text-secondary)">{t.fpPingMs}</dt>
            <dd className="font-mono font-semibold tabular-nums">
              {!ping?.result ? (
                <Skeleton className="inline-block h-4 w-16 align-middle" />
              ) : ping.result.ms !== null ? (
                `${Math.round(ping.result.ms)} ms`
              ) : (
                "—"
              )}
            </dd>
          </div>
          {ping?.result ? (
            <p className="border-t border-(--divider) pt-2 text-xs leading-relaxed text-(--text-secondary)">
              {t[PING_CODE_KEY[ping.result.code]]}
            </p>
          ) : null}
        </dl>

        <DialogActions>
          <Button
            variant="secondary"
            disabled={!ping?.result}
            onClick={() => {
              if (ping) void pingOne(ping.machine, ping.record);
            }}
          >
            {/* tombolnya memang mati selagi menunggu, tetapi spinner tetap
                dipasang: tanpa itu "Ping ulang" hanya tampak redup, tidak
                tampak sedang bekerja */}
            {ping?.result ? <Radio /> : <Spinner />}
            {t.fpPingRetry}
          </Button>
          <Button onClick={() => setPing(null)}>{t.btnClose}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
