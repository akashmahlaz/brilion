import { createFileRoute, Link } from '@tanstack/react-router'
import { StaticPage } from '#/components/landing/static-page'

export const Route = createFileRoute('/docs')({
  component: DocsPage,
  head: () => ({
    meta: [{ title: 'Documentation - Brilion' }],
  }),
})

function DocsPage() {
  return (
    <StaticPage
      title="Documentation"
      description="Find setup guides, API references, and integration walkthroughs."
    >
      <p>Use MCP for model and tools integration details, and Settings for provider configuration.</p>
      <p>
        Start with <Link to="/mcp" className="text-gray-900 underline">MCP docs</Link> and then configure channels in the dashboard.
      </p>
    </StaticPage>
  )
}
