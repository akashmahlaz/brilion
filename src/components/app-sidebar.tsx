import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import {
  Settings2,
  Sparkles,
  LogOut,
  ChevronsUpDown,
  Plus,
  Trash2,
  MessageCircle,
  Send,
  Globe,
  Search,
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"

import { useSession, signOut } from "#/lib/auth-client"
import { apiFetch } from "#/lib/api"
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "#/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip"

// ─── Types ───────────────────────────────────────────────
interface ConversationSummary {
  _id: string
  title: string
  channel: "web" | "whatsapp" | "telegram"
  foreignId?: string
  model?: string
  messageCount?: number
  lastMessage?: string | null
  updatedAt: string
  createdAt: string
}

const CHANNEL_DOT: Record<string, string> = {
  web: "bg-blue-500",
  whatsapp: "bg-emerald-500",
  telegram: "bg-sky-500",
}

// ─── Sidebar ─────────────────────────────────────────────
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const router = useRouter()
  const user = session?.user
  const pathname = router.state.location.pathname

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [search, setSearch] = useState("")

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiFetch("/api/chat")
      if (res.ok) setConversations(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadConversations()
    const id = setInterval(loadConversations, 5000)
    return () => clearInterval(id)
  }, [loadConversations])

  const filteredConversations = search
    ? conversations.filter((c) =>
        c.title?.toLowerCase().includes(search.toLowerCase())
      )
    : conversations

  // Group by date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const groups: { label: string; items: ConversationSummary[] }[] = []
  const todayItems: ConversationSummary[] = []
  const yesterdayItems: ConversationSummary[] = []
  const weekItems: ConversationSummary[] = []
  const olderItems: ConversationSummary[] = []

  for (const c of filteredConversations) {
    const d = new Date(c.updatedAt)
    if (d >= today) todayItems.push(c)
    else if (d >= yesterday) yesterdayItems.push(c)
    else if (d >= weekAgo) weekItems.push(c)
    else olderItems.push(c)
  }

  if (todayItems.length) groups.push({ label: "Today", items: todayItems })
  if (yesterdayItems.length) groups.push({ label: "Yesterday", items: yesterdayItems })
  if (weekItems.length) groups.push({ label: "Previous 7 days", items: weekItems })
  if (olderItems.length) groups.push({ label: "Older", items: olderItems })

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await apiFetch(`/api/chat?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      loadConversations()
    } catch { /* ignore */ }
  }

  function handleNewChat() {
    navigate({ to: "/chat" })
  }

  // Determine if a conversation is active from URL search params
  const activeConvId = (() => {
    try {
      const url = new URL(window.location.href)
      return url.searchParams.get("id")
    } catch { return null }
  })()

  return (
    <Sidebar collapsible="icon" className="border-r-0" {...props}>
      {/* ─── Header: Logo + New Chat ─── */}
      <SidebarHeader className="pb-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-foreground text-background shadow-[inset_0_0_12px_rgba(255,255,255,0.15)]">
                  <Sparkles className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-heading font-bold tracking-tight text-foreground">Brilion</span>
                  <span className="truncate text-[11px] text-muted-foreground">AI Gateway</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* New Chat button */}
        <div className="px-2 pt-3 pb-2">
          <button
            onClick={handleNewChat}
            className="group flex w-full items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur-sm px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:bg-card hover:border-ring/30 hover:text-foreground transition-all duration-200"
          >
            <Plus className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            New chat
          </button>
        </div>

        {/* Search */}
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chats…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-card/50 pl-8 pr-3 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring/40 focus:bg-card transition-all"
            />
          </div>
        </div>
      </SidebarHeader>

      {/* ─── Conversation list ─── */}
      <SidebarContent>
        <div className="flex-1 overflow-y-auto px-2">
          {groups.length === 0 && (
            <div className="px-3 py-8 text-center">
              <p className="text-[12px] text-muted-foreground">No conversations yet</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Start a new chat above</p>
            </div>
          )}

          {groups.map((group) => (
            <SidebarGroup key={group.label} className="py-1">
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
              <SidebarGroupContent>
                <div className="space-y-0.5">
                  {group.items.map((c) => {
                    const isActive = activeConvId === c._id
                    return (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => navigate({ to: "/chat", search: { id: c._id } })}
                        className={`group/item w-full text-left rounded-lg px-2.5 py-2 transition-all duration-150 ${
                          isActive
                            ? "bg-card shadow-sm border border-border"
                            : "hover:bg-accent"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`size-1.5 rounded-full mt-1.5 shrink-0 ${CHANNEL_DOT[c.channel] || "bg-muted-foreground"}`} />
                          <div className="flex-1 min-w-0">
                            <span className="block truncate text-[13px] font-medium text-foreground">
                              {c.title || "Untitled"}
                            </span>
                            {c.lastMessage && (
                              <span className="block truncate text-[11px] text-muted-foreground mt-0.5">
                                {c.lastMessage}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-muted-foreground opacity-0 group-hover/item:opacity-100">
                              {formatTimeAgo(c.updatedAt)}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => deleteConversation(c._id, e)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") deleteConversation(c._id, e as any)
                                  }}
                                  className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 rounded"
                                >
                                  <Trash2 className="size-3" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right">Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </div>
      </SidebarContent>

      {/* ─── Footer: User menu ─── */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-accent">
                  <Avatar className="size-8 rounded-xl">
                    <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
                    <AvatarFallback className="rounded-xl bg-foreground text-background text-xs font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium text-foreground">{user?.name ?? "User"}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{user?.email ?? ""}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-xl">
                      <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
                      <AvatarFallback className="rounded-xl bg-foreground text-background text-xs font-semibold">
                        {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name ?? "User"}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings2 className="mr-2 size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut()
                    navigate({ to: "/login" })
                  }}
                >
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
