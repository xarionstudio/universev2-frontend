/* Master mesin fingerprint — SATU sumber untuk modul admin (Mesin Fingerprint)
   dan layar TV Monitoring Fingerprint di grup Display.

   Sebelumnya daftar mesin hanya ada sebagai `displayMachines` di
   display-screens.ts: layar TV memegang datanya sendiri, jadi tidak ada tempat
   mana pun untuk mendaftarkan alamat IP mesin. Daftar layar sekarang
   DITURUNKAN dari berkas ini (lihat fpDisplayMachines), sehingga mesin yang
   didaftarkan admin langsung tercermin di layar tanpa dua daftar yang bisa
   berbeda. */

/* Port TCP bawaan mesin absensi ZKTeco/Solution — dipakai tombol Ping untuk
   memastikan LAYANAN absensinya hidup, bukan sekadar host-nya menyala. */
export const FP_DEFAULT_PORT = 4370;

export type FpMachine = {
  /* kode mesin, tampil besar di layar TV (mis. "FP-01") */
  id: string;
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

/* Keterangan mesin yang baru didaftarkan. Bukan lewat i18n: layar TV berjalan
   id-only (ADR 0003), sama seperti displayRuntext di display-screens.ts. */
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

export const initialFpMachines: FpMachine[] = [
  {
    id: "FP-01",
    loc: "Kantor SDI",
    ip: "10.10.20.11",
    port: FP_DEFAULT_PORT,
    active: true,
    online: true,
    meta: "312 scan",
  },
  {
    id: "FP-02",
    loc: "Gate utara",
    ip: "10.10.20.12",
    port: FP_DEFAULT_PORT,
    active: true,
    online: true,
    meta: "284 scan",
  },
  {
    id: "FP-03",
    loc: "Gate selatan",
    ip: "10.10.20.13",
    port: FP_DEFAULT_PORT,
    active: true,
    online: true,
    meta: "201 scan",
  },
  {
    id: "FP-04",
    loc: "Workshop Plant",
    ip: "10.10.20.14",
    port: FP_DEFAULT_PORT,
    active: true,
    online: true,
    meta: "145 scan",
  },
  {
    id: "FP-05",
    loc: "Kantor HRGA",
    ip: "10.10.20.15",
    port: FP_DEFAULT_PORT,
    active: true,
    online: true,
    meta: "98 scan",
  },
  {
    id: "FP-06",
    loc: "Pit utara",
    ip: "10.10.20.16",
    port: FP_DEFAULT_PORT,
    active: true,
    online: true,
    meta: "64 scan",
  },
  {
    id: "FP-07",
    loc: "Gate selatan",
    ip: "10.10.20.17",
    port: FP_DEFAULT_PORT,
    active: true,
    online: false,
    meta: "terakhir aktif 04:52",
  },
  {
    id: "FP-08",
    loc: "Pit selatan",
    ip: "10.10.20.18",
    port: FP_DEFAULT_PORT,
    active: true,
    online: true,
    meta: "52 scan",
  },
  {
    id: "FP-09",
    loc: "Warehouse",
    ip: "10.10.20.19",
    port: FP_DEFAULT_PORT,
    active: true,
    online: true,
    meta: "31 scan",
  },
  {
    id: "FP-10",
    loc: "Kantin",
    ip: "10.10.20.20",
    port: FP_DEFAULT_PORT,
    active: true,
    online: true,
    meta: "14 scan",
  },
  {
    id: "FP-11",
    loc: "Mess 31",
    ip: "10.10.20.21",
    port: FP_DEFAULT_PORT,
    active: true,
    online: false,
    meta: "terakhir aktif kemarin 21:14",
  },
  {
    id: "FP-12",
    loc: "Klinik",
    ip: "10.10.20.22",
    port: FP_DEFAULT_PORT,
    active: true,
    online: true,
    meta: "7 scan",
  },
];

/* Kode mesin berikutnya (FP-13, FP-14, …) — kode lama yang dihapus tidak
   dipakai ulang supaya riwayat scan di mesin tidak tertukar identitas. */
export function nextFpId(list: FpMachine[]): string {
  const max = list.reduce((acc, m) => {
    const n = Number(m.id.replace(/^FP-/, ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `FP-${String(max + 1).padStart(2, "0")}`;
}
