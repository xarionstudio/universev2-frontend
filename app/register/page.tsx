import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Register",
  description: "Buat akun UNIVERSE baru.",
};

export default function Page() {
  return <PageClient />;
}
