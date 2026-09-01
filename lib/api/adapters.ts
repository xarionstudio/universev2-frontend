/* Jembatan bentuk data backend -> bentuk yang sudah dipakai UI.

   Halaman-halaman lama (topbar, profil, users, roles, weather) sudah terlanjur
   bicara dalam tipe UmUser/UmRole/PermMap dari masa mock. Ketimbang mengubah
   semuanya sekaligus, konversinya dikumpulkan di satu berkas ini. Karena
   backend memang dirancang meniru tipe mock-nya, sebagian besar konversi
   hanya soal `id` numerik -> string.

   Saat modul-modulnya dipindah satu per satu ke API, berkas ini yang menipis,
   bukan yang membengkak. */

import type { Employee, Komp } from "@/lib/data/employees";
import { FP_META_NEW, type FpMachine } from "@/lib/data/fingerprint";
import { type Fleet } from "@/lib/data/fleet";
import type { MdCat, MdEntry } from "@/lib/data/master-data";
import {
  statusRank,
  type Unit,
  type UnitHist,
  type UnitStatus,
} from "@/lib/data/unit-status";
import type { UnitDb } from "@/lib/data/units-db";
import {
  umModules,
  type UmModule,
  type UmPerm,
  type UmRole,
  type UmUser,
} from "@/lib/data/users";
import { EMPTY_PERMS, type PermMap } from "@/lib/rbac";

import type { ApiCompetency, ApiEmployee } from "./endpoints/employees";
import type {
  ApiFleetSetting,
  ApiUnit,
  ApiUnitDb,
  ApiUnitHist,
} from "./endpoints/fleet";
import type { ApiMasterEntry } from "./endpoints/master";
import type { ApiFingerprintDevice } from "./endpoints/misc";
import type { ApiPermMap, ApiRole, ApiUser, PermLevel } from "./types";

/* ── Fleet Setting ───────────────────────────────────────────────────── */

/* id UI memakai konvensi seed "fl-<digger>" (bukan "fl-<dbId>") supaya
   konfigurasi display mock yang merujuk "fl-EX5002" dkk tetap menemukan
   fleet hasil hidrasi; dbId numerik yang dipakai PUT/DELETE. `units` bisa
   null dari Go (slice nil). */
export function toFleet(f: ApiFleetSetting): Fleet {
  return {
    id: "fl-" + f.digger,
    dbId: f.id,
    digger: f.digger,
    loc: f.loc,
    bus: f.bus,
    units: f.units ?? [],
    active: f.active,
  };
}

/* ── Status Unit ─────────────────────────────────────────────────────── */

const VALID_UNIT_STATUS: readonly UnitStatus[] = [
  "ready",
  "breakdown",
  "standby",
];

function asUnitStatus(v: string): UnitStatus {
  return (VALID_UNIT_STATUS as readonly string[]).includes(v)
    ? (v as UnitStatus)
    : "ready";
}

/* Backend UnitHist adalah [4]string; slot ke-4 di FE adalah union UnitStatus
   yang meng-index statusDotColor — jaga dari nilai liar. */
export function toUnitHist(h: ApiUnitHist): UnitHist {
  return [h[0], h[1], h[2], asUnitStatus(h[3])];
}

export function toUnit(u: ApiUnit): Unit {
  return {
    code: u.code,
    type: u.type,
    status: asUnitStatus(u.status),
    loc: u.loc,
    upd: u.upd,
    /* Go men-serialisasi slice nil sebagai null — bukan [] */
    hist: (u.hist ?? []).map(toUnitHist),
  };
}

/* Backend mengurutkan unit_code ASC saja; papan mengandalkan presort
   breakdown → standby → ready yang dulu dibuat seed mock. */
export function toUnits(list: ApiUnit[] | null | undefined): Unit[] {
  return (list ?? [])
    .map(toUnit)
    .sort(
      (a, b) =>
        statusRank[a.status] - statusRank[b.status] ||
        a.code.localeCompare(b.code)
    );
}

/* ── Master Data ─────────────────────────────────────────────────────── */

/* Baris master backend berbeda bentuk per kategori (internal/model/master.go);
   UI memakai MdEntry generik ber-kolom posisional a/b. `id` UI = CODE entri —
   itulah identitas path PUT/DELETE (segmen ":id" backend berisi code). */
export function toMdEntry(cat: MdCat, e: ApiMasterEntry): MdEntry {
  const s = (k: string) => (typeof e[k] === "string" ? (e[k] as string) : "");
  let a = "";
  let b = "";
  switch (cat) {
    case "egi":
      /* klasifikasi per Eq. Class (kode induk, migrasi 000031) */
      a = s("eqClass");
      break;
    case "eqclass":
      a = s("description");
      break;
    case "area":
      a = s("category");
      break;
    case "tempudo":
      a = s("location");
      b = s("pickupType");
      break;
    case "bus":
      a = s("egiType");
      b = s("departureTime");
      break;
    case "lokasiex":
      a = s("busCode");
      b = s("tempudoCode");
      break;
    case "mess":
      a = s("block");
      break;
    case "runtext":
      a = s("targetDisplay");
      b = s("textColor");
      break;
  }
  return { id: e.code, name: e.name, a, b, active: e.active };
}

