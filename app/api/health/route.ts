import { NextResponse } from "next/server";

import { APP_VERSION } from "@/lib/version";

/* Titik periksa untuk HEALTHCHECK container — sengaja tidak menyentuh backend
   maupun basis data. Yang dijawab di sini hanya satu pertanyaan: "proses Next
   ini sudah siap melayani request?". Menggabungkan kesehatan backend ke sini
   akan membuat container frontend ditandai unhealthy (lalu di-restart) hanya
   karena backend sedang turun — padahal halamannya masih tersaji.

   Runtime Node.js dipatok karena berkas ini berada di grup /api yang sama
   dengan probe perangkat; edge runtime tidak punya akses yang dibutuhkan
   tetangganya, dan menyeragamkan runtime menghindari dua perilaku berbeda
   dalam satu segmen. */
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { ok: true, service: "universev2-frontend", version: APP_VERSION },
    { headers: { "Cache-Control": "no-store" } }
  );
}
