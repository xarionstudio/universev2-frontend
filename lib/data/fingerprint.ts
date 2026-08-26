/* Tipe & utilitas mesin fingerprint — dipakai modul admin (Mesin Fingerprint)
   dan layar TV Monitoring Fingerprint di grup Display.

   Daftar mesinnya sendiri kini tinggal di backend (tabel
   fingerprint_devices): modul admin menghidrasinya dari
   GET /api/fingerprint/devices, layar TV membaca proyeksinya dari
   GET /api/display/fingerprint. Seed mock `initialFpMachines` yang dulu ada
   di sini sudah dihapus bersama penyambungan itu (ADR 0011) — berkas ini
   tersisa sebagai rumah tipe FpMachine + validasi yang dipakai bersama. */

/* Port bawaan layanan SOAP mesin Solution X100C (HTTP /iWsService) — nilai
   awal form 80, sama dengan default skema/seed backend. Sejak ADR 0015 worker
   backend mendukung DUA protokol penarikan dan memilihnya dari port yang
   terdaftar: 4370 = protokol biner ZKTeco (mesin existing), selain itu = SOAP
   (solutionx100c membentuk http://ip:port/iWsService). Penarikan mana pun
   tidak menghapus memori mesin. Tombol Ping menguji port ini untuk memastikan
   LAYANAN absensinya hidup, bukan sekadar host menyala. */
export const FP_DEFAULT_PORT = 80;

export type FpMachine = {
  /* kode mesin, tampil besar di layar TV (mis. "FP-01") */
  id: string;
  /* id numerik baris backend (fingerprint_devices.id) — identitas yang
     dipakai PUT/DELETE. `id` di atas tetap kode yang tampil di UI dan boleh
     diganti admin; nomor inilah yang tidak pernah berubah. */
  dbId: number;
  loc: string;
  ip: string;
  port: number;
  /* terdaftar & dipakai; nonaktif tidak ikut tayang di layar TV */
  active: boolean;
  /* status koneksi terakhir yang diketahui — diperbarui tombol Ping */
  online: boolean;
  /* keterangan di layar TV: jumlah scan bila online, jejak terakhir bila tidak */
  meta: string;
  /* hasil uji koneksi terakhir dari modul admin; undefined = belum pernah.

     Sengaja TIDAK menimpa `online`: `online` adalah heartbeat yang dikirim
     mesin ke aplikasi, sedangkan ini jangkauan server ke mesin saat tombol
     ditekan. Kalau keduanya disatukan, satu kali ping dari jaringan yang
     memang tidak tembus akan mengosongkan layar TV. */
  lastPing?: { at: string; ok: boolean; ms: number | null };
};

/* IPv4 ketat: empat oktet 0–255, tanpa nol di depan (013 ditolak).
   Bukan sekadar rapi-rapian — nilai ini diteruskan ke `ping` sebagai argumen
   proses di route handler, jadi ia harus tervalidasi sebelum dipakai. */
const IPV4 =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export function isIpv4(value: string): boolean {
  return IPV4.test(value.trim());
}

export function isPort(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 65535;
}

/* Keterangan mesin yang belum pernah sinkron. Bukan lewat i18n: layar TV
   berjalan id-only (ADR 0003), sama seperti displayRuntext di
   display-screens.ts; nilainya juga sama persis dengan yang dirakit backend
   di GetDisplayFingerprint (display_service.go). */
export const FP_META_NEW = "belum ada data scan";

/* "312 scan" -> 312. Satu parser dipakai bersama oleh urutan kartu di layar
   dan kartu ringkasan "Scan Hari Ini", supaya keduanya tidak bisa berbeda. */
export function fpScanCount(meta: string): number {
  const hit = /^\s*(\d+)/.exec(meta);
  return hit ? Number(hit[1]) : 0;
}

/* Hasil satu percobaan koneksi — dipakai bersama oleh route handler
   (app/api/fingerprint/ping) dan pop-up hasil di modul admin. */
export type FpPingResult = {
  /* mesin terjangkau lewat salah satu cara (TCP atau ICMP) */
  ok: boolean;
  /* port mesin menjawab — layanan absensi benar-benar hidup */
  service: boolean;
  method: "tcp" | "icmp" | "none";
  /* waktu tempuh milidetik; null bila tidak terukur */
  ms: number | null;
  /* kode sebab kegagalan/keberhasilan — dipetakan ke teks i18n di klien */
  code:
    | "tcp-open"
    | "icmp-only"
    | "unreachable"
    | "timeout"
    | "refused"
    | "invalid-ip"
    | "invalid-port"
    | "error";
};

/* Kode mesin berikutnya (FP-13, FP-14, …) — kode lama yang dihapus tidak
   dipakai ulang supaya riwayat scan di mesin tidak tertukar identitas. */
export function nextFpId(list: FpMachine[]): string {
  const max = list.reduce((acc, m) => {
    const n = Number(m.id.replace(/^FP-/, ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `FP-${String(max + 1).padStart(2, "0")}`;
}
