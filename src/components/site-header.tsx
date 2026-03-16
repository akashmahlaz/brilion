import { useRouter } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { Separator } from "#/components/ui/separator"
import { SidebarTrigger } from "#/components/ui/sidebar"
import { apiFetch } from "#/lib/api"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "#/components/ui/breadcrumb"

const PAGE_TITLES: Record<string, string> = {
  "/overview": "Overview",
  "/chat": "Chat",
  "/channels": "Channels",
  "/sessions": "Sessions",
  "/agents": "Agents",
  "/config": "Config",
  "/settings": "Settings",
  "/skills": "Skills",
  "/cron": "Cron",
  "/nodes": "Nodes",
  "/logs": "Logs",
  "/usage": "Usage",
  "/debug": "Debug",
}

export function SiteHeader() {
  const router = useRouter()
  const pathname = router.state.location.pathname
  const title = PAGE_TITLES[pathname] ?? "Brilion"
  const [health, setHealth] = useState<{ status: string; uptime?: number } | null>(null)

  useEffect(() => {
    async function check() {
      try {
        const res = await apiFetch("/api/health")
        if (res.ok) setHealth(await res.json())
        else setHealth({ status: "error" })
      } catch {
        setHealth({ status: "offline" })
      }
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 text-gray-500 hover:text-gray-900" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4 bg-gray-200/60"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 font-heading font-semibold text-gray-900 tracking-tight">
                {title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2.5">
          {/* Gateway status indicator */}
          <div className="flex items-center gap-2 rounded-full border border-gray-200/60 bg-white/70 backdrop-blur-sm px-3 py-1.5">
            <span
              className={`size-1.5 rounded-full ${
                health?.status === "ok"
                  ? "bg-emerald-500 animate-pulse"
                  : health?.status === "error"
                    ? "bg-red-500"
                    : "bg-gray-300"
              }`}
            />
            <span className="text-[11px] font-medium text-gray-500">
              {health?.status === "ok" ? "Connected" : health?.status === "error" ? "Error" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
