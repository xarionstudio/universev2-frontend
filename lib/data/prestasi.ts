/* Prestasi — mesin poin, peringkat, dan jejak audit operator.

   Inti MVP Universe adalah menekan idle time unit. Supaya boleh mengoperasikan
   unit, operator harus memenuhi dua syarat: absensinya tercatat DAN data
   tidurnya cukup.

   ATURAN POIN (mengikuti keputusan produk):
     1. Kode roster BUKAN D/N  → netral. Tidak dapat poin, tidak kena potongan;
        orangnya memang tidak dijadwalkan mengoperasikan unit.
     2. Kode roster D/N + layak + mengoperasikan unit → dapat poin.
     3. Kode roster D/N tapi TIDAK layak (tidak absen / tidur kurang) sehingga
        harus digantikan → kena potongan. Inilah kejadian yang membuat unit
        nyaris idle, jadi biayanya nyata.
     4. Operator pengganti yang berhasil mengoperasikan unit dengan memenuhi
        semua syarat → dapat poin operasi + bonus pengganti.

   Karena aturan 3 dan 4 memasangkan DUA orang pada hari yang sama, poin tidak
   bisa dihitung per orang secara terpisah. Setiap tanggal disimulasikan untuk
   seluruh operator sekaligus (`simulateDay`), baru hasilnya diakumulasi.

   CATATAN SUMBER DATA — penting dibaca sebelum memakai angkanya:
   Aplikasi belum menyimpan riwayat. `faAlloc` hanya berisi 2 tanggal, dan
   attendance/FTW hanya beberapa tanggal untuk sebagian nik. Karena itu hari
   yang PUNYA alokasi nyata memakai alokasi itu, sisanya diturunkan secara
   DETERMINISTIK dari (nik + tanggal) — tanpa Math.random, jadi hasil server =
   hasil klien (aman SSR) dan angkanya tidak berubah tiap render.
   Saat backend tersedia, ganti isi `rosterCodeOf` / `sleepOf` / `attendedOf`
   dengan query nyata; rumus poin, pemasangan pengganti, streak, lencana, dan
   peringkat di bawahnya tetap berlaku. */

import type { Employee } from "@/lib/data/employees";
import type { FaAlloc } from "@/lib/data/fleet-alloc";
import { ftwEvaluate, type FtwStatus } from "@/lib/data/ftw";
import { eqClassDefs, typeOfEgi, unitsDb } from "@/lib/data/units-db";

/* ---------- Rumus poin ---------- */

/* Basis: satu operasi yang memenuhi syarat */
export const PTS_BASE = 10;
/* Bonus hadir tepat waktu (bukan terlambat) */
export const PTS_ONTIME = 2;
/* Bonus tidur berkualitas (>= 7 jam) */
export const PTS_SLEEP = 3;
/* Bonus konsistensi: per hari beruntun setelah hari pertama, dibatasi */
export const PTS_STREAK_STEP = 2;
export const PTS_STREAK_CAP = 10;
/* Bonus menggantikan operator lain di hari yang seharusnya libur */
export const PTS_COVER = 5;
/* Potongan saat dijadwalkan D/N tapi harus digantikan.
   Sengaja lebih besar dari poin operasi: satu penggantian berarti unit sempat
   menganggur dan orang lain harus dipanggil, dan itu yang ingin ditekan. */
export const PTS_PENALTY = -15;

/* Ambang kelayakan TIDAK didefinisikan di sini — diambil dari modul Fit To
   Work (`ftwEvaluate`) supaya kedua modul selalu sepakat. Lihat lib/data/ftw.ts:
     >= 5j30 fit · 5j00–5j29 spare(+1j) · 4j00–4j59 spare(+2j) · <4j dipulangkan
   Operator "spare" tetap boleh bekerja setelah istirahat, jadi ia mendapat
   poin operasi dasar TANPA bonus tepat waktu / tidur berkualitas, dan tidak
   kena potongan. Yang "dipulangkan" tidak boleh bekerja sama sekali. */

/* Ambang "tidur berkualitas" untuk bonus */
export const SLEEP_MIN_GREAT = 420; // 7 jam

export type PrestasiPeriod = "week" | "month" | "all";

