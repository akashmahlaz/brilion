import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar'
import { AppSidebar } from '#/components/app-sidebar'
import { SiteHeader } from '#/components/site-header'
import { apiFetch } from '#/lib/api'

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

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="relative bg-[#F8F7F3]">
        {/* Ambient gradient blurs — matching hero */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-32 right-0 w-150 h-100 opacity-20"
            style={{
              background:
                'radial-gradient(ellipse at center, #bfdbfe 0%, #dbeafe 40%, transparent 70%)',
              filter: 'blur(100px)',
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-125 h-87.5 opacity-15"
            style={{
              background:
                'radial-gradient(ellipse at center, #fef3c7 0%, #fed7aa 40%, transparent 70%)',
              filter: 'blur(100px)',
            }}
          />
        </div>
        <div className="relative z-10 flex h-full flex-col">
          <SiteHeader />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
