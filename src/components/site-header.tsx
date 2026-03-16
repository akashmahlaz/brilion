import { useRouter } from "@tanstack/react-router"
import { SidebarTrigger } from "#/components/ui/sidebar"

export function SiteHeader() {
  const router = useRouter()
  const pathname = router.state.location.pathname

  // Only show header on non-chat pages (settings, etc.)
  const isChatPage = pathname === "/chat" || pathname === "/"
  if (isChatPage) {
    return (
      <header className="flex h-12 shrink-0 items-center px-4 md:hidden">
        <SidebarTrigger className="text-gray-400 hover:text-gray-700" />
      </header>
    )
  }

  // Minimal header for settings pages
  const PAGE_TITLES: Record<string, string> = {
    "/settings": "Settings",
    "/channels": "Channels",
    "/sessions": "Sessions",
    "/agents": "Agents",
    "/config": "Config",
    "/skills": "Skills",
    "/cron": "Cron",
    "/nodes": "Nodes",
    "/logs": "Logs",
    "/usage": "Usage",
    "/debug": "Debug",
  }
  const title = PAGE_TITLES[pathname] ?? ""

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200/40 px-4 lg:px-6">
      <SidebarTrigger className="text-gray-400 hover:text-gray-700" />
      {title && (
        <h1 className="font-heading text-sm font-semibold tracking-tight text-gray-900">
          {title}
        </h1>
      )}
    </header>
  )
}
