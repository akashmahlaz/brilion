import { createFileRoute, Link } from '@tanstack/react-router'
import {
  MessageSquareText,
  Share2,
  TrendingUp,
  Code2,
  Video,
  CalendarDays,
  ArrowRight,
  Sparkles,
  Zap,
  BrainCircuit,
  Megaphone,
  Rocket,
  GraduationCap,
  LineChart,
} from 'lucide-react'

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

/* ═══════════════════════════════════════════════════════════
   Landing Page
   ═══════════════════════════════════════════════════════════ */
function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Integrations />
      <Features />
      <HowItWorks />
      <UseCases />
      <CTASection />
      <PageFooter />
    </div>
  )
}

/* ── Navbar ── */
const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Use Cases', href: '#use-cases' },
]

function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[#E8E6E0] bg-[#FAFAF7]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <a href="/home" className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#0D0D12]">
            <Sparkles className="size-3.5 text-white" />
          </div>
          <span className="font-heading text-[17px] font-bold tracking-tight text-[#0D0D12]">brilion</span>
        </a>

        {/* Center links */}
        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#6B6B6B] transition-colors hover:text-[#0D0D12]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right CTAs */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-[#6B6B6B] transition-colors hover:text-[#0D0D12]"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0D0D12] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1a1a24] hover:shadow-lg hover:shadow-black/10"
          >
            Get Started
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* ── Hero ── */
function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAFAF7] pt-[60px]">
      {/* Subtle radial glow — top center */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-blue-100/60 via-indigo-50/30 to-transparent blur-[80px]" />
      {/* Dotted texture */}
      <div className="landing-dots pointer-events-none absolute inset-0" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#E2E0D9] bg-white px-4 py-1.5 text-sm font-medium text-[#555] shadow-sm">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>AI Automation Platform · Now Available</span>
        </div>

        {/* Headline */}
        <h1 className="font-heading text-[52px] font-extrabold leading-[1.07] tracking-[-0.03em] sm:text-[68px] lg:text-[82px] xl:text-[96px]">
          <span className="text-[#0D0D12]">Everything automated</span>
          <br />
          <span className="landing-ink-gradient">from one message.</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-12 mt-7 max-w-[560px] text-[17px] leading-[1.75] text-[#6B6B6B] sm:text-[19px]">
          Connect WhatsApp to every app you use. Create ads, deploy code,
          run trades, book meetings — one conversation handles it all.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-[#0D0D12] px-7 py-3.5 text-[14px] font-semibold text-white shadow-md shadow-black/10 transition-all hover:bg-[#1a1a24] hover:shadow-lg hover:shadow-black/15"
          >
            Start for Free
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-[#D8D6D0] bg-white px-7 py-3.5 text-[14px] font-semibold text-[#0D0D12] shadow-sm transition-all hover:border-[#C0BDB6] hover:shadow-md"
          >
            See how it works
          </a>
        </div>

        {/* Chat mockup */}
        <div className="mx-auto mt-16 max-w-[480px]">
          <div className="overflow-hidden rounded-2xl border border-[#E2E0D9] bg-white shadow-xl shadow-black/[0.06]">
            {/* Mockup top bar */}
            <div className="flex items-center gap-2 border-b border-[#F0EDE7] bg-[#F8F7F3] px-4 py-3">
              <div className="size-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-[#6B6B6B]">WhatsApp · Brilion AI</span>
            </div>
            {/* Messages */}
            <div className="space-y-3 p-4 text-left">
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-md bg-[#E8F5E9] px-4 py-2.5 text-[13px] text-[#1B5E20]">
                  Create a Facebook ad for my client's new product launch
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0D0D12]">
                  <Sparkles className="size-3 text-white" />
                </div>
                <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-[#F3F2EE] px-4 py-2.5 text-[13px] text-[#333]">
                  Done! I've created 3 ad variations with targeting strategy.
                  Should I publish to Facebook and Instagram?
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-md bg-[#E8F5E9] px-4 py-2.5 text-[13px] text-[#1B5E20]">
                  Yes, publish all three ✓
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0D0D12]">
                  <Sparkles className="size-3 text-white" />
                </div>
                <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-[#F3F2EE] px-4 py-2.5 text-[13px] text-[#333]">
                  All 3 ads are live. Reach: ~45,000. I'll send you a report in 24h. 📊
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof line */}
        <p className="mt-8 text-[13px] text-[#9B9990]">
          Used by marketers, founders, traders & developers worldwide
        </p>
      </div>
    </section>
  )
}

/* ── Integrations ── */
const PLATFORMS = [
  'WhatsApp','YouTube','Gmail','Google Calendar','Google Meet',
  'GitHub','Facebook','Instagram','TikTok','Binance','Vercel','Telegram',
]

function Integrations() {
  return (
    <section className="border-b border-border bg-background py-16">
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-8 text-center text-sm font-medium tracking-wide text-muted-foreground">
          SEAMLESSLY CONNECTS WITH THE PLATFORMS YOU ALREADY USE
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {PLATFORMS.map((name) => (
            <span
              key={name}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:border-primary/30 hover:text-foreground"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Features Bento Grid ── */
function Features() {
  return (
    <section id="features" className="scroll-mt-16 bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold tracking-wide text-primary">CAPABILITIES</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Everything you need,<br />nothing you don't
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Six powerful modules that cover your entire digital life — all controlled through natural conversation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {/* Large card: AI Chat */}
          <div className="landing-card group md:col-span-2 lg:row-span-2">
            <div className="flex h-full flex-col p-6 lg:p-8">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                <MessageSquareText className="size-6 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground lg:text-2xl">AI Chat Intelligence</h3>
              <p className="mt-2 max-w-md text-muted-foreground">
                Your WhatsApp becomes a command center. Send natural language messages to manage every connected service — no app-switching, no dashboards, just conversation.
              </p>
              <div className="mt-auto pt-8">
                <div className="rounded-xl border border-border bg-muted/50 p-4">
                  <div className="space-y-2.5">
                    <div className="flex justify-end">
                      <div className="rounded-xl rounded-br-sm bg-primary/15 px-3.5 py-2 text-sm text-foreground/80">
                        Deploy my latest commit to production
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary">
                        <Sparkles className="size-3 text-primary-foreground" />
                      </div>
                      <div className="rounded-xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm text-muted-foreground">
                        Deployed! Build #847 is live on Vercel. All checks passed. ✓
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="rounded-xl rounded-br-sm bg-primary/15 px-3.5 py-2 text-sm text-foreground/80">
                        Now post the update on Twitter and LinkedIn
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary">
                        <Sparkles className="size-3 text-primary-foreground" />
                      </div>
                      <div className="rounded-xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm text-muted-foreground">
                        Published to both platforms. Engagement tracking is on. 📊
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="landing-card group">
            <div className="flex h-full flex-col p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-pink-500/10">
                <Share2 className="size-6 text-pink-500" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">Social Media Automation</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create and publish content across Facebook, Instagram, TikTok, and more. One message, every platform.
              </p>
              <div className="mt-auto flex gap-2 pt-6">
                {['FB', 'IG', 'TT', 'X'].map((tag) => (
                  <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs font-mono font-medium text-muted-foreground">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Smart Trading */}
          <div className="landing-card group">
            <div className="flex h-full flex-col p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <TrendingUp className="size-6 text-emerald-500" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">Smart Trading</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Execute strategies, track portfolios, and automate trades on Binance — directly from your chat.
              </p>
              <div className="mt-auto pt-6">
                <div className="flex items-end gap-1">
                  {[40,55,35,65,50,75,60,85,70,90,80].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-emerald-500/20 transition-all group-hover:bg-emerald-500/30" style={{ height: `${h * 0.6}px` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Code & Deploy */}
          <div className="landing-card group">
            <div className="flex h-full flex-col p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-orange-500/10">
                <Code2 className="size-6 text-orange-500" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">Code & Deploy</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Push to GitHub, deploy to Vercel, monitor builds — all through natural conversation.
              </p>
            </div>
          </div>

          {/* Content Creation */}
          <div className="landing-card group">
            <div className="flex h-full flex-col p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-blue-500/10">
                <Video className="size-6 text-blue-500" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">Content Creation</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Generate videos, ad sets, and marketing materials with AI. Review and publish without leaving your chat.
              </p>
            </div>
          </div>

          {/* Smart Calendar */}
          <div className="landing-card group">
            <div className="flex h-full flex-col p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-amber-500/10">
                <CalendarDays className="size-6 text-amber-500" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">Smart Calendar</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Schedule meetings, set reminders, manage your Google Calendar — just tell Brilion what you need.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── How It Works ── */
const STEPS = [
  {
    num: '01', icon: Zap, title: 'Connect',
    description: 'Link your WhatsApp and favorite apps in seconds. One-click integrations with bank-grade security.',
    color: 'text-violet-400', bg: 'bg-violet-400/10',
  },
  {
    num: '02', icon: MessageSquareText, title: 'Command',
    description: "Send a message in plain language. 'Create a Facebook ad for this product' or 'Deploy my latest commit.'",
    color: 'text-indigo-400', bg: 'bg-indigo-400/10',
  },
  {
    num: '03', icon: BrainCircuit, title: 'Done',
    description: 'Brilion executes instantly, confirms the result, and learns your preferences for next time.',
    color: 'text-fuchsia-400', bg: 'bg-fuchsia-400/10',
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-y border-border bg-muted/40 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold tracking-wide text-primary">HOW IT WORKS</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Three steps. Zero friction.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">From connection to automation in under a minute.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, idx) => (
            <div key={step.num} className="relative text-center md:text-left">
              {idx < STEPS.length - 1 && (
                <div className="pointer-events-none absolute right-0 top-10 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-border to-transparent md:block" />
              )}
              <div className="flex flex-col items-center md:items-start">
                <span className="mb-4 font-mono text-xs font-semibold tracking-widest text-muted-foreground">STEP {step.num}</span>
                <div className={`mb-5 flex size-14 items-center justify-center rounded-2xl ${step.bg}`}>
                  <step.icon className={`size-6 ${step.color}`} />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 max-w-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Use Cases ── */
const USE_CASES = [
  { icon: Megaphone, title: 'Digital Marketers', description: 'Create ad campaigns, generate creatives, and publish across platforms — all from one message.', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { icon: Code2, title: 'Developers', description: 'Manage repos, trigger deployments, monitor CI/CD pipelines without touching a terminal.', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { icon: LineChart, title: 'Traders', description: 'Set up automated strategies, track portfolio performance, execute trades in real-time.', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: Video, title: 'Content Creators', description: 'Generate scripts, create videos, publish to YouTube and social media effortlessly.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: Rocket, title: 'Founders', description: 'Manage your entire business operations from WhatsApp — meetings, marketing, and more.', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { icon: GraduationCap, title: 'Professionals', description: 'Automate administrative tasks, schedule appointments, organize your professional life.', color: 'text-amber-500', bg: 'bg-amber-500/10' },
]

function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-16 bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold tracking-wide text-primary">WHO IT&apos;S FOR</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Built for the way you work
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Whether you're a solo creator or running a team, Brilion adapts to your workflow.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {USE_CASES.map((uc) => (
            <div key={uc.title} className="landing-card group flex flex-col p-6">
              <div className={`mb-4 flex size-12 items-center justify-center rounded-2xl ${uc.bg}`}>
                <uc.icon className={`size-6 ${uc.color}`} />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">{uc.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{uc.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── CTA ── */
function CTASection() {
  return (
    <section className="relative overflow-hidden bg-[#08061A] py-24 lg:py-32">
      <div className="pointer-events-none absolute left-1/4 top-0 size-[500px] -translate-y-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 size-[400px] translate-y-1/2 rounded-full bg-indigo-600/10 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Ready to automate<br />your world?
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-lg text-white/50">
          Join the next generation of productivity. One conversation is all it takes.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-[#08061A] shadow-lg shadow-white/10 transition-all hover:bg-white/90 hover:shadow-xl hover:shadow-white/15"
          >
            Start Free
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-8 py-4 text-sm font-semibold text-white transition-all hover:border-white/25 hover:bg-white/[0.04]"
          >
            Log in to Dashboard
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ── Footer ── */
function PageFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#08061A] py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-indigo-600">
            <Sparkles className="size-3 text-white" />
          </div>
          <span className="font-heading text-sm font-bold text-white/80">brilion</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/40">
          <a href="#features" className="transition-colors hover:text-white/70">Features</a>
          <a href="#how-it-works" className="transition-colors hover:text-white/70">How it works</a>
          <a href="#use-cases" className="transition-colors hover:text-white/70">Use Cases</a>
          <Link to="/login" className="transition-colors hover:text-white/70">Login</Link>
          <Link to="/signup" className="transition-colors hover:text-white/70">Sign Up</Link>
        </div>
        <p className="text-xs text-white/25">&copy; {new Date().getFullYear()} Brilion. All rights reserved.</p>
      </div>
    </footer>
  )
}
