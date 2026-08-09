"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Clock,
  Truck,
  UserX,
} from "lucide-react";

import { displayApi } from "@/lib/api/display";
import { displayRuntext, fleetDisplayCards } from "@/lib/data/display-screens";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { initialsOf } from "@/components/ui/avatar";

import { DisplayShell } from "../_components/display-shell";
import { DisplayBadge } from "../_components/display-table";

export default function DisplayFleetPage() {
  const params = useSearchParams();
  const deviceName = params.get("name") ?? undefined;
  const fleetId = params.get("fleet");
  const { fleets, faAlloc, empAll } = useAppStore();

  React.useEffect(() => {
    displayApi.getDisplayFleet().catch(() => {});
  }, []);

  /* satu layar = satu formasi fleet (digger + maks. 13 OHT) */
  const fleet =
    fleets.find((f) => f.id === fleetId) ??
    fleets.find((f) => f.active) ??
    fleets[0];

  /* operator dari alokasi harian: tanggal hari ini + shift menurut jam
     (06:00–17:59 = pagi); bisa dipaksa lewat ?shift= untuk pengujian */
  const [now] = React.useState(() => new Date());
  const shiftParam = params.get("shift");
  const shift =
    shiftParam === "pagi" || shiftParam === "malam"
      ? shiftParam
      : now.getHours() >= 6 && now.getHours() < 18
        ? "pagi"
        : "malam";
  const nameByNik = React.useMemo(
    () => new Map(empAll().map((e) => [e.nik, e.name])),
    [empAll]
  );
  const cards = React.useMemo(() => {
    if (!fleet) return [];
    const alloc = faAlloc[now.toISOString().slice(0, 10)]?.[shift] ?? {};
    return fleetDisplayCards(fleet, alloc, (nik) => nameByNik.get(nik));
  }, [fleet, faAlloc, now, shift, nameByNik]);
  const count = (tone: string) => cards.filter((c) => c.tone === tone).length;

  return (
    <DisplayShell
      title={fleet ? `Fleet ${fleet.digger}` : "Fleet — Status Unit"}
      meta={
        fleet ? (
          <>
            <span className="truncate">{fleet.loc}</span>
            {/* bus antar-jemput fleet — informasi penting operator, di-highlight */}
            <span className="inline-flex flex-none items-center gap-2.5 rounded-full border border-(--badge-info-border) bg-(--badge-info-fill) px-4.5 py-1 font-bold text-primary-bright">
              <Bus className="size-6" />
              Bus {fleet.bus}
            </span>
          </>
        ) : undefined
      }
      deviceName={
        deviceName !== `Fleet ${fleet?.digger}` ? deviceName : undefined
      }
      runtext={displayRuntext.fleet}
      stats={[
        {
          icon: <Truck className="text-primary-bright" />,
          iconClass: "bg-(--badge-info-fill) border-(--badge-info-border)",
          value: String(cards.length),
          label: "Total Unit",
        },
        {
          icon: <CheckCircle2 className="text-(--badge-success-text)" />,
          iconClass:
            "bg-(--badge-success-fill) border-(--badge-success-border)",
          value: String(count("success")),
          label: "Ready",
        },
        {
          icon: <AlertTriangle className="text-danger-text" />,
          iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)",
          value: String(count("danger")),
          label: "Breakdown",
        },
        {
          icon: <Clock className="text-(--badge-neutral-text)" />,
          iconClass:
            "bg-(--badge-neutral-fill) border-(--badge-neutral-border)",
          value: String(count("neutral")),
          label: "Standby",
        },
      ]}
    >
      {/* kartu operator per unit — maks. 14 (digger + 13 OHT), semua tampil
          sekaligus tanpa auto-scroll */}
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-2 gap-5">
        {cards.slice(0, 14).map((c) => (
          <div
            key={c.code}
            className={cn(
              "relative overflow-hidden rounded-card border border-(--glass-2-border)",
              c.tone === "danger" &&
                "border-[rgba(252,60,59,.55)] shadow-[0_0_28px_rgba(252,60,59,.25)]"
            )}
          >
            {/* foto karyawan memenuhi kartu (placeholder inisial) */}
            {c.opName ? (
              <div className="absolute inset-0 grid place-items-center bg-(image:--gradient-cta)">
                <span className="text-[88px] font-bold text-on-cta opacity-80">
                  {initialsOf(c.opName)}
                </span>
              </div>
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-(--fill-input)">
                <UserX className="size-20 text-(--text-disabled)" />
              </div>
            )}
            {/* scrim agar teks terbaca di atas foto */}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,4,22,.65)_0%,rgba(1,4,22,0)_32%,rgba(1,4,22,0)_52%,rgba(1,4,22,.88)_100%)]" />
            <div className="absolute inset-0 flex flex-col justify-between p-3.5">
              <div className="flex items-start justify-between gap-2">
                <b className="font-mono text-[22px] font-bold tabular-nums">
                  {c.code}
                </b>
                <DisplayBadge
                  tone={c.tone}
                  className="gap-1.5 px-2.5 py-0.5 text-sm [&>span]:size-2"
                >
                  {c.label}
                </DisplayBadge>
              </div>
              <div>
                <div className="line-clamp-1 text-[21px] leading-tight font-bold">
                  {c.opName ?? "Belum ada operator"}
                </div>
                {c.opNik ? (
                  <div className="mt-0.5 font-mono text-base text-(--text-secondary) tabular-nums">
                    {c.opNik}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DisplayShell>
  );
}