/* Kebalikan toMdEntry untuk badan POST/PUT — kolom posisional a/b kembali ke
   nama field kategorinya. `code` sengaja tidak dikirim: identitas dijaga
   path (PUT) atau dibangkitkan server (POST). */
export function mdEntryBody(
  cat: MdCat,
  d: { name: string; a: string; b: string; active: boolean }
): Record<string, unknown> {
  const body: Record<string, unknown> = { name: d.name, active: d.active };
  switch (cat) {
    case "egi":
      body.eqClass = d.a;
      break;
    case "eqclass":
      body.description = d.a;
      break;
    case "area":
      body.category = d.a;
      break;
    case "tempudo":
      body.location = d.a;
      body.pickupType = d.b;
      break;
    case "bus":
      body.egiType = d.a;
      body.departureTime = d.b;
      break;
    case "lokasiex":
      body.busCode = d.a;
      body.tempudoCode = d.b;
      break;
    case "mess":
      body.block = d.a;
      break;
    case "runtext":
      body.targetDisplay = d.a;
      body.textColor = d.b;
      break;
  }
  return body;
}

/* ── Database Unit ───────────────────────────────────────────────────── */

/* ApiUnitDb -> UnitDb UI; `uid` sintetis dari id numerik tabel. */
export function toUdb(u: ApiUnitDb): UnitDb {
  return {
    uid: "u-" + u.id,
    code: u.code,
    cat: u.cat,
    cls: u.cls,
    egi: u.egi,
    product: u.product,
    active: u.active,
    standby: u.standby,
    breakdown: u.breakdown,
    loc: u.loc,
    upd: u.upd,
    by: u.by,
  };
}

/* ── Permission ──────────────────────────────────────────────────────── */

const VALID_PERMS: readonly UmPerm[] = ["none", "view", "manage"];

function asPerm(v: PermLevel | string | undefined): UmPerm {
  return VALID_PERMS.includes(v as UmPerm) ? (v as UmPerm) : "none";
}

/* Modul frontend yang tidak punya barisnya sendiri di tabel role_permissions
   backend, dipetakan ke modul yang BENAR-BENAR ditegakkan router untuk
   route-route itu.

   `fingerprint` adalah satu-satunya kasusnya saat ini: seluruh route
   /api/fingerprint/* dijaga rbac.RequirePermission("settings", ...) — lihat
   internal/router/router.go — sementara migrasi seed hanya mengisi sepuluh
   modul lain. Tanpa pemetaan ini, Superadmin sekalipun akan melihat halaman
   "tidak punya akses" di /fingerprint padahal API-nya mengizinkan.

   Kalau nanti backend menambahkan baris `fingerprint` sungguhan, nilai
   aslinya menang dan entri ini otomatis tidak terpakai. */
const MODULE_FALLBACK: Partial<Record<UmModule, UmModule>> = {
  fingerprint: "settings",
};

/* Peta permission backend -> PermMap lengkap yang dipakai lib/rbac.ts.
   Modul yang tidak disebut backend menjadi "none", bukan dibiarkan undefined,
   supaya can() tidak pernah menerima nilai kosong. */
export function toPermMap(perms: ApiPermMap | null | undefined): PermMap {
  if (!perms) return EMPTY_PERMS;

  return umModules.reduce((acc, m) => {
    const direct = perms[m];
    if (direct !== undefined) {
      acc[m] = asPerm(direct);
      return acc;
    }
    const via = MODULE_FALLBACK[m];
    acc[m] = via ? asPerm(perms[via]) : "none";
    return acc;
  }, {} as PermMap);
}

/* Kebalikan toPermMap — PermMap frontend menjadi peta yang DITULIS ke
   backend (POST/PUT /api/roles). Modul yang punya fallback (`fingerprint`)
   sengaja DIBUANG, bukan ikut dikirim: ia tidak punya baris sendiri di
   role_permissions, dan seluruh route /api/fingerprint ditegakkan lewat
   `settings`. Menyimpannya justru membuat nilai langsungnya menang saat
   dibaca ulang, sehingga UI menampilkan akses yang tidak pernah ditegakkan
   backend. */
export function toApiPermMap(
  perms: Record<UmModule, UmPerm> | Partial<Record<UmModule, UmPerm>>
): ApiPermMap {
  const out: ApiPermMap = {};
  for (const m of umModules) {
    if (MODULE_FALLBACK[m]) continue;
    out[m] = asPerm(perms[m]);
  }
  return out;
}

/* ── User ────────────────────────────────────────────────────────────── */

/* ApiUser -> UmUser.

   Digest password (password_hash/password_salt) bertag json:"-" di backend,
   jadi tidak pernah sampai ke klien — yang ikut hanya stempel `pwAt`.
   Verifikasi & penggantian password sepenuhnya milik server. */
