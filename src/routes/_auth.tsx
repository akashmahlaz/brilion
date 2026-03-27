import { createFileRoute, Outlet, redirect, Link } from '@tanstack/react-router'
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
    <div className="relative min-h-screen bg-[#F8F7F3] flex flex-col overflow-hidden">
      {/* Background — same radial glow as hero */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-150 opacity-30"
          style={{
            background:
              'radial-gradient(ellipse at center, #bfdbfe 0%, #dbeafe 30%, #fef3c7 55%, #fed7aa 70%, transparent 85%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute top-[25%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-87.5 opacity-20"
          style={{
            background:
              'radial-gradient(ellipse at center, #93c5fd 0%, #bfdbfe 40%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 pt-6 md:pt-8">
        <Link to="/">
          <img src="/BRILION.svg" alt="Brilion" className="h-5 md:h-6" />
        </Link>
      </header>

      {/* Centered content */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center gap-5 pb-6 md:pb-8">
        <Link to="/privacy" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
          Privacy
        </Link>
        <span className="text-gray-300 text-[10px]">·</span>
        <Link to="/terms" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
          Terms
        </Link>
        <span className="text-gray-300 text-[10px]">·</span>
        <Link to="/support" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
          Support
        </Link>
      </footer>
    </div>
  )
}
