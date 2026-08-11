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

  React.useEffect(() => {
    displayApi
      .getDisplayFingerprint()
      .then((res) => {
        if (res && Array.isArray(res))
          setApiMachines(res as Record<string, unknown>[]);
      })
      .catch(() => {});
  }, []);

  const machines = apiMachines.map((m) => ({
    id: String(m.id || m.code || ""),
    loc: String(m.location || m.loc || "—"),
    online: Boolean(m.online ?? true),
    meta: m.online
      ? `${Number(m.scansToday || 0)} scan`
      : `Offline sejak ${String(m.offlineSince || "—")}`,
  }));

  const onlineN = machines.filter((m) => m.online).length;
  const offlineN = machines.filter((m) => !m.online).length;
  const totalScans = apiMachines.reduce(
    (sum: number, m) => sum + Number(m.scansToday || 0),
    0
  );

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
          value: String(totalScans.toLocaleString("id-ID")),
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
