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
import { notifToneDot } from "@/lib/data/notifications";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { usePermissions } from "@/components/providers/permissions";
import { useRefresh } from "@/components/providers/refresh";
import { useSession } from "@/components/providers/session";
import {
  useTheme,
  type ThemePref,
} from "@/components/providers/theme-provider";
import { Avatar, initialsOf } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  "relative inline-flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-(--glass-1-border) bg-(--fill-subtle) px-2 text-xs font-bold text-(--text-secondary) hover:border-[rgba(0,212,255,.4)] hover:bg-[rgba(0,212,255,.14)] hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&_svg]:size-4";

export function Topbar() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const { pref, resolved, setTheme } = useTheme();
  const {
    userName: storeName,
    userEmail: storeEmail,
    notifs,
    setNotifs,
  } = useAppStore();
  const { logout } = useSession();
  const { user: me, roles: myRoleList } = usePermissions();
  /* Identitas nyata dari sesi; store dipakai sebagai cadangan saat sesi
     belum terbaca agar tidak ada kedip teks kosong. */
  const userName = me?.kar ?? storeName;
  /* Baris identitas di menu akun: email bila ada, kalau tidak NIK — akun
     kini boleh tanpa email (identitas login = NIK). */
  const userEmail = me
    ? me.email || (me.nik ? `NIK ${me.nik}` : "")
    : storeEmail;
  /* Nama role datang dari GET /api/roles, bukan lagi dari daftar mock.
     Endpoint itu di balik permission `users:view`, jadi untuk role biasa
     daftarnya kosong dan topbar menampilkan label umum t.userRole — bukan
     nama yang salah. */
  const myRoles = (me?.roles ?? []).flatMap((rid) => {
    const r = myRoleList.find((x) => x.id === rid);
    return r ? [r.name] : [];
  });
  const { setSideOpen } = useShell();
  const { refreshing, refresh } = useRefresh();
  const { pushToast } = useToast();
  const [openDrop, setOpenDrop] = React.useState<string | null>(null);
  const unread = notifs.filter((n) => !n.read).length;

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
  else if (pathname.startsWith("/prestasi")) cur = t.navPrestasi;
  else if (pathname.startsWith("/fingerprint")) cur = t.navFingerprint;
  else if (pathname.startsWith("/settings")) cur = t.navSettings;
  else if (pathname.startsWith("/profile")) cur = t.profile;
  else if (pathname.startsWith("/notifications")) cur = t.notifTitle;
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
    <header className="sticky top-6 z-40 flex h-16 flex-none items-center gap-4 rounded-panel px-6 glass-panel max-xl:top-4 max-sm:top-3 max-sm:h-14 max-sm:gap-2 max-sm:rounded-card max-sm:px-3">
      <button
        onClick={() => setSideOpen(true)}
        aria-label="Buka menu navigasi"
        className={cn(hbtnClass, "hidden max-xl:inline-flex")}
      >
        <Menu />
      </button>
      {/* Breadcrumb menyusut bertahap, lalu hilang.
          < md : induk grup + pemisah dilepas — nilainya paling kecil justru
                 saat ruang paling sempit.
          < sm : seluruh breadcrumb disembunyikan. Sisa ruang setelah enam
                 kontrol di kanan tinggal ~50px, dan judul yang terpotong jadi
                 "Da…" bukan konteks, hanya derau — sementara <h1> halaman
                 tepat di bawahnya sudah menyebut nama halaman secara utuh. */}
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2 text-sm max-sm:hidden"
      >
        {group ? (
          <>
            <span className="whitespace-nowrap text-(--text-tertiary) max-md:hidden">
              {t[group.labelKey]}
            </span>
            <ChevronRight className="size-3.5 flex-none text-(--text-disabled) max-md:hidden" />
          </>
        ) : null}
        <span className="truncate font-semibold">{cur}</span>
      </nav>

      <div className="ml-auto flex flex-none items-center gap-2 max-sm:gap-1">
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
          <DropMenu open={openDrop === "lang"} className="w-47.5">
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
          <DropMenu open={openDrop === "theme"} className="w-47.5">
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
            aria-label={t.notifTitle}
            className={hbtnClass}
          >
            <Bell />
            {unread > 0 ? (
              <span className="absolute top-1.25 right-1.25 grid h-3.75 min-w-3.75 place-items-center rounded-lg bg-danger px-1 text-[9px] font-bold text-white shadow-[0_0_0_2px_var(--scrim)]">
                {unread}
              </span>
            ) : null}
          </button>
          <DropMenu open={openDrop === "notif"} className="w-85">
            <div className="flex items-center justify-between pr-2">
              <DropMenuHeading>{t.notifTitle}</DropMenuHeading>
              {unread > 0 ? (
                <span className="rounded-chip border border-[rgba(0,212,255,.4)] bg-[rgba(0,212,255,.12)] px-2 py-0.5 text-[11px] font-semibold text-primary-bright">
                  {unread} {t.ntfFUnread.toLowerCase()}
                </span>
              ) : null}
            </div>
            {notifs.slice(0, 5).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() =>
                  setNotifs((prev) =>
                    prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
                  )
                }
                className="flex w-full cursor-pointer gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] leading-normal hover:bg-(--fill-hover)"
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.75 flex-none rounded-full",
                    n.read ? "bg-(--text-disabled)" : notifToneDot[n.tone]
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block",
                      n.read
                        ? "text-(--text-secondary)"
                        : "font-semibold text-(--text-primary)"
                    )}
                  >
                    {lang === "id" ? n.textId : n.textEn}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-(--text-tertiary)">
                    {lang === "id" ? n.timeId : n.timeEn}
                  </span>
                </span>
              </button>
            ))}
            <div className="mt-1 flex items-center justify-between gap-1 border-t border-(--divider) pt-1.5">
              <button
                onClick={() =>
                  setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
                }
                disabled={unread === 0}
                className="flex h-9 cursor-pointer items-center rounded-lg px-3 text-[13px] font-medium whitespace-nowrap text-(--text-secondary) hover:bg-(--fill-hover) hover:text-(--text-primary) disabled:cursor-default disabled:text-(--text-disabled)"
              >
                {t.markRead}
              </button>
              <button
                onClick={() => {
                  close();
                  router.push("/notifications");
                }}
                className="flex h-9 cursor-pointer items-center rounded-lg px-3 text-[13px] font-medium whitespace-nowrap text-primary-bright hover:bg-(--fill-hover)"
              >
                {t.ntfViewAll}
              </button>
            </div>
          </DropMenu>
        </DropMenuWrap>

        {/* menu user */}
        <DropMenuWrap open={openDrop === "user"} onClose={close}>
          <button
            onClick={() => toggle("user")}
            aria-expanded={openDrop === "user"}
            aria-haspopup="menu"
            className="flex h-11 cursor-pointer items-center gap-3 rounded-full border border-transparent pr-2 pl-1 text-(--text-primary) hover:border-(--glass-1-border) hover:bg-(--fill-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Avatar>{initialsOf(userName)}</Avatar>
            <span className="max-md:hidden">
              <b className="block text-left text-[13px] leading-tight font-semibold">
                {userShort}
              </b>
              {/* Nama role hanya ditampilkan bila benar-benar diketahui.
                  Sebelumnya baris ini jatuh ke t.userRole yang isinya
                  "Superadmin" — sehingga akun Viewer pun tampil sebagai
                  Superadmin di layar. Lebih baik kosong daripada salah:
                  ini UI RBAC, dan label peran yang keliru menyesatkan soal
                  hak akses. Daftar nama role butuh permission `users:view`
                  (lihat myRoleList di atas), jadi kosong itu wajar. */}
              {myRoles.length ? (
                <span className="text-[11px] text-(--text-tertiary)">
                  {myRoles.join(" · ")}
                </span>
              ) : null}
            </span>
            <ChevronDown className="size-3.5 text-(--text-tertiary) max-md:hidden" />
          </button>
          <DropMenu open={openDrop === "user"} className="w-56">
            <div className="mb-2 border-b border-(--divider) px-3 pt-2 pb-3">
              <b className="block text-[13px]">{userName}</b>
              <span className="font-mono text-[11px] text-(--text-tertiary)">
                {userEmail}
              </span>
              {myRoles.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {myRoles.map((r) => (
                    <Badge key={r} variant="info">
                      {r}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
            <DropMenuItem
              onClick={() => {
                close();
                router.push("/profile");
              }}
            >
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
              className="text-danger-text hover:bg-(--badge-danger-fill) hover:text-danger-text"
              onClick={() => {
                /* Lewat provider agar tiga hal ikut bersih sekaligus: token
                   lokal, cookie `jwt` di server, dan state RBAC. Provider
                   juga yang mengarahkan ke /login setelah selesai. */
                void logout();
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
