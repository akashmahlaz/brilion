import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '#/components/landing/navbar'
import { Hero } from '#/components/landing/hero'
import { LogoCarousel } from '#/components/landing/logo-carousel'
import { VideoShowcase } from '#/components/landing/video-showcase'
import { IntegrationsBeam } from '#/components/landing/integrations-beam'
import { Features } from '#/components/landing/features'
import { HowItWorks } from '#/components/landing/how-it-works'

export const Route = createFileRoute('/home')({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'Brilion — Automate Everything from One Conversation' },
      {
        name: 'description',
        content:
          'Connect WhatsApp to every app you use. Send a message to create ads, deploy code, execute trades, or schedule meetings. AI-powered life automation.',
      },
    ],
  }),
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8F7F3]">
      <Navbar />
      <Hero />
      <LogoCarousel />
      <VideoShowcase />
      <IntegrationsBeam />
      <Features />
      <HowItWorks />
    </div>
  )
}

