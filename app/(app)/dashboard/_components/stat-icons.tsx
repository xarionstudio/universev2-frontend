/* Ikon kustom kartu KPI dashboard — satu metafora spesifik per metrik,
   menggantikan ikon lucide generik (XCircle/Clock/Truck/MessageSquareMore).

   Bahasa visualnya sengaja sama dengan lucide (viewBox 24, stroke 2, ujung
   bulat, currentColor) supaya duduk di badge StatCard tanpa penyesuaian:
   ukuran dari [&_svg]:size-5 milik kartu, warna dari iconStyle. */

import * as React from "react";

function Svg(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

/* Unfit Hari Ini — bulan sabit + Z: jam tidur di bawah ambang. */
export function UnfitSleepIcon() {
  return (
    <Svg>
      <path d="M11.5 4.5a6.5 6.5 0 0 0 8 8A8 8 0 1 1 11.5 4.5Z" />
      <polyline points="15.5 4 20 4 15.5 8.5 20 8.5" />
    </Svg>
  );
}

/* Belum Absen — bingkai pemindai + sidik jari: scan fingerprint yang belum
   terjadi. Sudut bingkai memakai idiom lucide ScanLine. */
export function BelumAbsenIcon() {
  return (
    <Svg>
      <path d="M4 8.5V6a2 2 0 0 1 2-2h2.5" />
      <path d="M15.5 4H18a2 2 0 0 1 2 2v2.5" />
      <path d="M20 15.5V18a2 2 0 0 1-2 2h-2.5" />
      <path d="M8.5 20H6a2 2 0 0 1-2-2v-2.5" />
      <path d="M8.5 13.5a3.5 3.5 0 0 1 7 0" />
      <path d="M12 13.5V16" />
    </Svg>
  );
}

/* Unit Breakdown — siluet dump truck utuh (bak menanjak menyatu dengan
   kabin, khas hauler tambang) + tanda seru. */
export function BreakdownTruckIcon() {
  return (
    <Svg>
      <path d="M2.5 14.5V7l9.5 2v2h3.5l2.5 3v.5" />
      <path d="M12 14.5h-9.5" />
      <path d="M18 14.5h-2" />
      <circle cx="6" cy="16.5" r="1.75" />
      <circle cx="14" cy="16.5" r="1.75" />
      <path d="M21 3v3.5" />
      <path d="M21 9.5h.01" />
    </Svg>
  );
}

/* Pending Approval — dokumen berlipat dengan jam: menunggu keputusan. */
export function ApprovalWaitIcon() {
  return (
    <Svg>
      <path d="M18 9V7.5L13.5 3H7a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h4" />
      <path d="M13.5 3v4H18" />
      <circle cx="16.75" cy="16.75" r="4.25" />
      <path d="M16.75 14.75v2l1.5 1" />
    </Svg>
  );
}
