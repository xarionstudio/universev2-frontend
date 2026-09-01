# API — Database Unit (Tambah / Edit Unit)

Dokumentasi kontrak yang dipakai form **Tambah Unit** / **Edit Unit** di
menu Master → Database Unit (`/master/units`).

Sumber tipe frontend: `lib/api/endpoints/fleet.ts`, `master.ts`.  
Model backend: `internal/model/fleet.go` (`UnitDb`), `internal/model/master.go`
(`MasterEGIType`, `MasterEqClass`, `MasterProduct`).  
Migrasi klasifikasi: `000031_egi_eqclass`.

---

## Ringkasan integrasi form

| Field form | Sumber opsi                                          | Field tersimpan di unit | Wajib |
| ---------- | ---------------------------------------------------- | ----------------------- | ----- |
| Kode unit  | input bebas (unik)                                   | `code`                  | ya    |
| Eq. Class  | `GET /api/master/eqclass` (aktif; `name` = kode)     | `cls`                   | ya    |
| Type EGI   | `GET /api/master/egi` difilter `eqClass` = Eq. Class | `egi`                   | ya    |
| Product    | `GET /api/master/product` (aktif; nama uppercase)    | `product`               | tidak |

### Cascade Eq. Class → Type EGI

1. Saat dialog dibuka (tambah), **Type EGI kosong dan disabled** sampai
   Eq. Class dipilih.
2. Setelah Eq. Class dipilih, dropdown Type EGI diisi entri aktif dari
   `GET /api/master/egi` yang `eqClass` sama dengan kode Eq. Class terpilih
   (perbandingan case-insensitive, diseragamkan uppercase di klien).
3. Mengganti Eq. Class mengosongkan Type EGI; opsi baru dimuat ulang.
4. Mode edit: Eq. Class dan Type EGI diisi dari baris unit; Type EGI
   dinormalkan lewat `typeOfEgi()` agar cocok dengan kosakata master.

Fallback bila `master:view` 403 / jaringan putus:

- Eq. Class → `eqClassDefs` + class yang sudah ada di baris unit
- Type EGI → `egiTypesForClass(cls, units)` di `lib/data/units-db.ts`
- Product → merek unik dari baris unit (uppercase)

---

## Permission

| Endpoint                       | Modul    | Aksi     |
| ------------------------------ | -------- | -------- |
| `GET /api/units/db`            | `asset`  | `view`   |
| `POST` / `PUT` / `DELETE` unit | `asset`  | `manage` |
| `GET /api/master/eqclass`      | `master` | `view`   |
| `GET /api/master/egi`          | `master` | `view`   |
| `GET /api/master/product`      | `master` | `view`   |

Akun yang punya `asset:manage` tapi tidak punya `master:view` tetap bisa
menyimpan unit; opsi dropdown memakai fallback lokal di atas.

---

## 1. Opsi Eq. Class

### `GET /api/master/eqclass?perPage=200`

```json
{
  "entries": [
    {
      "id": 16,
      "code": "MH",
      "name": "MH",
      "description": "Manhaul",
      "active": true
    }
  ],
  "total": 22,
  "page": 1,
  "perPage": 200,
  "totalPages": 1,
  "category": "eqclass"
}
```

Aturan form:

- Nilai yang disimpan ke `cls` adalah **`name`** (= kode kelas, mis. `"MH"`).
- `description` hanya untuk label UI (opsional).
- Hanya entri `active: true` yang ditawarkan.

---

## 2. Opsi Type EGI (terklasifikasi)

### `GET /api/master/egi?perPage=200`

```json
{
  "entries": [
    {
      "id": 12,
      "code": "MANHAUL",
      "name": "MANHAUL",
      "eqClass": "MH",
      "active": true
    },
    {
      "id": 3,
      "code": "SPARE",
      "name": "SPARE",
      "eqClass": "",
      "active": true
    }
  ],
  "total": 29,
  "page": 1,
  "perPage": 200,
  "totalPages": 1,
  "category": "egi"
}
```

Aturan form:

- Nilai yang disimpan ke `egi` adalah **`name`** Type EGI (bukan `code`).
- Filter klien: `entry.eqClass === selectedEqClass` (uppercase).
- `eqClass: ""` = belum / tidak terklasifikasi (mis. SPARE) — **tidak**
  muncul di dropdown unit kecuali kelas kosong (yang form unit tidak izinkan).
