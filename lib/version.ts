import pkg from "@/package.json";

/* Sumber tunggal versi aplikasi — angkanya diambil dari `version` di
   package.json supaya menaikkan versi cukup di satu tempat dan tidak bisa
   beda antara footer, kiosk, dan manifest paket. */
export const APP_VERSION = `v${pkg.version}`;
