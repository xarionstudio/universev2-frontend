import { execFile } from "node:child_process";
import net from "node:net";

/* ------------------------------------------------------------------ *
 * Validation — MUST run before an IP ever reaches execFile/net.
 * Strict dotted-quad. Rejects leading zeros (01.2.3.4), out-of-range
 * octets, whitespace, newlines, and every shell metacharacter.
 * ------------------------------------------------------------------ */
export const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export function isValidIPv4(ip: unknown): ip is string {
  return typeof ip === "string" && ip.length <= 15 && IPV4_RE.test(ip);
}

export function isValidPort(p: unknown): p is number {
  return Number.isInteger(p) && (p as number) >= 1 && (p as number) <= 65535;
}

export type ProbeResult = {
  ok: boolean;
  ms: number | null;
  method: "tcp" | "icmp";
  reason?: string;
};

/* ------------------------------------------------------------------ *
 * 1. TCP connect probe — PRIMARY check for a fingerprint device.
 *    Always destroys the socket exactly once; no leaked handles.
 * ------------------------------------------------------------------ */
export function tcpProbe(
  ip: string,
  port: number,
  timeoutMs = 2000
): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const socket = new net.Socket();
    let settled = false;

    const elapsed = () => Number(process.hrtime.bigint() - started) / 1e6;

    const finish = (ok: boolean, reason?: string) => {
      if (settled) return;
      settled = true;
      const ms = Math.round(elapsed());
      socket.removeAllListeners();
      socket.destroy(); // idempotent, safe on any state
      resolve({ ok, ms, method: "tcp", reason });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false, "timeout"));
    socket.once("error", (err: NodeJS.ErrnoException) =>
      finish(false, err.code ?? "error")
    );

    socket.connect({ host: ip, port });
  });
}

/* ------------------------------------------------------------------ *
 * 2. ICMP probe — fallback. Shells out to the system `ping`.
 * ------------------------------------------------------------------ */

/**
 * A genuine ICMP echo-reply ALWAYS carries a TTL token:
 *   Windows en-US : "Reply from 10.0.0.5: bytes=32 time=3ms TTL=64"
 *   Windows id-ID : "Balasan dari 10.0.0.5: bita=32 waktu=3md TTL=64"
 *   Linux / macOS : "64 bytes from 10.0.0.5: icmp_seq=1 ttl=64 time=0.4 ms"
 *
 * An ICMP *destination-unreachable* reply carries NO TTL token:
 *   "Reply from 192.168.1.42: Destination host unreachable."
 * ...and Windows exits 0 for it and even reports "0% loss", so neither the
 * exit code nor the loss percentage can be trusted. TTL is the only
 * locale-independent, exit-code-independent success signal.
 */
const TTL_RE = /\bttl\s*[=:]\s*(\d+)/i;

/** en "time=3ms" / "time<1ms" · id "waktu=3md" / "waktu<1md" · nix "time=0.412 ms" */
const LATENCY_RE =
  /(?:time|waktu|tempo)\s*[=<]\s*(\d+(?:[.,]\d+)?)\s*(?:ms|md)?/i;

export function parsePingOutput(stdout: string): ProbeResult {
  const out = stdout || "";
  const ttl = out.match(TTL_RE);
  if (!ttl) {
    return {
      ok: false,
      ms: null,
      method: "icmp",
      reason: /unreachable|tidak dapat dijangkau|tidak dapat dicapai/i.test(out)
        ? "unreachable"
        : "no-reply",
    };
  }
  const lat = out.match(LATENCY_RE);
  const ms = lat
    ? Math.round(Number(lat[1].replace(",", ".")) * 10) / 10
    : null;
  return { ok: true, ms, method: "icmp" };
}

export function icmpProbe(ip: string, timeoutMs = 1500): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    // argv array — never a shell string. No interpolation, no quoting bugs.
    const args = isWin
      ? ["-n", "1", "-w", String(timeoutMs), "-4", ip]
      : ["-c", "1", "-W", String(Math.max(1, Math.ceil(timeoutMs / 1000))), ip];

    execFile(
      "ping",
      args,
      {
        timeout: timeoutMs + 1000, // hard kill if ping.exe wedges
        windowsHide: true,
        maxBuffer: 1024 * 64,
        encoding: "utf8",
        shell: false, // explicit: no shell, ever
      },
      (err, stdout) => {
        // NOTE: `err` is deliberately ignored for the ok/fail decision.
        // Windows exits 0 on "Destination host unreachable".
        if (!stdout && err) {
          resolve({
            ok: false,
            ms: null,
            method: "icmp",
            reason: "spawn-failed",
          });
          return;
        }
        resolve(parsePingOutput(stdout));
      }
    );
  });
}

/* ------------------------------------------------------------------ *
 * 3. Combined strategy: TCP first (proves the *service* is up), fall
 *    back to ICMP only to distinguish "device off" from "port blocked".
 * ------------------------------------------------------------------ */
export async function probeDevice(
  ip: string,
  port = 4370,
  budgetMs = 4000
): Promise<ProbeResult & { host: string; port: number }> {
  const tcpBudget = Math.min(2500, Math.floor(budgetMs * 0.6));
  const tcp = await tcpProbe(ip, port, tcpBudget);
  if (tcp.ok) return { ...tcp, host: ip, port };

  // ECONNREFUSED already proves the host is alive — the port is just closed.
  if (tcp.reason === "ECONNREFUSED") {
    return { ...tcp, reason: "port-closed", host: ip, port };
  }

  const icmp = await icmpProbe(ip, Math.max(1000, budgetMs - tcpBudget - 200));
  if (icmp.ok) {
    return {
      ...icmp,
      ok: false,
      reason: "host-up-port-unreachable",
      host: ip,
      port,
    };
  }
  return { ...icmp, reason: icmp.reason ?? "unreachable", host: ip, port };
}
