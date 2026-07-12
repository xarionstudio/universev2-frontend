import type { Employee, Komp } from "@/lib/data/employees"
import type { BadgeVariant } from "@/components/ui/badge"
import type { Dict } from "@/lib/i18n/id"

/* Unit papan alokasi — turunan Database Unit (unit aktif saja) */
export type FaUnit = {
  code: string
  type: string
  loc: string
  tegi: string
  status: "ready" | "breakdown" | "standby"
}

/* Operator = karyawan aktif ber-kompetensi + status FTW hari ini */
export type FaOp = Employee & { ftw: "fit" | "kurang" | "belum" }

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

/* Kompetensi yang cocok utk Type EGI unit — SIMPER masih berlaku */
export function validKomp(op: FaOp, tegi: string): Komp | null {
  const today = todayIso()
  return (op.komp || []).find((k) => k.cls === tegi && (!k.exp || k.exp >= today)) || null
}

/* Kompetensi tampilan (tanpa cek expiry) */
export function displayKomp(op: FaOp, tegi: string): Komp | null {
  return (op.komp || []).find((k) => k.cls === tegi) || null
}

export function ftwBadgeOf(
  op: FaOp,
  t: Dict
): { variant: BadgeVariant; label: string } {
  if (op.ftw === "fit") return { variant: "success", label: "Fit" }
  if (op.ftw === "kurang") return { variant: "warning", label: t.ftwStatKurang }
  return { variant: "neutral", label: t.ftwStatBelum }
}
