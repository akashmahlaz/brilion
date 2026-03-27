import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '#/components/landing/static-page'

export const Route = createFileRoute('/roadmap')({
  component: RoadmapPage,
  head: () => ({
    meta: [{ title: 'Roadmap - Brilion' }],
  }),
})

function RoadmapPage() {
  return (
    <StaticPage
      title="Roadmap"
      description="Upcoming priorities for reliability, automation depth, and enterprise readiness."
    >
      <p>Roadmap themes: stronger observability, richer integrations, and safer autonomous actions.</p>
      <p>For feature requests, contact support with clear use cases and expected outcomes.</p>
    </StaticPage>
  )
}
