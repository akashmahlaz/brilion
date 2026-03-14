import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '#/components/landing/navbar'
import { Hero } from '#/components/landing/hero'

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
    </div>
  )
}

