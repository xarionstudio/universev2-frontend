import {
  CalendarDays,
  Database,
  Fingerprint,
  Heart,
  LayoutDashboard,
  Monitor,
  Settings,
  Trophy,
  Truck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { mdCatLabels, mdCats, type MdCat } from "@/lib/data/master-data";
import type { Lang } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/id";
import type { MenuVis } from "@/components/providers/app-store";

export type NavChild = {
  href?: string;
  labelKey?: keyof Dict;
  label?: string;
  /* anak yang membuka layar display (tab baru, fullscreen) alih-alih navigasi */
  displayUrl?: string;
};

export type NavItem = {
  key: string;
  labelKey: keyof Dict;
  icon: LucideIcon;
  href?: string;
  children?: NavChild[];
  visKey?: keyof MenuVis;
};

export function navItems(lang: Lang): NavItem[] {
  return [
    {
      key: "dashboard",
      labelKey: "navDashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      key: "display",
      labelKey: "navDisplay",
      icon: Monitor,
      visKey: "display",
      children: [
        { href: "/displays/attendance", labelKey: "navDispAtt" },
        { href: "/displays/fleet", labelKey: "navDispFleet" },
        { href: "/displays/monitor", labelKey: "navDispMonitor" },
        { label: "Display Fit To Work", displayUrl: "/display/fitwork" },
        { label: "Monitoring Fingerprint", displayUrl: "/display/fingerprint" },
      ],
    },
    {
      key: "employees",
      labelKey: "navEmployees",
      icon: Users,
      href: "/employees",
      visKey: "employees",
    },
    {
      key: "roster",
      labelKey: "navRoster",
      icon: CalendarDays,
      visKey: "roster",
      children: [
        { href: "/roster/data", labelKey: "navRD" },
        { href: "/roster/revision", labelKey: "navR2" },
        { href: "/roster/approval", labelKey: "navR3" },
        { href: "/roster/attendance", labelKey: "navR4" },
      ],
    },
    /* Modul sendiri, bukan anak Display: yang dikelola di sini adalah master
       perangkat (IP, port, uji koneksi), bukan layar TV. Layar kiosk
       "Monitoring Fingerprint" tetap di grup Display. */
    {
      key: "fingerprint",
      labelKey: "navFingerprint",
      icon: Fingerprint,
      href: "/fingerprint",
      visKey: "fingerprint",
    },
    {
      key: "ftw",
      labelKey: "navFtw",
      icon: Heart,
      href: "/fit-to-work",
      visKey: "ftw",
    },
    {
      key: "asset",
      labelKey: "navAsset",
      icon: Truck,
      visKey: "asset",
      children: [
        { href: "/assets/status", labelKey: "navUnitStatus" },
        { href: "/assets/allocation", labelKey: "navFleetAlloc" },
        { href: "/assets/fleet-setting", labelKey: "navFleetSetting" },
      ],
    },
    {
      key: "prestasi",
      labelKey: "navPrestasi",
      icon: Trophy,
      href: "/prestasi",
      visKey: "prestasi",
    },
    {
      key: "master",
      labelKey: "navMaster",
      icon: Database,
      visKey: "master",
      children: [
        { href: "/master/units", labelKey: "navUnitDb" },
        ...mdCats.map((c: MdCat) => ({
          href: `/master/${c}`,
          label: mdCatLabels[c][lang],
        })),
      ],
    },
    {
      key: "um",
      labelKey: "navUsers",
      icon: UserPlus,
      visKey: "users",
      children: [
        { href: "/users", labelKey: "umUsersT" },
        { href: "/roles", labelKey: "umRolesT" },
      ],
    },
  ];
}

export const settingsItem: NavItem = {
  key: "settings",
  labelKey: "navSettings",
  icon: Settings,
  href: "/settings",
};

/* Grup pemilik sebuah path — untuk breadcrumb & auto-expand */
export function groupOfPath(pathname: string, lang: Lang): NavItem | null {
  for (const item of navItems(lang)) {
    if (!item.children) continue;
    if (item.children.some((c) => c.href && pathname.startsWith(c.href)))
      return item;
  }
  return null;
}

/* Label crumb halaman aktif — dicari dari nav; fallback per-halaman meng-override */
export function activeChild(pathname: string, lang: Lang): NavChild | null {
  for (const item of navItems(lang)) {
    for (const c of item.children || []) {
      if (c.href && pathname.startsWith(c.href)) return c;
    }
  }
  return null;
}