export const PERIOD_DAYS: Record<PrestasiPeriod, number> = {
  week: 7,
  month: 30,
  all: 90,
};

/* ---------- Acak deterministik ---------- */

/* FNV-1a — stabil lintas platform, tanpa dependensi */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* 0..1 dari kunci — pengganti Math.random yang tetap sama tiap render */
function frac(...parts: (string | number)[]): number {
  return (hash(parts.join("|")) % 10000) / 10000;
}

export function isoAdd(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- Roster, absensi, tidur ---------- */

/* Kode roster mengikuti kamus yang sudah dipakai modul Roster.
   Hanya D & N yang berarti "dijadwalkan mengoperasikan unit". */
export type RosterCode = "D" | "N" | "OFF" | "CR" | "R" | "STB";

export const OPERATING_CODES: RosterCode[] = ["D", "N"];

export function isOperatingCode(code: RosterCode): boolean {
  return code === "D" || code === "N";
}

/* Jam mulai shift — dipakai menentukan terlambat atau tidak */
const SHIFT_START: Record<"D" | "N", number> = { D: 6 * 60, N: 18 * 60 };

function rosterCodeOf(nik: string, iso: string): RosterCode {
  const r = frac(nik, iso, "roster");
  if (r < 0.45) return "D";
  if (r < 0.7) return "N";
  if (r < 0.88) return "OFF";
  if (r < 0.93) return "CR";
  if (r < 0.97) return "R";
  return "STB";
}

/* Menit tidur; 0 = tidak ada log sama sekali */
function sleepOf(nik: string, iso: string): number {
  const r = frac(nik, iso, "sleep");
  if (r < 0.07) return 0;
  if (r < 0.24) return 200 + Math.floor(frac(nik, iso, "sa") * 150); // kurang
  return 365 + Math.floor(frac(nik, iso, "sb") * 165); // cukup
}

/* Apakah yang bersangkutan benar-benar tap absen hari itu */
function attendedOf(nik: string, iso: string): boolean {
  return frac(nik, iso, "att") < 0.93;
}

function fmtClock(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* Jam tap: sebagian besar sebelum shift mulai, sebagian terlambat */
function clockInOf(nik: string, iso: string, code: "D" | "N"): number {
  const start = SHIFT_START[code];
  const r = frac(nik, iso, "in");
  // -30..+5 menit dari jam mulai; > 0 berarti terlambat
  return start + Math.round(r * 35) - 30;
}

/* ---------- Satu hari kerja seorang operator ---------- */

export type DayOutcome =
  /* roster bukan D/N — tidak dijadwalkan, netral */
  | "notScheduled"
  /* dijadwalkan, layak, mengoperasikan unit */
  | "qualified"
  /* dijadwalkan tapi tidak absen → digantikan */
  | "replacedAbsent"
  /* dijadwalkan tapi tidur kurang → digantikan */
  | "replacedSleep"
  /* dipanggil menggantikan operator lain */
  | "replacement";

/* Status absensi yang ditampilkan di riwayat.
   "off" = tidak dijadwalkan, jadi memang tidak ada kewajiban tap. */
export type AttMark = "hadir" | "terlambat" | "belum" | "off";

export type PrestasiDay = {
  iso: string;
  code: RosterCode;
  /* unit yang dioperasikan hari itu; null bila tidak mengoperasikan unit */
  unitCode: string | null;
  att: AttMark;
  /* "05:41" atau "" bila tidak tap */
  clockIn: string;
  late: boolean;
  /* menit tidur; 0 = tidak ada log */
  sleepMin: number;
  attOk: boolean;
  sleepOk: boolean;
  /* hasil aturan Fit To Work atas jam tidur hari itu */
  ftwStatus: FtwStatus;
  /* jam istirahat tambahan sebelum boleh bekerja (0/1/2) */
  restHours: number;
  outcome: DayOutcome;
  /* lawan main pada kejadian penggantian — untuk jejak audit */
  counterpartNik: string | null;
  counterpartName: string | null;
  /* bisa negatif */
  points: number;
};

/* Poin operasi + bonusnya */
function operationPoints(
  late: boolean,
  sleepMin: number,
  cover: boolean,
  spare: boolean
) {
  let p = PTS_BASE;
  /* Operator spare tetap mengoperasikan unit, tapi baru setelah istirahat
     tambahan — jadi poin dasarnya utuh sementara bonus tepat waktu & tidur
     berkualitas hangus. Tidak ada potongan: dia tidak membuat unit gagal
     dioperasikan. */
  if (!spare) {
    if (!late) p += PTS_ONTIME;
    if (sleepMin >= SLEEP_MIN_GREAT) p += PTS_SLEEP;
  }
  if (cover) p += PTS_COVER;
  return p;
}

/* Cari unit yang dialokasikan ke seorang nik pada tanggal tertentu */
function unitOfNikAt(alloc: FaAlloc, iso: string, nik: string): string | null {
  const day = alloc[iso];
  if (!day) return null;
  for (const shift of ["pagi", "malam"] as const) {
    const map = day[shift];
    if (!map) continue;
    for (const [code, who] of Object.entries(map)) {
      if (who === nik) return code;
    }
  }
  return null;
}

/* ---------- Penetapan unit ---------- */

/* Unit siap pakai dikelompokkan per Type EGI, memakai pemetaan yang sama
   dengan modul Fleet Allocation (`typeOfEgi`) supaya unit yang muncul di
   riwayat selalu unit yang memang boleh dioperasikan orang itu. */
const UNITS_BY_CLASS: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const u of unitsDb) {
    if (!u.active || u.breakdown) continue;
    const cls = typeOfEgi(u.egi);
    const list = m.get(cls);
    if (list) list.push(u.code);
    else m.set(cls, [u.code]);
  }
  // urutkan agar hasilnya tidak bergantung urutan sumber
  for (const list of m.values()) list.sort();
  return m;
})();

