import { createFileRoute, Link, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Globe2,
  Share2,
  TrendingUp,
  Code2,
  Settings,
  Sparkles,
  LogOut,
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

// ─── Sidebar sections ────────────────────────────────────────────────────────
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

  // Determine active section
  const isSettings = pathname.startsWith('/settings') || pathname.startsWith('/channels') ||
    pathname.startsWith('/agents') || pathname.startsWith('/config') ||
    pathname.startsWith('/skills') || pathname.startsWith('/cron') ||
    pathname.startsWith('/nodes') || pathname.startsWith('/logs') ||
    pathname.startsWith('/usage') || pathname.startsWith('/debug') ||
    pathname.startsWith('/sessions')
  const activeSection = isSettings ? 'settings' : 'chat'

  return (
    <div className="flex h-dvh bg-[#F8F7F3]">
      {/* ─── Icon Sidebar (thin, ~60px) ────────────────────────────── */}
      <nav className="flex w-15 shrink-0 flex-col items-center border-r border-gray-200/50 bg-[#F8F7F3] py-3">
        {/* Logo */}
        <Link to="/chat" className="mb-4 flex size-9 items-center justify-center rounded-xl bg-gray-900 shadow-sm">
          <Sparkles className="size-4 text-white" />
        </Link>

        {/* Section icons */}
        <div className="flex flex-1 flex-col items-center gap-1">
          {SECTIONS.map((s) => {
            const isActive = activeSection === s.id
            return (
              <Tooltip key={s.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    to={s.to}
                    className={`relative flex size-10 items-center justify-center rounded-xl transition-all ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
                        : s.soon
                          ? 'text-gray-300 cursor-default'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-white/60'
                    }`}
                    onClick={s.soon ? (e) => e.preventDefault() : undefined}
                  >
                    <s.icon className="size-4.5" />
                    {s.soon && (
                      <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-amber-400 border border-[#F8F7F3]" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {s.label}{s.soon ? ' (Coming soon)' : ''}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Bottom: Settings + User avatar */}
        <div className="flex flex-col items-center gap-2 mt-auto">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                to="/settings"
                className={`flex size-10 items-center justify-center rounded-xl transition-all ${
                  isSettings
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-white/60'
                }`}
              >
                <Settings className="size-4.5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>Settings</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex size-9 items-center justify-center rounded-full ring-2 ring-gray-200/60 hover:ring-gray-300/60 transition-all">
                <Avatar className="size-8">
                  {user?.image && <AvatarImage src={user.image} alt={user.name || ''} />}
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-xs font-medium">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
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
                className="gap-2 text-red-600 focus:text-red-600"
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
      </nav>

      {/* ─── Main content area ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
