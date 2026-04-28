import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { ShieldCheck, FileText, Sparkles } from 'lucide-react'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsLayout,
})

const SETTINGS_TABS = [
  { to: '/settings/providers', label: 'Providers', icon: ShieldCheck, description: 'AI keys & models' },
  { to: '/settings/workspace', label: 'Workspace', icon: FileText, description: 'Files & instructions' },
  { to: '/settings/persona', label: 'Persona', icon: Sparkles, description: 'Identity & memory' },
] as const

function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-5 lg:px-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage providers, workspace, and your AI's persona
          </p>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 lg:px-6">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname.startsWith(tab.to)
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`group relative -mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors ${
                  isActive
                    ? 'border-primary text-foreground font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
