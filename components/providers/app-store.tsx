"use client";

import * as React from "react";

import {
  employees as empDesign,
  withKomp,
  type Employee,
} from "@/lib/data/employees";
import {
  FP_DEFAULT_PORT,
  FP_META_NEW,
  initialFpMachines,
  type FpMachine,
} from "@/lib/data/fingerprint";
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
import {
  initialUmRoles,
  initialUmUsers,
  type UmRole,
  type UmUser,
} from "@/lib/data/users";

/* Master karyawan = persona desain (bertangan, berdata lengkap: medis, mess,
   kontak — dipakai halaman detail & form) + operator lapangan dari file
   setting operator. Digabung di sini, BUKAN di employees.ts, karena
   operators.ts sudah mengimpor tipe dari employees.ts; menggabungnya di sana
   akan membuat impor melingkar. */
const empBase: Employee[] = [...empDesign, ...operatorSeed];

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
  /* karyawan — master + mutasi lokal */
  empOverrides: Record<string, Partial<Employee>>;
  empAdded: Employee[];
  empDeleted: Record<string, boolean>;
  empAll: () => Employee[];
  saveEmployee: (
    nik: string | null,
    data: Partial<Employee> & { nik: string }
  ) => void;
  deleteEmployee: (nik: string) => void;
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
  /* mesin fingerprint — dipakai modul admin DAN layar Monitoring Fingerprint,
     jadi keduanya tidak pernah menampilkan daftar mesin yang berbeda */
  fpMachines: FpMachine[];
  setFpMachines: React.Dispatch<React.SetStateAction<FpMachine[]>>;
  fpAll: () => FpMachine[];
  saveFpMachine: (
    id: string | null,
    data: Partial<FpMachine> & { id: string }
  ) => void;
  deleteFpMachine: (id: string) => void;
  recordFpPing: (id: string, lastPing: FpMachine["lastPing"]) => void;
  /* user management (akun login + role RBAC) */
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
  const [empOverrides, setEmpOverrides] = React.useState<
    Record<string, Partial<Employee>>
  >({});
  const [empAdded, setEmpAdded] = React.useState<Employee[]>([]);
  const [empDeleted, setEmpDeleted] = React.useState<Record<string, boolean>>(
    {}
  );
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
  const [fpMachines, setFpMachines] =
    React.useState<FpMachine[]>(initialFpMachines);
  const [umUsers, setUmUsers] = React.useState<UmUser[]>(initialUmUsers);
  const [umRoles, setUmRoles] = React.useState<UmRole[]>(initialUmRoles);

  const empAll = React.useCallback(() => {
    const base = empBase.map((r) => ({ ...r, ...(empOverrides[r.nik] || {}) }));
    return withKomp(base.concat(empAdded).filter((r) => !empDeleted[r.nik]));
  }, [empOverrides, empAdded, empDeleted]);

  const saveEmployee = React.useCallback(
    (nik: string | null, data: Partial<Employee> & { nik: string }) => {
      if (nik && empBase.some((r) => r.nik === nik)) {
        setEmpOverrides((prev) => ({
          ...prev,
          [nik]: { ...prev[nik], ...data },
        }));
      } else if (nik) {
        setEmpAdded((prev) =>
          prev.map((r) => (r.nik === nik ? { ...r, ...data } : r))
        );
      } else {
        setEmpAdded((prev) => [...prev, data as Employee]);
      }
    },
    []
  );

  const deleteEmployee = React.useCallback((nik: string) => {
    setEmpDeleted((prev) => ({ ...prev, [nik]: true }));
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
     base/override seperti karyawan & unit: seed-nya tidak dibaca modul lain,
     jadi seluruh daftar memang tinggal di state. */
  const fpAll = React.useCallback(
    () => [...fpMachines].sort((a, b) => a.id.localeCompare(b.id)),
    [fpMachines]
  );

  /* id === null -> tambah; id !== null -> ubah baris itu (kode mesin boleh
     ikut berganti, karena identitas baris adalah `id` LAMA yang dikirim). */
  const saveFpMachine = React.useCallback(
    (id: string | null, data: Partial<FpMachine> & { id: string }) => {
      if (id) {
        setFpMachines((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...data } : m))
        );
      } else {
        setFpMachines((prev) => [
          ...prev,
          {
            loc: "",
            ip: "",
            port: FP_DEFAULT_PORT,
            active: true,
            /* mesin baru dianggap offline sampai heartbeat pertama —
               menandainya online tanpa bukti akan membohongi layar TV */
            online: false,
            meta: FP_META_NEW,
            ...data,
          },
        ]);
      }
    },
    []
  );

  const deleteFpMachine = React.useCallback((id: string) => {
    setFpMachines((prev) => prev.filter((m) => m.id !== id));
  }, []);

  /* Hasil uji koneksi TIDAK menyentuh `online`: itu heartbeat mesin ke
     aplikasi, sedangkan ini jangkauan server ke mesin. Lihat catatan di
     lib/data/fingerprint.ts. */
  const recordFpPing = React.useCallback(
    (id: string, lastPing: FpMachine["lastPing"]) => {
      setFpMachines((prev) =>
        prev.map((m) => (m.id === id ? { ...m, lastPing } : m))
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
    empOverrides,
    empAdded,
    empDeleted,
    empAll,
    saveEmployee,
    deleteEmployee,
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
    saveFpMachine,
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
