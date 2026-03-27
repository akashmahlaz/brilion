import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '#/components/landing/static-page'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
  head: () => ({
    meta: [{ title: 'Privacy Policy - Brilion' }],
  }),
})

function PrivacyPage() {
  return (
    <StaticPage
      title="Privacy Policy"
      description="Brilion collects only the data needed to operate your automations securely and reliably."
    >
      <p>We process account details, usage events, and integration metadata to provide core product functionality.</p>
      <p>Your data is never sold. Access is restricted to authorized systems and audited operational access.</p>
      <p>You can request export or deletion of personal data by contacting support from the Support page.</p>
    </StaticPage>
  )
}
