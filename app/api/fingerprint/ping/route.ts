import { execFile } from "node:child_process";
import { Socket } from "node:net";
import { NextResponse } from "next/server";

import {
  FP_DEFAULT_PORT,
  isIpv4,
  isPort,
  type FpPingResult,
} from "@/lib/data/fingerprint";

/* Uji koneksi mesin fingerprint. Berjalan di SERVER karena browser tidak bisa
   membuka soket TCP mentah maupun mengirim paket ICMP — konsekuensinya hasil
   di sini menggambarkan jangkauan server aplikasi ke jaringan site, bukan
   jangkauan laptop yang membuka halaman (dijelaskan ke admin lewat catatan
   fpNoteB di halamannya).

   Dua lapis, karena "mesin menyala" dan "layanan absensinya hidup" adalah dua
   pertanyaan berbeda:
     1. TCP connect ke port mesin (4370 untuk ZKTeco/Solution) — inilah yang
        benar-benar berarti "berhasil terhubung".
     2. Bila gagal, ICMP ping — membedakan "mesin mati / IP salah" dari
        "mesin hidup tapi layanannya belum jalan". */

/* Opsional di Next 16 (route handler sudah default runtime Node — diverifikasi
   di next@16.2.10), ditulis sebagai dokumentasi: berkas ini memanggil node:net
   & node:child_process, jadi memindahkannya ke edge harus gagal keras, bukan
   diam-diam. */
export const runtime = "nodejs";
/* `dynamic = "force-dynamic"` sengaja TIDAK dipasang: route handler tidak
   dicache sejak Next 15 dan POST tidak pernah cacheable. */

const TCP_TIMEOUT_MS = 2000;
const ICMP_TIMEOUT_MS = 2000;

type TcpCode = "tcp-open" | "timeout" | "refused" | "unreachable";

function tcpProbe(
  ip: string,
  port: number
): Promise<{
  ok: boolean;
  ms: number;
  code: TcpCode;
}> {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = new Socket();
    let settled = false;

    /* satu jalan keluar untuk semua cabang: soket SELALU dihancurkan, kalau
       tidak percobaan yang gagal meninggalkan handle menggantung sampai OS
       menyerah sendiri — dan admin bisa menekan Ping berkali-kali beruntun */
    const finish = (ok: boolean, code: TcpCode) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ok, code, ms: Date.now() - started });
    };

    socket.setTimeout(TCP_TIMEOUT_MS);
    socket.once("connect", () => finish(true, "tcp-open"));
    socket.once("timeout", () => finish(false, "timeout"));
    socket.once("error", (err: NodeJS.ErrnoException) =>
      finish(false, err.code === "ECONNREFUSED" ? "refused" : "unreachable")
    );
    socket.connect(port, ip);
  });
}

/* Argumen ping berbeda di tiap OS — dan macOS memakai -W dalam MILIdetik
   sementara Linux memakainya dalam detik, jadi ketiganya dipisah. */
function icmpArgs(ip: string): string[] {
  /* -4 memaksa IPv4 supaya bentuk keluarannya tidak berubah di host yang
     punya jalur IPv6 */
  if (process.platform === "win32")
    return ["-4", "-n", "1", "-w", String(ICMP_TIMEOUT_MS), ip];
  if (process.platform === "darwin") return ["-c", "1", "-t", "2", ip];
  return ["-c", "1", "-W", "2", ip];
}

/* "TTL=128" (Windows, termasuk Windows berbahasa Indonesia) dan "ttl=64"
   (Linux/macOS): token yang sama di semua lokal. Kalimat balasannya sendiri
   diterjemahkan ("Reply from" / "Balasan dari"), jadi mencocokkan kalimat akan
   membuat hasil ping bergantung pada bahasa Windows server. */
const TTL_RE = /\bttl[=\s]*\d+/i;
const RTT_RE = /(?:time|waktu)\s*[=<]\s*([\d.,]+)/i;

