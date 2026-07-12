import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
  title: "Masuk",
  description: "Akun dibuat oleh admin melalui User Management — tidak ada pendaftaran mandiri.",
}

export default function Page() {
  return <PageClient />
}
