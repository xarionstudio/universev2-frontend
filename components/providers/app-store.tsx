"use client";

import * as React from "react";

import {
  employees as empDesign,
  withKomp,
  type Employee,
} from "@/lib/data/employees";
import { type FpMachine } from "@/lib/data/fingerprint";
import { initialFleets, type Fleet } from "@/lib/data/fleet";
import { isoAddDays, seedFaAlloc, type FaAlloc } from "@/lib/data/fleet-alloc";
import { mdInit, type MdCat, type MdEntry } from "@/lib/data/master-data";
import { initialNotifs, type Notif } from "@/lib/data/notifications";
import { operatorSeed } from "@/lib/data/operators";
import { apInitialRows, type ApRow } from "@/lib/data/roster";
import {
  initialAudios,
  initialDspAtt,
  initialDspFleet,
  initialDspMonitor,
  type Audio,
  type Display,
} from "@/lib/data/settings-data";
import { initialUnits, type Unit } from "@/lib/data/unit-status";
import { unitsDb as udbBase, type UnitDb } from "@/lib/data/units-db";
import { type UmRole, type UmUser } from "@/lib/data/users";

/* Master karyawan MOCK = persona desain + operator lapangan dari file
   setting operator. Digabung di sini, BUKAN di employees.ts, karena
   operators.ts sudah mengimpor tipe dari employees.ts; menggabungnya di sana
   akan membuat impor melingkar.

   Sejak ADR 0014 gabungan ini TIDAK lagi menjadi sumber halaman Karyawan
   maupun dropdown tautan di menu User — keduanya membaca `emps` hasil hidrasi
   backend. empAll() dipertahankan hanya untuk modul yang MASIH mock dan
   bergantung pada NIK seed lama (alokasi fleet, display fleet, prestasi,
   fit-to-work, revisi roster, weather); mutasinya dihapus karena tidak ada
   lagi halaman yang menulis ke sana. */
const empBase: Employee[] = withKomp([...empDesign, ...operatorSeed]);

export { type FaAlloc } from "@/lib/data/fleet-alloc";

export type MenuVis = {
  display: boolean;
  roster: boolean;
  fingerprint: boolean;
  employees: boolean;
  ftw: boolean;
  asset: boolean;
  prestasi: boolean;
  master: boolean;
  users: boolean;
};

type AppStore = {
  /* akun yang sedang login (profil) */
  userName: string;
  setUserName: (v: string) => void;
  userEmail: string;
  setUserEmail: (v: string) => void;
  /* notifikasi in-app */
  notifs: Notif[];
  setNotifs: React.Dispatch<React.SetStateAction<Notif[]>>;
  /* karyawan seed lama — hanya untuk modul yang MASIH mock (lihat catatan
     empBase di atas); halaman Karyawan tidak membacanya lagi */
  empAll: () => Employee[];
  /* master karyawan dari backend — BUKAN seed: kosong sampai halaman
     Karyawan/Users menghidrasinya dari GET /api/employees (ADR 0014).
     Identitas barisnya NIK, mengikuti route backend. */
  emps: Employee[];
  setEmps: React.Dispatch<React.SetStateAction<Employee[]>>;
  /* sisipkan/ganti satu baris hasil respons API — dipakai form tambah/edit */
  upsertEmp: (e: Employee) => void;
  removeEmp: (nik: string) => void;
  /* antrean approval revisi */
  apRows: ApRow[];
  setApRows: React.Dispatch<React.SetStateAction<ApRow[]>>;
  /* status unit */
  units: Unit[];
  setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
  /* database unit */
  udbAdded: UnitDb[];
  udbOverrides: Record<string, Partial<UnitDb>>;
  udbAll: () => UnitDb[];
  saveUdb: (
    uid: string | null,
    data: Partial<UnitDb> & { code: string }
  ) => void;
  /* master data dinamis */
  mdData: Record<MdCat, MdEntry[]>;
  setMdData: React.Dispatch<React.SetStateAction<Record<MdCat, MdEntry[]>>>;
  /* alokasi fleet + formasi */
  faAlloc: FaAlloc;
  setFaAlloc: React.Dispatch<React.SetStateAction<FaAlloc>>;
  fleets: Fleet[];
  setFleets: React.Dispatch<React.SetStateAction<Fleet[]>>;
  /* settings */
  appName: string;
  setAppName: (v: string) => void;
  appDesc: string;
  setAppDesc: (v: string) => void;
  audios: Audio[];
  setAudios: React.Dispatch<React.SetStateAction<Audio[]>>;
  menuVis: MenuVis;
  setMenuVis: React.Dispatch<React.SetStateAction<MenuVis>>;
  /* display kiosk (admin) */
  dspAtt: Display[];
  setDspAtt: React.Dispatch<React.SetStateAction<Display[]>>;
  dspFleet: Display[];
  setDspFleet: React.Dispatch<React.SetStateAction<Display[]>>;
  dspMonitor: Display[];
  setDspMonitor: React.Dispatch<React.SetStateAction<Display[]>>;
  /* mesin fingerprint — BUKAN lagi seed: kosong sampai halaman admin
     menghidrasinya dari GET /api/fingerprint/devices. Layar TV Monitoring
     Fingerprint tidak membaca state ini lagi — ia mengambil proyeksinya
     sendiri dari GET /api/display/fingerprint (ADR 0011). */
  fpMachines: FpMachine[];
  setFpMachines: React.Dispatch<React.SetStateAction<FpMachine[]>>;
  fpAll: () => FpMachine[];
  /* sisipkan/ganti satu baris hasil respons API — identitasnya dbId backend */
  upsertFpMachine: (m: FpMachine) => void;
  deleteFpMachine: (dbId: number) => void;
  recordFpPing: (dbId: number, lastPing: FpMachine["lastPing"]) => void;
  /* user management (akun login + role RBAC) — BUKAN lagi seed: kosong
     sampai halaman Users/Roles menghidrasinya dari GET /api/users dan
     GET /api/roles (ADR 0013). Sesi login TIDAK membaca state ini — ia
     membawa user + permission-nya sendiri lewat SessionProvider. */
  umUsers: UmUser[];
  setUmUsers: React.Dispatch<React.SetStateAction<UmUser[]>>;
  umRoles: UmRole[];
  setUmRoles: React.Dispatch<React.SetStateAction<UmRole[]>>;
};

