import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '#/components/landing/static-page'

export const Route = createFileRoute('/status')({
  component: StatusPage,
  head: () => ({
    meta: [{ title: 'Status - Brilion' }],
  }),
})

function StatusPage() {
  return (
    <StaticPage
      title="System Status"
      description="Current platform health and incident communication."
    >
      <p>All core services are currently operational.</p>
      <p>If you experience an issue, report it via the Support page with reproduction details.</p>
    </StaticPage>
  )
}
