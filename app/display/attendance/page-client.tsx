"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Users } from "lucide-react";

import { displayApi } from "@/lib/api/display";
import { useAppStore } from "@/components/providers/app-store";

import { DisplayShell } from "../_components/display-shell";
import { DisplayBadge, DisplayTable } from "../_components/display-table";

/* Kiosk menampilkan data live — polling ringan menggantikan reload manual. */
const REFRESH_MS = 60_000;

export default function DisplayAttendancePage() {
  const searchParams = useSearchParams();
  const deviceName = searchParams.get("name") ?? undefined;
  const shiftParam = searchParams.get("shift"); // "pagi" | "malam"
  const { mdData } = useAppStore();
  const [apiRows, setApiRows] = React.useState<Record<string, unknown>[]>([]);
  const runtext =
    (mdData?.runtext || []).find(
      (r) => r.active && r.targetDisplay === "Display Attendance"
    )?.name ??
    (mdData?.runtext || []).find((r) => r.active)?.name ??
    "Utamakan keselamatan — patuhi batas kecepatan 40 km/jam di jalan hauling.";

  /* shift aktif: dari ?shift= atau jam WITA sekarang (pagi 04–17, malam 18–03) */
  const activeShift = React.useMemo(() => {
    if (shiftParam === "pagi" || shiftParam === "malam") return shiftParam;
    const h = new Date().getHours();
    return h >= 4 && h < 18 ? "pagi" : "malam";
  }, [shiftParam]);
  const shiftTitle = activeShift === "malam" ? "Shift Malam" : "Shift Pagi";

  /* polling otomatis — kiosk menampilkan data live tanpa reload manual */
  React.useEffect(() => {
    let alive = true;
    const load = () => {
      displayApi
        .getDisplayAttendance()
        .then((res) => {
          if (alive && res && Array.isArray(res))
            setApiRows(res as Record<string, unknown>[]);
        })
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  /* baris + statistik diturunkan dari log absensi API — sinkron dengan admin.
     Baris difilter sesuai shift aktif (kode roster D=pagi / N=malam). */
  const rows = React.useMemo(
    () =>
      apiRows
        .filter((a) => {
          const code = String(a.shift || a.code || "");
          const rowShift =
            code === "D" ? "pagi" : code === "N" ? "malam" : null;
          return rowShift === null || rowShift === activeShift;
        })
        .map((a) => {
          const st = String(a.st || a.status || "belum");
          const label =
            st === "hadir" || st === "unfit"
              ? "Hadir"
              : st === "terlambat"
                ? "Terlambat"
                : "Belum absen";
          const tone =
            st === "hadir" || st === "unfit"
              ? "success"
              : st === "terlambat"
                ? "warning"
                : st === "belum"
                  ? "danger"
                  : "neutral";
          return {
            nik: String(a.nik || ""),
            name: String(a.name || a.nik || ""),
            pos: String(a.pos || "Operator"),
            dept: String(a.dept || ""),
            label,
            variant: (st === "hadir" || st === "unfit"
              ? "success"
              : st === "terlambat"
                ? "warning"
                : "neutral") as "success" | "warning" | "neutral",
            tone: tone as "success" | "warning" | "neutral" | "danger",
          };
        }),
    [apiRows, activeShift]
  );
  const n = (label: string) => rows.filter((r) => r.label === label).length;
  return (
    <DisplayShell
      title={`Attendance — ${shiftTitle}`}
      deviceName={deviceName}
      runtext={runtext}
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
