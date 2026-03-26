import { createFileRoute, Link, Outlet, redirect, useRouter } from '@tanstack/react-router'
import {
  MessageSquare,
  Globe2,
  Share2,
  TrendingUp,
  Code2,
  Settings,
  Sparkles,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { useSession, signOut } from '#/lib/auth-client'
import { apiFetch } from '#/lib/api'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { HotkeysProvider, useHotkey } from '@tanstack/react-hotkeys'
import { useStore } from '@tanstack/react-store'
import { appStore, toggleSidebar, setSidebarExpanded } from '#/lib/app-store'
import { toggleChatPanel } from '#/lib/app-store'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    try {
      const res = await apiFetch('/api/auth/session')
      if (!res.ok) throw new Error('Not authenticated')
      const data = await res.json()
      if (!data?.user) throw new Error('No session')

      return {
        user: data.user,
        session: { expires: data.expires },
      }
    } catch (e) {
      if (e instanceof Response || (e && typeof e === 'object' && 'to' in e)) throw e
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout,
})

const SECTIONS = [
  { id: 'chat', icon: MessageSquare, label: 'Chats', to: '/chat' as const },
  { id: 'google', icon: Globe2, label: 'Google', to: '/google' as const },
  { id: 'social', icon: Share2, label: 'Social', to: '/social' as const },
  { id: 'trading', icon: TrendingUp, label: 'Trading', to: '/trading' as const },
  { id: 'coding', icon: Code2, label: 'Coding', to: '/coding' as const },
] as const

function AppLayout() {
  const router = useRouter()
  const pathname = router.state.location.pathname
  const { data: session } = useSession()
  const user = session?.user
  const expanded = useStore(appStore, (s) => s.sidebarExpanded)

  // Global keyboard shortcuts
  useHotkey('mod+shift+c', () => router.navigate({ to: '/chat' }))
  useHotkey('mod+shift+s', () => router.navigate({ to: '/settings' }))
  useHotkey('mod+shift+l', () => router.navigate({ to: '/logs' }))
  useHotkey('mod+shift+u', () => router.navigate({ to: '/usage' }))
  useHotkey('mod+shift+o', () => router.navigate({ to: '/overview' }))
  useHotkey('mod+b', () => toggleSidebar())
  useHotkey('mod+shift+b', () => toggleChatPanel())

  const isSettings = pathname.startsWith('/settings') || pathname.startsWith('/channels') ||
    pathname.startsWith('/agents') || pathname.startsWith('/config') ||
    pathname.startsWith('/skills') || pathname.startsWith('/cron') ||
    pathname.startsWith('/nodes') || pathname.startsWith('/logs') ||
    pathname.startsWith('/usage') || pathname.startsWith('/debug') ||
    pathname.startsWith('/sessions')
  const activeSection = isSettings
    ? 'settings'
    : pathname.startsWith('/google')
      ? 'google'
      : pathname.startsWith('/social')
        ? 'social'
        : pathname.startsWith('/trading')
          ? 'trading'
          : pathname.startsWith('/coding')
            ? 'coding'
            : 'chat'

  return (
    <HotkeysProvider>
    <div className="flex h-dvh bg-background">
      {/* ─── Sidebar ───────────────────────────────────────── */}
      <nav
        className={`flex shrink-0 flex-col border-r border-border bg-sidebar backdrop-blur-xl transition-all duration-300 ease-out ${
          expanded ? 'w-52' : 'w-15'
        }`}
      >
        {/* Logo + expand toggle */}
        <div className={`flex items-center shrink-0 h-14 ${expanded ? 'px-3.5 justify-between' : 'justify-center'}`}>
          <Link to="/chat" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-foreground shadow-[inset_0_0_12px_rgba(255,255,255,0.15)]">
              <Sparkles className="size-4 text-background" />
            </div>
            {expanded && <span className="font-heading text-[15px] font-bold text-foreground tracking-tight">Brilion</span>}
          </Link>
          {expanded && (
            <button onClick={() => setSidebarExpanded(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>

        {!expanded && (
          <div className="flex justify-center mb-2">
            <button onClick={() => setSidebarExpanded(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <PanelLeft className="size-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className={`flex flex-1 flex-col gap-1 ${expanded ? 'px-2' : 'items-center'} mt-1`}>
          {SECTIONS.map((s) => {
            const isActive = activeSection === s.id
            return (
              <Tooltip key={s.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    to={s.to}
                    className={`relative flex items-center gap-2.5 rounded-xl transition-all duration-200 ${
                      expanded ? 'px-3 py-2.5' : 'size-10 justify-center'
                    } ${
                      isActive
                        ? 'bg-primary/8 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <s.icon className="size-4.5 shrink-0" />
                    {expanded && (
                      <span className={`text-[13px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{s.label}</span>
                    )}
                  </Link>
                </TooltipTrigger>
                {!expanded && (
                  <TooltipContent side="right" sideOffset={8} className="font-medium">
                    {s.label}
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </div>

        {/* Bottom: Settings + User */}
        <div className={`flex flex-col gap-1.5 mt-auto pb-3 ${expanded ? 'px-2' : 'items-center'}`}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                to="/settings"
                className={`flex items-center gap-2.5 rounded-xl transition-all duration-200 ${
                  expanded ? 'px-3 py-2.5' : 'size-10 justify-center'
                } ${
                  isSettings
                    ? 'bg-primary/8 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Settings className="size-4.5 shrink-0" />
                {expanded && <span className="text-[13px] font-medium">Settings</span>}
              </Link>
            </TooltipTrigger>
            {!expanded && (
              <TooltipContent side="right" sideOffset={8} className="font-medium">Settings</TooltipContent>
            )}
          </Tooltip>

          <div className="mt-1 pt-3 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-accent transition-colors ${expanded ? 'w-full' : ''}`}>
                  <Avatar className="size-8 ring-2 ring-border">
                    {user?.image && <AvatarImage src={user.image} alt={user.name || ''} />}
                    <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {expanded && (
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[12px] font-medium text-foreground truncate">{user?.name || 'User'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-52 rounded-xl">
                <div className="px-2 py-2">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="gap-2">
                    <Settings className="size-3.5" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={async () => {
                    await signOut()
                    window.location.href = '/login'
                  }}
                >
                  <LogOut className="size-3.5" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* ─── Main content area ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
    </HotkeysProvider>
  )
}
