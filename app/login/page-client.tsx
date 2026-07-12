"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Eye, EyeOff } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { Spinner } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { appName, appDesc } = useAppStore();
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

  return (
    <div>
      <div className="fixed inset-0 z-0 bg-(image:--gradient-auth)" />
      <div className="pointer-events-none fixed -top-30 -right-25 z-0 size-130 rounded-full bg-(--blob-cyan) blur-[130px]" />
      <div className="pointer-events-none fixed -bottom-35 -left-20 z-0 size-120 rounded-full bg-(--blob-blue) blur-[130px]" />
      <div className="relative z-1 grid min-h-screen place-items-center p-6">
        <div className="w-[min(440px,100%)]">
          <main className="w-full rounded-panel px-8 py-10 glass-card">
            <div className="mb-8 flex flex-col items-center gap-3 text-center">
              <div className="grid size-16 place-items-center rounded-full bg-(image:--gradient-logo) text-[26px] font-bold text-white shadow-[0_0_0_3px_var(--ring-avatar),0_0_28px_rgba(0,212,255,.4)]">
                U
              </div>
              <div>
                <h1 className="text-xl font-bold">{appName}</h1>
                <p className="text-xs text-(--text-tertiary)">{appDesc}</p>
              </div>
            </div>
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
            <form onSubmit={onSubmit} noValidate>
              <div className="mb-5 flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium">
                  {t.emailLabel}
                </label>
                <Input
                  ref={emailRef}
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="nama@unggul.co.id"
                  className="h-11"
                />
              </div>
              <div className="mb-5 flex flex-col gap-2">
                <label htmlFor="pw" className="text-sm font-medium">
                  {t.pwLabel}
                </label>
                <div className="relative">
                  <Input
                    ref={pwRef}
                    id="pw"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 pr-13"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-pressed={showPw}
                    aria-label={t.pwToggle}
                    className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-(--text-tertiary) hover:bg-(--fill-hover) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--color-primary)"
                  >
                    {showPw ? (
                      <EyeOff className="size-[17px]" />
                    ) : (
                      <Eye className="size-[17px]" />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-(image:--gradient-cta) text-base font-bold text-(--color-on-cta) shadow-(--glow-cta) transition-[box-shadow,background-color,transform] duration-150 hover:-translate-y-px hover:bg-(image:--gradient-cta-hover) hover:shadow-[0_10px_28px_rgba(0,212,255,.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary) disabled:translate-y-0 disabled:cursor-progress"
              >
                {busy ? (
                  <Spinner className="size-4 border-[rgba(1,4,22,.3)] border-t-(--color-on-cta)" />
                ) : null}
                {busy ? t.loginChecking : t.loginBtn}
              </button>
            </form>
            <div className="mt-5 text-center text-sm">
              <a href="#" onClick={(e) => e.preventDefault()}>
                {t.forgotPw}
              </a>
            </div>
          </main>
          <p className="mt-6 text-center text-xs text-(--text-tertiary)">
            {t.loginFootnote}
          </p>
        </div>
      </div>
    </div>
  );
}
