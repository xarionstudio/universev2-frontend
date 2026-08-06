# 0009 — Master mesin fingerprint + uji koneksi lewat route handler

- Status: Accepted (diamandemen [0010](0010-tanpa-streaming-ke-browser.md))
- Tanggal: 2026-08-06

## Konteks

Layar TV "Monitoring Fingerprint" (`/display/fingerprint`) sudah ada dan
menampilkan 12 mesin lengkap dengan status online/offline, tetapi daftarnya
adalah konstanta `displayMachines` di `lib/data/display-screens.ts` — milik
layar itu sendiri. Akibatnya tidak ada satu pun tempat di aplikasi untuk
mendaftarkan **alamat IP** mesin, padahal itulah yang dibutuhkan admin ketika
sebuah mesin berhenti mengirim absensi: menyalakan ulang, mengecek jaringan,
atau memastikan IP-nya tidak berpindah.

Menambahkan kolom IP ke konstanta layar tidak menyelesaikannya: layar kiosk
tidak boleh jadi tempat menyunting data, dan menaruh IP di sana berarti alamat
jaringan ikut terkirim ke TV yang dipasang di area publik (mess, kantin).

Kebutuhan kedua — "tombol Ping yang benar-benar nge-ping" — tidak bisa
dikerjakan di browser sama sekali: JavaScript halaman tidak punya soket TCP
mentah maupun ICMP. Sampai ADR ini, aplikasi belum punya route handler apa pun
(`app/api/` tidak ada); seluruh data masih mock di `lib/data/*`.

## Keputusan

1. **`lib/data/fingerprint.ts` jadi satu-satunya master mesin.** Berisi
   `FpMachine` (kode, lokasi, **ip**, **port**, aktif, online, meta, lastPing)
   dan seed `initialFpMachines`. Konstanta `displayMachines` DIHAPUS.

2. **Layar TV menurunkan daftarnya**, tidak memilikinya:
   `fpDisplayMachines(list): DisplayMachine[]` memfilter yang aktif dan
   memproyeksikan hanya empat kolom yang dirender TV. `DisplayMachine` sengaja
   tetap tipe sempit tanpa `ip`/`port` — kiosk tidak pernah menerima alamat
   jaringan. Urutannya offline dulu, lalu tersibuk, lalu kode, supaya posisi
   kartu tidak berpindah-pindah setiap daftar disunting.

3. **Modul admin berdiri sendiri di `/fingerprint`**, bukan anak grup Display.
   Yang dikelola di sini adalah master PERANGKAT (IP, port, uji koneksi),
   sedangkan grup Display mengelola LAYAR — dua domain berbeda yang kebetulan
   bertemu di satu layar. Konsekuensinya modul RBAC `fingerprint` ditambahkan
   ke `umModules`, dipetakan dari prefix `/fingerprint` di `ROUTE_MODULES`
   (penjagaan `view` otomatis lewat `app/(app)/layout.tsx`), dan aksi ubah
   dijaga `can("fingerprint", "manage")` di dalam halaman. Entri kiosk
   "Monitoring Fingerprint" TETAP di grup Display — itu memang sebuah layar.

   Role Viewer diberi `none`, bukan `view`: sebelum dipromosikan, registry ini
   berada di bawah modul `display` yang memang `none` untuk Viewer. Menaikkan
   menu tidak boleh diam-diam membuka alamat IP mesin ke role read-only.

4. **Uji koneksi berjalan di server**: `POST /api/fingerprint/ping`, dua lapis.
   - **TCP connect ke `ip:port`** (bawaan 4370, ZKTeco/Solution) sebagai
     pemeriksaan UTAMA. Inilah yang benar-benar berarti "berhasil terhubung":
     mesin yang layanannya hang tetap membalas ping tetapi tidak bisa ditarik
     datanya. TCP juga tidak butuh biner `ping`, tidak butuh `CAP_NET_RAW`,
     dan tidak perlu membaca teks yang diterjemahkan.
   - **ICMP hanya cadangan diagnosis**, membedakan "mesin mati / IP salah"
     dari "mesin hidup tetapi port ditutup firewall".

   Balasannya selalu `FpPingResult` berisi **kode**, bukan kalimat: seluruh
   teks yang dibaca admin diterjemahkan di klien lewat `t.*`, sesuai ADR 0001.

5. **Keamanan input.** IP divalidasi IPv4 ketat (`isIpv4`, ber-anchor `^…$`,
   menolak nol di depan) SEBELUM dipakai, dan `ping` dipanggil dengan
   `execFile` + array argv, `shell: false` — tidak pernah `exec` dengan string.
   Validasinya juga menutup argv-injection: `-t` sekalipun tidak lolos.

6. **Keberhasilan ICMP ditentukan token `TTL`, bukan kode keluar.** Windows
   memulangkan kode 0 — lengkap dengan "Received = 1" dan "0% loss" — untuk
   balasan `Destination host unreachable`. Ketiga sinyal itu berbohong; hanya
   TTL yang jujur, dan ia satu-satunya token yang tidak dilokalkan (`TTL=128`
   di Windows en-US maupun id-ID, `ttl=64` di Linux/macOS).

7. **Hasil ping TIDAK menimpa `online`.** `online` adalah heartbeat mesin
   menuju aplikasi (yang dipakai TV); `lastPing` adalah jangkauan server menuju
   mesin saat tombol ditekan. Menyatukannya berarti satu ping dari jaringan
   yang memang tidak tembus akan mengosongkan layar TV.

## Konsekuensi

- Mendaftarkan mesin di modul admin langsung mengubah layar TV — tidak ada lagi
  dua daftar yang bisa berbeda tanpa ketahuan.
- Hasil ping menggambarkan jangkauan **server aplikasi**, bukan laptop admin.
  Mesin di VLAN yang tidak terjangkau server akan selalu tampil tidak
  terhubung meski menyala; ini dinyatakan terang-terangan di halamannya
  (`fpNoteB`), bukan disembunyikan.
- Ini route handler pertama di repo. Runtime Node ditulis eksplisit sebagai
  dokumentasi — Next 16 sudah memakai Node secara bawaan untuk route handler,
  dan `force-dynamic` tidak diperlukan karena route handler tidak dicache
  sejak Next 15.
- Waktu terburuk satu ping: TCP 2 dtk + ICMP ~3,5 dtk, dipagari keras 6 dtk di
  server dan 9 dtk di klien.
- **Diamandemen 0010:** aksi massal "Ping semua" — beserta pembatas 4
  pemeriksaan paralelnya — sudah dihapus. Uji koneksi kini dijalankan satu per
  satu dari baris mesin yang bersangkutan, sehingga tidak pernah ada belasan
  proses `ping` sekaligus dan pop-up hasilnya selalu merujuk satu alamat.
- Data aplikasi masih di memori browser, jadi layar TV yang dibuka di perangkat
  lain tetap memulai dari seed sampai backend tersambung — batas yang sama
  dengan seluruh modul lain (ADR 0001).
