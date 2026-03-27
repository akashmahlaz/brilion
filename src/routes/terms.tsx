import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '#/components/landing/static-page'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
  head: () => ({
    meta: [{ title: 'Terms of Service - Brilion' }],
  }),
})

function TermsPage() {
  return (
    <StaticPage
      title="Terms of Service"
      description="Using Brilion means you agree to responsible use of automations, integrations, and connected channels."
    >
      <p>Do not use the platform for unlawful activity, abuse, spam, or actions that violate third-party service terms.</p>
      <p>You are responsible for credentials and permissions granted to connected tools and messaging channels.</p>
      <p>We may suspend accounts that create security risk or platform instability.</p>
    </StaticPage>
  )
}
