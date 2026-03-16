import { createFileRoute, Link, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
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
  { id: 'google', icon: Globe2, label: 'Google', to: '/chat' as const, soon: true },
  { id: 'social', icon: Share2, label: 'Social', to: '/chat' as const, soon: true },
  { id: 'trading', icon: TrendingUp, label: 'Trading', to: '/chat' as const, soon: true },
  { id: 'coding', icon: Code2, label: 'Coding', to: '/chat' as const, soon: true },
] as const

function AppLayout() {
  const router = useRouter()
  const pathname = router.state.location.pathname
  const { data: session } = useSession()
  const user = session?.user
  const [expanded, setExpanded] = useState(false)

  const isSettings = pathname.startsWith('/settings') || pathname.startsWith('/channels') ||
    pathname.startsWith('/agents') || pathname.startsWith('/config') ||
    pathname.startsWith('/skills') || pathname.startsWith('/cron') ||
    pathname.startsWith('/nodes') || pathname.startsWith('/logs') ||
    pathname.startsWith('/usage') || pathname.startsWith('/debug') ||
    pathname.startsWith('/sessions')
  const activeSection = isSettings ? 'settings' : 'chat'

  return (
    <div className="flex h-dvh bg-background">
      {/* ─── Main Sidebar — expandable, rounded ────────────────── */}
      <nav
        className={`flex shrink-0 flex-col border-r border-border/50 bg-secondary/50 rounded-r-2xl transition-all duration-200 ease-out ${
          expanded ? 'w-48' : 'w-15'
        }`}
      >
        {/* Top: Logo + expand toggle */}
        <div className={`flex items-center shrink-0 py-3 ${expanded ? 'px-3 justify-between' : 'justify-center'}`}>
          <Link to="/chat" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-blue-500 shadow-sm">
              <Sparkles className="size-4 text-white" />
            </div>
            {expanded && <span className="font-heading text-sm font-bold text-foreground">Brilion</span>}
          </Link>
          {expanded && (
            <button onClick={() => setExpanded(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors">
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>

        {!expanded && (
          <div className="flex justify-center mb-1">
            <button onClick={() => setExpanded(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors">
              <PanelLeft className="size-4" />
            </button>
          </div>
        )}

        {/* Section icons */}
        <div className={`flex flex-1 flex-col gap-1 ${expanded ? 'px-2' : 'items-center'}`}>
          {SECTIONS.map((s) => {
            const isActive = activeSection === s.id
            return (
              <Tooltip key={s.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    to={s.to}
                    className={`relative flex items-center gap-2.5 rounded-xl transition-all ${
                      expanded ? 'px-2.5 py-2' : 'size-10 justify-center'
                    } ${
                      isActive
                        ? 'bg-background text-foreground shadow-sm border border-border/60'
                        : s.soon
                          ? 'text-muted-foreground/40 cursor-default'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                    }`}
                    onClick={s.soon ? (e) => e.preventDefault() : undefined}
                  >
                    <s.icon className="size-4.5 shrink-0" />
                    {expanded && (
                      <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>{s.label}</span>
                    )}
                    {s.soon && (
                      <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-blue-400 border-2 border-secondary" />
                    )}
                  </Link>
                </TooltipTrigger>
                {!expanded && (
                  <TooltipContent side="right" sideOffset={8}>
                    {s.label}{s.soon ? ' (Coming soon)' : ''}
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </div>

        {/* Bottom: Settings + User avatar */}
        <div className={`flex flex-col gap-2 mt-auto pb-3 ${expanded ? 'px-2' : 'items-center'}`}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                to="/settings"
                className={`flex items-center gap-2.5 rounded-xl transition-all ${
                  expanded ? 'px-2.5 py-2' : 'size-10 justify-center'
                } ${
                  isSettings
                    ? 'bg-background text-foreground shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <Settings className="size-4.5 shrink-0" />
                {expanded && <span className="text-sm">Settings</span>}
              </Link>
            </TooltipTrigger>
            {!expanded && (
              <TooltipContent side="right" sideOffset={8}>Settings</TooltipContent>
            )}
          </Tooltip>

          {/* Avatar with gap */}
          <div className="pt-3 mt-1 border-t border-border/30">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-background/60 transition-all ${expanded ? 'w-full' : ''}`}>
                  <Avatar className="size-8 ring-2 ring-border/40">
                    {user?.image && <AvatarImage src={user.image} alt={user.name || ''} />}
                    <AvatarFallback className="bg-blue-50 text-blue-600 text-xs font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {expanded && (
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-medium text-foreground truncate">{user?.name || 'User'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
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
  )
}
