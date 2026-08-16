"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Fingerprint, LayoutGrid, Wifi, WifiOff } from "lucide-react";

import { displayApi } from "@/lib/api/display";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";

import { DisplayShell } from "../_components/display-shell";

export default function DisplayFingerprintPage() {
  const deviceName = useSearchParams().get("name") ?? undefined;
  const { mdData } = useAppStore();
  const [apiMachines, setApiMachines] = React.useState<
    Record<string, unknown>[]
  >([]);
  const runtextOpts = mdData?.runtext || [];
  const runtext =
    runtextOpts.find((r) => r.active)?.name ??
    "Wajib P2H sebelum mengoperasikan unit.";

  // Ensure runtext is always a string
  const safeRuntext = runtext || "Wajib P2H sebelum mengoperasikan unit.";

  /* polling otomatis — kiosk menampilkan status live tanpa reload manual.
     REFRESH_MS sedikit lebih cepat karena status online/offline adalah sinyal
     operasional yang harus segar. */
  React.useEffect(() => {
    let alive = true;
    const load = () => {
      displayApi
        .getDisplayFingerprint()
        .then((res) => {
          if (alive && res && Array.isArray(res))
            setApiMachines(res as Record<string, unknown>[]);
        })
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const machines = apiMachines.map((m) => {
    const online = Boolean(m.online ?? true);
    return {
      id: String(m.id || m.code || ""),
      loc: String(m.location || m.loc || "—"),
      online,
      /* backend mengirim `meta` siap-tampil (mis. "terakhir sinkron 02 Jan 15:04").
         Sebelumnya dipakai scansToday/offlineSince yang tidak pernah dikirim. */
      meta: online
        ? String(m.meta || m.scansToday || "belum ada data scan")
        : `Offline sejak ${String(m.meta || m.offlineSince || "—")}`,
    };
  });

  const onlineN = machines.filter((m) => m.online).length;
  const offlineN = machines.filter((m) => !m.online).length;
  /* Backend tidak mengirim jumlah scan hari ini → jangan klaim angka 0 yang
     menyesatkan; tampilkan "—" saat data tidak tersedia. */
  const hasScans = apiMachines.some((m) => m.scansToday != null);
  const totalScans = hasScans
    ? apiMachines.reduce((sum: number, m) => sum + Number(m.scansToday || 0), 0)
    : null;

  return (
    <DisplayShell
      title="Mesin Fingerprint"
      deviceName={deviceName}
      runtext={safeRuntext}
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
          value: String(onlineN),
          label: "Online",
        },
        {
          icon: <WifiOff className="text-danger-text" />,
          iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)",
          value: String(offlineN),
          label: "Offline",
        },
        {
          icon: <Fingerprint className="text-primary-bright" />,
          iconClass: "bg-[rgba(0,212,255,.14)] border-[rgba(0,212,255,.4)]",
          value: totalScans != null ? totalScans.toLocaleString("id-ID") : "—",
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
