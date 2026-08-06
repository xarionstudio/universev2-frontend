import { NextResponse } from "next/server";

import { isValidIPv4, isValidPort, probeDevice } from "@/lib/device-probe";

// VERIFIED on next@16.2.10 (this repo): route handlers already run on the
// Node.js runtime by default -- a handler with NO segment config reported
// process.versions.node = 22.14.0 and successfully used node:child_process in
// both `next dev` and `next start`. Declaring it is optional; it is kept only
// as executable documentation that this route CANNOT run on the edge runtime.
export const runtime = "nodejs";

// `export const dynamic = "force-dynamic"` is NOT needed and is deliberately
// omitted. VERIFIED: `next build` marks every route handler in this app as
// "f (Dynamic)", and a plain GET with no params returned a fresh Date.now()
// on 3 consecutive production requests. Route handlers have been uncached by
// default since Next 15. POST is never cacheable regardless.

const TOTAL_BUDGET_MS = 4000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body tidak valid." },
      { status: 400 }
    );
  }

  const { ip, port = 4370 } = (body ?? {}) as { ip?: unknown; port?: unknown };

  // ---- Validate BEFORE the value can reach execFile / net.connect ----
  if (!isValidIPv4(ip)) {
    return NextResponse.json(
      { ok: false, message: "Alamat IP tidak valid." },
      { status: 400 }
    );
  }
  const portNum = Number(port);
  if (!isValidPort(portNum)) {
    return NextResponse.json(
      { ok: false, message: "Port tidak valid." },
      { status: 400 }
    );
  }

  // ---- Hard outer bound so the UI can never hang ----
  const result = await Promise.race([
    probeDevice(ip, portNum, TOTAL_BUDGET_MS),
    new Promise<{ ok: false; ms: null; reason: string }>((resolve) =>
      setTimeout(
        () => resolve({ ok: false, ms: null, reason: "budget-exceeded" }),
        TOTAL_BUDGET_MS + 500
      )
    ),
  ]);

  return NextResponse.json(
    {
      ok: result.ok,
      ms: result.ms,
      reason: result.ok ? undefined : result.reason,
      message: result.ok
        ? "Berhasil Terhubung"
        : reasonToMessage(result.reason),
    },
    {
      status: 200, // probe *ran* successfully; `ok` carries the verdict
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function reasonToMessage(reason?: string) {
  switch (reason) {
    case "port-closed":
      return "Perangkat merespons, tetapi port tertutup.";
    case "host-up-port-unreachable":
      return "Perangkat merespons ping, tetapi port 4370 tidak dapat diakses.";
    case "timeout":
    case "no-reply":
      return "Tidak ada respons dari perangkat.";
    case "unreachable":
      return "Perangkat tidak dapat dijangkau.";
    case "EHOSTUNREACH":
    case "ENETUNREACH":
      return "Jaringan menuju perangkat tidak tersedia.";
    case "budget-exceeded":
      return "Waktu pemeriksaan habis.";
    default:
      return "Gagal terhubung ke perangkat.";
  }
}
