"use client";

import * as React from "react";

import { employeesApi } from "@/lib/api/employees";
import { fleetApi } from "@/lib/api/fleet";
import { masterApi } from "@/lib/api/master";
import { notificationsApi } from "@/lib/api/notifications";
import { rolesApi } from "@/lib/api/roles";
import { rosterApi } from "@/lib/api/roster";
import { settingsApi } from "@/lib/api/settings";
import { usersApi } from "@/lib/api/users";
import { withKomp, type Employee } from "@/lib/data/employees";
import { type Fleet } from "@/lib/data/fleet";
import { type FaAlloc } from "@/lib/data/fleet-alloc";
import { type MdCat, type MdEntry } from "@/lib/data/master-data";
import { type Notif } from "@/lib/data/notifications";
import { type ApRow } from "@/lib/data/roster";
import { type Audio, type Display } from "@/lib/data/settings-data";
import { type Unit } from "@/lib/data/unit-status";
import { unitsDb as udbBase, type UnitDb } from "@/lib/data/units-db";
import { type UmRole, type UmUser } from "@/lib/data/users";
import { useSession } from "@/components/providers/session";

export { type FaAlloc } from "@/lib/data/fleet-alloc";

export type MenuVis = {
  display: boolean;
  roster: boolean;
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
  /* user management (akun login + role RBAC) */
  umUsers: UmUser[];
  setUmUsers: React.Dispatch<React.SetStateAction<UmUser[]>>;
  umRoles: UmRole[];
  setUmRoles: React.Dispatch<React.SetStateAction<UmRole[]>>;
};

