# API — Roster Template, Scan & Submit

Dokumentasi alur Upload Roster yang mendukung kelima persyaratan:

1. Unduh template dengan pilihan Departemen + bulan + tahun
2. Template berisi karyawan aktif departemen
3. Scan (review) sebelum Submit ke database
4. Sel kode invalid ditandai; catatan `( Tanggal - Kesalahan )`
5. Submit sukses → roster tampil di Data Roster / Detail

---

## `GET /api/rosters/template`

Permission: `roster:manage`

Query:

| Param   | Wajib | Contoh              |
| ------- | ----- | ------------------- |
| `dept`  | ya    | `OPERATION`         |
| `month` | ya    | `2026-10` (YYYY-MM) |

Respons: berkas `.xlsx` (bukan JSON).

Isi sheet (kop bermerek sejak 1 Sep 2026):

- **Kop**: logo UNGGUL (tertanam, baris 1–3), judul
  `TEMPLATE ROSTER <DEPT> — <Bulan Tahun>`, `PT Unggul Dinamika Utama`,
  dan `Tanggal download template: <dd MMM yyyy HH:mm> WITA | UNIVERSE —
Fleet Automation System`
- Baris header data berisi `NIK` (parser mendeteksinya dari isi sel, bukan
  posisi tetap — kop tidak mengganggu impor)
- Satu baris per karyawan **aktif** di departemen itu (Nama, Departemen, Posisi)
- Kolom tanggal `01`…`NN` **kosong** — `NN` mengikuti **jumlah hari bulan
  terpilih** (Sep = 30, bukan selalu 31); diisi user dengan kode roster
- Laporan roster tersimpan (`GET /api/rosters/:key/export`) memakai kop yang
  sama dengan meta `Tanggal unduh: …`

---

## `POST /api/rosters/upload`

Permission: `roster:manage`

Form-data:

| Field       | Keterangan                                |
| ----------- | ----------------------------------------- |
| `file`      | `.xlsx` / `.xls` / `.csv`                 |
| `month`     | `YYYY-MM`                                 |
| `dept`      | kode departemen (huruf kapital)           |
| `label`     | opsional — label di daftar roster         |
| `dryRun`    | `true` = **Scan saja** (tidak menulis DB) |
| `createdBy` | opsional                                  |

### Scan (`dryRun=true`)

HTTP 200, body `data`:

```json
{
  "dryRun": true,
  "validation": {
    "preview": [{ "nik": "…", "name": "…", "codes": { "1": "D", "2": "XX" } }],
    "days": ["01 Oct", "02 Oct", "…"],
    "errors": [
      {
        "row": "5",
        "nik": "…",
        "emp": "…",
        "issue": "Kode \"XX\" pada 2 Oct — bukan kode roster yang dikenal",
        "issueEn": "…",
        "badgeVariant": "danger",
        "badge": "Error",
        "day": 2
      }
    ],
    "validCount": 10,
    "dupCount": 0,
    "errCount": 1
  }
}
```

Field `day` dipakai UI untuk mewarnai sel merah dan menyusun catatan  
`( 02 Oct - Kode "XX" … )`.

### Submit (`dryRun` tidak diisi / false)

- Ditolak **422** bila `errCount > 0`
- Sukses: menyimpan `roster_files` + `roster_schedules`, mengembalikan `meta` + `validation`
- Frontend mengarahkan ke `/roster/detail?p={meta.key}` atau `/roster/data`

---

## Aturan kode roster (parser)

Sumber: `internal/export/excel.go` → `normalizeShiftCode`

Valid: D, N, R, STB, OFF, CR, AL, LWP, LWOP, PH, PHD, S, A, MCU, MCR, MCUF, ISM, OBC, KRT, TGS, DNS, TRV, TR, TRS, IN, TERM, EOC, RSG

Alias: C/CT→CR, O/OFFD/OFFN→OFF

Lainnya: NIK numerik & terdaftar, semua hari wajib berkode, N berurutan ≤ 14 hari.

---

## Alur UI

```
Unduh Template (dept + bulan + tahun)
        ↓ isi kode di Excel
Pilih file → Scan (dryRun)
        ↓ review sel merah + catatan
Submit (tanpa dryRun) → Data Roster / Detail
```
