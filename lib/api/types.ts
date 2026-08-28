/* Kontrak HTTP backend Go (Fiber) — universev2-backend.

   Semua tipe di sini dijaga persis sama dengan tag `json:"..."` di sisi Go,
   BUKAN dengan nama kolom database maupun nama field Go-nya. Beberapa di
   antaranya terlihat ganjil dari sisi TypeScript (mis. `kar` untuk nama
   karyawan, `on` untuk status aktif) — itu memang disengaja di backend agar
   payload-nya langsung sebangun dengan tipe mock frontend yang sudah ada di
   lib/data/users.ts, sehingga adaptor di lapisan atas nyaris tanpa mapping.

   Rujukan: internal/model/user.go, pkg/response/api.go, pkg/pagination. */

/* ── Amplop respons ──────────────────────────────────────────────────── */

/* Semua handler membungkus hasilnya seperti ini (pkg/response.Success). */
export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
  meta?: LegacyMeta;
  timestamp: string;
};

/* Dipakai response.SuccessWithMeta — bentuknya BERBEDA dari `PaginationMeta`
   di bawah (limit/totalPage vs perPage/totalPages). Keduanya benar-benar ada
   di backend, jadi keduanya ikut dimodelkan alih-alih dipaksa seragam. */
export type LegacyMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
};

export type FieldError = { field?: string; message: string };

/* Dua bentuk error yang bisa datang dari backend:
     1. envelope error dari pkg/response.Error  -> { success:false, message }
     2. middleware auth & RBAC                  -> { error: "..." }
   Yang kedua tidak lewat pkg/response sama sekali (lihat internal/middleware/
   auth.go dan rbac.go), jadi klien wajib mengenali keduanya. */
export type ApiErrorBody = {
  success?: boolean;
  message?: string;
  errors?: FieldError[];
  timestamp?: string;
  error?: string;
};

/* ── Paginasi ────────────────────────────────────────────────────────── */

export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

/* response.PagedData — `data` berisi objek ini, bukan array telanjang. */
export type Paged<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type PageQuery = {
  page?: number;
  /* Dibatasi 200 oleh backend (pagination.MaxPerPage); nilai lebih besar
     dipangkas diam-diam, bukan ditolak. */
  perPage?: number;
};

/* Parameter filter yang dipahami SEMUA endpoint daftar — diurai satu tempat
   di pkg/filter.ParseFromCtx, jadi bentuknya seragam lintas modul.

   Perhatikan penamaannya: `date_from`/`date_to` memakai garis bawah,
   sementara `perPage` memakai camelCase. Itu memang tidak konsisten di sisi
   backend; ditiru apa adanya di sini karena inilah yang benar-benar dibaca
   server. */
export type FilterQuery = {
  search?: string;
  status?: string;
  dept?: string;
  nik?: string;
  date_from?: string;
  date_to?: string;
  month?: string;
  /* Cara menggabungkan kondisi. Default "and". */
  logic?: "and" | "or";
};

export type ListQuery = PageQuery & FilterQuery;

/* ── Auth & RBAC ─────────────────────────────────────────────────────── */

export type PermLevel = "none" | "view" | "manage";

/* Nama modul yang dikenal backend. Sengaja union longgar (`| string`) karena
   daftar modul tinggal di tabel role_permissions, bukan di kode — role baru
   bisa membawa nama modul yang belum ada di sini tanpa membuat klien pecah. */
export type ApiModule =
  | "dashboard"
  | "display"
  | "employees"
  | "roster"
  | "ftw"
  | "asset"
  | "prestasi"
  | "master"
  | "users"
  | "settings";

export type ApiPermMap = Partial<Record<ApiModule | string, PermLevel>>;

/* internal/model/user.go — perhatikan `kar` (name) dan `on` (is_active).
   password_hash & password_salt bertag `json:"-"`, jadi memang tidak pernah
   sampai ke klien; itu perilaku yang benar dan tidak perlu dimodelkan. */
export type ApiUser = {
  id: number;
  email: string;
  kar: string;
  nik: string | null;
  on: boolean;
  /* ID role numerik dalam bentuk string, mis. ["1"]. Bukan nama role. */
  roles: string[];
  pwAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

/* internal/model/user.go — Role */
export type ApiRole = {
  id: number;
  name: string;
  desc: string;
  locked: boolean;
  perms: ApiPermMap;
  createdAt: string;
  updatedAt: string;
};

/* Payload POST /auth/login dan POST /auth/refresh.
   `perms` bisa null: service mengisinya dari roleRepo, dan map nil di Go
   diserialisasi menjadi null — bukan {}. */
export type AuthPayload = {
  token: string;
  user: ApiUser;
  perms: ApiPermMap | null;
};

/* Identitas login adalah NIK (angka, panjang bebas), bukan email. */
export type LoginBody = { nik: string; password: string };

export type RegisterBody = {
  name: string;
  nik: string;
  /* Opsional — boleh kosong; bila diisi harus valid & belum dipakai. */
  email?: string;
  password: string;
  dept: string;
  pos: string;
};

export type UpdateProfileBody = { name: string; email: string };

export type UpdatePasswordBody = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};