function icmpProbe(ip: string): Promise<{ ok: boolean; ms: number | null }> {
  return new Promise((resolve) => {
    const started = Date.now();
    execFile(
      "ping",
      /* argv array, BUKAN string perintah: alamat IP datang dari input admin,
         dan tanpa shell tidak ada yang bisa ditumpangkan ke dalamnya
         (isIpv4 di pemanggil sudah menyaring, ini lapis keduanya) */
      icmpArgs(ip),
      {
        timeout: ICMP_TIMEOUT_MS + 1500,
        windowsHide: true,
        maxBuffer: 1024 * 64,
        encoding: "utf8",
        /* eksplisit: tidak pernah lewat shell, jadi tidak ada metakarakter
           yang bisa ditumpangkan sekalipun validasi IP jebol */
        shell: false,
      },
      (err, stdout) => {
        const out = stdout ?? "";
        /* Kode keluar SENGAJA tidak dipakai untuk memutuskan berhasil/gagal.
           Windows memulangkan kode 0 — lengkap dengan "Received = 1" dan
           "0% loss" — untuk balasan "Destination host unreachable"; ketiga
           sinyal itu berbohong. Hanya TTL yang jujur, dan ia satu-satunya
           token yang tidak diterjemahkan. Kode keluar hanya dipakai untuk
           membedakan "ping tidak bisa dijalankan" (mis. ENOENT di image
           Docker slim) dari "ping jalan tapi tidak ada balasan". */
        if ((err && !out) || !TTL_RE.test(out))
          return resolve({ ok: false, ms: null });
        const hit = RTT_RE.exec(out);
        const parsed = hit ? Number(hit[1].replace(",", ".")) : NaN;
        resolve({
          ok: true,
          ms: Number.isFinite(parsed) ? parsed : Date.now() - started,
        });
      }
    );
  });
}

/* Batas keras seluruh permintaan. Lapisan per-probe (socket timeout, -w,
   timeout execFile) bisa gagal sendiri-sendiri; ini jaminan terakhir supaya
   tombol di UI tidak pernah menggantung. */
const TOTAL_BUDGET_MS = 6000;

const BUDGET_EXCEEDED: FpPingResult = {
  ok: false,
  service: false,
  method: "none",
  ms: null,
  code: "timeout",
};

function reply(result: FpPingResult, status = 200) {
  return NextResponse.json(result, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const body = (payload ?? {}) as { ip?: unknown; port?: unknown };
  const ip = typeof body.ip === "string" ? body.ip.trim() : "";
  const port =
    body.port === undefined || body.port === null
      ? FP_DEFAULT_PORT
      : Number(body.port);

  if (!isIpv4(ip))
    return reply(
      {
        ok: false,
        service: false,
        method: "none",
        ms: null,
        code: "invalid-ip",
      },
      400
    );
  if (!isPort(port))
    return reply(
      {
        ok: false,
        service: false,
        method: "none",
        ms: null,
        code: "invalid-port",
      },
      400
    );

  async function probe(): Promise<FpPingResult> {
    const tcp = await tcpProbe(ip, port);
    if (tcp.ok)
      return {
        ok: true,
        service: true,
        method: "tcp",
        ms: tcp.ms,
        code: "tcp-open",
      };

    /* Ditolak = ada yang menjawab dengan RST, jadi host-nya HIDUP — hanya
       layanan di port itu yang tidak mendengarkan. Tidak perlu ICMP lagi. */
    if (tcp.code === "refused")
      return {
        ok: true,
        service: false,
        method: "tcp",
        ms: tcp.ms,
        code: "refused",
      };

    const icmp = await icmpProbe(ip);
    if (icmp.ok)
      return {
        ok: true,
        service: false,
        method: "icmp",
        ms: icmp.ms,
        code: "icmp-only",
      };

    return {
      ok: false,
      service: false,
      method: "none",
      ms: null,
      code: tcp.code === "timeout" ? "timeout" : "unreachable",
    };
  }

  try {
    return reply(
      await Promise.race([
        probe(),
        new Promise<FpPingResult>((resolve) =>
          setTimeout(() => resolve(BUDGET_EXCEEDED), TOTAL_BUDGET_MS)
        ),
      ])
    );
  } catch {
    return reply({
      ok: false,
      service: false,
      method: "none",
      ms: null,
      code: "error",
    });
  }
}