/* Kelas (Type EGI) tiap kode unit — dipakai memastikan pengganti benar-benar
   punya kompetensi untuk unit yang ditinggalkan. */
const CLASS_OF_UNIT: Map<string, string> = new Map(
  unitsDb.map((u) => [u.code, typeOfEgi(u.egi)])
);

/* ---------- Eq. class ----------

   Eq. class DIBACA APA ADANYA dari master unit (kolom `cls`), bukan diturunkan
   dari Type EGI: satu Type EGI bisa memuat unit dengan eq class berbeda, dan
   yang dipakai orang lapangan adalah kode kelas di master unit. Deskripsinya
   diambil dari `eqClassDefs` supaya kode dan artinya selalu sama dengan
   Master Data → Eq. Class, tanpa daftar kembar di modul ini. */
const EQCLASS_OF_UNIT: Map<string, string> = new Map(
  unitsDb.map((u) => [u.code, u.cls])
);

const EQCLASS_DESC: Map<string, string> = new Map(eqClassDefs);

export function eqClassOfUnit(unitCode: string | null): string | null {
  if (!unitCode) return null;
  return EQCLASS_OF_UNIT.get(unitCode) || null;
}

/* Deskripsi kelas. Kode yang belum terdaftar di master dikembalikan apa adanya
   supaya barisnya tetap muncul dan datanya yang pincang justru kelihatan. */
export function eqClassLabel(cls: string): string {
  return EQCLASS_DESC.get(cls) ?? cls;
}

/* Pilih unit untuk seorang operator pada satu tanggal — deterministik, dan
   melewati unit yang sudah dipakai orang lain di hari yang sama. */
function pickUnit(op: Op, iso: string, used: Set<string>): string | null {
  for (const cls of op.classes) {
    const list = UNITS_BY_CLASS.get(cls);
    if (!list || !list.length) continue;
    const start = hash(`${op.nik}|${iso}|unit`) % list.length;
    for (let i = 0; i < list.length; i++) {
      const code = list[(start + i) % list.length];
      if (!used.has(code)) return code;
    }
  }
  return null;
}

type Op = { nik: string; name: string; classes: string[] };

/* Simulasi satu tanggal untuk SELURUH operator sekaligus.
   Harus serentak karena penggantian memasangkan dua orang: yang digantikan
   kena potongan, yang menggantikan dapat poin. */
