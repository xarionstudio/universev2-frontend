"use client";

import { useSearchParams } from "next/navigation";
import { Fingerprint, LayoutGrid, Wifi, WifiOff } from "lucide-react";

import { displayRuntext, fpDisplayMachines } from "@/lib/data/display-screens";
import { fpScanCount } from "@/lib/data/fingerprint";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";

import { DisplayShell } from "../_components/display-shell";

/* Pemisah ribuan ditulis sendiri, bukan toLocaleString: layar ini dirender di
   server lalu dihidrasi di browser, dan format lokal keduanya bisa berbeda. */
function thousands(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function DisplayFingerprintPage() {
  const deviceName = useSearchParams().get("name") ?? undefined;
  const { fpMachines } = useAppStore();

  /* Angka ringkasan DIHITUNG dari mesin terdaftar, tidak ditulis tangan —
     mendaftarkan mesin baru di modul admin langsung mengubah keempat kartu. */
  const machines = fpDisplayMachines(fpMachines);
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
      {/* grid mesin — offline selalu di urutan teratas & menonjol */}
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
            <div
              className={cn(
                "mt-auto text-lg text-(--text-tertiary)",
                !m.online && "text-danger-text"
              )}
            >
              {m.online ? (
                <>
                  Hari ini:{" "}
                  <b className="font-mono font-semibold text-(--text-secondary) tabular-nums">
                    {m.meta}
                  </b>
                </>
              ) : (
                <b className="font-mono font-semibold text-danger-text tabular-nums">
                  {m.meta}
                </b>
              )}
            </div>
          </div>
        ))}
      </div>
    </DisplayShell>
  );
}
