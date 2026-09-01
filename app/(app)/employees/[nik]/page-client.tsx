"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CircleAlert,
  Heart,
  House,
  IdCard,
  Pencil,
} from "lucide-react";

import { assetUrl, employeesApi, isApiError } from "@/lib/api";
import { toEmployee, toKomp } from "@/lib/api/adapters";
import type { Employee } from "@/lib/data/employees";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/components/providers/permissions";
import { useSession } from "@/components/providers/session";
import { initialsOf } from "@/components/ui/avatar";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, Spinner } from "@/components/ui/button";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { StateBox } from "@/components/ui/state-box";

function Kv({ children }: { children: React.ReactNode }) {
  return (
    /* Kolom label 180px sudah lebih dari separuh layar 360px, jadi di ponsel
       pasangan label–nilai ditumpuk. Jarak antar-pasangan diberikan lewat
       margin pada <dt>, bukan gap: dalam satu kolom, gap yang sama membuat
       label dan nilainya berjarak sama dengan jarak antar-baris sehingga
       pengelompokannya hilang. */
    <dl className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-3 text-sm max-sm:grid-cols-1 max-sm:gap-y-0 max-sm:[&_dt]:mt-3 max-sm:[&_dt:first-child]:mt-0">
      {children}
    </dl>
  );
}

function KvRow({
  label,
  mono,
  children,
}: {
  label: React.ReactNode;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-(--text-tertiary)">{label}</dt>
      <dd className={mono ? "font-mono" : "font-medium"}>
        {children || <span className="text-(--text-tertiary)">—</span>}
      </dd>
    </>
  );
}

