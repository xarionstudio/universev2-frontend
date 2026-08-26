# Architecture Decision Records

| No                                                   | Judul                                                             | Status                            |
| ---------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| [0001](0001-frontend-shadcn-architecture.md)         | Frontend mengikuti arsitektur ala shadcn/ui                       | Accepted                          |
| [0002](0002-kiosk-static-assets.md)                  | Layar kiosk sebagai aset statis + overlay iframe fullscreen       | Superseded by 0003                |
| [0003](0003-kiosk-nextjs-routes.md)                  | Layar kiosk sebagai route Next.js                                 | Accepted (diamandemen 0004)       |
| [0004](0004-display-newtab-naming.md)                | Layar display dibuka di tab baru + fullscreen; penamaan "display" | Accepted                          |
| [0005](0005-tooling-kolaborasi.md)                   | Format, linter, dan pre-commit mengikuti universe-2               | Accepted                          |
| [0006](0006-equipment-json-sumber-terpusat.md)       | equipment.json sebagai sumber data unit terpusat                  | Accepted                          |
| [0007](0007-alokasi-per-tanggal-shift.md)            | Alokasi operator per tanggal+shift, display fleet memantulkannya  | Accepted                          |
| [0008](0008-formasi-fleet-dari-xlsx.md)              | Formasi fleet digenerate dari setting-operator.xlsx               | Accepted                          |
| [0009](0009-ping-mesin-fingerprint.md)               | Master mesin fingerprint + uji koneksi lewat route handler        | Accepted (diamandemen 0010, 0011) |
| [0010](0010-tanpa-streaming-ke-browser.md)           | Tanpa streaming ke browser; umpan balik lewat permintaan pendek   | Accepted                          |
| [0011](0011-integrasi-fingerprint-backend.md)        | Modul Mesin Fingerprint tersambung ke backend Go                  | Accepted                          |
| [0012](0012-register-validation-dan-role-default.md) | Paritas validasi register + role default pendaftar dari Settings  | Accepted                          |
| [0013](0013-integrasi-users-roles-backend.md)        | Menu User & Roles tersambung ke backend Go                        | Accepted                          |
| [0014](0014-integrasi-employees-backend.md)          | Modul Karyawan tersambung ke backend Go                           | Accepted                          |
| [0015](0015-penarikan-zk4370-tanpa-hapus.md)         | Penarikan absen ZK 4370 tanpa hapus memori mesin                  | Accepted                          |
