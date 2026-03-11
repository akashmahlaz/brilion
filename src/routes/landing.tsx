import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  Sparkles,
  Zap,
  MessageCircle,
  Brain,
  Shield,
  Globe,
  ArrowRight,
  Bot,
  Puzzle,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/landing')({
  beforeLoad: async () => {
    // If logged in, go to dashboard
    try {
      const res = await apiFetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        if (data?.user) throw redirect({ to: '/' })
      }
    } catch (e) {
      if (e instanceof Response || (e && typeof e === 'object' && 'to' in e)) throw e
    }
  },
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="text-lg font-heading font-semibold">MyAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">
                Get Started <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-primary/5 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center md:py-32 lg:py-40">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm mb-8">
            <Sparkles className="size-3.5 text-primary" />
            Now with 10+ AI providers
          </div>

          <h1 className="text-4xl font-heading font-bold tracking-tight md:text-5xl lg:text-6xl">
            Your personal AI agent,{' '}
            <span className="text-primary">always ready.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Connect your favorite AI providers, link WhatsApp & Telegram, and let 
            your AI agent handle conversations, tasks, and more — all from one dashboard.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link to="/signup">
                Start for Free <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {['A', 'S', 'P', 'R', 'M'].map((letter) => (
                <div
                  key={letter}
                  className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-xs font-medium"
                >
                  {letter}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Trusted by developers & creators worldwide
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-heading font-bold tracking-tight">
              Everything you need in one platform
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              No more juggling between apps. MyAI brings AI, messaging, and automation together.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Zap,
                color: 'bg-primary/10 text-primary',
                title: '10+ AI Providers',
                description: 'OpenAI, Anthropic, Google, GitHub, xAI, Groq, and more. Use any model you want.',
              },
              {
                icon: MessageCircle,
                color: 'bg-emerald-500/10 text-emerald-500',
                title: 'WhatsApp & Telegram',
                description: 'Connect your messaging apps. Your AI responds to messages automatically.',
              },
              {
                icon: Brain,
                color: 'bg-violet-500/10 text-violet-500',
                title: 'Custom Skills',
                description: 'Teach your AI new behaviors. It can even create and update its own skills.',
              },
              {
                icon: Shield,
                color: 'bg-amber-500/10 text-amber-500',
                title: 'Your Keys, Your Data',
                description: 'Bring your own API keys. We never store or access your conversations.',
              },
              {
                icon: Puzzle,
                color: 'bg-cyan-500/10 text-cyan-500',
                title: 'Built-in Tools',
                description: 'Web search, file management, config editing — 10+ tools out of the box.',
              },
              {
                icon: Globe,
                color: 'bg-blue-500/10 text-blue-500',
                title: 'Works Everywhere',
                description: 'Chat from your browser, WhatsApp, or Telegram. Same AI, everywhere.',
              },
            ].map((feature) => (
              <Card key={feature.title} className="group hover:border-primary/20 transition-colors">
                <CardContent className="pt-6">
                  <div className={`mb-4 flex size-12 items-center justify-center rounded-2xl ${feature.color}`}>
                    <feature.icon className="size-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="text-3xl font-heading font-bold tracking-tight mb-16">
            Up and running in 3 minutes
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Sign up',
                description: 'Create your account with Google, LinkedIn, or email.',
              },
              {
                step: '2',
                title: 'Connect',
                description: 'Add your AI provider keys and link WhatsApp or Telegram.',
              },
              {
                step: '3',
                title: 'Chat',
                description: 'Start talking to your AI — from your browser or messaging apps.',
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-heading font-bold">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <div className="flex justify-center mb-6">
            <div className="flex size-16 items-center justify-center rounded-3xl bg-primary/10">
              <Bot className="size-8 text-primary" />
            </div>
          </div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Create your free account and have your AI agent running in minutes.
          </p>
          <div className="mt-8">
            <Button size="lg" className="h-12 px-10 text-base" asChild>
              <Link to="/signup">
                Start for Free <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            MyAI — Personal AI Agent Platform
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MyAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