const AppStoreContext = React.createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { user: sessionUser, hydrated } = useSession();
  const [userName, setUserName] = React.useState("First Angel Paustine");
  const [userEmail, setUserEmail] = React.useState("angel@unggul.co.id");
  const [notifs, setNotifs] = React.useState<Notif[]>([]);
  const [empOverrides, setEmpOverrides] = React.useState<
    Record<string, Partial<Employee>>
  >({});
  const [empAdded, setEmpAdded] = React.useState<Employee[]>([]);
  const [empDeleted, setEmpDeleted] = React.useState<Record<string, boolean>>(
    {}
  );
  const [apRows, setApRows] = React.useState<ApRow[]>([]);
  const [units, setUnits] = React.useState<Unit[]>([]);
  const [udbAdded, setUdbAdded] = React.useState<UnitDb[]>([]);
  const [udbOverrides, setUdbOverrides] = React.useState<
    Record<string, Partial<UnitDb>>
  >({});
  const [mdData, setMdData] = React.useState<Record<MdCat, MdEntry[]>>(
    {} as Record<MdCat, MdEntry[]>
  );
  const [faAlloc, setFaAlloc] = React.useState<FaAlloc>({});
  const [fleets, setFleets] = React.useState<Fleet[]>([]);
  const [appName, setAppName] = React.useState("UNIVERSE");
  const [appDesc, setAppDesc] = React.useState(
    "Unggul Network for Integrated Vehicle Resource Smart Ecosystem"
  );
  const [audios, setAudios] = React.useState<Audio[]>([]);
  const [menuVis, setMenuVis] = React.useState<MenuVis>({
    display: true,
    roster: true,
    employees: true,
    ftw: true,
    asset: true,
    prestasi: true,
    master: true,
    users: true,
  });
  const [dspAtt, setDspAtt] = React.useState<Display[]>([]);
  const [dspFleet, setDspFleet] = React.useState<Display[]>([]);
  const [umUsers, setUmUsers] = React.useState<UmUser[]>([]);
  const [umRoles, setUmRoles] = React.useState<UmRole[]>([]);

  // Sync state with backend when user is authenticated
  React.useEffect(() => {
    if (!hydrated || !sessionUser) return;

    queueMicrotask(() => {
      if (sessionUser.kar) setUserName(sessionUser.kar);
      if (sessionUser.email) setUserEmail(sessionUser.email);
    });

    // Fetch Notifications
    notificationsApi
      .getNotifications()
      .then((data) => {
        if (data && Array.isArray(data)) {
          setNotifs(
            data.map((n) => ({
              id: String(n.id),
              tone: n.tone,
              textId: n.textId,
              textEn: n.textEn,
              timeId: n.timeId,
              timeEn: n.timeEn,
              read: n.read,
            }))
          );
        }
      })
      .catch(() => {});

    // Fetch Roster Revisions (approval queue)
    rosterApi
      .getRevisions()
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setApRows(
            data.map((r) => ({
              sid: String(r.sid || ""),
              name: String(r.name || r.nik || ""),
              nik: String(r.nik || ""),
              whatId: String(r.whatId || ""),
              whatEn: String(r.whatEn || r.whatId || ""),
              whenId: String(r.whenId || ""),
              whenEn: String(r.whenEn || r.whenId || ""),
              status: (r.status || "pending") as ApRow["status"],
              byId: r.byId ? String(r.byId) : undefined,
              byEn: r.byEn ? String(r.byEn) : undefined,
            }))
          );
        }
      })
      .catch(() => {});

    // Fetch Users
    usersApi
      .getUsers()
      .then((data) => {
        if (data && Array.isArray(data)) {
          setUmUsers(
            data.map((u) => ({
              id: String(u.id),
              nik: u.nik || "",
              kar: u.kar,
              email: u.email,
              dept: "",
              pos: "",
              roles: u.roles || [],
              on: u.on,
            }))
          );
        }
      })
      .catch(() => {});

    // Fetch Roles
    rolesApi
      .getRoles()
      .then((data) => {
        if (data && Array.isArray(data)) {
          setUmRoles(
            data.map((r) => ({
              id: String(r.id),
              name: r.name,
              desc: r.desc,
              locked: r.locked,
              perms: (r.perms || {}) as Record<
                import("@/lib/data/users").UmModule,
                import("@/lib/data/users").UmPerm
              >,
            }))
          );
        }
      })
      .catch(() => {});

    // Fetch App Settings
    settingsApi
      .getSettings()
      .then((st) => {
        if (st) {
          if (st.appName) setAppName(st.appName);
          if (st.menuVis) setMenuVis((prev) => ({ ...prev, ...st.menuVis }));
        }
      })
      .catch(() => {});

    // Fetch Employees
    employeesApi
      .getEmployees()
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setEmpAdded(
            data.map(
              (e) =>
                ({
                  nik: e.nik,
                  name: e.name,
                  company: e.company || "PT Unggul Dinamika Utama",
                  dept: e.dept || "Operation",
                  pos: e.pos || "Operator Dump Truck",
                  equip: e.equip || "HD 785-7",
                  join: e.join || "2022-01-01",
                  status: (e.status || "aktif") as Employee["status"],
                  simper: e.simper || "",
                  simperExp: e.simperExp || "",
                  mcuExp: e.mcuExp || "",
                  ind: e.ind || "",
                  birth: e.birth || "",
                  blood: e.blood || "",
                  religion: e.religion || "",
                  marital: e.marital || "",
                  gender: e.gender || "L",
                  phone: e.phone || "",
                  email: e.email || "",
                  address: e.address || "",
                  emergencyName: e.emergencyName || "",
                  emergencyRel: e.emergencyRel || "",
                  emergencyPhone: e.emergencyPhone || "",
                  exp: 1,
                  license: [],
                  mcu: "Fit",
                  medis: [],
                  komp: e.komp || [],
                }) as unknown as Employee
            )
          );
        }
      })
      .catch(() => {});

    // Fetch Unit Statuses
    fleetApi
      .getUnitStatuses()
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setUnits(
            data.map(
              (u) =>
                ({
                  code: u.code,
                  type: u.type || "",
                  status: (u.status || "ready") as Unit["status"],
                  loc: u.loc || "",
                  upd: u.upd || "",
                  hist: [],
                }) as Unit
            )
          );
        }
      })
      .catch(() => {});

    // Fetch Unit DB (master unit list)
    fleetApi
      .getUnitDB()
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setUdbAdded(
            data.map((u) => ({
              uid: String(u.id || u.code),
              code: u.code,
              cat: u.cat || "",
              cls: u.cls || "",
              egi: u.egi || "",
              product: u.product || "",
              active: u.active !== false,
              standby: !!u.standby,
              breakdown: !!u.breakdown,
              loc: u.loc || "",
              upd: u.upd || "",
              by: u.by || "",
            }))
          );
        }
      })
      .catch(() => {});

    // Fetch Fleet Settings (formations)
    fleetApi
      .getFleetSettings()
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setFleets(
            data.map((f) => ({
              id: `fl-${f.id}`,
              digger: f.digger,
              loc: f.loc,
              bus: f.bus,
              units: f.units || [],
              active: f.active !== false,
            }))
          );
        }
      })
      .catch(() => {});

    // Fetch Fleet Allocations
    fleetApi
      .getAllocations()
      .then((data) => {
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          setFaAlloc(data as FaAlloc);
        }
      })
      .catch(() => {});

    // Fetch Master Data categories
    const mdCats = [
      "egi",
      "product",
      "eqclass",
      "area",
      "tempudo",
      "bus",
      "lokasiex",
      "mess",
      "runtext",
    ] as const;
    Promise.all(
      mdCats.map(async (cat) => {
        try {
          const entries = await masterApi.getByCategory(cat);
          return [
            cat,
            entries.map((e, i) => ({
              id: e.id != null ? String(e.id) : `${cat}-${i}`,
              code: String(e.code || e.name || `${cat}-${i}`),
              name: String(e.name || e.code || ""),
              a: String(e.a || ""),
              b: String(e.b || ""),
              active: e.active !== false,
            })),
          ] as const;
        } catch {
          return [
            cat,
            [] as import("@/lib/data/master-data").MdEntry[],
          ] as const;
        }
      })
    ).then((results) => {
      const merged = {} as Record<
        import("@/lib/data/master-data").MdCat,
        import("@/lib/data/master-data").MdEntry[]
      >;
      for (const [cat, entries] of results) {
        merged[cat as import("@/lib/data/master-data").MdCat] = entries;
      }
      const hasData = Object.values(merged).some((arr) => arr.length > 0);
      if (hasData) setMdData(merged);
    });

    // Fetch Displays (attendance + fleet)
    settingsApi
      .getDisplays()
      .then((data) => {
        if (data && Array.isArray(data)) {
          const att: Display[] = [];
          const fleet: Display[] = [];
          for (const d of data) {
            const item: Display = {
              id: String(d.id),
              name: d.name,
              loc: d.loc || "",
              content: (d.content === "fleet" ? "fleet" : "att") as
                "att" | "fleet",
              fleetId: d.fleetId ? `fl-${d.fleetId}` : undefined,
              runtext: d.runtext || "",
              online: !!d.online,
              hb: d.hb || "",
              active: d.active !== false,
            };
            if (d.content === "fleet") fleet.push(item);
            else att.push(item);
          }
          if (att.length) setDspAtt(att);
          if (fleet.length) setDspFleet(fleet);
        }
      })
      .catch(() => {});

    // Fetch Audio Schedules
    settingsApi
      .getAudioSchedules()
      .then((data) => {
        if (data && Array.isArray(data)) {
          setAudios(
            data.map((a) => ({
              id: String(a.id),
              title: a.title,
              when: a.when,
              freq: (a.freq || "harian") as Audio["freq"],
              file: a.file,
              active: a.active !== false,
              displays: (a.displays || []) as Audio["displays"],
            }))
          );
        }
      })
      .catch(() => {});
  }, [hydrated, sessionUser]);

  const empAll = React.useCallback(() => {
    const list = empAdded;
    const base = list.map((r) => ({ ...r, ...(empOverrides[r.nik] || {}) }));
    return withKomp(base.filter((r) => !empDeleted[r.nik]));
  }, [empOverrides, empAdded, empDeleted]);

  const saveEmployee = React.useCallback(
    (nik: string | null, data: Partial<Employee> & { nik: string }) => {
      if (nik && empAdded.some((r) => r.nik === nik)) {
        setEmpAdded((prev) =>
          prev.map((r) => (r.nik === nik ? { ...r, ...data } : r))
        );
      } else if (nik) {
        setEmpOverrides((prev) => ({
          ...prev,
          [nik]: { ...prev[nik], ...data },
        }));
      } else {
        setEmpAdded((prev) => [...prev, data as Employee]);
      }
    },
    [empAdded]
  );

  const deleteEmployee = React.useCallback((nik: string) => {
    setEmpDeleted((prev) => ({ ...prev, [nik]: true }));
  }, []);

  const udbAll = React.useCallback(() => {
    const list = udbAdded;
    return list.map((u) => ({ ...u, ...(udbOverrides[u.uid] || {}) }));
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