const AppStoreContext = React.createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = React.useState("First Angel Paustine");
  const [userEmail, setUserEmail] = React.useState("angel@unggul.co.id");
  const [notifs, setNotifs] = React.useState<Notif[]>(initialNotifs);
  /* kosong sampai dihidrasi dari backend — lihat catatan di tipe AppStore */
  const [emps, setEmps] = React.useState<Employee[]>([]);
  const [apRows, setApRows] = React.useState<ApRow[]>(apInitialRows);
  const [units, setUnits] = React.useState<Unit[]>(initialUnits);
  const [udbAdded, setUdbAdded] = React.useState<UnitDb[]>([]);
  const [udbOverrides, setUdbOverrides] = React.useState<
    Record<string, Partial<UnitDb>>
  >({});
  const [mdData, setMdData] = React.useState<Record<MdCat, MdEntry[]>>(mdInit);
  /* alokasi diseed untuk kemarin & hari ini — demo "salin dari kemarin" + TV;
     fleet yang punya display TV diisi duluan */
  const [faAlloc, setFaAlloc] = React.useState<FaAlloc>(() => {
    const today = new Date().toISOString().slice(0, 10);
    /* Fleet yang tayang di monitor ikut masuk daftar prioritas seed.
       CATATAN: prioritas hanya menentukan URUTAN pengisian, bukan jumlahnya.
       Master karyawan mock hanya berisi ~11 operator aktif berkompetensi,
       sementara fleet yang tayang (3 display fleet + 12 giliran monitor)
       butuh ratusan slot — jadi fleet di urutan belakang memang tampil
       "Belum ada operator". Itu status yang sah (lihat halaman Unit
       No-Operator), bukan kegagalan render; layar akan terisi sendiri begitu
       master karyawan diisi data sebenarnya. */
    return seedFaAlloc(
      [isoAddDays(today, -1), today],
      [
        ...initialDspFleet.flatMap((d) => (d.fleetId ? [d.fleetId] : [])),
        ...initialDspMonitor.flatMap((d) => d.fleetIds ?? []),
      ]
    );
  });
  const [fleets, setFleets] = React.useState<Fleet[]>(initialFleets);
  const [appName, setAppName] = React.useState("UNIVERSE");
  const [appDesc, setAppDesc] = React.useState(
    "Unggul Network for Integrated Vehicle Resource Smart Ecosystem"
  );
  const [audios, setAudios] = React.useState<Audio[]>(initialAudios);
  const [menuVis, setMenuVis] = React.useState<MenuVis>({
    display: true,
    roster: true,
    fingerprint: true,
    employees: true,
    ftw: true,
    asset: true,
    prestasi: true,
    master: true,
    users: true,
  });
  const [dspAtt, setDspAtt] = React.useState<Display[]>(initialDspAtt);
  const [dspFleet, setDspFleet] = React.useState<Display[]>(initialDspFleet);
  const [dspMonitor, setDspMonitor] =
    React.useState<Display[]>(initialDspMonitor);
  /* kosong sampai dihidrasi dari backend — lihat catatan di tipe AppStore */
  const [fpMachines, setFpMachines] = React.useState<FpMachine[]>([]);
  /* kosong sampai dihidrasi dari backend — lihat catatan di tipe AppStore */
  const [umUsers, setUmUsers] = React.useState<UmUser[]>([]);
  const [umRoles, setUmRoles] = React.useState<UmRole[]>([]);

  /* Seed statis untuk modul yang masih mock — tanpa override/mutasi lagi.
     Tetap berbentuk fungsi supaya kesepuluh pemanggil lamanya tidak berubah. */
  const empAll = React.useCallback(() => empBase, []);

  /* Baris `emps` berasal dari respons API (list/create/get) — kebenarannya
     milik backend, state ini hanya salinan hasil hidrasi + respons CRUD
     terakhir, pola yang sama dengan fpMachines. */
  const upsertEmp = React.useCallback((e: Employee) => {
    setEmps((prev) =>
      prev.some((x) => x.nik === e.nik)
        ? prev.map((x) => (x.nik === e.nik ? e : x))
        : [...prev, e]
    );
  }, []);

  const removeEmp = React.useCallback((nik: string) => {
    setEmps((prev) => prev.filter((e) => e.nik !== nik));
  }, []);

  const udbAll = React.useCallback(() => {
    return udbBase
      .map((u) => ({ ...u, ...(udbOverrides[u.uid] || {}) }))
      .concat(udbAdded);
  }, [udbOverrides, udbAdded]);

  const saveUdb = React.useCallback(
    (uid: string | null, data: Partial<UnitDb> & { code: string }) => {
      if (uid) {
        if (udbBase.some((u) => u.uid === uid)) {
          setUdbOverrides((prev) => ({
            ...prev,
            [uid]: { ...prev[uid], ...data },
          }));
        } else {
          setUdbAdded((prev) =>
            prev.map((u) => (u.uid === uid ? { ...u, ...data } : u))
          );
        }
      } else {
        setUdbAdded((prev) => [
          ...prev,
          {
            uid: `new-${prev.length}`,
            cat: "DUMP_TRUCK_100T",
            cls: "HD",
            egi: "",
            product: "CATERPILLAR",
            active: true,
            standby: false,
            breakdown: false,
            loc: "Workshop",
            upd: new Date().toISOString().slice(0, 10),
            by: "admin",
            ...data,
          } as UnitDb,
        ]);
      }
    },
    []
  );

  /* Daftar mesin fingerprint dalam urutan tetap. Tidak ada pemisahan
     base/override seperti karyawan & unit: kebenarannya milik backend, state
     ini hanya salinan hasil hidrasi + respons CRUD terakhir. */
  const fpAll = React.useCallback(
    () => [...fpMachines].sort((a, b) => a.id.localeCompare(b.id)),
    [fpMachines]
  );

  /* Baris berasal dari respons API (create/update), jadi tidak ada lagi
     nilai bawaan yang dikarang di sini. `lastPing` satu-satunya field yang
     hidup di klien — dipertahankan saat barisnya diganti hasil server. */
  const upsertFpMachine = React.useCallback((m: FpMachine) => {
    setFpMachines((prev) =>
      prev.some((x) => x.dbId === m.dbId)
        ? prev.map((x) =>
            x.dbId === m.dbId ? { ...m, lastPing: x.lastPing } : x
          )
        : [...prev, m]
    );
  }, []);

  const deleteFpMachine = React.useCallback((dbId: number) => {
    setFpMachines((prev) => prev.filter((m) => m.dbId !== dbId));
  }, []);

  /* Hasil uji koneksi TIDAK menyentuh `online`: itu heartbeat mesin ke
     aplikasi, sedangkan ini jangkauan server ke mesin. Lihat catatan di
     lib/data/fingerprint.ts. */
  const recordFpPing = React.useCallback(
    (dbId: number, lastPing: FpMachine["lastPing"]) => {
      setFpMachines((prev) =>
        prev.map((m) => (m.dbId === dbId ? { ...m, lastPing } : m))
      );
    },
    []
  );

  const value: AppStore = {
    userName,
    setUserName,
    userEmail,
    setUserEmail,
    notifs,
    setNotifs,
    empAll,
    emps,
    setEmps,
    upsertEmp,
    removeEmp,
    apRows,
    setApRows,
    units,
    setUnits,
    udbAdded,
    udbOverrides,
    udbAll,
    saveUdb,
    mdData,
    setMdData,
    faAlloc,
    setFaAlloc,
    fleets,
    setFleets,
    appName,
    setAppName,
    appDesc,
    setAppDesc,
    audios,
    setAudios,
    menuVis,
    setMenuVis,
    dspAtt,
    setDspAtt,
    dspFleet,
    setDspFleet,
    dspMonitor,
    setDspMonitor,
    fpMachines,
    setFpMachines,
    fpAll,
    upsertFpMachine,
    deleteFpMachine,
    recordFpPing,
    umUsers,
    setUmUsers,
    umRoles,
    setUmRoles,
  };

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = React.useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
