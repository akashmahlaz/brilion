import { createFileRoute, Link, useRouteContext } from '@tanstack/react-router'
import {
  MessageSquare,
  Radio,
  Settings2,
  Bot,
  Activity,
  Zap,
  ArrowRight,
  Sparkles,
  Globe,
  TrendingUp,
  Brain,
  Rocket,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
})

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function DashboardPage() {
  const { user } = Route.useRouteContext() as { user?: { name?: string; onboardingCompleted?: boolean } }
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  // Setup checklist for progress banner
  const setupSteps = [
    { label: 'Create account', done: true },
    { label: 'Connect an AI provider', done: false },
    { label: 'Link a messaging channel', done: false },
    { label: 'Send your first message', done: false },
  ]
  const doneCount = setupSteps.filter((s) => s.done).length
  const showSetupBanner = !user?.onboardingCompleted && doneCount < setupSteps.length

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-4 md:py-6">
        {/* Welcome Section */}
        <div className="px-4 lg:px-6 space-y-1">
          <h1 className="text-2xl font-heading font-semibold tracking-tight md:text-3xl">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your AI agent today.
          </p>
        </div>

        {/* Setup Progress Banner */}
        {showSetupBanner && (
          <div className="px-4 lg:px-6">
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Rocket className="size-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Complete your setup</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      {setupSteps.map((step) => (
                        <div key={step.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {step.done ? (
                            <CheckCircle2 className="size-3.5 text-primary" />
                          ) : (
                            <Circle className="size-3.5" />
                          )}
                          <span className={step.done ? 'line-through opacity-60' : ''}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 w-48 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(doneCount / setupSteps.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <Button size="sm" asChild>
                  <Link to="/onboarding">
                    Continue setup <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <Card className="@container/card bg-gradient-to-t from-primary/5 to-card">
            <CardHeader className="relative pb-0">
              <CardDescription>Active Model</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                GPT-4o
              </CardTitle>
              <div className="absolute right-4 top-4">
                <TrendingUp className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Powered by GitHub Models <Sparkles className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Multi-provider support
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card bg-gradient-to-t from-primary/5 to-card">
            <CardHeader className="relative pb-0">
              <CardDescription>Channels</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Activity className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                WhatsApp &amp; Telegram <Globe className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Multi-platform messaging
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card bg-gradient-to-t from-primary/5 to-card">
            <CardHeader className="relative pb-0">
              <CardDescription>AI Providers</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                10+
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Bot className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                OpenAI, Anthropic, Google… <Bot className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Connect any provider you want
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card bg-gradient-to-t from-primary/5 to-card">
            <CardHeader className="relative pb-0">
              <CardDescription>System</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </CardTitle>
              <div className="absolute right-4 top-4">
                <TrendingUp className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                All services operational <Activity className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Server connected
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Quick Actions — Bento Grid */}
        <div className="px-4 lg:px-6">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {/* Large Chat Card */}
            <Card className="md:col-span-2 group hover:border-primary/30 transition-colors">
              <Link to="/chat" className="block">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <MessageSquare className="size-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">Start Chatting</CardTitle>
                      <CardDescription>
                        Talk to your AI agent in natural language
                      </CardDescription>
                    </div>
                    <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your AI can answer questions, manage your workspace,
                    interact with connected channels, and use built-in tools.
                  </p>
                </CardContent>
              </Link>
            </Card>

            {/* Channels Card */}
            <Card className="group hover:border-chart-2/30 transition-colors">
              <Link to="/channels" className="block">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-chart-2/10 group-hover:bg-chart-2/20 transition-colors">
                      <Radio className="size-6 text-chart-2" />
                    </div>
                    <ArrowRight className="ml-auto size-5 text-muted-foreground group-hover:text-chart-2 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg mb-1">Channels</CardTitle>
                  <CardDescription>
                    WhatsApp &amp; Telegram connections
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>

            {/* Skills Card */}
            <Card className="group hover:border-chart-4/30 transition-colors">
              <Link to="/skills" className="block">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-chart-4/10 group-hover:bg-chart-4/20 transition-colors">
                      <Brain className="size-6 text-chart-4" />
                    </div>
                    <ArrowRight className="ml-auto size-5 text-muted-foreground group-hover:text-chart-4 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg mb-1">Skills</CardTitle>
                  <CardDescription>
                    Customize how your AI behaves
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>

            {/* Settings Card */}
            <Card className="group hover:border-chart-3/30 transition-colors">
              <Link to="/settings" className="block">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-chart-3/10 group-hover:bg-chart-3/20 transition-colors">
                      <Settings2 className="size-6 text-chart-3" />
                    </div>
                    <ArrowRight className="ml-auto size-5 text-muted-foreground group-hover:text-chart-3 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg mb-1">Settings</CardTitle>
                  <CardDescription>
                    API keys, providers &amp; config
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>

            {/* Agent Capabilities — wide card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">What your agent can do</CardTitle>
                <CardDescription>
                  Built-in capabilities — no extra setup needed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    'Answer Questions',
                    'Web Search',
                    'Manage Files',
                    'Read Config',
                    'Edit Settings',
                    'Switch Models',
                    'Multi-Language',
                    'Channel Reply',
                    'Self Update',
                    'Custom Skills',
                  ].map((tool) => (
                    <div
                      key={tool}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <Zap className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">{tool}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
