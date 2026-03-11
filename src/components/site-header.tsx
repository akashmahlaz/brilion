import { useRouter } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { Separator } from "#/components/ui/separator"
import { SidebarTrigger } from "#/components/ui/sidebar"
import { ThemeToggle } from "#/components/ThemeToggle"
import { Badge } from "#/components/ui/badge"
import { apiFetch } from "#/lib/api"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "#/components/ui/breadcrumb"

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
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
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1">
                {title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          {/* Gateway status indicator — OpenClaw style */}
          <Badge
            variant={health?.status === "ok" ? "default" : "secondary"}
            className="gap-1.5 text-[10px] font-mono"
          >
            <span
              className={`size-1.5 rounded-full ${
                health?.status === "ok"
                  ? "bg-emerald-500 animate-pulse"
                  : health?.status === "error"
                    ? "bg-red-500"
                    : "bg-muted-foreground/40"
              }`}
            />
            {health?.status === "ok" ? "Connected" : health?.status === "error" ? "Error" : "Offline"}
          </Badge>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