function simulateDay(
  iso: string,
  ops: Op[],
  alloc: FaAlloc
): Map<string, PrestasiDay> {
  const out = new Map<string, PrestasiDay>();

  type Row = {
    op: Op;
    code: RosterCode;
    sleepMin: number;
    sleepOk: boolean;
    ftwStatus: FtwStatus;
    restHours: number;
    attended: boolean;
    clockMin: number | null;
    late: boolean;
  };

  const rows: Row[] = ops.map((op) => {
    const code = rosterCodeOf(op.nik, iso);
    const sleepMin = sleepOf(op.nik, iso);
    /* Kelayakan tidur memakai aturan Fit To Work, bukan ambang sendiri */
    const ftw = ftwEvaluate(sleepMin);
    const sleepOk = ftw.canWork;
    const scheduled = isOperatingCode(code);
    const attended = scheduled ? attendedOf(op.nik, iso) : false;
    const clockMin =
      scheduled && attended ? clockInOf(op.nik, iso, code as "D" | "N") : null;
    const late = clockMin !== null && clockMin > SHIFT_START[code as "D" | "N"];
    return {
      op,
      code,
      sleepMin,
      sleepOk,
      ftwStatus: ftw.status,
      restHours: ftw.restHours,
      attended,
      clockMin,
      late,
    };
  });

  const scheduled = rows.filter((r) => isOperatingCode(r.code));
  /* Layak = absensi tercatat DAN tidur cukup. Keduanya wajib. */
  const fit = scheduled.filter((r) => r.attended && r.sleepOk);
  const unfit = scheduled.filter((r) => !(r.attended && r.sleepOk));

  /* Kandidat pengganti: tidak dijadwalkan hari itu, tapi tidurnya cukup —
     hanya orang yang benar-benar layak yang boleh dipanggil. Diurutkan
     deterministik agar pasangannya sama di tiap render. */
  const pool = rows
    .filter((r) => !isOperatingCode(r.code) && r.sleepOk)
    .sort((a, b) => frac(a.op.nik, iso, "pool") - frac(b.op.nik, iso, "pool"));

  /* Unit ditetapkan ke SEMUA yang dijadwalkan — termasuk yang nanti tidak
     layak — karena roster memang sudah memberi mereka unit. Unit itulah yang
     kemudian dialihkan ke pengganti, sehingga di riwayat kedua orang terlihat
     memegang kode unit yang sama dan serah terimanya bisa ditelusuri.
     Alokasi nyata (bila tanggalnya ada) selalu menang. */
  const usedUnits = new Set<string>();
  const unitOf = new Map<string, string | null>();
  for (const r of [...fit, ...unfit].sort((a, b) =>
    a.op.nik.localeCompare(b.op.nik)
  )) {
    const real = unitOfNikAt(alloc, iso, r.op.nik);
    const code = real ?? pickUnit(r.op, iso, usedUnits);
    if (code) usedUnits.add(code);
    unitOf.set(r.op.nik, code);
  }

  /* 2. Dijadwalkan & layak → dapat poin operasi */
  for (const r of fit) {
    out.set(r.op.nik, {
      iso,
      code: r.code,
      unitCode: unitOf.get(r.op.nik) ?? null,
      att: r.late ? "terlambat" : "hadir",
      clockIn: r.clockMin !== null ? fmtClock(r.clockMin) : "",
      late: r.late,
      sleepMin: r.sleepMin,
      attOk: true,
      sleepOk: true,
      ftwStatus: r.ftwStatus,
      restHours: r.restHours,
      outcome: "qualified",
      counterpartNik: null,
      counterpartName: null,
      points: operationPoints(
        r.late,
        r.sleepMin,
        false,
        r.ftwStatus === "spare"
      ),
    });
  }

  /* 3 & 4. Dijadwalkan tapi tidak layak → potongan, dan carikan pengganti */
  const usedCover = new Set<string>();
  for (const r of unfit) {
    const unit = unitOf.get(r.op.nik) ?? null;
    /* Pengganti WAJIB punya kompetensi untuk kelas unit yang ditinggalkan —
       aturan yang sama dipakai modul Fleet Allocation. Tanpa ini, operator
       dump truck bisa "menggantikan" di water truck, yang tidak boleh terjadi.
       Kalau tidak ada yang memenuhi, unit memang menganggur hari itu. */
    const need = unit ? (CLASS_OF_UNIT.get(unit) ?? null) : null;
    const cover = pool.find(
      (c) => !usedCover.has(c.op.nik) && (!need || c.op.classes.includes(need))
    );
    if (cover) usedCover.add(cover.op.nik);

    out.set(r.op.nik, {
      iso,
      code: r.code,
      unitCode: unit,
      att: !r.attended ? "belum" : r.late ? "terlambat" : "hadir",
      clockIn: r.clockMin !== null ? fmtClock(r.clockMin) : "",
      late: r.late,
      sleepMin: r.sleepMin,
      attOk: r.attended,
      sleepOk: r.sleepOk,
      ftwStatus: r.ftwStatus,
      restHours: r.restHours,
      // absensi diperiksa lebih dulu: kalau tidak tap, itu sebabnya.
      // Sisanya pasti "dipulangkan" (<4 jam) — spare tidak pernah sampai sini
      // karena ftwEvaluate menyatakan dia masih boleh bekerja.
      outcome: !r.attended ? "replacedAbsent" : "replacedSleep",
      counterpartNik: cover?.op.nik ?? null,
      counterpartName: cover?.op.name ?? null,
      points: PTS_PENALTY,
    });

    if (cover) {
      /* Pengganti dipanggil: dianggap tap saat masuk, dan mengambil alih
         unit yang sama persis dengan yang digantikan. */
      const clockMin = clockInOf(cover.op.nik, iso, r.code as "D" | "N");
      const late = clockMin > SHIFT_START[r.code as "D" | "N"];
      out.set(cover.op.nik, {
        iso,
        code: cover.code,
        unitCode: unit,
        att: late ? "terlambat" : "hadir",
        clockIn: fmtClock(clockMin),
        late,
        sleepMin: cover.sleepMin,
        attOk: true,
        sleepOk: true,
        ftwStatus: cover.ftwStatus,
        restHours: cover.restHours,
        outcome: "replacement",
        counterpartNik: r.op.nik,
        counterpartName: r.op.name,
        points: operationPoints(
          late,
          cover.sleepMin,
          true,
          cover.ftwStatus === "spare"
        ),
      });
    }
  }

  /* 1. Sisanya: tidak dijadwalkan dan tidak dipanggil → netral */
  for (const r of rows) {
    if (out.has(r.op.nik)) continue;
    out.set(r.op.nik, {
      iso,
      code: r.code,
      unitCode: null,
      att: "off",
      clockIn: "",
      late: false,
      sleepMin: r.sleepMin,
      attOk: false,
      sleepOk: r.sleepOk,
      ftwStatus: r.ftwStatus,
      restHours: r.restHours,
      outcome: "notScheduled",
      counterpartNik: null,
      counterpartName: null,
      points: 0,
    });
  }

  return out;
}

