"use client"

import { Users, CheckCircle2, AlertTriangle } from "lucide-react"
import { kioskAttRows } from "@/lib/data/kiosk"
import { KioskShell } from "../_components/kiosk-shell"
import { KioskTable, KioskBadge, KioskNameCell } from "../_components/kiosk-table"

export default function KioskAttendancePage() {
  return (
    <KioskShell
      title="Attendance — Shift Pagi"
      stats={[
        { icon: <Users className="text-[#7AE6FF]" />, iconClass: "bg-[rgba(0,212,255,.14)] border-[rgba(0,212,255,.4)]", value: "238", label: "Sudah Absen" },
        { icon: <CheckCircle2 className="text-(--badge-success-text)" />, iconClass: "bg-(--badge-success-fill) border-(--badge-success-border)", value: "231", label: "Fit To Work" },
        { icon: <AlertTriangle className="text-(--color-danger-text)" />, iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)", value: "16", label: "Perlu Perhatian" },
      ]}
    >
      <KioskTable
        cols={[
          { label: "Karyawan", width: "34%" },
          { label: "Departemen", width: "20%" },
          { label: "Check-in", width: "22%" },
          { label: "Status" },
        ]}
        rows={kioskAttRows.map((r) => ({
          key: r.nik,
          cells: [
            <KioskNameCell key="n" main={r.name} sub={r.nik} />,
            r.dept,
            <KioskNameCell
              key="c"
              main={r.checkIn}
              mono
              sub={r.machine !== "—" ? r.machine : undefined}
              subMono={false}
            />,
            <KioskBadge key="s" tone={r.tone}>
              {r.label}
            </KioskBadge>,
          ],
        }))}
      />
    </KioskShell>
  )
}
