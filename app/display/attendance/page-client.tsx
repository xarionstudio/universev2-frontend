"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Users } from "lucide-react";

import { miscApi } from "@/lib/api";
import type { ApiDisplayAttRow } from "@/lib/api/endpoints/misc";
import { displayRuntext } from "@/lib/data/display-screens";

import { DisplayShell } from "../_components/display-shell";
import { DisplayBadge, DisplayTable } from "../_components/display-table";

/* TV menyala berhari-hari — tanpa muat ulang berkala, scan yang baru ditarik
   worker fingerprint tidak pernah sampai ke layar. Irama 60 detik sama dengan
   layar mesin fingerprint. */
const REFRESH_MS = 60 * 1000;

/* Belum absen & terlambat selalu teratas — urutan yang sama dengan kartu
   statistik di atas tabel; sisanya (hadir/unfit) mengikuti urutan backend. */
const ST_RANK: Record<string, number> = { belum: 0, terlambat: 1 };

export default function DisplayAttendancePage() {
  const deviceName = useSearchParams().get("name") ?? undefined;

  /* Baris dari GET /api/display/attendance — endpoint yang membangun ulang
     papan absensi (SyncAttendanceBoard) sebelum membaca, jadi status belum/
     terlambat/off ikut terhitung, sinkron dengan halaman admin.

     null = belum ada jawaban pertama. Kegagalan muat SENGAJA didiamkan dan
     data lama dipertahankan — tidak ada operator di depan TV yang bisa
     membaca toast, dan interval berikutnya akan mencoba lagi sendiri. */
  const [data, setData] = React.useState<ApiDisplayAttRow[] | null>(null);
  /* Gagal SEBELUM jawaban pertama dibedakan dari "sedang memuat": tanpa ini,
     akun tanpa permission display (403) membuat TV menampilkan "Memuat…"
     selamanya dan tak ada yang tahu kenapa. Setelah data pertama tiba,
     kegagalan kembali didiamkan seperti biasa. */
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    let gotData = false;
    let ac: AbortController | null = null;
    const load = () => {
      ac?.abort();
      const c = new AbortController();
      ac = c;
      void miscApi
        .getDisplayAttendance(c.signal)
        .then((rows) => {
          if (!alive) return;
          gotData = true;
          setData(rows);
          setFailed(false);
        })
        .catch(() => {
          /* diamkan setelah data pertama — lihat catatan di atas */
          if (alive && !c.signal.aborted && !gotData) setFailed(true);
        });
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      ac?.abort();
      clearInterval(timer);
    };
  }, []);

  /* "Off" tidak tampil (bukan roster hari ini) dan "unfit" sudah dilabeli
     "Hadir" oleh backend — kelayakan kerja adalah domain layar Fit To Work. */
  const rows = React.useMemo(
    () =>
      (data ?? [])
        .filter((r) => r.st !== "off")
        .slice()
        .sort((a, b) => (ST_RANK[a.st] ?? 2) - (ST_RANK[b.st] ?? 2)),
    [data]
  );
  const n = (label: string) => rows.filter((r) => r.label === label).length;

  return (
    <DisplayShell
      title="Attendance — Hari Ini"
      deviceName={deviceName}
      runtext={displayRuntext.att}
      stats={[
        {
          icon: <Users className="text-primary-bright" />,
          iconClass: "bg-(--badge-info-fill) border-(--badge-info-border)",
          value: String(rows.length),
          label: "Total Roster",
        },
        {
          icon: <CheckCircle2 className="text-(--badge-success-text)" />,
          iconClass:
            "bg-(--badge-success-fill) border-(--badge-success-border)",
          value: String(n("Hadir") + n("Terlambat")),
          label: "Sudah Absen",
        },
        {
          icon: <Clock className="text-(--badge-warning-text)" />,
          iconClass:
            "bg-(--badge-warning-fill) border-(--badge-warning-border)",
          value: String(n("Terlambat")),
          label: "Terlambat",
        },
        {
          icon: <AlertTriangle className="text-danger-text" />,
          iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)",
          value: String(n("Belum absen")),
          label: "Belum Absen",
        },
      ]}
    >
      {/* Keadaan kosong dibedakan: "memuat" (belum ada jawaban pertama) vs
          benar-benar belum ada baris absensi hari ini — id-only, seperti
          seluruh teks kiosk (ADR 0003). */}
      {rows.length === 0 ? (
        <div className="grid min-h-0 flex-1 place-items-center text-[26px] text-(--text-tertiary)">
          {data !== null
            ? "Belum ada data absensi hari ini"
            : failed
              ? "Data absensi tidak dapat dimuat — periksa koneksi dan akses akun layar ini"
              : "Memuat data absensi…"}
        </div>
      ) : (
        <DisplayTable
          cols={[
            { label: "NIK", width: "12%" },
            { label: "Nama", width: "25%" },
            { label: "Posisi", width: "21%" },
            { label: "Departemen", width: "15%" },
            { label: "Shift", width: "9%" },
            { label: "Status" },
          ]}
          rows={rows.map((r) => ({
            key: r.nik,
            danger: r.tone === "danger",
            cells: [
              <span
                key="k"
                className="font-mono text-(--text-secondary) tabular-nums"
              >
                {r.nik}
              </span>,
              <b key="n" className="font-bold">
                {r.name}
              </b>,
              r.pos || "—",
              r.dept,
              /* papan memuat SEMUA shift hari ini — kode shift memberi
                 konteks kenapa pekerja shift malam masih "Belum absen" pagi */
              <span key="c" className="font-mono">
                {r.shift || "—"}
              </span>,
              <DisplayBadge key="s" tone={r.tone}>
                {r.label}
              </DisplayBadge>,
            ],
          }))}
        />
      )}
    </DisplayShell>
  );
}
