import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
  title: "User",
  description: "Akun login aplikasi — undang, tautkan ke karyawan, dan atur role-nya.",
}

export default function Page() {
  return <PageClient />
}
