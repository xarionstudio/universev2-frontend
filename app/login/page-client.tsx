"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  CircleAlert,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Truck,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { Spinner } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

/* Layout dua panel mengikuti referensi universe-2 (Figma 1512:2810):
   kartu 1200×760, panel kiri = foto armada + brand + hero + fitur,
   panel kanan glass overlap 21px berisi form. Style memakai token DS ini. */

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { appName } = useAppStore();
  const emailRef = React.useRef<HTMLInputElement>(null);
  const pwRef = React.useRef<HTMLInputElement>(null);
  const [showPw, setShowPw] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = emailRef.current?.value.trim() || "";
    const pw = pwRef.current?.value || "";
    if (!email.includes("@") || !pw) {
      setErr(true);
      emailRef.current?.focus();
      return;
    }
    setErr(false);
    setBusy(true);
    setTimeout(() => {
      try {
        localStorage.setItem("universe-auth", email);
      } catch {}
      router.push("/dashboard");
    }, 900);
  }

  const features = [
    { icon: Clock, label: t.loginFeat1 },
    { icon: Truck, label: t.loginFeat2 },
    { icon: BarChart2, label: t.loginFeat3 },
  ];

  return (
    <div>
      <div className="fixed inset-0 z-0 bg-(image:--gradient-auth)" />
      <div className="pointer-events-none fixed -top-30 -right-25 z-0 size-130 rounded-full bg-(--blob-cyan) blur-[130px]" />
      <div className="pointer-events-none fixed -bottom-35 -left-20 z-0 size-120 rounded-full bg-(--blob-blue) blur-[130px]" />

      <div className="relative z-1 grid min-h-screen place-items-center p-6">
        {/* zoom .8 mengikuti keputusan universe-2 — kartu 760px muat nyaman
            di layar 1080–1200px tanpa scroll */}
        <main className="relative h-[760px] w-full max-w-[1200px] [zoom:0.8] max-lg:h-auto max-lg:max-w-[520px]">
          {/* ── panel kiri: foto + brand + hero (selalu dark di atas foto) ── */}
          <div
            data-theme="dark"
            className="absolute top-0 left-0 h-full w-[600px] overflow-hidden rounded-panel border border-(--glass-1-border) text-(--text-primary) max-lg:hidden"
          >
            <Image
              src="/login-bg.avif"
              alt=""
              fill
              sizes="600px"
              className="object-cover object-center"
              priority
              aria-hidden
            />
            {/* vignette radial dari referensi — menggelapkan tepi bawah foto */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg viewBox='0 0 600 760' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='0.8'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(5 33.35 -126.64 18.986 250 354.5)'><stop stop-color='rgba(249,246,238,0.12)' offset='0.534'/><stop stop-color='rgba(187,189,190,0.34)' offset='0.572'/><stop stop-color='rgba(125,133,142,0.56)' offset='0.610'/><stop stop-color='rgba(63,76,94,0.78)' offset='0.648'/><stop stop-color='rgba(1,19,46,1)' offset='0.686'/></radialGradient></defs></svg>")`,
              }}
            />

            <div className="relative z-10 flex h-full flex-col justify-between px-[60px] py-[50px]">
              {/* brand — kiri atas */}
              <div className="flex items-center gap-3">
                <div className="grid size-[46px] flex-none place-items-center rounded-full bg-(image:--gradient-logo) text-lg font-bold text-white shadow-[0_0_0_2px_rgba(255,255,255,.28),0_0_20px_rgba(0,212,255,.4)]">
                  U
                </div>
                <div className="leading-tight">
                  <p className="text-[28px] font-bold tracking-(--tracking-brand)">
                    {appName}
                  </p>
                  <p className="text-sm font-medium text-(--text-secondary)">
                    Fleet Automation System
                  </p>
                </div>
              </div>

              {/* hero + fitur — bawah */}
              <div className="flex flex-col gap-5">
                <div>
                  <h1 className="text-[40px] leading-tight font-bold">
                    {t.loginHero1}
                  </h1>
                  <h1 className="bg-(image:--gradient-cta) bg-clip-text text-[40px] leading-tight font-bold text-transparent">
                    {t.loginHero2}
                  </h1>
                </div>
                <p className="max-w-[418px] text-sm leading-relaxed text-(--text-secondary)">
                  {t.loginHeroDesc}
                </p>
                <div className="flex gap-3">
                  {features.map((f) => (
                    <div
                      key={f.label}
                      className="flex w-[120px] items-center gap-3 rounded-xl bg-[rgba(255,255,255,.08)] px-3 py-2.5"
                    >
                      <div className="grid size-[30px] flex-none place-items-center rounded-lg border border-(--badge-info-border) bg-(--badge-info-fill)">
                        <f.icon
                          className="size-5 text-(--color-primary-bright)"
                          strokeWidth={1.5}
                        />
                      </div>
                      <span className="text-[10px] leading-snug font-medium">
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── panel kanan: glass + form — overlap 21px di atas panel kiri ── */}
          <div className="absolute top-0 left-[579px] z-10 h-full w-[620px] rounded-panel glass-card max-lg:relative max-lg:left-0 max-lg:h-auto max-lg:w-full">
            <div className="flex h-full flex-col items-center justify-between px-20 py-10 max-lg:gap-8 max-lg:px-8">
              {/* logo + heading */}
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="grid size-24 place-items-center rounded-full bg-(image:--gradient-logo) text-4xl font-bold text-white shadow-[0_0_0_3px_var(--ring-avatar),0_0_28px_rgba(0,212,255,.4)]">
                  U
                </div>
                <div className="flex flex-col items-center gap-1">
                  <h2 className="text-[32px] font-bold tracking-(--tracking-brand)">
                    {t.loginWelcome}{" "}
                    <span role="img" aria-label="wave">
                      👋
                    </span>
                  </h2>
                  <p className="text-sm text-(--text-secondary)">
                    {t.loginWelcomeSub}
                  </p>
                </div>
              </div>

              {/* form */}
              <div className="w-full max-w-[458px]">
                <div
                  role="alert"
                  className={cn(
                    "mb-5 items-start gap-2 rounded-control border border-(--badge-danger-border) bg-(--badge-danger-fill) px-4 py-3 text-sm leading-normal text-(--color-danger-text)",
                    err ? "flex" : "hidden"
                  )}
                >
                  <CircleAlert className="mt-0.5 size-4 flex-none" />
                  <span>{t.loginErr}</span>
                </div>
                <form
                  onSubmit={onSubmit}
                  noValidate
                  className="flex flex-col gap-5"
                >
                  <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      {t.emailLabel}
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-(--text-tertiary)" />
                      <Input
                        ref={emailRef}
                        id="email"
                        type="email"
                        autoComplete="username"
                        placeholder="nama@unggul.co.id"
                        className="h-13 pl-12"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="pw" className="text-sm font-medium">
                      {t.pwLabel}
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-(--text-tertiary)" />
                      <Input
                        ref={pwRef}
                        id="pw"
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="h-13 pr-13 pl-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        aria-pressed={showPw}
                        aria-label={t.pwToggle}
                        className="absolute top-1/2 right-2.5 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-(--text-tertiary) hover:bg-(--fill-hover) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--color-primary)"
                      >
                        {showPw ? (
                          <EyeOff className="size-[17px]" />
                        ) : (
                          <Eye className="size-[17px]" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex cursor-pointer items-center gap-2 select-none">
                        <Checkbox id="remember" name="remember" />
                        <span className="text-xs text-(--text-secondary)">
                          {t.loginRemember}
                        </span>
                      </label>
                      <a
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="text-xs font-bold"
                      >
                        {t.forgotPw}
                      </a>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-3 inline-flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-(image:--gradient-cta) text-base font-bold text-(--color-on-cta) shadow-(--glow-cta) transition-[box-shadow,background-color,transform] duration-150 hover:-translate-y-px hover:bg-(image:--gradient-cta-hover) hover:shadow-[0_10px_28px_rgba(0,212,255,.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary) disabled:translate-y-0 disabled:cursor-progress"
                  >
                    {busy ? (
                      <Spinner className="size-4 border-[rgba(1,4,22,.3)] border-t-(--color-on-cta)" />
                    ) : null}
                    {busy ? t.loginChecking : t.loginBtn}
                  </button>
                  <p className="text-center text-xs text-(--text-secondary)">
                    {t.loginNoAcc}{" "}
                    <Link href="/register" className="font-bold">
                      {t.loginRegLink}
                    </Link>
                  </p>
                </form>
              </div>

              {/* copyright */}
              <p className="text-xs text-(--text-tertiary)">{t.loginCopy}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