- Tanpa Eq. Class terpilih → daftar Type EGI **kosong** (bukan daftar penuh).
- Klasifikasi dikelola di Master Data → Type EGI (`eqClass` di-set lewat
  migrasi 000031 + koreksi admin).

---

## 3. Opsi Product / Merek

### `GET /api/master/product?perPage=200`

```json
{
  "entries": [
    {
      "id": 1,
      "code": "CATERPILLAR",
      "name": "CATERPILLAR",
      "active": true
    }
  ],
  "total": 8,
  "page": 1,
  "perPage": 200,
  "totalPages": 1,
  "category": "product"
}
```

Form memakai `name` (di-uppercase di klien) sebagai nilai `product`.

---

## 4. CRUD baris Database Unit

Permission modul: `asset`.

### `GET /api/units/db`

Mengembalikan array `UnitDb` (bukan amplop paginasi).

```json
[
  {
    "id": 42,
    "code": "DT-122",
    "egi": "MANHAUL",
    "product": "CATERPILLAR",
    "cls": "MH",
    "cat": "",
    "area": "",
    "active": true,
    "standby": false,
    "breakdown": false,
    "loc": "",
    "upd": "2026-09-01",
    "by": "503264133",
    "createdAt": "2026-03-01T00:00:00Z",
    "updatedAt": "2026-09-01T06:00:00Z"
  }
]
```

### `POST /api/units/db`

Body (form Tambah Unit):

```json
{
  "code": "DT-122",
  "egi": "MANHAUL",
  "product": "CATERPILLAR",
  "cls": "MH",
  "cat": "",
  "area": "",
  "active": true,
  "standby": false,
  "breakdown": false,
  "loc": "",
  "upd": "2026-09-01",
  "by": "503264133"
}
```

Aturan:

- `code` wajib (trim tidak kosong); unik di tabel `units_db`.
- `cls` = kode Eq. Class; `egi` = nama Type EGI. Backend **tidak** memvalidasi
  bahwa `egi` anggota `eqClass` — cascade dijaga di UI.
- Field status (`active` / `standby` / `breakdown` / `loc` / `area` / `cat`)
  diisi default saat tambah dari form Database Unit; status operasional diubah
  lewat menu Status Unit.

Respons sukses: `201` + objek `UnitDb` lengkap (termasuk `id`).

### `PUT /api/units/db`

Body sama bentuknya dengan POST. Baris dikenali lewat **`code` di dalam
body** (bukan path). Mengganti kode unit lewat endpoint ini tidak didukung —
form edit menonaktifkan field Kode.

### `DELETE /api/units/db?code=DT-122`

Menghapus baris berdasarkan kode unit (query `code`).

### Import / Export

| Method | Path                   | Keterangan                       |
| ------ | ---------------------- | -------------------------------- |
| `POST` | `/api/units/db/import` | multipart field `file` (`.xlsx`) |
| `GET`  | `/api/units/db/export` | unduh xlsx seluruh unit          |

---

## Alur klien (ringkas)

```
buka Tambah Unit
  ├─ GET /api/master/eqclass   → opsi Eq. Class
  ├─ GET /api/master/egi       → simpan; filter saat class dipilih
  └─ GET /api/master/product   → opsi Product

pilih Eq. Class = "MH"
  └─ Type EGI = master/egi.filter(eqClass === "MH")  // mis. ["MANHAUL"]

Simpan Unit
  └─ POST /api/units/db  { code, cls: "MH", egi: "MANHAUL", product, ... }
```

Halaman: `app/(app)/master/units/page-client.tsx`.  
Client API: `fleetApi.createUnitDb` / `updateUnitDb`, `masterApi.listMaster`.

---

## Catatan: form Data Karyawan (SIMPER)

Cascade yang sama dipakai di **Tambah / Edit Karyawan** untuk baris
kompetensi (`employees/_components/employee-form.tsx`):

| Field form             | Sumber                         | Disimpan di kompetensi |
| ---------------------- | ------------------------------ | ---------------------- |
| Pilih Kompetensi       | `GET /api/master/eqclass`      | `eq` (kode Eq. Class)  |
| Pilih Jenis Kompetensi | `GET /api/master/egi` × filter | `cls` (nama Type EGI)  |

Tanpa Eq. Class, dropdown Jenis Kompetensi disabled dan kosong; setelah
Eq. Class dipilih, hanya Type EGI dengan `eqClass` cocok yang muncul.
