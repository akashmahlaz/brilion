import { useRouter } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Button } from "#/components/ui/button"
import { Separator } from "#/components/ui/separator"
import { SidebarTrigger } from "#/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "#/components/ui/breadcrumb"
import { Badge } from "#/components/ui/badge"

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/chat": "Chat",
  "/channels": "Channels",
  "/settings": "Settings",
}

export function SiteHeader() {
  const router = useRouter()
  const pathname = router.state.location.pathname
  const title = PAGE_TITLES[pathname] ?? "Brilion AI"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border/50 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-heading font-medium tracking-tight">
                {title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground h-8 px-3 rounded-lg border-border/60"
          >
            <Search className="size-3" />
            <span>Search</span>
            <kbd className="ml-1 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
          <Badge variant="outline" className="hidden sm:flex gap-1.5 text-[10px] font-mono font-medium tracking-wider uppercase text-muted-foreground/70 border-border/40 rounded-md">
            v0.1.0
          </Badge>
        </div>
      </div>
    </header>
  )
}
