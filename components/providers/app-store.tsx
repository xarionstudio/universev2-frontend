"use client";

import * as React from "react";

import {
  employees as empBase,
  withKomp,
  type Employee,
} from "@/lib/data/employees";
import { initialFleets, type Fleet } from "@/lib/data/fleet";
import { isoAddDays, seedFaAlloc, type FaAlloc } from "@/lib/data/fleet-alloc";
import { mdInit, type MdCat, type MdEntry } from "@/lib/data/master-data";
import { initialNotifs, type Notif } from "@/lib/data/notifications";
import { apInitialRows, type ApRow } from "@/lib/data/roster";
import {
  initialAudios,
  initialDspAtt,
  initialDspFleet,
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

export { type FaAlloc } from "@/lib/data/fleet-alloc";

export type MenuVis = {
  display: boolean;
  roster: boolean;
  employees: boolean;
  ftw: boolean;
  asset: boolean;
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
    return seedFaAlloc(
      [isoAddDays(today, -1), today],
      initialDspFleet.flatMap((d) => (d.fleetId ? [d.fleetId] : []))
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
    employees: true,
    ftw: true,
    asset: true,
    master: true,
    users: true,
  });
  const [dspAtt, setDspAtt] = React.useState<Display[]>(initialDspAtt);
  const [dspFleet, setDspFleet] = React.useState<Display[]>(initialDspFleet);
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
