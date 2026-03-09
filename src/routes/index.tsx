import { createFileRoute, Link } from '@tanstack/react-router'
import {
  MessageSquare,
  Radio,
  Settings2,
  Bot,
  Activity,
  Zap,
  ArrowUpRight,
  Sparkles,
  Globe,
  TrendingUp,
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

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
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
                7 providers configured
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card bg-gradient-to-t from-primary/5 to-card">
            <CardHeader className="relative pb-0">
              <CardDescription>Channels</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                2 Active
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
                7
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Bot className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                GitHub, OpenAI, Anthropic… <Bot className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Multi-provider support
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
                10 self-management tools <Activity className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Server connected on port 4000
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Quick Actions — Bento Grid */}
        <div className="px-4 lg:px-6">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {/* Large Chat Card */}
            <Card className="md:col-span-2 group">
              <Link to="/chat" className="block">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                      <MessageSquare className="size-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">Start Chatting</CardTitle>
                      <CardDescription>
                        Talk to your AI agent in natural language
                      </CardDescription>
                    </div>
                    <ArrowUpRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your AI can answer questions, manage your workspace,
                    interact with connected channels, and use any of the 10
                    built-in tools.
                  </p>
                </CardContent>
              </Link>
            </Card>

            {/* Channels Card */}
            <Card className="group">
              <Link to="/channels" className="block">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-chart-2/10">
                      <Radio className="size-6 text-chart-2" />
                    </div>
                    <ArrowUpRight className="ml-auto size-5 text-muted-foreground group-hover:text-chart-2 transition-colors" />
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

            {/* Settings Card */}
            <Card className="group">
              <Link to="/settings" className="block">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-chart-4/10">
                      <Settings2 className="size-6 text-chart-4" />
                    </div>
                    <ArrowUpRight className="ml-auto size-5 text-muted-foreground group-hover:text-chart-4 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg mb-1">Settings</CardTitle>
                  <CardDescription>
                    API keys, providers &amp; workspace config
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>

            {/* Agent Capabilities — wide card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Agent Capabilities</CardTitle>
                <CardDescription>
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
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <Zap className="size-4 text-primary" />
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
