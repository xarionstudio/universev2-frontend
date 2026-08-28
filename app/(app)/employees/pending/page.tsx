import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Pending Registrasi",
  description:
    "Baris impor Excel karyawan yang ditahan karena departemennya tidak dikenal sistem.",
};

export default function Page() {
  return <PageClient />;
}
