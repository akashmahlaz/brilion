import { createFileRoute, Link, Outlet, redirect, useRouter } from '@tanstack/react-router'
import {
  MessageSquare,
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

// Real Google "G" logo with official brand colors
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// Google-branded wordmark text with official per-letter colors
function GoogleText({ className }: { className?: string }) {
  const colors = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335']
  return (
    <span className={className}>
      {'Google'.split('').map((ch, i) => (
        <span key={i} style={{ color: colors[i] }}>{ch}</span>
      ))}
    </span>
  )
}

// Branded sidebar icons for each section
function SocialIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function TradingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

function CodingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </svg>
  )
}

// Section brand colors for active state
const SECTION_COLORS: Record<string, { bg: string; text: string }> = {
  chat: { bg: 'bg-primary/8', text: 'text-primary' },
  google: { bg: 'bg-blue-500/8', text: '' }, // Google keeps its multicolor
  social: { bg: 'bg-violet-500/8', text: 'text-violet-500' },
  trading: { bg: 'bg-emerald-500/8', text: 'text-emerald-500' },
  coding: { bg: 'bg-amber-500/8', text: 'text-amber-500' },
}

const SECTIONS = [
  { id: 'chat', icon: MessageSquare, label: 'Chats', to: '/chat' as const },
  { id: 'google', icon: GoogleIcon, label: 'Google', to: '/google' as const },
  { id: 'social', icon: SocialIcon, label: 'Social', to: '/social' as const },
  { id: 'trading', icon: TradingIcon, label: 'Trading', to: '/trading' as const },
  { id: 'coding', icon: CodingIcon, label: 'Coding', to: '/coding' as const },
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
            const colors = SECTION_COLORS[s.id] || SECTION_COLORS.chat
            return (
              <Tooltip key={s.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    to={s.to}
                    className={`relative flex items-center gap-2.5 rounded-xl transition-all duration-200 ${
                      expanded ? 'px-3 py-2.5' : 'size-10 justify-center'
                    } ${
                      isActive
                        ? `${colors.bg} ${colors.text}`
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <s.icon className="size-4.5 shrink-0" />
                    {expanded && (
                      s.id === 'google'
                        ? <GoogleText className={`text-[13px] ${isActive ? 'font-semibold' : 'font-medium'}`} />
                        : <span className={`text-[13px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{s.label}</span>
                    )}
                  </Link>
                </TooltipTrigger>
                {!expanded && (
                  <TooltipContent side="right" sideOffset={8} className="font-medium">
                    {s.id === 'google' ? <GoogleText className="text-sm font-medium" /> : s.label}
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
