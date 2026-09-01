# API — Display Monitor

Dokumentasi kontrak yang dipakai form **Tambah / Edit Monitor**
(`displays/monitor`) dan layar kiosk `/display/monitor`.

Sumber tipe frontend: `lib/api/endpoints/settings.ts`, `fleet.ts`,
`master.ts`, `misc.ts`. Model backend: `internal/model/settings.go`,
`fleet.go`, `master.go`.

---

## Ringkasan integrasi form

| Field form         | Sumber data                                      | Field tersimpan         |
| ------------------ | ------------------------------------------------ | ----------------------- |
| Durasi per giliran | Opsi UI (`5/8/10/15/20/30` detik)                | `rotateSec` (int)       |
| Running text       | `GET /api/master/runtext` (aktif + target cocok) | `runtext` (string teks) |
| Fleet yang tayang  | `GET /api/fleet/settings` (aktif)                | `fleetIds` (id numerik) |

Target Running Text yang ditampilkan di dropdown monitor:

- `Semua kiosk`
- `Display Fleet`
- `Display Monitor`

---

## 1. Perangkat display (CRUD admin)

Permission modul: `settings`.

### `GET /api/settings/displays?kind=monitor`

Mengembalikan daftar `display_devices` dengan `content_kind = monitor`.
Untuk tiap baris monitor, server mengisi `fleetIds` dari pivot
`display_fleets` terurut `sort_order ASC`.

```json
[
  {
    "id": 12,
    "code": "DSP-M01",
    "name": "Display Monitor 1",
    "loc": "Kantin — meja tengah",
    "content": "monitor",
    "fleetIds": [3, 7, 1],
    "rotateSec": 10,
    "runtext": "Utamakan keselamatan — patuhi batas kecepatan 40 km/jam di jalan hauling.",
    "online": false,
    "hb": "—",
    "active": true
  }
]
```

### `POST /api/settings/displays`

Body (monitor):

```json
{
  "code": "DSP-M03",
  "name": "Display Monitor 3",
  "loc": "Kantin — meja tengah",
  "content": "monitor",
  "fleetIds": [3, 7],
  "rotateSec": 10,
  "runtext": "Wajib P2H sebelum mengoperasikan unit.",
  "online": false,
  "active": true
}
```

Aturan:

- `name` dan `loc` wajib (trim tidak kosong).
- `fleetIds` = primary key `fleet_settings.id` (bukan kode digger).
- Urutan array = urutan tayangan di TV.
- `rotateSec` disimpan apa adanya ke kolom `rotate_sec` dan dipakai kiosk
  sebagai durasi giliran (detik).
- `runtext` menyimpan **teks**, bukan kode master (`rt-1`).

### `PUT /api/settings/displays/:id`

`:id` = id numerik baris. Wajib menyertakan `code` (kolom ikut di-update).
Pivot `display_fleets` diganti penuh sesuai `fleetIds` baru.

### `DELETE /api/settings/displays/:id`

Menghapus perangkat + baris pivot-nya.

### `GET /api/displays/:code/heartbeat` (publik)

Satu-satunya route display tanpa auth — TV memanggilnya untuk menandai
online. Bukan sumber konfigurasi durasi/fleet/runtext.

---

## 2. Setting Fleet (opsi “Fleet yang tayang”)

Permission modul: `asset`.

### `GET /api/fleet/settings`

```json
[
  {
    "id": 3,
    "digger": "EX7001",
    "loc": "Workshop Plant",
    "bus": "UDBU-002",
    "active": true,
    "units": ["RD5038", "DT5108"]
  }
]
```

Pemetaan di UI admin:

- `id` (numerik) ↔ dikirim sebagai elemen `fleetIds`
- id UI lokal = `"fl-" + digger` (hanya untuk state React / store)

Form monitor hanya menawarkan formasi **`active: true`**. Fleet nonaktif
yang sudah terpilih sebelumnya tetap tampil saat edit agar referensi tidak
hilang diam-diam.

CRUD formasi: `POST/PUT/DELETE /api/fleet/settings` — lihat
`lib/api/endpoints/fleet.ts`.

---

## 3. Running Text (opsi dropdown)

Permission modul: `master`.

### `GET /api/master/runtext?perPage=200`

Amplop master (bukan `{ items, pagination }`):

```json
{
  "entries": [
    {
      "id": 1,
      "code": "rt-1",
      "name": "Utamakan keselamatan — patuhi batas kecepatan 40 km/jam di jalan hauling.",
      "targetDisplay": "Semua kiosk",
      "textColor": "Cyan",
      "active": true
    }
  ],
  "total": 4,
  "page": 1,
  "perPage": 200,
  "totalPages": 1,
  "category": "runtext"
}
```

Di form monitor, `name` (teks) yang aktif dengan
`targetDisplay ∈ { Semua kiosk, Display Fleet, Display Monitor }` menjadi
`<option>`. Nilai yang disimpan ke display adalah string `name` itu sendiri.

CRUD: `POST/PUT/DELETE /api/master/runtext` — lihat
`lib/api/endpoints/master.ts`.

---

## 4. Kiosk TV

Permission modul: `display` (`display:view`). Token sesi login tetap
diperlukan (sama seperti layar attendance).

### `GET /api/display/monitor?monitor=DSP-M01`

Mengembalikan konfigurasi monitor + snapshot formasi aktif (kartu unit +
operator dari alokasi hari/shift berjalan).

```json
[
  {
    "id": "DSP-M01",
    "name": "Display Monitor 1",
    "loc": "Kantin — meja tengah",
    "fleetIds": [3, 7],
    "rotateSec": 10,
    "runtext": "Utamakan keselamatan — patuhi batas kecepatan 40 km/jam di jalan hauling.",
    "online": true,
    "active": true,
    "fleets": [
      {
        "id": "3",
        "digger": "EX7001",
        "loc": "Workshop Plant",
        "bus": "UDBU-002",
        "units": [
          {
            "code": "EX7001",
            "opName": "Budi",
            "opNik": "12345",
            "tone": "success",
            "label": "Ready",
            "isDigger": true
          }
        ]
      }
    ]
  }
]
```

Catatan kesesuaian data:

- `rotateSec` / `runtext` / `fleetIds` sama dengan yang disimpan lewat
  `POST/PUT /api/settings/displays`.
- `fleets[].id` = string dari id numerik `fleet_settings` (bukan
  `fl-<digger>`).
- Formasi nonaktif di Setting Fleet tidak ikut di `fleets` (filter
  `active` di service).

Implementasi kiosk Next.js saat ini menghidrasi konfigurasi lewat
`GET /api/settings/displays?kind=monitor` + `GET /api/fleet/settings`
(pemetaan id sama dengan admin), lalu memakai `rotateSec` untuk
penjadwal giliran. Endpoint `/api/display/monitor` tersedia untuk klien
yang ingin snapshot kartu operator siap pakai.

---

## Alur simpan (admin → TV)

```
Tambah Monitor
  ├─ opsi Running Text ← GET /api/master/runtext
  ├─ opsi Fleet        ← GET /api/fleet/settings
  └─ simpan            → POST /api/settings/displays
                           { rotateSec, runtext, fleetIds, … }

Preview / TV /display/monitor?monitor=DSP-Mxx
  ├─ GET /api/settings/displays?kind=monitor  → rotateSec, runtext, fleetIds
  ├─ GET /api/fleet/settings                  → formasi unit
  └─ penjadwal giliran memakai rotateSec * 1000 ms
```
