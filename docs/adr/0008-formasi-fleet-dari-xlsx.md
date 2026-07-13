# 0008 — Formasi fleet digenerate dari setting-operator.xlsx

- Status: Accepted
- Tanggal: 2026-07-13

## Konteks

Setting Fleet hanya berisi 3 formasi karangan sisa mock desain, padahal
docs/setting-operator.xlsx (sheet tanggal 1, shift siang) menyiratkan 18 fleet:
18 big/medium digger beroperasi memimpin 212 truk OHT/DT yang terbagi per pit.

## Keputusan

`lib/data/fleet.ts` DIGENERATE oleh `docs/generate-fleets.py` (butuh openpyxl):
satu fleet per big/medium digger di sheet tanggal 1; truk OHT/DT se-pit dibagi
rata antar digger se-pit (maks. 13, konsisten `FLEET_MAX_UNITS`); nama pit
operasional dipetakan ke lokasi resmi equipment.json; id fleet stabil
(`fl-<digger>`); bus default bergilir dari unit BUS resmi. Seed alokasi demo
memprioritaskan fleet yang punya display TV terdaftar karena pool operator mock
terbatas.

## Konsekuensi

- Setting Fleet, papan alokasi, dan display TV memakai 18 formasi riil
  (169 truk) — prinsip ADR 0006 (sumber data asli) berlaku juga untuk formasi.
- Pembagian truk per digger adalah aproksimasi (file lama tidak memetakan truk
  ke digger); dispatcher merapikannya lewat UI Setting Fleet.
- "Pit Service" muncul verbatim karena tidak ada di master Area resmi —
  penanda gap antar-sumber, bukan bug.
