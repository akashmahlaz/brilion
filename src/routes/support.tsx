import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '#/components/landing/static-page'

export const Route = createFileRoute('/support')({
  component: SupportPage,
  head: () => ({
    meta: [{ title: 'Support - Brilion' }],
  }),
})

function SupportPage() {
  return (
    <StaticPage
      title="Support"
      description="Need help with setup, integrations, or billing? We are here to help."
    >
      <p>For account or billing issues, include your workspace name and a clear description of the issue.</p>
      <p>For technical support, share reproduction steps, expected behavior, and any error messages.</p>
      <p>Contact: support@brilion.ai</p>
    </StaticPage>
  )
}
