import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Profil Saya",
  description: "Informasi akun dan pengaturan password.",
};

export default function Page() {
  return <PageClient />;
}