/* Tingkat Pantau riwayat medis — warna mengikuti bobot pengawasan */
const pantauTone: Record<string, BadgeVariant> = {
  low: "success",
  medium: "warning",
  high: "danger",
};
const pantauLabel: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function expTone(exp: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${exp}T00:00:00`);
  if (d.getTime() < today.getTime()) return "text-danger-text";
  const days = (d.getTime() - today.getTime()) / 86400000;
  return days <= 60 ? "text-(--badge-warning-text)" : "text-(--text-tertiary)";
}

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ nik: string }>;
}) {
  const { nik } = React.use(params);
  const { t } = useI18n();
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can("employees", "manage");
  const canSeeMed = can("medical");

  /* Grant `medical` yang baru diberikan lewat Users & Roles tidak terlihat
     tab yang sudah terbuka (permission sesi = snapshot saat muat) — sekali
     refresh diam-diam membuatnya berlaku tanpa login ulang. Sama seperti di
     employee-form. */
  const { refresh: refreshSession } = useSession();
  const medRefreshTried = React.useRef(false);
  React.useEffect(() => {
    if (canSeeMed || medRefreshTried.current) return;
    medRefreshTried.current = true;
    void refreshSession().catch(() => {});
  }, [canSeeMed, refreshSession]);

  /* Dimuat sendiri dari backend, BUKAN dari daftar di store: dengan begitu
     refresh dan deep-link /employees/:nik tetap bekerja tanpa harus mampir
     ke halaman list dulu. Kompetensi ikut ditarik dari endpoint-nya sendiri
     supaya yang tampil selalu daftar tersimpan, bukan sisa preload. */
  const [emp, setEmp] = React.useState<Employee | null>(null);
  const [loadErr, setLoadErr] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([
      employeesApi.getEmployee(nik),
      employeesApi.getCompetencies(nik),
    ])
      .then(([e, comps]) => {
        if (cancelled) return;
        setEmp({ ...toEmployee(e), komp: (comps ?? []).map(toKomp) });
        setLoadErr(false);
      })
      .catch((e2) => {
        if (cancelled) return;
        /* NIK tidak dikenal (atau bukan 9 digit) — kembali ke daftar, sama
           dengan perilaku lama saat record tidak ditemukan di seed */
        if (isApiError(e2) && (e2.status === 404 || e2.isValidation)) {
          router.replace("/employees");
          return;
        }
        setLoadErr(true);
      });
    return () => {
      cancelled = true;
    };
  }, [nik, reloadKey, router]);

  if (loadErr) {
    return (
      <Panel>
        <StateBox
          icon={<CircleAlert className="text-danger-text" />}
          title={t.apLoadErrT}
          body={t.empLoadErrB}
        >
          <div className="flex justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push("/employees")}
            >
              <ArrowLeft />
              {t.back}
            </Button>
            <Button
              onClick={() => {
                setLoadErr(false);
                setReloadKey((k) => k + 1);
              }}
            >
              {t.apRetry}
            </Button>
          </div>
        </StateBox>
      </Panel>
    );
  }

  if (!emp)
    return (
      <div className="grid place-items-center py-16">
        <Spinner className="size-6" />
      </div>
    );

  const komps = emp.komp ?? [];
  const statusMap: Record<Employee["status"], { v: BadgeVariant; l: string }> =
    {
      aktif: { v: "success", l: "Aktif" },
      cuti: { v: "neutral", l: t.stCuti },
      nonaktif: { v: "danger", l: t.stNonaktif },
    };
  const st = statusMap[emp.status];
  const fotoSrc = assetUrl(emp.foto);

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-6">
          {fotoSrc ? (
            /* foto dari /uploads backend — di luar kendali optimizer Next,
               pola <img> yang sama dengan slideshow halaman auth */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoSrc}
              alt={emp.name}
              className="size-24 flex-none rounded-card object-cover shadow-[0_0_0_3px_var(--ring-avatar),0_0_24px_rgba(0,212,255,.3)]"
            />
          ) : (
            <div className="grid size-24 flex-none place-items-center rounded-card bg-(image:--gradient-cta) text-[28px] font-bold text-on-cta shadow-[0_0_0_3px_var(--ring-avatar),0_0_24px_rgba(0,212,255,.3)]">
              {initialsOf(emp.name)}
            </div>
          )}
          <div className="min-w-65 flex-1">
            <h1 className="text-2xl font-bold">{emp.name}</h1>
            <div className="mt-0.5 font-mono text-sm text-(--text-secondary)">
              NIK {emp.nik} · {emp.company}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={st.v} dot>
                {st.l}
              </Badge>
              {komps[0] ? (
                <Badge variant="info" dot>
                  {komps[0].cls}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push("/employees")}
            >
              <ArrowLeft />
              {t.back}
            </Button>
            {canManage ? (
              <Button onClick={() => router.push(`/employees/${emp.nik}/edit`)}>
                <Pencil />
                {t.empChange}
              </Button>
            ) : null}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-6 max-[1360px]:grid-cols-1">
        <Panel>
          <SectionTitle>
            <Briefcase />
            {t.secEmployment}
          </SectionTitle>
          <Kv>
            <KvRow label={t.kCompany}>{emp.company}</KvRow>
            <KvRow label={t.thDept}>{emp.dept}</KvRow>
            <KvRow label={t.thPos}>{emp.pos}</KvRow>
            <KvRow label="Equipment type">{emp.equip}</KvRow>
            <KvRow label={t.kJoin} mono>
              {emp.join}
            </KvRow>
            <KvRow label={t.kExp} mono>
              {emp.exp}
            </KvRow>
          </Kv>
        </Panel>

        <Panel>
          <SectionTitle>
            <IdCard />
            {t.efKompT}
          </SectionTitle>
          <div className="flex flex-col gap-3">
            {komps.length ? (
              komps.map((k) => (
                <div key={k.cls} className="flex items-center gap-3">
                  {/* eq = kode Eq. Class ("Pilih Kompetensi"); cls = Type EGI
                      yang dicocokkan auto-alokasi. Baris lawas tanpa eq tetap
                      tampil wajar. */}
                  {k.eq ? <Badge variant="info">{k.eq}</Badge> : null}
                  <span className="text-sm font-medium">{k.cls}</span>
                  <span
                    className={cn("ml-auto font-mono text-xs", expTone(k.exp))}
                  >
                    s/d {k.exp}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-sm text-(--text-tertiary)">
                {t.edKompNone}
              </span>
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle>
            <Heart />
            {t.secMedical}
          </SectionTitle>
          <Kv>
            {/* Riwayat Medis (Tingkat Pantau + catatan) hanya untuk pemegang
                modul `medical` — backend mengirim kosong bagi yang lain, jadi
                barisnya disembunyikan alih-alih menampilkan "—" menyesatkan */}
            {canSeeMed ? (
              <>
                <KvRow label={t.kPantau}>
                  {emp.medMonitor ? (
                    <Badge variant={pantauTone[emp.medMonitor] ?? "neutral"}>
                      {pantauLabel[emp.medMonitor] ?? emp.medMonitor}
                    </Badge>
                  ) : null}
                </KvRow>
                <KvRow label={t.kMedHistory}>{emp.medis}</KvRow>
              </>
            ) : null}
            <KvRow label={t.kBlood}>{emp.blood}</KvRow>
            <KvRow label="BPJS Kesehatan" mono>
              {emp.bpjs}
            </KvRow>
          </Kv>
        </Panel>

        <Panel>
          <SectionTitle>
            <House />
            {t.secMess}
          </SectionTitle>
          <Kv>
            <KvRow label="Mess">{emp.mess}</KvRow>
            <KvRow label={t.kRoom} mono>
              {emp.kamar}
            </KvRow>
            <KvRow label={t.kPhone} mono>
              {emp.hp}
            </KvRow>
            <KvRow label={t.kEmergency}>{emp.emg}</KvRow>
          </Kv>
        </Panel>
      </div>
    </div>
  );
}
