"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart2,
  Check,
  CircleAlert,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Truck,
  X,
} from "lucide-react";

import { authApi } from "@/lib/api/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/components/providers/app-store";
import { Input } from "@/components/ui/input";
import { LogoBadge, UniverseLogo } from "@/components/ui/logo";
import { Select } from "@/components/ui/select";

/* Register dua panel mengikuti referensi universe-2 (kartu 1300×900):
   kiri = register-bg + hero + fitur vertikal, kanan = form 2 kolom.
   State loading/sukses/gagal tampil sebagai kartu full-screen (unit-16). */

type FormState = "idle" | "loading" | "success" | "error";

const POSITIONS = [
  "Operator Dump Truck",
  "Operator Digger",
  "Foreman",
  "Supervisor",
  "Admin Roster",
];
const DEPARTMENTS = ["Operation", "Plant", "SDI", "HRGA", "SHE"];

const ctaClass =
  "inline-flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-(image:--gradient-cta) text-base font-bold text-on-cta shadow-(--glow-cta) transition-[box-shadow,background-color,transform] duration-150 hover:-translate-y-px hover:bg-(image:--gradient-cta-hover) hover:shadow-[0_10px_28px_rgba(0,212,255,.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function RegisterPage() {
  const { t } = useI18n();
  const { appName } = useAppStore();
  const [state, setState] = React.useState<FormState>("idle");
  const [errs, setErrs] = React.useState<string[]>([]);

  const [name, setName] = React.useState("");
  const [pos, setPos] = React.useState("");
  const [nik, setNik] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [conf, setConf] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [showConf, setShowConf] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const list: string[] = [];
    if (!name.trim()) list.push(t.errNama);
    if (!pos) list.push(`${t.regPos} — ${t.regPosPh.toLowerCase()}.`);
    if (!nik.trim()) list.push(`${t.regNik} — ${t.regNikPh.toLowerCase()}.`);
    if (!dept) list.push(`${t.regDept} — ${t.regDeptPh.toLowerCase()}.`);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) list.push(t.pfErrEmail);
    if (pw.length < 8)
      list.push(`${t.pwLabel} — ${t.pfPwErrLen.toLowerCase()}`);
    if (conf !== pw) list.push(t.pfPwErrConf);
    setErrs(list);
    if (list.length) return;
    setState("loading");
    try {
      await authApi.register({
        name: name.trim(),
        nik: nik.trim(),
        email: email.trim(),
        password: pw,
        dept,
        pos,
      });
      setState("success");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Registration failed";
      setErrs([msg]);
      setState("error");
    }
  }

  const features = [
    { icon: Clock, label: t.loginFeat1 },
    { icon: Truck, label: t.loginFeat2 },
    { icon: BarChart2, label: t.loginFeat3 },
  ];

  /* ── layar status: loading / sukses / gagal ── */
  if (state !== "idle") {
    return (
      <div data-theme="dark" className="text-(--text-primary)">
        <div className="fixed inset-0 z-0">
          <Image
            src="/unit-16.avif"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
            aria-hidden
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(2,6,23,.45) 0%, rgba(2,6,23,.6) 100%), radial-gradient(ellipse 200% 60% at 50% 50%, rgba(1,19,46,.3) 0%, rgba(1,6,20,.65) 100%)",
            }}
          />
        </div>

        <div className="relative z-1 flex min-h-screen flex-col">
          {/* bar atas: brand + kembali */}
          <div className="flex items-center justify-between px-10 py-6">
            <div className="flex items-center gap-3">
              <UniverseLogo className="size-9" />
              <div className="leading-tight">
                <p className="text-xl font-bold tracking-(--tracking-brand)">
                  {appName}
                </p>
                <p className="text-[11px] font-medium text-(--text-secondary)">
                  Fleet Automation System
                </p>
              </div>
            </div>
            {state !== "loading" ? (
              <button
                onClick={() => setState("idle")}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-control border border-(--glass-2-border) bg-[rgba(255,255,255,.06)] px-4 text-sm font-medium backdrop-blur-sm hover:bg-[rgba(255,255,255,.12)]"
              >
                <ArrowLeft className="size-4" />
                {t.regBack}
              </button>
            ) : null}
          </div>

          {/* kartu status */}
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="flex w-95 flex-col items-center gap-6 rounded-panel px-12 py-14 text-center glass-card">
              {state === "loading" ? (
                <>
                  <div className="size-24 animate-spin rounded-full border-[5px] border-[rgba(0,212,255,.2)] border-t-primary" />
                  <div className="flex flex-col gap-3">
                    <h2 className="text-[28px] font-bold">{t.regLoadingT}</h2>
                    <p className="text-sm leading-relaxed text-(--text-secondary)">
                      {t.regLoadingB}
                    </p>
                  </div>
                </>
              ) : state === "success" ? (
                <>
                  <div className="grid size-20 flex-none place-items-center rounded-full border-[3px] border-(--badge-success-border) bg-(--badge-success-fill)">
                    <Check
                      className="size-9 text-(--badge-success-text)"
                      strokeWidth={2.5}
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <h2 className="text-[28px] font-bold">{t.regOkT}</h2>
                    <p className="text-sm leading-relaxed text-(--text-secondary)">
                      {t.regOkB}
                    </p>
                  </div>
                  <Link href="/login" className={cn(ctaClass, "no-underline")}>
                    {t.loginBtn}
                  </Link>
                </>
              ) : (
                <>
                  <div className="grid size-20 flex-none place-items-center rounded-full border-[3px] border-dashed border-danger">
                    <X className="size-9 text-danger-text" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col gap-3">
                    <h2 className="text-[28px] font-bold">{t.regFailT}</h2>
                    <p className="text-sm leading-relaxed text-(--text-secondary)">
                      {t.regFailB}
                    </p>
                  </div>
                  <button onClick={() => setState("idle")} className={ctaClass}>
                    {t.regRetry}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── kartu register ── */
  return (
    <div>
      <div className="fixed inset-0 z-0 bg-(image:--gradient-auth)" />
      <div className="pointer-events-none fixed -top-30 left-[29%] z-0 size-130 rounded-full bg-(--blob-cyan) blur-[130px]" />
      <div className="pointer-events-none fixed -bottom-35 -left-20 z-0 size-120 rounded-full bg-(--blob-blue) blur-[130px]" />

      <div className="relative z-1 grid min-h-screen place-items-center p-6">
        <main className="relative h-225 w-full max-w-325 zoom-[0.8] max-lg:h-auto max-lg:max-w-140">
          {/* ── panel kiri: foto + hero + fitur ── */}
          <div
            data-theme="dark"
            className="absolute top-0 left-0 h-full w-147.5 overflow-hidden rounded-panel border border-(--glass-1-border) text-(--text-primary) max-lg:hidden"
          >
            <Image
              src="/register-bg.avif"
              alt=""
              fill
              sizes="590px"
              className="object-cover object-center"
              priority
              aria-hidden
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(2,6,23,.06) 0%, rgba(2,6,23,.15) 100%), radial-gradient(ellipse 211% 44% at 42% 47%, rgba(249,246,238,.1) 53%, rgba(1,19,46,.8) 69%)",
              }}
            />

            <div className="relative z-10 flex h-full flex-col justify-between px-15 py-12.5">
              <div className="flex items-center gap-3">
                <UniverseLogo priority className="size-11.5" />
                <div className="leading-tight">
                  <p className="text-[28px] font-bold tracking-(--tracking-brand)">
                    {appName}
                  </p>
                  <p className="text-sm font-medium text-(--text-secondary)">
                    Fleet Automation System
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xl font-medium text-(--text-secondary)">
                    {t.regCreateYour}
                  </p>
                  <h1 className="text-[40px] leading-tight font-bold">
                    {t.regHero1}
                  </h1>
                  <h1 className="bg-(image:--gradient-cta) bg-clip-text text-[40px] leading-tight font-bold text-transparent">
                    {t.regHero2}
                  </h1>
                </div>
                <p className="max-w-100 text-sm leading-relaxed text-(--text-secondary)">
                  {t.regHeroDesc}
                </p>
                <div className="flex flex-col gap-4 pt-2">
                  {features.map((f) => (
                    <div key={f.label} className="flex items-center gap-4">
                      <div className="grid size-10 flex-none place-items-center rounded-xl border border-(--badge-info-border) bg-(--badge-info-fill)">
                        <f.icon
                          className="size-5 text-primary-bright"
                          strokeWidth={1.5}
                        />
                      </div>
                      <span className="text-base font-semibold">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-(--text-tertiary)">{t.loginCopy}</p>
            </div>
          </div>

          {/* ── panel kanan: form — overlap 20px di atas panel kiri ── */}
          <div className="absolute top-0 left-142.5 z-10 h-full w-182.5 rounded-panel glass-card max-lg:relative max-lg:left-0 max-lg:h-auto max-lg:w-full">
            <div className="flex h-full flex-col items-center px-10 py-12.5 max-lg:px-8">
              <LogoBadge className="size-22.5" logoClassName="size-10" />
              <div className="mt-5 flex flex-col items-center gap-0.5 text-center">
                <h2 className="text-[32px] font-bold tracking-(--tracking-brand)">
                  {t.regTitle}
                </h2>
                <p className="text-sm text-(--text-secondary)">{t.regSub}</p>
              </div>

              <form
                onSubmit={onSubmit}
                noValidate
                className="mt-7.5 flex w-full flex-col gap-4"
              >
                <div
                  role="alert"
                  className={cn(
                    "items-start gap-2 rounded-control border border-(--badge-danger-border) bg-(--badge-danger-fill) px-4 py-3 text-sm leading-normal text-danger-text",
                    errs.length ? "flex" : "hidden"
                  )}
                >
                  <CircleAlert className="mt-0.5 size-4 flex-none" />
                  <span>
                    {t.regErrForm} {errs.join(" ")}
                  </span>
                </div>

                {/* baris 1 — nama + posisi */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 max-md:grid-cols-1">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="reg-name" className="text-sm font-medium">
                      {t.regName}
                    </label>
                    <Input
                      id="reg-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.regNamePh}
                      autoComplete="name"
                      className="h-12"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="reg-pos" className="text-sm font-medium">
                      {t.regPos}
                    </label>
                    <Select
                      id="reg-pos"
                      value={pos}
                      onChange={(e) => setPos(e.target.value)}
                      className="h-12"
                    >
                      <option value="">{t.regPosPh}</option>
                      {POSITIONS.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </Select>
                  </div>

                  {/* baris 2 — NIK + departemen */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="reg-nik" className="text-sm font-medium">
                      {t.regNik}
                    </label>
                    <Input
                      id="reg-nik"
                      value={nik}
                      onChange={(e) => setNik(e.target.value)}
                      placeholder={t.regNikPh}
                      inputMode="numeric"
                      className="h-12"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="reg-dept" className="text-sm font-medium">
                      {t.regDept}
                    </label>
                    <Select
                      id="reg-dept"
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      className="h-12"
                    >
                      <option value="">{t.regDeptPh}</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* email */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="reg-email" className="text-sm font-medium">
                    {t.emailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-(--text-tertiary)" />
                    <Input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.regEmailPh}
                      autoComplete="email"
                      className="h-12 pl-12"
                    />
                  </div>
                </div>

                {/* password + konfirmasi */}
                <PwField
                  id="reg-pw"
                  label={t.pwLabel}
                  placeholder={t.regPwPh}
                  value={pw}
                  onChange={setPw}
                  show={showPw}
                  onToggle={() => setShowPw((v) => !v)}
                  toggleLabel={t.pwToggle}
                />
                <PwField
                  id="reg-conf"
                  label={t.regPwConf}
                  placeholder={t.regPwConfPh}
                  value={conf}
                  onChange={setConf}
                  show={showConf}
                  onToggle={() => setShowConf((v) => !v)}
                  toggleLabel={t.pwToggle}
                />

                <button type="submit" className={cn(ctaClass, "mt-2")}>
                  {t.regBtn}
                </button>

                <div className="flex items-center gap-3">
                  <hr className="flex-1 border-(--divider)" />
                  <span className="text-xs text-(--text-tertiary)">
                    {t.regOr}
                  </span>
                  <hr className="flex-1 border-(--divider)" />
                </div>

                <p className="text-center text-xs text-(--text-secondary)">
                  {t.regHaveAcc}{" "}
                  <Link href="/login" className="font-bold">
                    {t.regLoginLink}
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* field password dengan ikon gembok + toggle lihat */
function PwField({
  id,
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggle,
  toggleLabel,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  toggleLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-(--text-tertiary)" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="h-12 pr-13 pl-12"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={show}
          aria-label={toggleLabel}
          className="absolute top-1/2 right-2.5 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-(--text-tertiary) hover:bg-(--fill-hover) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-primary"
        >
          {show ? (
            <EyeOff className="size-4.25" />
          ) : (
            <Eye className="size-4.25" />
          )}
        </button>
      </div>
    </div>
  );
}
