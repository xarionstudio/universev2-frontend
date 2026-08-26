/* Unduhan file di sisi klien.

   downloadBlob memicu unduhan blob apa adanya — dipakai tombol Export yang
   kini menerima CSV jadi dari backend (GET /api/users/export & /api/roles/
   export), jadi isinya tidak disentuh sama sekali. downloadCsv tetap ada
   untuk ekspor yang masih dirakit klien (pola umDownloadCsv desain) — BOM
   ditambahkan agar Excel membaca UTF-8. */
export function downloadBlob(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

export function downloadCsv(name: string, text: string) {
  downloadBlob(
    name,
    new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" })
  );
}
