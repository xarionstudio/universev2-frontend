"use client"

import { CheckCircle2, AlertTriangle, Clock } from "lucide-react"
import { kioskFleetRows } from "@/lib/data/kiosk"
import { KioskShell } from "../_components/kiosk-shell"
import { KioskTable, KioskBadge } from "../_components/kiosk-table"

export default function KioskFleetPage() {
  return (
    <KioskShell
      title="Fleet — Status Unit"
      stats={[
        { icon: <CheckCircle2 className="text-(--badge-success-text)" />, iconClass: "bg-(--badge-success-fill) border-(--badge-success-border)", value: "46", label: "Ready" },
        { icon: <AlertTriangle className="text-(--color-danger-text)" />, iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)", value: "3", label: "Breakdown" },
        { icon: <Clock className="text-(--badge-neutral-text)" />, iconClass: "bg-(--badge-neutral-fill) border-(--badge-neutral-border)", value: "3", label: "Standby" },
      ]}
    >
      <KioskTable
        cols={[
          { label: "Unit", width: "16%" },
          { label: "Tipe", width: "24%" },
          { label: "Operator", width: "26%" },
          { label: "Lokasi", width: "16%" },
          { label: "Status" },
        ]}
        rows={kioskFleetRows.map((r) => ({
          key: r.code,
          danger: r.tone === "danger",
          cells: [
            <b key="c" className="font-mono font-bold tabular-nums">
              {r.code}
            </b>,
            r.type,
            r.operator,
            r.loc,
            <KioskBadge key="s" tone={r.tone}>
              {r.label}
            </KioskBadge>,
          ],
        }))}
      />
    </KioskShell>
  )
}
