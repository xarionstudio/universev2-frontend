"use client";

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

import { displayFleetRows } from "@/lib/data/display-screens";

import { DisplayShell } from "../_components/display-shell";
import { DisplayBadge, DisplayTable } from "../_components/display-table";

export default function DisplayFleetPage() {
  return (
    <DisplayShell
      title="Fleet — Status Unit"
      stats={[
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
      <DisplayTable
        cols={[
          { label: "Unit", width: "16%" },
          { label: "Tipe", width: "24%" },
          { label: "Operator", width: "26%" },
          { label: "Lokasi", width: "16%" },
          { label: "Status" },
        ]}
        rows={displayFleetRows.map((r) => ({
          key: r.code,
          danger: r.tone === "danger",
          cells: [
            <b key="c" className="font-mono font-bold tabular-nums">
              {r.code}
            </b>,
            r.type,
            r.operator,
            r.loc,
            <DisplayBadge key="s" tone={r.tone}>
              {r.label}
            </DisplayBadge>,
          ],
        }))}
      />
    </DisplayShell>
  );
}
