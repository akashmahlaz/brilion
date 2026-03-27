import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '#/components/landing/static-page'

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
  head: () => ({
    meta: [{ title: 'Changelog - Brilion' }],
  }),
})

function ChangelogPage() {
  return (
    <StaticPage
      title="Changelog"
      description="Track new features, fixes, and operational improvements shipped to Brilion."
    >
      <p>Recent updates include reliability improvements, link-quality hardening, and dashboard navigation cleanup.</p>
      <p>Use this page as the source of truth for release-level changes.</p>
    </StaticPage>
  )
}
