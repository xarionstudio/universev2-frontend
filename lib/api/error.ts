/* Satu jenis error untuk seluruh panggilan API.

   Alasan tidak sekadar melempar Error biasa: pemanggil hampir selalu perlu
   membedakan tiga hal — apakah ini salah input (422, ada `field`), tidak
   berhak (401/403), atau jaringan mati sama sekali. Dibungkus jadi satu kelas
   supaya UI cukup `catch (e)` lalu menanyai `e.status` / `e.fieldErrors`
   alih-alih membaca-baca string pesan. */

import type { ApiErrorBody, FieldError } from "./types";

export class ApiError extends Error {
  /* 0 = permintaan tidak pernah sampai (server mati, CORS, offline). */
  readonly status: number;
  readonly fieldErrors: FieldError[];
  readonly body: ApiErrorBody | null;
  readonly url: string;

  constructor(
    message: string,
    status: number,
    opts: {
      fieldErrors?: FieldError[];
      body?: ApiErrorBody | null;
      url?: string;
    } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = opts.fieldErrors ?? [];
    this.body = opts.body ?? null;
    this.url = opts.url ?? "";
  }

  /* Server tidak terjangkau — bedakan dari 5xx, karena saran ke pengguna
     berbeda: "backend belum dinyalakan" vs "backend error". */
  get isNetwork(): boolean {
    return this.status === 0;
  }

  /* Sesi hilang/kedaluwarsa. Klien menjawabnya dengan membersihkan sesi. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /* Sudah login, tapi role-nya tidak cukup untuk endpoint ini. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isValidation(): boolean {
    return this.status === 422 || this.fieldErrors.length > 0;
  }

  /* Pesan untuk satu field form, bila backend menyebutkannya. */
  fieldMessage(field: string): string | null {
    const hit = this.fieldErrors.find((e) => e.field === field);
    return hit ? hit.message : null;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/* Pesan yang layak ditampilkan ke pengguna.

   Backend sudah menulis pesannya dalam bahasa manusia (lihat
   pkg/response/errors.go), jadi umumnya dipakai apa adanya. `fallback` hanya
   dipakai kalau backend diam — terutama saat jaringan gagal, di mana
   pesan bawaan fetch ("Failed to fetch") tidak berarti apa-apa bagi pengguna. */
export function errorMessage(e: unknown, fallback: string): string {
  if (isApiError(e)) {
    if (e.isNetwork) return fallback;
    return e.message || fallback;
  }
  return fallback;
}
