"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { useAppStore } from "@/components/providers/app-store"
import { useKiosk } from "@/components/providers/kiosk-provider"
import { useShell } from "./shell-context"
import { navItems, settingsItem, groupOfPath, type NavItem } from "./nav"

const navBtnClass =
  "relative flex h-11 w-full cursor-pointer items-center gap-3 rounded-control border border-transparent px-3 text-left text-sm font-medium text-(--text-secondary) transition-colors duration-100 hover:bg-(--fill-hover) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-primary)"

const activeClass =
  "border-[rgba(0,212,255,.5)] bg-(image:--gradient-nav-active) font-semibold text-(--text-primary) shadow-[0_0_10px_rgba(0,212,255,.4)]"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, lang } = useI18n()
  const { appName, menuVis } = useAppStore()
  const { openKiosk } = useKiosk()
  const { collapsed, setCollapsed, sideOpen, setSideOpen } = useShell()
  const items = navItems(lang)
  const currentGroup = groupOfPath(pathname, lang)
  const [openGroup, setOpenGroup] = React.useState<string | null>(
    currentGroup?.key ?? null
  )

  React.useEffect(() => {
    if (currentGroup) setOpenGroup(currentGroup.key)
  }, [currentGroup?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  // tutup off-canvas setiap pindah halaman
  React.useEffect(() => {
    setSideOpen(false)
  }, [pathname, setSideOpen])

  const isChildActive = (href: string) => pathname.startsWith(href)
  const isTopActive = (item: NavItem) =>
    item.href ? pathname.startsWith(item.href) : false

  function renderTop(item: NavItem) {
    if (item.visKey && !menuVis[item.visKey]) return null
    const Icon = item.icon
    const label = t[item.labelKey]
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
      )
    }
    const expanded = openGroup === item.key
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
          <span className={cn("flex-1 truncate", collapsed && "hidden max-xl:block")}>
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
            "overflow-hidden transition-[max-height] duration-250 ease-in-out",
            expanded ? "max-h-[520px] py-2 pb-3" : "max-h-0",
            collapsed && "hidden max-xl:block"
          )}
        >
          {item.children.map((c) => {
            const kidClass = cn(
              "relative ml-7.5 flex h-10 w-[calc(100%-30px)] items-center gap-2 rounded-control border border-transparent px-3 text-left text-[13px] text-(--text-secondary) no-underline transition-colors duration-100 hover:bg-(--fill-hover) hover:text-(--text-primary) hover:no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-primary) [&+a]:mt-2 [&+button]:mt-2"
            )
            const label = c.labelKey ? t[c.labelKey] : c.label
            if (c.kioskUrl) {
              return (
                <button
                  key={c.kioskUrl}
                  onClick={() => openKiosk(c.kioskUrl!)}
                  className={cn(kidClass, "cursor-pointer")}
                >
                  {label}
                </button>
              )
            }
            return (
              <Link
                key={c.href}
                href={c.href!}
                className={cn(kidClass, isChildActive(c.href!) && activeClass)}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </React.Fragment>
    )
  }

  return (
    <>
      {/* scrim off-canvas tablet */}
      <div
        onClick={() => setSideOpen(false)}
        className={cn(
          "fixed inset-0 z-110 hidden bg-(--scrim) backdrop-blur-[4px]",
          sideOpen && "max-xl:block"
        )}
      />
      <aside
        aria-label="Navigasi utama"
        className={cn(
          "glass-panel relative z-30 flex flex-none flex-col rounded-panel px-3 py-5 shadow-[var(--shadow-panel),inset_0_1px_40px_var(--inset-glow)] transition-[width] duration-250",
          collapsed ? "w-18 px-2 py-4" : "w-70",
          // tablet: off-canvas
          "max-xl:fixed max-xl:top-0 max-xl:bottom-0 max-xl:left-0 max-xl:z-120 max-xl:w-[min(300px,84vw)] max-xl:rounded-l-none max-xl:bg-(--overlay-fill) max-xl:px-3 max-xl:py-5 max-xl:shadow-(--shadow-modal) max-xl:transition-transform",
          sideOpen ? "max-xl:translate-x-0" : "max-xl:-translate-x-[105%]"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 px-2 pt-1 pb-6",
            collapsed && "justify-center px-0 max-xl:justify-start max-xl:px-2"
          )}
        >
          <div className="grid size-10 flex-none place-items-center rounded-full bg-linear-[1.86deg] from-[#0054C7] to-[#00CFFE] text-base font-bold text-white shadow-[0_0_0_2px_var(--ring-avatar),0_0_18px_rgba(0,212,255,.35)]">
            U
          </div>
          <div className={cn(collapsed && "hidden max-xl:block")}>
            <b className="block text-base">{appName}</b>
            <span className="text-xs text-(--text-tertiary)">Fleet Automation</span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Ciutkan sidebar"
            title="Ciutkan sidebar"
            className={cn(
              "ml-auto grid size-7 flex-none cursor-pointer place-items-center rounded-lg border border-(--glass-1-border) bg-(--fill-subtle) hover:border-[rgba(0,212,255,.4)] hover:bg-[rgba(0,212,255,.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary) max-xl:hidden",
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
        <nav className="scrollbar-none flex flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto">
          {items.map(renderTop)}
        </nav>
        <div className="mx-2 my-4 border-t border-(--divider)" />
        {renderTop({ ...settingsItem })}
      </aside>
    </>
  )
}
