"use client";

import * as React from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";

import { errorMessage, profileApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/components/providers/app-store";
import { usePermissions } from "@/components/providers/permissions";
import { useSession } from "@/components/providers/session";
import { Avatar, initialsOf } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormGrid } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageTitle, Panel, SectionTitle } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";

export default function ProfilePage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { userName, setUserName, userEmail, setUserEmail } = useAppStore();

  /* Dulu akun sesi dipatok konstanta SESSION_UID = "u1"; sekarang diambil
     dari sesi yang benar-benar login, jadi halaman ini mengikuti siapa pun
     yang masuk. */
  const { user: me, roles: allRoles } = usePermissions();
  const { applyUserPatch } = useSession();
  const roleNames = (me?.roles ?? []).flatMap((rid) => {
    const role = allRoles.find((r) => r.id === rid);
    return role ? [role.name] : [];
  });

  const [name, setName] = React.useState(userName);
  const [email, setEmail] = React.useState(userEmail);

  /* Sesi baru terbaca setelah hydrate, jadi form diisi ulang begitu akun yang
     login diketahui. Memakai pola resmi React "menyesuaikan state saat render"
     — bukan useEffect — supaya tidak ada render berantai. Hanya berjalan saat
     identitasnya berganti, bukan tiap kali record-nya berubah. */
  const [seededFor, setSeededFor] = React.useState<string | null>(null);
  if (me && seededFor !== me.id) {
    setSeededFor(me.id);
    setName(me.kar ?? "");
    setEmail(me.email);
  }

  /* password opsional — dikosongkan berarti tidak diganti */
  const [pwCur, setPwCur] = React.useState("");
  const [pwNew, setPwNew] = React.useState("");
  const [pwConf, setPwConf] = React.useState("");
  const [err, setErr] = React.useState<{
    name?: boolean;
    email?: boolean;
    cur?: boolean;
    nw?: boolean;
    conf?: boolean;
  }>({});

  async function save() {
    if (!me) return;
    const wantPw = Boolean(pwCur || pwNew || pwConf);
    const e = {
      name: !name.trim(),
      email: !/^\S+@\S+\.\S+$/.test(email.trim()),
      cur: wantPw && !pwCur,
      nw: wantPw && pwNew.length < 8,
      conf: wantPw && pwConf !== pwNew,
    };
    setErr(e);
    if (Object.values(e).some(Boolean)) return;

    const nextName = name.trim();
    const nextEmail = email.trim();

    /* Profil dan password adalah DUA endpoint terpisah di backend, jadi
       dikirim berurutan — profil dulu. Kalau ganti password gagal (mis.
       password lama salah), perubahan nama/email yang sudah tersimpan tetap
       sah; pengguna cukup mengulang bagian passwordnya. */
    try {
      await profileApi.updateProfile({ name: nextName, email: nextEmail });
    } catch (e2) {
      pushToast("error", t.pfSavedT, errorMessage(e2, t.pfErrEmail));
      return;
    }

    if (wantPw) {
      /* Password lama TIDAK lagi dicocokkan di browser: digest-nya memang
         tidak pernah dikirim ke klien (tag json:"-" di model.User). Server
         yang memverifikasi, dan menjawab 400 bila salah. */
      try {
        await profileApi.updatePassword({
          oldPassword: pwCur,
          newPassword: pwNew,
          confirmPassword: pwConf,
        });
      } catch (e2) {
        setErr((p) => ({ ...p, cur: true }));
        pushToast("error", t.pfPwSavedT, errorMessage(e2, t.pfPwErrCur));
        return;
      }
    }

    /* Sesi menyimpan salinan user; ditambal supaya topbar & sapaan langsung
       ikut berubah tanpa perlu login ulang. */
    applyUserPatch({ kar: nextName, email: nextEmail });
    setUserName(nextName);
    setUserEmail(nextEmail);

    if (wantPw) {
      setPwCur("");
      setPwNew("");
      setPwConf("");
      pushToast("success", t.pfPwSavedT, t.pfPwSavedD);
    } else {
      pushToast("success", t.pfSavedT, t.pfSavedD);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <PageTitle title={t.profile} sub={t.pfSub} />
      <Panel className="max-w-190">
        {/* identitas akun — NIK & role cukup tampil di sini (read-only) */}
        <div className="mb-5 flex items-center gap-4">
          <Avatar className="size-14 text-lg">{initialsOf(userName)}</Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <b className="truncate text-lg font-semibold">{userName}</b>
              {roleNames.map((r) => (
                <Badge key={r} variant="info">
                  {r}
                </Badge>
              ))}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 font-mono text-[13px] text-(--text-tertiary)">
              <span>{userEmail}</span>
              <span>NIK {me?.nik ?? "—"}</span>
            </div>
          </div>
        </div>
        <FormGrid>
          <Field
            label={t.pfName}
            htmlFor="pf-name"
            required
            error={err.name}
            errorMessage={t.errNama}
          >
            <Input
              id="pf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field
            label={t.pfEmail}
            htmlFor="pf-email"
            required
            error={err.email}
            errorMessage={t.pfErrEmail}
          >
            <Input
              id="pf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        </FormGrid>

        <div className="my-5 border-t border-(--divider)" />

        {/* --- ubah password --- */}
        <SectionTitle className="mb-1">
          <KeyRound />
          {t.pfPwT}
        </SectionTitle>
        <p className="mb-4 text-sm text-(--text-secondary)">{t.pfPwOpt}</p>
        <div className="grid grid-cols-3 gap-x-6 gap-y-5 max-md:grid-cols-1">
          <Field
            label={t.pfPwCur}
            htmlFor="pf-pw-cur"
            error={err.cur}
            errorMessage={t.pfPwErrCur}
          >
            <PwInput
              id="pf-pw-cur"
              autoComplete="current-password"
              value={pwCur}
              onChange={setPwCur}
            />
          </Field>
          <Field
            label={t.pfPwNew}
            htmlFor="pf-pw-new"
            helper={t.pfPwHelp}
            error={err.nw}
            errorMessage={t.pfPwErrLen}
          >
            <PwInput
              id="pf-pw-new"
              autoComplete="new-password"
              value={pwNew}
              onChange={setPwNew}
            />
          </Field>
          <Field
            label={t.pfPwConf}
            htmlFor="pf-pw-conf"
            error={err.conf}
            errorMessage={t.pfPwErrConf}
          >
            <PwInput
              id="pf-pw-conf"
              autoComplete="new-password"
              value={pwConf}
              onChange={setPwConf}
            />
          </Field>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={save}>{t.pfSave}</Button>
        </div>
      </Panel>
    </div>
  );
}

/* input password dengan toggle lihat/sembunyikan — pola sama dengan login */
function PwInput({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const { t } = useI18n();
  const [show, setShow] = React.useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder="••••••••"
        className="pr-13"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        aria-label={t.pwToggle}
        className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-(--text-tertiary) hover:bg-(--fill-hover) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-primary"
      >
        {show ? (
          <EyeOff className="size-4.25" />
        ) : (
          <Eye className="size-4.25" />
        )}
      </button>
    </div>
  );
}
