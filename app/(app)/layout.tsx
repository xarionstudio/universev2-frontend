"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ShellProvider } from "@/components/layout/shell-context"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

/* Shell admin: blob glow + sidebar + topbar + konten */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    let authed = false
    try {
      authed = !!localStorage.getItem("universe-auth")
    } catch {}
    if (!authed) router.replace("/login")
    else setReady(true)
  }, [router])

  if (!ready) return null

  return (
    <ShellProvider>
      <div className="pointer-events-none fixed -top-30 -right-25 z-0 size-130 rounded-full bg-(--blob-cyan) blur-[130px]" />
      <div className="pointer-events-none fixed -bottom-35 -left-20 z-0 size-120 rounded-full bg-(--blob-blue) blur-[130px]" />
      <div className="p-6 max-xl:p-4">
        <div className="relative z-1 mx-auto flex min-h-[calc(100vh-48px)] max-w-[1840px] items-stretch gap-6 max-xl:block max-xl:min-h-[calc(100vh-32px)]">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Topbar />
            <div className="flex max-w-360 flex-1 flex-col gap-6">{children}</div>
          </div>
        </div>
      </div>
    </ShellProvider>
  )
}
