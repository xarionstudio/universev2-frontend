"use client";

import { Fingerprint, Wifi, WifiOff } from "lucide-react";

import { displayMachines } from "@/lib/data/display-screens";
import { cn } from "@/lib/utils";

import { DisplayShell } from "../_components/display-shell";
import { DisplayBadge } from "../_components/display-table";

export default function DisplayFingerprintPage() {
  return (
    <DisplayShell
      title="Mesin Fingerprint"
      stats={[
        {
          icon: <Wifi className="text-(--badge-success-text)" />,
          iconClass:
            "bg-(--badge-success-fill) border-(--badge-success-border)",
          value: "10",
          label: "Online",
        },
        {
          icon: <WifiOff className="text-(--color-danger-text)" />,
          iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)",
          value: "2",
          label: "Offline",
        },
        {
          icon: <Fingerprint className="text-(--color-primary-bright)" />,
          iconClass: "bg-[rgba(0,212,255,.14)] border-[rgba(0,212,255,.4)]",
          value: "1.208",
          label: "Scan Hari Ini",
        },
      ]}
    >
      {/* grid mesin — offline selalu di urutan teratas & menonjol */}
      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-4 gap-6">
        {displayMachines.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex flex-col gap-3.5 rounded-panel p-7 glass-card",
              !m.online &&
                "border-[rgba(252,60,59,.55)] shadow-[0_0_28px_rgba(252,60,59,.25),0_20px_80px_rgba(0,0,0,.5)]"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[34px] font-bold">{m.id}</span>
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
                  <WifiOff className="text-(--color-danger-text)" />
                )}
              </span>
            </div>
            <div className="text-[22px] text-(--text-secondary)">{m.loc}</div>
            <DisplayBadge tone={m.online ? "success" : "danger"}>
              {m.online ? "Online" : "Offline"}
            </DisplayBadge>
            <div
              className={cn(
                "mt-auto text-xl text-(--text-tertiary)",
                !m.online && "text-(--color-danger-text)"
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
                <b className="font-mono font-semibold text-(--color-danger-text) tabular-nums">
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
