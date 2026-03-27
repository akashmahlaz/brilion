import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '#/components/landing/static-page'

export const Route = createFileRoute('/blog')({
  component: BlogPage,
  head: () => ({
    meta: [{ title: 'Blog - Brilion' }],
  }),
})

function BlogPage() {
  return (
    <StaticPage
      title="Blog"
      description="Product updates, launch notes, and practical automation playbooks from the Brilion team."
    >
      <p>Long-form updates and tutorials are being consolidated here.</p>
      <p>For immediate release updates, see the Changelog page.</p>
    </StaticPage>
  )
}
