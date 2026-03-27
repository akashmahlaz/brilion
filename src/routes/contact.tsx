import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '#/components/landing/static-page'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
  head: () => ({
    meta: [{ title: 'Contact - Brilion' }],
  }),
})

function ContactPage() {
  return (
    <StaticPage
      title="Contact"
      description="Talk to the Brilion team about product, partnerships, or enterprise onboarding."
    >
      <p>General inquiries: hello@brilion.ai</p>
      <p>Sales and enterprise: sales@brilion.ai</p>
      <p>Support: support@brilion.ai</p>
    </StaticPage>
  )
}
