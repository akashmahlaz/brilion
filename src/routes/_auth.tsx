import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { Sparkles, Zap, Shield, Globe } from 'lucide-react'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    console.log('[AUTH LAYOUT] beforeLoad running — checking session...')
    // If user is already logged in, redirect to dashboard
    try {
      const res = await apiFetch('/api/auth/session')
      console.log('[AUTH LAYOUT] session response:', res.status, res.statusText)
      if (res.ok) {
        const data = await res.json()
        console.log('[AUTH LAYOUT] session data:', JSON.stringify(data))
        if (data?.user) {
          console.log('[AUTH LAYOUT] User already logged in, redirecting to /')
          throw redirect({ to: '/' })
        }
      }
    } catch (e) {
      if (e instanceof Response || (e && typeof e === 'object' && 'to' in e)) {
        console.log('[AUTH LAYOUT] Rethrowing redirect/response')
        throw e
      }
      console.error('[AUTH LAYOUT] beforeLoad error:', e)
    }
    console.log('[AUTH LAYOUT] No user session, showing auth page')
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand Panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background border-r">
        {/* Decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

        {/* Decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <span className="text-xl font-heading font-semibold">MyAI</span>
          </div>

          {/* Hero */}
          <div className="space-y-8 max-w-md">
            <h1 className="text-4xl font-heading font-bold tracking-tight leading-tight">
              Your personal AI agent, always ready.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Connect your favorite AI providers, link WhatsApp & Telegram, and let your agent handle the rest.
            </p>

            {/* Feature pills */}
            <div className="space-y-4">
              {[
                { icon: Zap, text: '10+ AI providers supported' },
                { icon: Globe, text: 'WhatsApp & Telegram in minutes' },
                { icon: Shield, text: 'Your keys, your data, your control' },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="size-4 text-primary" />
                  </div>
                  {f.text}
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial / social proof */}
          <div className="space-y-3">
            <div className="flex -space-x-2">
              {['A', 'S', 'R', 'M'].map((letter) => (
                <div key={letter} className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-xs font-medium">
                  {letter}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Trusted by developers & creators worldwide
            </p>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <Outlet />
      </div>
    </div>
  )
}
