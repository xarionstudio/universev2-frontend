"use client"

import { CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { kioskFtwRows } from "@/lib/data/kiosk"
import { KioskShell } from "../_components/kiosk-shell"
import { KioskTable, KioskBadge, KioskNameCell } from "../_components/kiosk-table"

export default function KioskFitworkPage() {
  return (
    <KioskShell
      title="Fit To Work — Shift Pagi"
      stats={[
        { icon: <CheckCircle2 className="text-(--badge-success-text)" />, iconClass: "bg-(--badge-success-fill) border-(--badge-success-border)", value: "231", label: "Fit" },
        { icon: <Clock className="text-(--badge-warning-text)" />, iconClass: "bg-(--badge-warning-fill) border-(--badge-warning-border)", value: "9", label: "Belum Lapor" },
        { icon: <AlertTriangle className="text-(--color-danger-text)" />, iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)", value: "2", label: "Kurang Tidur" },
      ]}
    >
      <KioskTable
        cols={[
          { label: "Operator", width: "30%" },
          { label: "Departemen", width: "18%" },
          { label: "Shift", width: "16%" },
          { label: "Jam Tidur", width: "16%" },
          { label: "Status" },
        ]}
        rows={kioskFtwRows.map((r) => ({
          key: r.nik,
          danger: r.tone === "danger",
          cells: [
            <KioskNameCell key="n" main={r.name} sub={r.nik} />,
            r.dept,
            <span key="sh" className="font-mono tabular-nums">
              {r.shift}
            </span>,
            <span key="sl" className="font-mono tabular-nums">
              {r.sleep}
            </span>,
            <KioskBadge key="s" tone={r.tone}>
              {r.label}
            </KioskBadge>,
          ],
        }))}
      />
    </KioskShell>
  )
}
