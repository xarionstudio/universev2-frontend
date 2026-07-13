"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Truck, UserX } from "lucide-react";

import { displayFleetCards, displayRuntext } from "@/lib/data/display-screens";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/components/ui/avatar";

import { DisplayShell } from "../_components/display-shell";
import { DisplayBadge } from "../_components/display-table";

export default function DisplayFleetPage() {
  const deviceName = useSearchParams().get("name") ?? undefined;
  const cards = displayFleetCards;
  return (
    <DisplayShell
      title="Fleet — Status Unit"
      deviceName={deviceName}
      runtext={displayRuntext.fleet}
      stats={[
        {
          icon: <Truck className="text-(--color-primary-bright)" />,
          iconClass: "bg-(--badge-info-fill) border-(--badge-info-border)",
          value: "52",
          label: "Total Unit Aktif",
        },
        {
          icon: <CheckCircle2 className="text-(--badge-success-text)" />,
          iconClass:
            "bg-(--badge-success-fill) border-(--badge-success-border)",
          value: "46",
          label: "Ready",
        },
        {
          icon: <AlertTriangle className="text-(--color-danger-text)" />,
          iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)",
          value: "3",
          label: "Breakdown",
        },
        {
          icon: <Clock className="text-(--badge-neutral-text)" />,
          iconClass:
            "bg-(--badge-neutral-fill) border-(--badge-neutral-border)",
          value: "3",
          label: "Standby",
        },
      ]}
    >
      {/* kartu operator per unit — foto memenuhi kartu; auto-scroll seperti tabel */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="display-scroller [animation:kscroll_var(--kscroll-dur,30s)_linear_infinite]"
          style={
            { "--kscroll-dur": `${cards.length * 3}s` } as React.CSSProperties
          }
        >
          {/* isi digandakan agar loop scroll mulus */}
          {[0, 1].map((dup) => (
            <div key={dup} className="grid grid-cols-6 gap-5 pb-5">
              {cards.map((c) => (
                <div
                  key={`${c.code}-${dup}`}
                  className={cn(
                    "relative aspect-[3/4] overflow-hidden rounded-card border border-(--glass-2-border)",
                    c.tone === "danger" &&
                      "border-[rgba(252,60,59,.55)] shadow-[0_0_28px_rgba(252,60,59,.25)]"
                  )}
                >
                  {/* foto karyawan memenuhi kartu (placeholder inisial) */}
                  {c.opName ? (
                    <div className="absolute inset-0 grid place-items-center bg-(image:--gradient-cta)">
                      <span className="text-[120px] font-bold text-(--color-on-cta) opacity-80">
                        {initialsOf(c.opName)}
                      </span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-(--fill-input)">
                      <UserX className="size-24 text-(--text-disabled)" />
                    </div>
                  )}
                  {/* scrim agar teks terbaca di atas foto */}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,4,22,.65)_0%,rgba(1,4,22,0)_32%,rgba(1,4,22,0)_52%,rgba(1,4,22,.88)_100%)]" />
                  <div className="absolute inset-0 flex flex-col justify-between p-5">
                    <div className="flex items-start justify-between gap-3">
                      <b className="font-mono text-[30px] font-bold tabular-nums">
                        {c.code}
                      </b>
                      <DisplayBadge
                        tone={c.tone}
                        className="px-3.5 py-1 text-lg"
                      >
                        {c.label}
                      </DisplayBadge>
                    </div>
                    <div>
                      <div className="line-clamp-1 text-[24px] leading-tight font-bold">
                        {c.opName ?? "Belum ada operator"}
                      </div>
                      {c.opNik ? (
                        <div className="mt-0.5 font-mono text-lg text-(--text-secondary) tabular-nums">
                          {c.opNik}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </DisplayShell>
  );
}