/* ---------- Lencana & entri peringkat ---------- */

export type PrestasiBadgeKey =
  "streak7" | "streak14" | "perfectSleep" | "neverLate" | "noPenalty";

export type PrestasiEntry = {
  rank: number;
  nik: string;
  name: string;
  dept: string;
  pos: string;
  foto?: string;
  points: number;
  /* operasi yang memenuhi syarat (termasuk saat jadi pengganti) */
  qualifiedDays: number;
  /* hari dijadwalkan D/N */
  scheduledDays: number;
  /* berapa kali digantikan (kena potongan) */
  penaltyDays: number;
  /* berapa kali menggantikan orang lain */
  coverDays: number;
  bestStreak: number;
  currentStreak: number;
  /* 0..1, dihitung hanya dari hari yang dijadwalkan */
  attRate: number;
  sleepRate: number;
  avgSleepMin: number;
  badges: PrestasiBadgeKey[];
  days: PrestasiDay[];
};

/* ---------- Papan peringkat ---------- */

export function buildLeaderboard({
  operators,
  alloc,
  period,
  today = todayIso(),
}: {
  /* karyawan aktif ber-kompetensi — sama dengan definisi "operator" di
     fleet-alloc.ts, supaya daftarnya konsisten dengan modul alokasi */
  operators: Employee[];
  alloc: FaAlloc;
  period: PrestasiPeriod;
  today?: string;
}): PrestasiEntry[] {
  const span = PERIOD_DAYS[period];
  /* Kelas kompetensi dibawa serta agar unit yang ditetapkan selalu unit yang
     boleh dioperasikan orang itu — bukan unit sembarangan. */
  const ops: Op[] = operators.map((e) => ({
    nik: e.nik,
    name: e.name,
    classes: (e.komp ?? []).map((k) => k.cls),
  }));

  /* Simulasi per tanggal, lalu dikelompokkan per operator */
  const byNik = new Map<string, PrestasiDay[]>();
  for (const op of ops) byNik.set(op.nik, []);
  for (let i = span - 1; i >= 0; i--) {
    const iso = isoAdd(today, -i);
    const day = simulateDay(iso, ops, alloc);
    for (const op of ops) {
      const d = day.get(op.nik);
      if (d) byNik.get(op.nik)!.push(d);
    }
  }

  const rows = operators.map((op) => {
    const days = byNik.get(op.nik) ?? [];

    let points = 0;
    let qualifiedDays = 0;
    let scheduledDays = 0;
    let penaltyDays = 0;
    let coverDays = 0;
    let bestStreak = 0;
    let run = 0;
    let attHit = 0;
    let lateHit = 0;
    let sleepHit = 0;
    let sleepTotal = 0;
    let sleepLogged = 0;

    for (const d of days) {
      points += d.points;

      if (d.sleepMin > 0) {
        sleepTotal += d.sleepMin;
        sleepLogged++;
      }

      if (isOperatingCode(d.code)) {
        scheduledDays++;
        if (d.attOk) attHit++;
        if (d.sleepOk) sleepHit++;
        if (d.late) lateHit++;
      }

      if (d.outcome === "qualified" || d.outcome === "replacement") {
        qualifiedDays++;
        if (d.outcome === "replacement") coverDays++;
        run++;
        if (run > bestStreak) bestStreak = run;
      } else if (
        d.outcome === "replacedAbsent" ||
        d.outcome === "replacedSleep"
      ) {
        penaltyDays++;
        run = 0;
      }
      /* notScheduled tidak memutus konsistensi — hari libur itu hak operator */
    }

    /* Bonus konsistensi dari rentetan terbaik, bukan per hari, agar jadwal
       libur tidak menghukum */
    if (bestStreak > 1) {
      points += Math.min((bestStreak - 1) * PTS_STREAK_STEP, PTS_STREAK_CAP);
    }

    const badges: PrestasiBadgeKey[] = [];
    if (bestStreak >= 14) badges.push("streak14");
    else if (bestStreak >= 7) badges.push("streak7");
    if (scheduledDays > 0 && sleepHit === scheduledDays)
      badges.push("perfectSleep");
    if (scheduledDays > 0 && lateHit === 0) badges.push("neverLate");
    if (scheduledDays > 0 && penaltyDays === 0) badges.push("noPenalty");

    return {
      rank: 0,
      nik: op.nik,
      name: op.name,
      dept: op.dept,
      pos: op.pos,
      foto: op.foto,
      points,
      qualifiedDays,
      scheduledDays,
      penaltyDays,
      coverDays,
      bestStreak,
      currentStreak: run,
      attRate: scheduledDays ? attHit / scheduledDays : 0,
      sleepRate: scheduledDays ? sleepHit / scheduledDays : 0,
      avgSleepMin: sleepLogged ? Math.round(sleepTotal / sleepLogged) : 0,
      badges,
      days,
    } satisfies PrestasiEntry;
  });

  /* Peringkat: poin ↓, lalu operasi memenuhi syarat ↓, lalu nama A→Z supaya
     urutannya stabil saat poin seri */
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.qualifiedDays - a.qualifiedDays ||
      a.name.localeCompare(b.name)
  );
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

