import { createFileRoute, Link } from '@tanstack/react-router'
import {
  MessageSquare,
  Radio,
  Settings2,
  Bot,
  Activity,
  Zap,
  ArrowUpRight,
  Globe,
  TrendingUp,
  Fingerprint,
  Shield,
  Rocket,
  Terminal,
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
import { Badge } from '#/components/ui/badge'
import { ContractDNA } from '#/components/contract-dna'
import { DeployPipeline } from '#/components/deploy-pipeline'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
        {/* Welcome Section */}
        <div className="px-4 lg:px-6">
          <div className="flex items-start justify-between">
            <div className="animate-slide-up">
              <h1 className="text-2xl font-heading font-semibold tracking-tight md:text-3xl">
                Welcome to <span className="gradient-text">Brilion AI</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg leading-relaxed">
                Your OpenClaw-powered platform for smart contract development, auditing, and deployment — all from the browser.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-lg gap-2 text-xs press-effect">
                <Terminal className="size-3.5" />
                Open Terminal
              </Button>
              <Button size="sm" className="rounded-lg gap-2 text-xs press-effect">
                <Rocket className="size-3.5" />
                New Project
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <Card className="@container/card group hover:border-primary/20 transition-all duration-300 animate-slide-up">
            <CardHeader className="pb-2">
              <CardDescription className="text-[11px] uppercase tracking-wider font-medium">Active Model</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums font-heading @[250px]/card:text-2xl">
                GPT-4o
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Badge variant="outline" className="gap-1 text-[10px] font-mono">
                  <TrendingUp className="size-2.5" />
                  Online
                </Badge>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs">
              <div className="line-clamp-1 flex gap-2 font-medium text-foreground/80">
                Powered by GitHub Models <Fingerprint className="size-3.5 text-primary" />
              </div>
              <div className="text-muted-foreground/60">
                7 providers configured
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card group hover:border-chart-2/20 transition-all duration-300 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <CardHeader className="pb-2">
              <CardDescription className="text-[11px] uppercase tracking-wider font-medium">Channels</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums font-heading @[250px]/card:text-2xl">
                2 Active
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Badge variant="outline" className="gap-1 text-[10px] font-mono">
                  <Activity className="size-2.5" />
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs">
              <div className="line-clamp-1 flex gap-2 font-medium text-foreground/80">
                WhatsApp &amp; Telegram <Globe className="size-3.5 text-chart-2" />
              </div>
              <div className="text-muted-foreground/60">
                Multi-platform messaging
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card group hover:border-chart-4/20 transition-all duration-300 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader className="pb-2">
              <CardDescription className="text-[11px] uppercase tracking-wider font-medium">Security Score</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums font-heading @[250px]/card:text-2xl">
                94/100
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Badge variant="outline" className="gap-1 text-[10px] font-mono">
                  <Shield className="size-2.5" />
                  Audited
                </Badge>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs">
              <div className="line-clamp-1 flex gap-2 font-medium text-foreground/80">
                Last scan: 2 hours ago <Bot className="size-3.5 text-chart-4" />
              </div>
              <div className="text-muted-foreground/60">
                No critical vulnerabilities
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card group hover:border-emerald-500/20 transition-all duration-300 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <CardHeader className="pb-2">
              <CardDescription className="text-[11px] uppercase tracking-wider font-medium">System</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums font-heading @[250px]/card:text-2xl">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Badge variant="outline" className="gap-1 text-[10px] font-mono">
                  <TrendingUp className="size-2.5" />
                  Healthy
                </Badge>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs">
              <div className="line-clamp-1 flex gap-2 font-medium text-foreground/80">
                10 self-management tools <Activity className="size-3.5 text-emerald-500" />
              </div>
              <div className="text-muted-foreground/60">
                Server connected on port 4000
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Contract DNA + Deploy Pipeline Row */}
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <ContractDNA />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '250ms' }}>
            <DeployPipeline />
          </div>
        </div>

        {/* Quick Actions — Bento Grid */}
        <div className="px-4 lg:px-6">
          <h2 className="text-sm font-heading font-medium text-muted-foreground mb-3 uppercase tracking-wider">Quick Actions</h2>
          <div className="grid auto-rows-min gap-3 md:grid-cols-3">
            {/* Large Chat Card */}
            <Card className="md:col-span-2 group hover:border-primary/25 transition-all duration-300 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <Link to="/chat" className="block">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors ring-1 ring-primary/10">
                      <MessageSquare className="size-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="font-heading text-base">Start Chatting</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Talk to your AI agent — generate, audit, or deploy
                      </CardDescription>
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground/70 leading-relaxed">
                    Your AI can generate smart contracts, audit code for vulnerabilities,
                    optimize gas, manage deployments, and interact with all connected services.
                  </p>
                </CardContent>
              </Link>
            </Card>

            {/* Channels Card */}
            <Card className="group hover:border-chart-2/25 transition-all duration-300 animate-slide-up" style={{ animationDelay: '350ms' }}>
              <Link to="/channels" className="block">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-chart-2/10 group-hover:bg-chart-2/15 transition-colors ring-1 ring-chart-2/10">
                      <Radio className="size-5 text-chart-2" />
                    </div>
                    <ArrowUpRight className="ml-auto size-4 text-muted-foreground/30 group-hover:text-chart-2 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="font-heading text-sm mb-1">Channels</CardTitle>
                  <CardDescription className="text-xs">
                    WhatsApp &amp; Telegram connections
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>

            {/* Settings Card */}
            <Card className="group hover:border-chart-4/25 transition-all duration-300 animate-slide-up" style={{ animationDelay: '400ms' }}>
              <Link to="/settings" className="block">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-chart-4/10 group-hover:bg-chart-4/15 transition-colors ring-1 ring-chart-4/10">
                      <Settings2 className="size-5 text-chart-4" />
                    </div>
                    <ArrowUpRight className="ml-auto size-4 text-muted-foreground/30 group-hover:text-chart-4 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="font-heading text-sm mb-1">Settings</CardTitle>
                  <CardDescription className="text-xs">
                    API keys, providers &amp; workspace config
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>

            {/* Agent Capabilities — wide card */}
            <Card className="md:col-span-2 animate-slide-up" style={{ animationDelay: '450ms' }}>
              <CardHeader>
                <CardTitle className="font-heading text-sm">Agent Capabilities</CardTitle>
                <CardDescription className="text-xs">
                  10 self-management tools built into your agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    "Read Config",
                    "Write Config",
                    "Read Files",
                    "Write Files",
                    "List Files",
                    "Get Auth",
                    "Set Auth",
                    "List Models",
                    "Web Search",
                    "Self Edit",
                  ].map((tool) => (
                    <div
                      key={tool}
                      className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Zap className="size-3 text-primary/70" />
                      {tool}
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
