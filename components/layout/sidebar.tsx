"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { openDisplay } from "@/lib/open-display";
import { moduleOfNav } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { usePermissions } from "@/components/providers/permissions";

import { groupOfPath, navItems, settingsItem, type NavItem } from "./nav";
import { useShell } from "./shell-context";

const navBtnClass =
  "relative flex h-11 w-full flex-none cursor-pointer items-center gap-3 rounded-control border border-transparent px-3 text-left text-sm font-medium text-(--text-secondary) transition-colors duration-100 hover:bg-(--fill-hover) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

const activeClass =
  "border-[rgba(0,212,255,.5)] bg-(image:--gradient-nav-active) font-semibold text-(--text-primary) shadow-[0_0_10px_rgba(0,212,255,.4)]";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, lang } = useI18n();
  const { appName, menuVis } = useAppStore();
  const { can } = usePermissions();
  const { collapsed, setCollapsed, sideOpen, setSideOpen } = useShell();
  const items = navItems(lang);
  const currentGroup = groupOfPath(pathname, lang);
  const [openGroup, setOpenGroup] = React.useState<string | null>(
    currentGroup?.key ?? null
  );

  const groupKey = currentGroup?.key ?? null;
  React.useEffect(() => {
    if (!groupKey) return;
    const id = setTimeout(() => setOpenGroup(groupKey), 0);
    return () => clearTimeout(id);
  }, [groupKey]);

  // tutup off-canvas setiap pindah halaman
  React.useEffect(() => {
    setSideOpen(false);
  }, [pathname, setSideOpen]);

  /* Anak aktif = href TERPANJANG yang cocok di antara saudaranya —
     "/employees" dan "/employees/pending" bertetangga; startsWith polos
     menyalakan keduanya sekaligus. */
  const isChildActive = (item: NavItem, href: string) => {
    let best = "";
    for (const c of item.children ?? []) {
      if (
        c.href &&
        (pathname === c.href || pathname.startsWith(c.href + "/")) &&
        c.href.length > best.length
      )
        best = c.href;
    }
    return href === best;
  };
  const isTopActive = (item: NavItem) =>
    item.href ? pathname.startsWith(item.href) : false;

  function renderTop(item: NavItem) {
    // visibilitas global (Setting Menu) — berlaku untuk semua user
    if (item.visKey && !menuVis[item.visKey]) return null;
    // permission per user — menu tanpa permission TIDAK dirender (bukan
    // disabled), sesuai kontrak RBAC di i18n `umRbacNote`
    const mod = moduleOfNav(item);
    if (mod && !can(mod, "view")) return null;
    const Icon = item.icon;
    const label = t[item.labelKey];
    if (!item.children) {
      return (
        <button
          key={item.key}
          onClick={() => router.push(item.href!)}
          className={cn(
            navBtnClass,
            isTopActive(item) && activeClass,
            collapsed && "justify-center px-0 max-xl:justify-start max-xl:px-3"
          )}
          title={collapsed ? label : undefined}
        >
          <Icon className="size-4.5 flex-none" strokeWidth={1.8} />
          <span
            className={cn(
              "flex-1 truncate",
              collapsed && "hidden max-xl:block"
            )}
          >
            {label}
          </span>
        </button>
      );
    }
    const expanded = openGroup === item.key;
    return (
      <React.Fragment key={item.key}>
        <button
          aria-expanded={expanded}
          onClick={() => setOpenGroup(expanded ? null : item.key)}
          className={cn(
            navBtnClass,
            collapsed && "justify-center px-0 max-xl:justify-start max-xl:px-3"
          )}
          title={collapsed ? label : undefined}
        >
          <Icon className="size-4.5 flex-none" strokeWidth={1.8} />
          <span
            className={cn(
              "flex-1 truncate",
              collapsed && "hidden max-xl:block"
            )}
          >
            {label}
          </span>
          <ChevronRight
            className={cn(
              "size-3.5 flex-none text-(--text-tertiary) transition-transform duration-200",
              expanded && "rotate-90",
              collapsed && "hidden max-xl:block"
            )}
            strokeWidth={2}
          />
        </button>
        <div
          className={cn(
            "flex-none overflow-hidden transition-[max-height] duration-250 ease-in-out",
            expanded ? "max-h-130 py-2 pb-3" : "max-h-0",
            collapsed && "hidden max-xl:block"
          )}
        >
          {item.children.map((c) => {
            const kidClass = cn(
              "relative ml-7.5 flex h-10 w-[calc(100%-30px)] items-center gap-2 rounded-control border border-transparent px-3 text-left text-[13px] text-(--text-secondary) no-underline transition-colors duration-100 hover:bg-(--fill-hover) hover:text-(--text-primary) hover:no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary [&+a]:mt-2 [&+button]:mt-2"
            );
            const label = c.labelKey ? t[c.labelKey] : c.label;
            if (c.displayUrl) {
              return (
                <button
                  key={c.displayUrl}
                  onClick={() => openDisplay(c.displayUrl!)}
                  className={cn(kidClass, "cursor-pointer")}
                >
                  {label}
                </button>
              );
            }
            return (
              <Link
                key={c.href}
                href={c.href!}
                className={cn(
                  kidClass,
                  isChildActive(item, c.href!) && activeClass
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </React.Fragment>
    );
  }

  return (
    <>
      {/* scrim off-canvas tablet */}
      <div
        onClick={() => setSideOpen(false)}
        className={cn(
          "fixed inset-0 z-110 hidden bg-(--scrim) backdrop-blur-xs",
          sideOpen && "max-xl:block"
        )}
      />
      <aside
        aria-label="Navigasi utama"
        className={cn(
          // sticky + tinggi viewport: menu Setting selalu terlihat di bawah
          // meski konten halaman panjang — nav punya scroll sendiri
          "sticky top-6 z-30 flex h-[calc(100vh-48px)] flex-none flex-col self-start rounded-panel px-3 py-5 shadow-[var(--shadow-panel),inset_0_1px_40px_var(--inset-glow)] glass-panel transition-[width] duration-250",
          collapsed ? "w-18 px-2 py-4" : "w-70",
          // tablet: off-canvas
          /* h-dvh, bukan h-auto: dengan top-0 + bottom-0 panelnya tetap
             berhenti setinggi isinya (617px di layar 800px), jadi laci
             mengambang dengan tepi bawah membulat di tengah layar dan konten
             halaman terlihat di bawahnya. dvh juga ikut menyesuaikan bilah
             alamat browser ponsel yang muncul-hilang. */
          "max-xl:fixed max-xl:top-0 max-xl:bottom-0 max-xl:left-0 max-xl:z-120 max-xl:h-dvh max-xl:w-[min(300px,84vw)] max-xl:rounded-l-none max-xl:bg-(--overlay-fill) max-xl:px-3 max-xl:py-5 max-xl:shadow-(--shadow-modal) max-xl:transition-transform",
          sideOpen ? "max-xl:translate-x-0" : "max-xl:translate-x-[-105%]"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 px-2 pt-1 pb-6",
            collapsed && "justify-center px-0 max-xl:justify-start max-xl:px-2"
          )}
        >
          <Image
            src="/logoV1.svg"
            alt="UNIVERSE"
            width={40}
            height={40}
            className="size-10 flex-none"
          />
          <div className={cn(collapsed && "hidden max-xl:block")}>
            <b className="block text-base">{appName}</b>
            <span className="text-xs text-(--text-tertiary)">
              Fleet Automation
            </span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Ciutkan sidebar"
            title="Ciutkan sidebar"
            className={cn(
              "ml-auto grid size-7 flex-none cursor-pointer place-items-center rounded-lg border border-(--glass-1-border) bg-(--fill-subtle) hover:border-[rgba(0,212,255,.4)] hover:bg-[rgba(0,212,255,.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-xl:hidden",
              collapsed && "hidden"
            )}
          >
            <ChevronLeft className="size-3.5 text-(--text-secondary)" />
          </button>
        </div>
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Perluas sidebar"
          title="Perluas sidebar"
          className={cn(
            "mx-auto mb-3 grid size-7 flex-none cursor-pointer place-items-center rounded-lg border border-(--glass-1-border) bg-(--fill-subtle) hover:border-[rgba(0,212,255,.4)] hover:bg-[rgba(0,212,255,.14)] max-xl:hidden",
            !collapsed && "hidden"
          )}
        >
          <ChevronRight className="size-3.5 text-(--text-secondary)" />
        </button>
        <nav className="scrollbar-none flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto">
          {items.map(renderTop)}
        </nav>
        <div className="mx-2 my-4 border-t border-(--divider)" />
        {renderTop({ ...settingsItem })}
      </aside>
    </>
  );
}
