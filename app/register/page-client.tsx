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

import { authApi, errorDetail } from "@/lib/api";
import { useAuthPageConfig } from "@/lib/auth-page-config";
import { useI18n } from "@/lib/i18n";
import { passwordIssues } from "@/lib/password";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/layout/footer";
import { useAppStore } from "@/components/providers/app-store";
import { AuthSlideshow } from "@/components/ui/auth-slideshow";
import { Input } from "@/components/ui/input";
import { LogoBadge, UniverseLogo } from "@/components/ui/logo";
import { Select } from "@/components/ui/select";

/* SATU kartu glass 1300×900 berisi dua kolom: kiri slideshow foto (berganti
   otomatis tiap 5 detik) + hero + fitur vertikal, kanan form 2 kolom.
   Menggantikan layout dua panel terpisah-overlap dari referensi universe-2.

   Opsi Posisi & Departemen tidak lagi hardcoded — datang dari backend
   (GET /api/auth/page-config) dan dikelola superadmin di Settings → Halaman
   Auth; lib/auth-page-config.ts menyediakan fallback saat server mati.
   State loading/sukses/gagal tampil sebagai kartu full-screen (unit-16). */

type FormState = "idle" | "loading" | "success" | "error";

const ctaClass =
  "inline-flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-(image:--gradient-cta) text-base font-bold text-on-cta shadow-(--glow-cta) transition-[box-shadow,background-color,transform] duration-150 hover:-translate-y-px hover:bg-(image:--gradient-cta-hover) hover:shadow-[0_10px_28px_rgba(0,212,255,.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function RegisterPage() {
  const { t } = useI18n();
  const { appName } = useAppStore();
  const { slides, positions, departments } = useAuthPageConfig();
  const [state, setState] = React.useState<FormState>("idle");
  const [errs, setErrs] = React.useState<string[]>([]);
  /* Alasan penolakan dari backend — NIK sudah terpakai, NIK bukan 9 digit,
     email (bila diisi) sudah dipakai, dan seterusnya. null berarti pakai
     teks umum t.regFailB. */
  const [failMsg, setFailMsg] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [pos, setPos] = React.useState("");
  const [nik, setNik] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [conf, setConf] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [showConf, setShowConf] = React.useState(false);

  /* Validasi di bawah tetap dijalankan lebih dulu supaya pengguna dapat
     seluruh kesalahan formulir sekaligus tanpa menunggu jaringan. Aturannya
     dijaga SAMA dengan backend (internal/service/auth_service.go +
     internal/pkg/validate.go): nama maks 100, NIK persis 9 digit, password
     min 8 mengandung huruf & angka (maks 72). Backend memvalidasi ulang
     semuanya — yang di sini murni kenyamanan, bukan pengganti. */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const list: string[] = [];
    if (!name.trim()) list.push(t.errNama);
    else if (name.trim().length > 100) list.push(t.regNameErrMax);
    if (!pos) list.push(`${t.regPos} — ${t.regPosPh.toLowerCase()}.`);
    if (!/^\d{9}$/.test(nik.trim())) list.push(t.regNikErr);
    if (!dept) list.push(`${t.regDept} — ${t.regDeptPh.toLowerCase()}.`);
    /* Email OPSIONAL — identitas akun adalah NIK. Formatnya diperiksa hanya
       bila diisi; backend memvalidasi ulang dan menolak email yang sudah
       dipakai akun lain. */
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()))
      list.push(t.regEmailErr);
    /* Kode isu dari lib/password — sumber aturan yang sama dengan halaman
       Users, cermin dari IsPasswordStrong di backend. */
    for (const issue of passwordIssues(pw)) {
      list.push(
        issue === "len"
          ? t.umPwErrLen
          : issue === "num"
            ? t.umPwErrNum
            : t.umPwErrLetter
      );
    }
    /* Backend membatasi password 72 BYTE (auth_service.go), bukan 72
       karakter — hitung byte agar password multibyte tidak lolos klien
       lalu ditolak 422 server. maxLength=72 pada input tetap sebagai
       pagar kenyamanan saja. */
    if (new TextEncoder().encode(pw).length > 72) list.push(t.regPwErrMax);
    if (conf !== pw) list.push(t.pfPwErrConf);
    setErrs(list);
    if (list.length) return;
    setState("loading");
    setFailMsg(null);

    try {
      /* Role akun baru ditentukan setting "Role pendaftar baru" di backend
         (Settings → Halaman Auth; bawaan Viewer). Tidak ada token yang
         dikembalikan, jadi pengguna tetap harus login setelah ini. */
      await authApi.register({
        name: name.trim(),
        nik: nik.trim(),
        email: email.trim(),
        password: pw,
        dept,
        pos,
      });
      setState("success");
    } catch (e2) {
      /* errorDetail merangkai pesan per-field dari 422 ("NIK harus 9 digit",
         "email sudah terdaftar") — bukan "Validation failed" yang generik. */
      setFailMsg(errorDetail(e2, t.regFailB));
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
                      {failMsg ?? t.regFailB}
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
        <main className="relative flex h-225 w-full max-w-325 zoom-[0.8] overflow-hidden rounded-panel glass-card max-lg:h-auto max-lg:max-w-140">
          {/* ── kolom kiri: slideshow + hero + fitur ── */}
          <div
            data-theme="dark"
            className="relative w-[45%] flex-none overflow-hidden text-(--text-primary) max-lg:hidden"
          >
            <AuthSlideshow slides={slides}>
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(2,6,23,.06) 0%, rgba(2,6,23,.15) 100%), radial-gradient(ellipse 211% 44% at 42% 47%, rgba(249,246,238,.1) 53%, rgba(1,19,46,.8) 69%)",
                }}
              />
            </AuthSlideshow>

            {/* pointer-events-none: konten kiri murni dekoratif — biarkan
                klik tembus ke dot navigasi slideshow di bawahnya */}
            <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between px-15 py-12.5">
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

              <div className="flex flex-col gap-4 pb-6">
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
            </div>
          </div>

          {/* ── kolom kanan: form — masih dalam kartu yang sama ── */}
          <div className="flex min-w-0 flex-1 flex-col items-center px-12 py-10 max-lg:px-8">
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
                    maxLength={100}
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
                    {positions.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </Select>
                </div>

                {/* baris 2 — NIK + departemen */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="reg-nik" className="text-sm font-medium">
                    {t.regNik}
                  </label>
                  {/* NIK backend wajib persis 9 digit — karakter non-angka
                      disaring saat mengetik/menempel, lalu dipotong di 9.
                      Bukan maxLength: browser memotong tempelan "503 264 133"
                      SEBELUM pemisahnya dibuang. */}
                  <Input
                    id="reg-nik"
                    value={nik}
                    onChange={(e) =>
                      setNik(e.target.value.replace(/\D/g, "").slice(0, 9))
                    }
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
                    {departments.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* email — opsional; NIK di atas yang menjadi identitas login */}
              <div className="flex flex-col gap-2">
                <label htmlFor="reg-email" className="text-sm font-medium">
                  {t.regEmailOptional}
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

              {/* password + konfirmasi — syarat tampil PROAKTIF sebagai
                  helper, bukan baru muncul setelah submit gagal */}
              <PwField
                id="reg-pw"
                label={t.pwLabel}
                placeholder={t.regPwPh}
                value={pw}
                onChange={setPw}
                show={showPw}
                onToggle={() => setShowPw((v) => !v)}
                toggleLabel={t.pwToggle}
                helper={t.umPwHelp}
                maxLength={72}
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
                maxLength={72}
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

            {/* copyright + versi — pindah dari panel foto agar dot slideshow
                punya ruang di bawah */}
            <Footer className="mt-auto pt-4" />
          </div>
        </main>
      </div>
    </div>
  );
}

/* field password dengan ikon gembok + toggle lihat; `helper` opsional untuk
   menampilkan syarat password di bawah kontrol (gaya helper kit Field) */
function PwField({
  id,
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggle,
  toggleLabel,
  helper,
  maxLength,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  toggleLabel: string;
  helper?: string;
  maxLength?: number;
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
          maxLength={maxLength}
          aria-describedby={helper ? `${id}-help` : undefined}
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
      {helper ? (
        <span id={`${id}-help`} className="text-xs text-(--text-tertiary)">
          {helper}
        </span>
      ) : null}
    </div>
  );
}
