import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
  title: "Role",
  description: "RBAC per modul — menu tanpa permission tidak dirender.",
}

export default function Page() {
  return <PageClient />
}