/* ---------- Papan peringkat per Eq. Class ---------- */

export type PrestasiClassRow = {
  /* peringkat DI DALAM kelas ini, bukan peringkat keseluruhan */
  rank: number;
  nik: string;
  name: string;
  dept: string;
  pos: string;
  foto?: string;
  /* poin dari hari-hari di kelas ini saja — lihat catatan buildClassBoards */
  points: number;
  qualifiedDays: number;
  penaltyDays: number;
  coverDays: number;
  /* kode unit kelas ini yang pernah dipegang, urut A→Z */
  units: string[];
};

export type PrestasiClassBoard = {
  /* kode eq. class, mis. "HD" */
  cls: string;
  /* deskripsi kode, mis. "Heavy Dump Truck (60–100 t)" */
  desc: string;
  points: number;
  qualifiedDays: number;
  penaltyDays: number;
  rows: PrestasiClassRow[];
};

/* Membagi klasemen menjadi beberapa papan — satu per Eq. Class — dari hari-hari
   yang SUDAH dihitung `buildLeaderboard`. Tidak ada simulasi ulang, jadi
   angkanya mustahil berbeda dengan klasemen lengkap.

   Kelas sebuah hari diambil dari unit yang dipegang hari itu:
     · Hari tanpa unit (roster bukan D/N, atau tidak ada unit yang bisa
       ditetapkan) tidak masuk papan mana pun — tidak ada kelas alat yang bisa
       dipertanggungjawabkan.
     · Hari "digantikan" tetap masuk kelas unit yang DITINGGALKAN: potongan itu
       memang milik kelas tersebut, karena di situlah unit nyaris menganggur.
     · Satu operator bisa muncul di beberapa papan bila dalam periode itu ia
       memegang unit dari kelas berbeda — memang begitu keadaannya di lapangan.

   Poin papan kelas = jumlah poin harian kelas itu SAJA. Bonus konsistensi
   (`PTS_STREAK_STEP`) tidak dibagi ke kelas mana pun karena rentetannya lintas
   unit, sehingga jumlah poin seluruh papan bisa lebih kecil dari poin klasemen
   lengkap. Ini disengaja: memecah bonus itu berarti mengarang angka. */
