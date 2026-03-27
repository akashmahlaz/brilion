import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '#/components/landing/static-page'

export const Route = createFileRoute('/careers')({
  component: CareersPage,
  head: () => ({
    meta: [{ title: 'Careers - Brilion' }],
  }),
})

function CareersPage() {
  return (
    <StaticPage
      title="Careers"
      description="We are building an AI execution platform with high ownership and fast iteration."
    >
      <p>We value engineering rigor, product thinking, and clear customer impact.</p>
      <p>Send your profile and portfolio to careers@brilion.ai.</p>
    </StaticPage>
  )
}
