/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/types.ts
 *
 * Shared TypeScript types matching the backend Go models & API response shapes.
 * These are the canonical frontend types — all API service files import from here.
 * ────────────────────────────────────────────────────────────────────────── */

// ── Generic API Response Envelope ──────────────────────────────────────────

/** Standard backend response wrapper (pkg/response/api.go) */
export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type PagedData<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  errors?: { field?: string; message: string }[];
  timestamp: string;
};

// ── Auth ──────────────────────────────────────────────────────────────────

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  nik: string;
  email: string;
  password: string;
  dept: string;
  pos: string;
};

export type AuthUser = {
  id: number;
  email: string;
  kar: string; // name (backend json tag "kar")
  nik: string | null;
  on: boolean; // isActive
  roles: string[];
  pwAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthPerms = Record<string, string>; // module → "view"|"manage"|"none"

export type LoginResponse = {
  token: string;
  user: AuthUser;
  perms: AuthPerms;
};

// ── Employee ──────────────────────────────────────────────────────────────

export type Competency = {
  cls: string;
  simper: string;
  exp: string;
};

export type Employee = {
  id: number;
  nik: string;
  name: string;
  dept: string;
  pos: string;
  simper: string;
  simperExp: string;
  status: string;
  company: string;
  equip: string;
  join: string;
  exp: string;
  license: string;
  mcu: string;
  medis: string;
  blood: string;
  bpjs: string;
  mess: string;
  kamar: string;
  hp: string;
  emg: string;
  foto?: string;
  komp?: Competency[];
  mcuExp?: string;
  ind?: string;
  birth?: string;
  religion?: string;
  marital?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyName?: string;
  emergencyRel?: string;
  emergencyPhone?: string;
  createdAt: string;
  updatedAt: string;
};

// ── Fit to Work ───────────────────────────────────────────────────────────

export type FTWStatus = "fit" | "spare" | "pulang" | "belum";

export type FTWRecord = {
  nik: string;
  name: string;
  dept: string;
  shift: string;
  sleepMin: number | null;
  sleep: string;
  st: FTWStatus;
  restHours: number;
  hist: number[];
  canWork: boolean;
  sendTime: string;
  date: string;
  submittedAt: string;
};

export type FTWHistEntry = {
  d: number;
  iso: string;
  date: string;
  st: number;
  sleepMin: number | null;
  sleep: string;
  status: FTWStatus;
  restHours: number;
  sendTime: string;
};

// ── Roster ────────────────────────────────────────────────────────────────

export type RosterMeta = {
  key: number;
  label: string;
  month: string;
  dept: string;
  file: string;
  emp: number;
  rows: string;
  by: string;
  dateISO: string;
  status: string;
  createdAt: string;
};

export type RosterPreviewRow = {
  nik: string;
  name: string;
  codes: Record<number, string>;
};

export type RosterValidationError = {
  row: string;
  nik: string;
  emp: string;
  issue: string;
  issueEn: string;
  badgeVariant: "danger" | "warning";
  badge: string;
};

export type RosterValidation = {
  preview: RosterPreviewRow[];
  days: string[];
  errors: RosterValidationError[];
  validCount: number;
  dupCount: number;
  errCount: number;
};

export type ShiftCodeGroup = {
  group: string;
  groupEn: string;
  codes: { k: string; v: string; vEn: string }[];
};

export type RosterRevision = {
  id: number;
  sid: string;
  nik: string;
  name: string;
  whatId: string;
  whatEn: string;
  whenId: string;
  whenEn: string;
  targetDate?: string;
  status: string;
  byId?: string;
  byEn?: string;
  createdAt: string;
};

export type AttendanceRow = {
  nik: string;
  name: string;
  dept: string;
  code: string;
  in: string;
  inM: string;
  out: string;
  outM: string;
  st: string;
  date?: string;
};

export type RosterExportRow = {
  nik: string;
  name: string;
  dept: string;
  pos: string;
  schedules: Record<number, string>;
};

// ── Fleet / Assets ────────────────────────────────────────────────────────

export type UnitStatus = "ready" | "breakdown" | "standby";

export type UnitHist = [string, string, string, string];

export type Unit = {
  code: string;
  type: string;
  status: UnitStatus;
  loc: string;
  upd: string;
  hist: UnitHist[];
};

export type FleetSetting = {
  id: number;
  digger: string;
  loc: string;
  bus: string;
  active: boolean;
  units: string[];
};

export type FleetAlloc = {
  id: number;
  date: string;
  shift: string;
  flId: number;
  digger: string;
  loc: string;
  bus: string;
  units: Record<string, string>;
};

/** Nested allocation format: date → shift → unitCode → operatorNIK */
export type FleetAllocResponse = Record<
  string,
  Record<string, Record<string, string>>
>;

export type UnitDb = {
  id: number;
  code: string;
  egi: string;
  product: string;
  cls: string;
  cat: string;
  area: string;
  active: boolean;
  standby: boolean;
  breakdown: boolean;
  loc: string;
  upd: string;
  by: string;
  createdAt: string;
  updatedAt: string;
};

// ── Prestasi ──────────────────────────────────────────────────────────────

export type PrestasiRecord = {
  nik: string;
  name: string;
  dept: string;
  pos: string;
  foto?: string;
  rank: number;
  points: number;
  bestStreak: number;
  currentStreak: number;
  attCount: number;
  sleepPct: number;
  attRate: number;
  sleepRate: number;
  avgSleepMin: number;
  badges: string[];
  lateCount: number;
  penaltyDays: number;
  qualifiedDays: number;
  scheduledDays: number;
  coverDays: number;
  days?: PrestasiDay[];
};

export type PrestasiDay = {
  iso: string;
  code: string;
  unitCode?: string;
  att: string;
  clockIn: string;
  late: boolean;
  sleepMin: number;
  attOk: boolean;
  sleepOk: boolean;
  ftwStatus: string;
  restHours: number;
  outcome: string;
  counterpartNik?: string;
  counterpartName?: string;
  points: number;
};

// ── Master Data ───────────────────────────────────────────────────────────

export type MdCat =
  | "egi"
  | "product"
  | "eqclass"
  | "area"
  | "tempudo"
  | "bus"
  | "lokasiex"
  | "mess"
  | "runtext";

export type MasterEntry = {
  id: number;
  code: string;
  name: string;
  active: boolean;
  [key: string]: unknown; // category-specific extra fields
};

// ── User Management ───────────────────────────────────────────────────────

export type ApiUser = {
  id: number;
  email: string;
  kar: string; // name
  nik: string | null;
  on: boolean;
  roles: string[];
  pwAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiRole = {
  id: number;
  name: string;
  desc: string;
  locked: boolean;
  perms: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

// ── Notifications ─────────────────────────────────────────────────────────

export type NotifTone = "info" | "success" | "warning" | "danger";

export type Notification = {
  id: number;
  userId?: number;
  tone: NotifTone;
  textId: string;
  textEn: string;
  timeId: string;
  timeEn: string;
  read: boolean;
  createdAt: string;
};

// ── Settings ──────────────────────────────────────────────────────────────

export type AudioSchedule = {
  id: number;
  title: string;
  when: string;
  freq: string;
  file: string;
  active: boolean;
  displays: string[];
};

export type DisplayDevice = {
  id: number;
  code: string;
  name: string;
  loc: string;
  content: string;
  fleetId?: number | null;
  fleetIds?: number[];
  rotateSec: number;
  runtext: string;
  online: boolean;
  hb: string;
  active: boolean;
};

export type AppSettings = {
  appName: string;
  appDesc: string;
  appEnv: string;
  companyLogo: string;
  theme: string;
  lang: string;
  menuVis: Record<string, boolean>;
};

// ── Dashboard ─────────────────────────────────────────────────────────────

export type DashboardSummary = {
  attendance: {
    total: number;
    hadir: number;
    terlambat: number;
    belum: number;
    off: number;
  };
  ftw: {
    total: number;
    fit: number;
    spare: number;
    pulang: number;
    belum: number;
  };
  fleet: {
    total: number;
    ready: number;
    breakdown: number;
    standby: number;
  };
  roster: {
    pendingApproval: number;
  };
  notifications: {
    unread: number;
  };
  employees: {
    totalActive: number;
  };
};

// ── Fingerprint ───────────────────────────────────────────────────────────

export type FingerprintDevice = {
  id: number;
  code: string;
  name: string;
  ipAddress: string;
  port: number;
  comKey: number;
  location: string;
  isOnline: boolean;
  lastSync: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ── Weather (proxy pass-through) ──────────────────────────────────────────

export type WeatherData = {
  [key: string]: unknown;
};

// ── Profile ───────────────────────────────────────────────────────────────

export type ProfileUpdateRequest = {
  name?: string;
  email?: string;
};

export type PasswordUpdateRequest = {
  currentPassword: string;
  newPassword: string;
};
