import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '#/components/landing/static-page'

export const Route = createFileRoute('/about')({
  component: AboutPage,
  head: () => ({
    meta: [{ title: 'About - Brilion' }],
  }),
})

function AboutPage() {
  return (
    <StaticPage
      title="About Brilion"
      description="Brilion helps teams automate complex work from one conversation across chat, tools, and AI models."
    >
      <p>Our focus is practical automation that combines speed, reliability, and visibility across every workflow.</p>
      <p>We build for operators, developers, and growth teams who want execution, not just chat responses.</p>
    </StaticPage>
  )
}
