"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Truck } from "lucide-react";

import { displayRuntext } from "@/lib/data/display-screens";
import { useAppStore } from "@/components/providers/app-store";

import { DisplayShell } from "../_components/display-shell";
import {
  FleetCardGrid,
  FleetIdentity,
  shiftNow,
  toneCount,
  useFleetCards,
} from "../_components/fleet-board";

export default function DisplayFleetPage() {
  const params = useSearchParams();
  const deviceName = params.get("name") ?? undefined;
  const fleetId = params.get("fleet");
  const { fleets } = useAppStore();

  /* satu layar = satu formasi fleet (digger + maks. 13 OHT) */
  const fleet =
    fleets.find((f) => f.id === fleetId) ??
    fleets.find((f) => f.active) ??
    fleets[0];

  /* operator dari alokasi harian: tanggal hari ini + shift menurut jam
     (06:00–17:59 = pagi); bisa dipaksa lewat ?shift= untuk pengujian */
  const [now] = React.useState(() => new Date());
  const shift = shiftNow(params.get("shift"), now);
  const cards = useFleetCards(fleet, shift, now.toISOString().slice(0, 10));

  return (
    <DisplayShell
      title={fleet ? `Fleet ${fleet.digger}` : "Fleet — Status Unit"}
      meta={fleet ? <FleetIdentity fleet={fleet} /> : undefined}
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
          value: String(toneCount(cards, "success")),
          label: "Ready",
        },
        {
          icon: <AlertTriangle className="text-danger-text" />,
          iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)",
          value: String(toneCount(cards, "danger")),
          label: "Breakdown",
        },
        {
          icon: <Clock className="text-(--badge-neutral-text)" />,
          iconClass:
            "bg-(--badge-neutral-fill) border-(--badge-neutral-border)",
          value: String(toneCount(cards, "neutral")),
          label: "Standby",
        },
      ]}
    >
      {/* kartu operator per unit — maks. 14 (digger + 13 OHT), semua tampil
          sekaligus tanpa auto-scroll */}
      <FleetCardGrid cards={cards} />
    </DisplayShell>
  );
}
