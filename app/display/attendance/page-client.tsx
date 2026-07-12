"use client"

import { Users, CheckCircle2, AlertTriangle } from "lucide-react"
import { displayAttRows } from "@/lib/data/display-screens"
import { DisplayShell } from "../_components/display-shell"
import { DisplayTable, DisplayBadge, DisplayNameCell } from "../_components/display-table"

export default function DisplayAttendancePage() {
  return (
    <DisplayShell
      title="Attendance — Shift Pagi"
      stats={[
        { icon: <Users className="text-[#7AE6FF]" />, iconClass: "bg-[rgba(0,212,255,.14)] border-[rgba(0,212,255,.4)]", value: "238", label: "Sudah Absen" },
        { icon: <CheckCircle2 className="text-(--badge-success-text)" />, iconClass: "bg-(--badge-success-fill) border-(--badge-success-border)", value: "231", label: "Fit To Work" },
        { icon: <AlertTriangle className="text-(--color-danger-text)" />, iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)", value: "16", label: "Perlu Perhatian" },
      ]}
    >
      <DisplayTable
        cols={[
          { label: "Karyawan", width: "34%" },
          { label: "Departemen", width: "20%" },
          { label: "Check-in", width: "22%" },
          { label: "Status" },
        ]}
        rows={displayAttRows.map((r) => ({
          key: r.nik,
          cells: [
            <DisplayNameCell key="n" main={r.name} sub={r.nik} />,
            r.dept,
            <DisplayNameCell
              key="c"
              main={r.checkIn}
              mono
              sub={r.machine !== "—" ? r.machine : undefined}
              subMono={false}
            />,
            <DisplayBadge key="s" tone={r.tone}>
              {r.label}
            </DisplayBadge>,
          ],
        }))}
      />
    </DisplayShell>
  )
}