export function buildClassBoards(board: PrestasiEntry[]): PrestasiClassBoard[] {
  /* cls → nik → baris */
  const byCls = new Map<string, Map<string, PrestasiClassRow>>();

  for (const e of board) {
    for (const d of e.days) {
      const cls = eqClassOfUnit(d.unitCode);
      if (!cls) continue;

      let rowMap = byCls.get(cls);
      if (!rowMap) {
        rowMap = new Map();
        byCls.set(cls, rowMap);
      }

      let row = rowMap.get(e.nik);
      if (!row) {
        row = {
          rank: 0,
          nik: e.nik,
          name: e.name,
          dept: e.dept,
          pos: e.pos,
          foto: e.foto,
          points: 0,
          qualifiedDays: 0,
          penaltyDays: 0,
          coverDays: 0,
          units: [],
        };
        rowMap.set(e.nik, row);
      }

      row.points += d.points;
      if (d.outcome === "qualified" || d.outcome === "replacement") {
        row.qualifiedDays++;
        if (d.outcome === "replacement") row.coverDays++;
      } else if (
        d.outcome === "replacedAbsent" ||
        d.outcome === "replacedSleep"
      ) {
        row.penaltyDays++;
      }
      if (d.unitCode && !row.units.includes(d.unitCode)) {
        row.units.push(d.unitCode);
      }
    }
  }

  const boards: PrestasiClassBoard[] = [];
  for (const [cls, rowMap] of byCls) {
    const rows = [...rowMap.values()];
    /* Tie-break disamakan dengan klasemen lengkap supaya kedua papan tidak
       terasa memakai aturan berbeda */
    rows.sort(
      (a, b) =>
        b.points - a.points ||
        b.qualifiedDays - a.qualifiedDays ||
        a.name.localeCompare(b.name)
    );
    rows.forEach((r, i) => {
      r.rank = i + 1;
      r.units.sort();
    });
    boards.push({
      cls,
      desc: eqClassLabel(cls),
      points: rows.reduce((s, r) => s + r.points, 0),
      qualifiedDays: rows.reduce((s, r) => s + r.qualifiedDays, 0),
      penaltyDays: rows.reduce((s, r) => s + r.penaltyDays, 0),
      rows,
    });
  }

  /* Urut kode A→Z — sama dengan Master Data → Eq. Class, jadi posisi sebuah
     kelas tidak berpindah-pindah saat poinnya berubah. */
  boards.sort((a, b) => a.cls.localeCompare(b.cls));
  return boards;
}

/* "7 j 20 m" / "7 h 20 m" — mengikuti gaya ftw.ts */
export function fmtSleep(min: number, en: boolean): string {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return en ? `${h} h ${m} m` : `${h} j ${m} m`;
}
