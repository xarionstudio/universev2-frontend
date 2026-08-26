"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Fingerprint, LayoutGrid, Wifi, WifiOff } from "lucide-react";

import { miscApi } from "@/lib/api";
import {
  displayRuntext,
  fpDisplayMachines,
  type DisplayMachine,
} from "@/lib/data/display-screens";
import { fpScanCount } from "@/lib/data/fingerprint";
import { cn } from "@/lib/utils";

import { DisplayShell } from "../_components/display-shell";

/* Pemisah ribuan ditulis sendiri, bukan toLocaleString: layar ini dirender di
   server lalu dihidrasi di browser, dan format lokal keduanya bisa berbeda. */
function thousands(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/* TV menyala berhari-hari — tanpa muat ulang berkala, status online/offline
   yang ditulis worker sync backend tidak akan pernah sampai ke layar. */
const REFRESH_MS = 60 * 1000;

export default function DisplayFingerprintPage() {
  const deviceName = useSearchParams().get("name") ?? undefined;

  /* Daftar mesin dari GET /api/display/fingerprint — proyeksi backend yang
     sama dengan yang dikelola modul admin, bukan lagi store lokal tab ini
     (yang di tab TV lain selalu kosong). Kiosk tetap membawa token: sesi di
     localStorage ikut terbaca di tab yang dibuka lewat tombol pratinjau.

     null = belum ada jawaban pertama. Kegagalan muat SENGAJA didiamkan dan
     data lama dipertahankan — tidak ada operator di depan TV yang bisa
     membaca toast, dan interval berikutnya akan mencoba lagi sendiri. */
  const [rows, setRows] = React.useState<DisplayMachine[] | null>(null);
  React.useEffect(() => {
    let alive = true;
    let ac: AbortController | null = null;
    const load = () => {
      ac?.abort();
      const c = new AbortController();
      ac = c;
      void miscApi
        .getDisplayFingerprint(c.signal)
        .then((data) => {
          if (alive) setRows(data);
        })
        .catch(() => {
          /* diamkan — lihat catatan di atas */
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

  /* Angka ringkasan DIHITUNG dari mesin terdaftar, tidak ditulis tangan —
     mendaftarkan mesin baru di modul admin langsung mengubah keempat kartu. */
  const machines = fpDisplayMachines(rows ?? []);
  const online = machines.filter((m) => m.online).length;
  const scans = machines.reduce(
    (sum, m) => sum + (m.online ? fpScanCount(m.meta) : 0),
    0
  );

  return (
    <DisplayShell
      title="Mesin Fingerprint"
      deviceName={deviceName}
      runtext={displayRuntext.finger}
      stats={[
        {
          icon: <LayoutGrid className="text-primary-bright" />,
          iconClass: "bg-(--badge-info-fill) border-(--badge-info-border)",
          value: String(machines.length),
          label: "Total Mesin",
        },
        {
          icon: <Wifi className="text-(--badge-success-text)" />,
          iconClass:
            "bg-(--badge-success-fill) border-(--badge-success-border)",
          value: String(online),
          label: "Online",
        },
        {
          icon: <WifiOff className="text-danger-text" />,
          iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)",
          value: String(machines.length - online),
          label: "Offline",
        },
        {
          icon: <Fingerprint className="text-primary-bright" />,
          iconClass: "bg-[rgba(0,212,255,.14)] border-[rgba(0,212,255,.4)]",
          value: thousands(scans),
          label: "Scan Hari Ini",
        },
      ]}
    >
      {/* grid mesin — offline selalu di urutan teratas & menonjol.
          Keadaan kosong dibedakan: "memuat" (belum ada jawaban pertama) vs
          benar-benar belum ada mesin terdaftar — id-only, seperti seluruh
          teks kiosk (ADR 0003). */}
      {machines.length === 0 ? (
        <div className="grid min-h-0 flex-1 place-items-center text-[26px] text-(--text-tertiary)">
          {rows === null
            ? "Memuat data mesin…"
            : "Belum ada mesin fingerprint terdaftar"}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-4 gap-6">
          {machines.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex flex-col gap-2.5 rounded-panel p-5 glass-card",
                !m.online &&
                  "border-[rgba(252,60,59,.55)] shadow-[0_0_28px_rgba(252,60,59,.25),0_20px_80px_rgba(0,0,0,.5)]"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[30px] font-bold">{m.id}</span>
                <span
                  className={cn(
                    "grid size-13 flex-none place-items-center rounded-icon border [&_svg]:size-6.5",
                    m.online
                      ? "border-(--badge-success-border) bg-(--badge-success-fill)"
                      : "border-(--badge-danger-border) bg-(--badge-danger-fill)"
                  )}
                >
                  {m.online ? (
                    <Wifi className="text-(--badge-success-text)" />
                  ) : (
                    <WifiOff className="text-danger-text" />
                  )}
                </span>
              </div>
              <div className="text-xl text-(--text-secondary)">{m.loc}</div>
              {/* meta backend sudah kalimat utuh ("terakhir sinkron 25 Aug
                  10:30" / "belum ada data scan") — jangan diberi prefix
                  "Hari ini:" yang membuatnya janggal. Jumlah scan harian
                  menyusul dari backend (ADR 0011); saat itu format meta-nya
                  yang berubah, bukan pembungkus di sini. */}
              <div
                className={cn(
                  "mt-auto text-lg text-(--text-tertiary)",
                  !m.online && "text-danger-text"
                )}
              >
                <b
                  className={cn(
                    "font-mono font-semibold tabular-nums",
                    m.online ? "text-(--text-secondary)" : "text-danger-text"
                  )}
                >
                  {m.meta}
                </b>
              </div>
            </div>
          ))}
        </div>
      )}
    </DisplayShell>
  );
}
