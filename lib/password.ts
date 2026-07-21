/* Penanganan password untuk mock data.

   PERINGATAN PENTING — baca sebelum memakai ulang pola ini:
   Hashing di sisi klien BUKAN pengamanan password. Ini dipakai di sini hanya
   supaya prototipe tanpa backend tidak perlu menyimpan password apa adanya,
   sehingga polanya tidak terbawa jadi kebiasaan buruk. Pada sistem sungguhan:
     - password dikirim lewat HTTPS ke server, lalu di-hash DI SERVER
       memakai bcrypt/scrypt/argon2 (algoritma lambat dan ber-salt),
     - SHA-256 terlalu cepat untuk password, jadi tidak layak dipakai di server,
     - verifikasi kredensial juga wajib terjadi di server.
   Yang dipertahankan dari praktik nyata: password tidak pernah disimpan
   apa adanya dan tidak pernah dikembalikan ke UI. */

const ITER_NOTE = "sha-256/mock";

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* Salt acak per user — mencegah dua password sama menghasilkan digest sama */
export function newSalt(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return toHex(a.buffer);
}

export async function hashPassword(
  password: string,
  salt: string
): Promise<string> {
  const data = new TextEncoder().encode(`${ITER_NOTE}:${salt}:${password}`);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

export async function verifyPassword(
  password: string,
  salt: string,
  digest: string
): Promise<boolean> {
  return (await hashPassword(password, salt)) === digest;
}

/* ---- Aturan kekuatan password ---- */

export const PW_MIN = 8;

export type PwIssue = "len" | "num" | "letter";

/* Dikembalikan sebagai daftar kode agar pemanggil yang memilih string i18n */
export function passwordIssues(pw: string): PwIssue[] {
  const out: PwIssue[] = [];
  if (pw.length < PW_MIN) out.push("len");
  if (!/[0-9]/.test(pw)) out.push("num");
  if (!/[a-zA-Z]/.test(pw)) out.push("letter");
  return out;
}

export function isPasswordStrong(pw: string): boolean {
  return passwordIssues(pw).length === 0;
}
