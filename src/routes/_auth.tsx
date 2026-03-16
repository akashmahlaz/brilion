import { createFileRoute, Outlet, redirect, Link } from '@tanstack/react-router'
import { MessageSquare, Zap, Shield, Bot } from 'lucide-react'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    try {
      const res = await apiFetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        if (data?.user) {
          throw redirect({ to: '/overview' })
        }
      }
    } catch (e) {
      if (e instanceof Response || (e && typeof e === 'object' && 'to' in e)) throw e
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-[#F8F7F3]">
      {/* Brand Panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-120 xl:w-130 relative overflow-hidden bg-gray-950">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-size-[48px_48px]" />

        {/* Accent glow */}
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-purple-500/15 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-blue-500/10 blur-[80px]" />

        <div className="relative flex flex-col justify-between p-10 xl:p-12 w-full">
          {/* Logo */}
          <Link to="/" className="inline-block">
            <img src="/BRILION.svg" alt="Brilion" className="h-6 brightness-0 invert" />
          </Link>

          {/* Hero text */}
          <div className="space-y-8 max-w-sm">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-[3px]">
                AI Operating System
              </p>
              <h1 className="text-[32px] xl:text-[36px] font-heading font-bold tracking-tight leading-[1.15] text-white">
                One conversation to automate everything.
              </h1>
            </div>
            <p className="text-[15px] text-gray-400 leading-relaxed">
              Connect WhatsApp, Telegram, and every app you use. Send a message — Brilion handles the rest.
            </p>

            {/* Feature list */}
            <div className="space-y-3.5 pt-2">
              {[
                { icon: MessageSquare, text: 'WhatsApp & Telegram in minutes' },
                { icon: Bot, text: '10+ AI providers — use your own keys' },
                { icon: Zap, text: 'Marketing, trading, code — automated' },
                { icon: Shield, text: 'Your data stays yours, always' },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/6 ring-1 ring-white/8">
                    <f.icon className="size-3.5 text-gray-400" />
                  </div>
                  <span className="text-[13px] text-gray-400">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="space-y-4 border-t border-white/6 pt-6">
            <p className="text-[14px] text-gray-300 leading-relaxed italic">
              "I automated my entire marketing workflow through WhatsApp. What used to take 4 hours now takes one message."
            </p>
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-purple-500/20 text-[11px] font-semibold text-purple-300">
                AK
              </div>
              <div>
                <p className="text-[13px] font-medium text-gray-300">Akash K.</p>
                <p className="text-[11px] text-gray-500">Founder, Brilion</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <div className="flex items-center justify-between p-5 lg:hidden">
          <Link to="/">
            <img src="/BRILION.svg" alt="Brilion" className="h-5" />
          </Link>
        </div>

        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center px-6 pb-10">
          <Outlet />
        </div>

        {/* Bottom subtle text */}
        <div className="hidden lg:flex items-center justify-center pb-6 gap-6">
          <a href="#" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
            Privacy Policy
          </a>
          <span className="text-gray-300">·</span>
          <a href="#" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  )
}
