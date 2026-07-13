"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Globe,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Settings,
  Sun,
  User,
} from "lucide-react";

import { mdCatLabels, type MdCat } from "@/lib/data/master-data";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { useRefresh } from "@/components/providers/refresh";
import {
  useTheme,
  type ThemePref,
} from "@/components/providers/theme-provider";
import { Avatar, initialsOf } from "@/components/ui/avatar";
import {
  DropMenu,
  DropMenuHeading,
  DropMenuItem,
  DropMenuRadio,
  DropMenuWrap,
} from "@/components/ui/drop-menu";
import { useToast } from "@/components/ui/toast";

import { activeChild, groupOfPath } from "./nav";
import { useShell } from "./shell-context";

const hbtnClass =
  "relative inline-flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-(--glass-1-border) bg-(--fill-subtle) px-2 text-xs font-bold text-(--text-secondary) hover:border-[rgba(0,212,255,.4)] hover:bg-[rgba(0,212,255,.14)] hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary) [&_svg]:size-4";

export function Topbar() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const { pref, resolved, setTheme } = useTheme();
  const { userName } = useAppStore();
  const { setSideOpen } = useShell();
  const { refreshing, refresh } = useRefresh();
  const { pushToast } = useToast();
  const [openDrop, setOpenDrop] = React.useState<string | null>(null);
  const [notifRead, setNotifRead] = React.useState(false);

  const toggle = (key: string) => setOpenDrop((v) => (v === key ? null : key));
  const close = () => setOpenDrop(null);

  /* breadcrumb: parent grup (bila ada) + halaman aktif */
  const group = groupOfPath(pathname, lang);
  const child = activeChild(pathname, lang);
  let cur: string =
    (child && (child.labelKey ? t[child.labelKey] : child.label)) ||
    t.navDashboard;
  if (pathname.startsWith("/roster/upload")) cur = t.navR1;
  else if (pathname.startsWith("/roster/revision/new")) cur = t.revNewTitle;
  else if (pathname.startsWith("/fit-to-work/history")) cur = t.ftwHistPage;
  else if (pathname.startsWith("/fit-to-work")) cur = t.navFtw;
  else if (pathname.startsWith("/employees")) cur = t.navEmployees;
  else if (pathname.startsWith("/settings")) cur = t.navSettings;
  else if (pathname.startsWith("/master/") && params?.cat)
    cur = mdCatLabels[params.cat as MdCat]?.[lang] ?? cur;

  const userShort = userName.trim().split(/\s+/).slice(0, 2).join(" ");

  /* refresh data halaman aktif — handler didaftarkan tiap halaman via
     useRegisterRefresh; toast konfirmasi menyebut halaman + jam */
  function doRefresh() {
    void refresh().then(() => {
      const d = new Date();
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      pushToast(
        "success",
        t.refreshDoneT,
        `${cur} · ${pad(d.getHours())}:${pad(d.getMinutes())} WITA`
      );
    });
  }

  return (
    <header className="sticky top-6 z-40 flex h-16 flex-none items-center gap-4 rounded-panel px-6 glass-panel max-xl:top-4">
      <button
        onClick={() => setSideOpen(true)}
        aria-label="Buka menu navigasi"
        className={cn(hbtnClass, "hidden max-xl:inline-flex")}
      >
        <Menu />
      </button>
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2 text-sm"
      >
        {group ? (
          <>
            <span className="whitespace-nowrap text-(--text-tertiary)">
              {t[group.labelKey]}
            </span>
            <ChevronRight className="size-3.5 flex-none text-(--text-disabled)" />
          </>
        ) : null}
        <span className="font-semibold whitespace-nowrap">{cur}</span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {/* refresh data halaman aktif */}
        <button
          onClick={doRefresh}
          disabled={refreshing}
          aria-label={t.refresh}
          title={t.refresh}
          className={cn(hbtnClass, "disabled:cursor-progress")}
        >
          <RefreshCw className={refreshing ? "animate-spin" : undefined} />
        </button>

        {/* bahasa */}
        <DropMenuWrap open={openDrop === "lang"} onClose={close}>
          <button
            onClick={() => toggle("lang")}
            aria-expanded={openDrop === "lang"}
            aria-haspopup="menu"
            aria-label="Ganti bahasa"
            className={hbtnClass}
          >
            <Globe />
            <span>{lang.toUpperCase()}</span>
          </button>
          <DropMenu open={openDrop === "lang"} className="w-[190px]">
            {(
              [
                ["id", "Bahasa Indonesia"],
                ["en", "English"],
              ] as [Lang, string][]
            ).map(([code, label]) => (
              <DropMenuRadio
                key={code}
                checked={lang === code}
                onClick={() => {
                  setLang(code);
                  close();
                }}
              >
                {label}
              </DropMenuRadio>
            ))}
          </DropMenu>
        </DropMenuWrap>

        {/* tema */}
        <DropMenuWrap open={openDrop === "theme"} onClose={close}>
          <button
            onClick={() => toggle("theme")}
            aria-expanded={openDrop === "theme"}
            aria-haspopup="menu"
            aria-label="Tema aplikasi"
            className={hbtnClass}
          >
            {resolved === "dark" ? <Moon /> : <Sun />}
          </button>
          <DropMenu open={openDrop === "theme"} className="w-[190px]">
            {(
              [
                ["system", t.themeSystem],
                ["light", t.themeLight],
                ["dark", t.themeDark],
              ] as [ThemePref, string][]
            ).map(([value, label]) => (
              <DropMenuRadio
                key={value}
                checked={pref === value}
                onClick={() => {
                  setTheme(value);
                  close();
                }}
              >
                {label}
              </DropMenuRadio>
            ))}
          </DropMenu>
        </DropMenuWrap>

        {/* notifikasi */}
        <DropMenuWrap open={openDrop === "notif"} onClose={close}>
          <button
            onClick={() => toggle("notif")}
            aria-expanded={openDrop === "notif"}
            aria-haspopup="menu"
            aria-label="Notifikasi"
            className={hbtnClass}
          >
            <Bell />
            {!notifRead ? (
              <span className="absolute top-[5px] right-[5px] grid h-[15px] min-w-[15px] place-items-center rounded-lg bg-(--color-danger) px-1 text-[9px] font-bold text-white shadow-[0_0_0_2px_var(--scrim)]">
                3
              </span>
            ) : null}
          </button>
          <DropMenu open={openDrop === "notif"}>
            <DropMenuHeading>{t.notifTitle}</DropMenuHeading>
            {(
              [
                [t.notif1, t.notif1t],
                [t.notif2, t.notif2t],
                [t.notif3, t.notif3t],
              ] as [string, string][]
            ).map(([text, when]) => (
              <div
                key={text}
                className="flex gap-2 rounded-lg px-3 py-2 text-[13px] leading-normal hover:bg-(--fill-hover)"
              >
                <span className="mt-1.5 size-[7px] flex-none rounded-full bg-(--color-primary)" />
                <div>
                  {text}
                  <span className="mt-0.5 block text-[11px] text-(--text-tertiary)">
                    {when}
                  </span>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setNotifRead(true);
                close();
              }}
              className="mt-1 flex h-9 w-full cursor-pointer items-center justify-center rounded-lg text-[13px] font-medium text-(--color-primary-bright) hover:bg-(--fill-hover)"
            >
              {t.markRead}
            </button>
          </DropMenu>
        </DropMenuWrap>

        {/* menu user */}
        <DropMenuWrap open={openDrop === "user"} onClose={close}>
          <button
            onClick={() => toggle("user")}
            aria-expanded={openDrop === "user"}
            aria-haspopup="menu"
            className="flex h-11 cursor-pointer items-center gap-3 rounded-full border border-transparent pr-2 pl-1 text-(--text-primary) hover:border-(--glass-1-border) hover:bg-(--fill-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary)"
          >
            <Avatar>{initialsOf(userName)}</Avatar>
            <span className="max-md:hidden">
              <b className="block text-left text-[13px] leading-tight font-semibold">
                {userShort}
              </b>
              <span className="text-[11px] text-(--text-tertiary)">
                {t.userRole}
              </span>
            </span>
            <ChevronDown className="size-3.5 text-(--text-tertiary) max-md:hidden" />
          </button>
          <DropMenu open={openDrop === "user"} className="w-56">
            <div className="mb-2 border-b border-(--divider) px-3 pt-2 pb-3">
              <b className="block text-[13px]">{userName}</b>
              <span className="font-mono text-[11px] text-(--text-tertiary)">
                first.angel@unggul.co.id
              </span>
            </div>
            <DropMenuItem onClick={close}>
              <User />
              {t.profile}
            </DropMenuItem>
            <DropMenuItem
              onClick={() => {
                close();
                router.push("/settings");
              }}
            >
              <Settings />
              {t.navSettings}
            </DropMenuItem>
            <DropMenuItem
              className="text-(--color-danger-text) hover:bg-(--badge-danger-fill) hover:text-(--color-danger-text)"
              onClick={() => {
                try {
                  localStorage.removeItem("universe-auth");
                } catch {}
                router.push("/login");
              }}
            >
              <LogOut />
              {t.logout}
            </DropMenuItem>
          </DropMenu>
        </DropMenuWrap>
      </div>
    </header>
  );
}
