"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Users } from "lucide-react";

import { displayAttRowsNow, displayRuntext } from "@/lib/data/display-screens";

import { DisplayShell } from "../_components/display-shell";
import { DisplayBadge, DisplayTable } from "../_components/display-table";

export default function DisplayAttendancePage() {
  const deviceName = useSearchParams().get("name") ?? undefined;
  /* baris + statistik diturunkan dari log absensi — sinkron dengan admin */
  const rows = React.useMemo(() => displayAttRowsNow(), []);
  const n = (label: string) => rows.filter((r) => r.label === label).length;
  return (
    <DisplayShell
      title="Attendance — Shift Pagi"
      deviceName={deviceName}
      runtext={displayRuntext.att}
      stats={[
        {
          icon: <Users className="text-primary-bright" />,
          iconClass: "bg-(--badge-info-fill) border-(--badge-info-border)",
          value: String(rows.length),
          label: "Total Roster",
        },
        {
          icon: <CheckCircle2 className="text-(--badge-success-text)" />,
          iconClass:
            "bg-(--badge-success-fill) border-(--badge-success-border)",
          value: String(n("Hadir") + n("Terlambat")),
          label: "Sudah Absen",
        },
        {
          icon: <Clock className="text-(--badge-warning-text)" />,
          iconClass:
            "bg-(--badge-warning-fill) border-(--badge-warning-border)",
          value: String(n("Terlambat")),
          label: "Terlambat",
        },
        {
          icon: <AlertTriangle className="text-danger-text" />,
          iconClass: "bg-(--badge-danger-fill) border-(--badge-danger-border)",
          value: String(n("Belum absen")),
          label: "Belum Absen",
        },
      ]}
    >
      <DisplayTable
        cols={[
          { label: "NIK", width: "13%" },
          { label: "Nama", width: "27%" },
          { label: "Posisi", width: "24%" },
          { label: "Departemen", width: "16%" },
          { label: "Status" },
        ]}
        rows={rows.map((r) => ({
          key: r.nik,
          danger: r.tone === "danger",
          cells: [
            <span
              key="k"
              className="font-mono text-(--text-secondary) tabular-nums"
            >
              {r.nik}
            </span>,
            <b key="n" className="font-bold">
              {r.name}
            </b>,
            r.pos,
            r.dept,
            <DisplayBadge key="s" tone={r.tone}>
              {r.label}
            </DisplayBadge>,
          ],
        }))}
      />
    </DisplayShell>
  );
}