export function toUmUser(u: ApiUser | null | undefined): UmUser | null {
  if (!u) return null;
  return {
    id: String(u.id),
    email: u.email,
    kar: u.kar || null,
    /* backend menyimpan NIK sebagai pointer non-nil, jadi akun tanpa
       tautan karyawan kembali dengan "" — perlakukan sama dengan null */
    nik: u.nik || null,
    roles: u.roles ?? [],
    on: u.on,
    pwAt: u.pwAt ?? undefined,
  };
}

export function toUmUsers(users: ApiUser[] | null | undefined): UmUser[] {
  return (users ?? []).flatMap((u) => {
    const m = toUmUser(u);
    return m ? [m] : [];
  });
}

/* ── Role ────────────────────────────────────────────────────────────── */

export function toUmRole(r: ApiRole): UmRole {
  return {
    id: String(r.id),
    name: r.name,
    desc: r.desc ?? "",
    locked: r.locked,
    /* Perms role dipetakan lewat jalur yang sama dengan perms user, sehingga
       matriks di halaman Roles menampilkan `fingerprint` konsisten dengan
       yang benar-benar ditegakkan backend. */
    perms: toPermMap(r.perms),
  };
}

export function toUmRoles(roles: ApiRole[] | null | undefined): UmRole[] {
  return (roles ?? []).map(toUmRole);
}

/* ── Karyawan ────────────────────────────────────────────────────────── */

/* Kolom DATE backend pulang sebagai RFC3339 penuh ("2026-12-01T00:00:00Z")
   atau "" saat NULL (lihat catatan di endpoints/employees.ts) — dipotong ke
   "YYYY-MM-DD" karena seluruh UI lama menampilkan dan membandingkan bentuk
   itu (input type=date, kompVariant, validasi exp > join). */
function isoDateOnly(v: string | null | undefined): string {
  return v ? v.slice(0, 10) : "";
}

const EMP_STATUSES: readonly Employee["status"][] = [
  "aktif",
  "cuti",
  "nonaktif",
];

/* Kolom status ber-CHECK constraint di DB, jadi nilai lain semestinya tidak
   pernah datang — fallback "aktif" hanya pagar supaya union tipe UI tidak
   pernah menerima string liar. */
function asEmpStatus(v: string): Employee["status"] {
  return (EMP_STATUSES as readonly string[]).includes(v)
    ? (v as Employee["status"])
    : "aktif";
}

export function toKomp(k: ApiCompetency): Komp {
  return {
    cls: k.cls,
    eq: k.eq ?? "",
    simper: k.simper,
    exp: isoDateOnly(k.exp),
  };
}

/* ApiEmployee -> Employee. `komp` selalu array (backend memakai omitempty,
   jadi karyawan tanpa kompetensi datang tanpa field-nya sama sekali) supaya
   baris hasil hidrasi tidak pernah jatuh ke kompMap mock lewat withKomp().
   `foto` dibiarkan path relatif backend — bungkus dengan assetUrl() saat
   dirender, sama seperti logo & slide auth. */
export function toEmployee(e: ApiEmployee): Employee {
  return {
    name: e.name,
    nik: e.nik,
    dept: e.dept,
    pos: e.pos,
    simper: e.simper,
    simperExp: isoDateOnly(e.simperExp),
    status: asEmpStatus(e.status),
    company: e.company,
    equip: e.equip,
    join: isoDateOnly(e.join),
    exp: isoDateOnly(e.exp),
    license: e.license,
    mcu: e.mcu,
    medis: e.medis,
    medMonitor: e.medMonitor ?? "",
    blood: e.blood,
    bpjs: e.bpjs,
    mess: e.mess,
    kamar: e.kamar,
    hp: e.hp,
    emg: e.emg,
    foto: e.foto || undefined,
    komp: (e.komp ?? []).map(toKomp),
  };
}

export function toEmployees(
  list: ApiEmployee[] | null | undefined
): Employee[] {
  return (list ?? []).map(toEmployee);
}

/* ── Mesin fingerprint ───────────────────────────────────────────────── */

/* Stempel sinkron terakhir -> keterangan pendek. id-only, bukan i18n:
   bentuknya meniru meta yang dirakit backend untuk layar TV
   (display_service.go), dan kiosk memang berjalan id-only (ADR 0003). */
function fpMeta(lastSync: string | null): string {
  if (!lastSync) return FP_META_NEW;
  const d = new Date(lastSync);
  if (Number.isNaN(d.getTime())) return FP_META_NEW;
  const two = (n: number) => (n < 10 ? "0" : "") + n;
  return `terakhir sinkron ${two(d.getDate())}/${two(d.getMonth() + 1)} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/* ApiFingerprintDevice -> FpMachine. `id` UI tetap KODE mesin (yang tampil
   di tabel & layar TV); id numerik tabel backend disimpan di `dbId` — itulah
   yang dipakai PUT/DELETE. `lastPing` sengaja tidak diisi: hasil uji koneksi
   hanya hidup di state klien (lihat lib/data/fingerprint.ts). */
export function toFpMachine(d: ApiFingerprintDevice): FpMachine {
  return {
    id: d.code,
    dbId: d.id,
    loc: d.location,
    ip: d.ipAddress,
    port: d.port,
    active: d.isActive,
    online: d.isOnline,
    meta: fpMeta(d.lastSync),
  };
}
