import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
  title: "Settings",
  description: "Pengaturan aplikasi, audio kiosk, dan visibilitas menu.",
}

export default function Page() {
  return <PageClient />
}
