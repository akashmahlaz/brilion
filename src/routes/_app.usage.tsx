import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_app/usage')({
  component: UsagePage,
})

interface UsageStats {
  totalTokens: number
  inputTokens: number
  outputTokens: number
  totalCost: number
  requestCount: number
  avgLatency: number
  models: { name: string; tokens: number; cost: number; requests: number }[]
  dailyUsage: { date: string; tokens: number; cost: number }[]
}

function UsagePage() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('7d')
  const [loading] = useState(false)

  // Mock usage data — matches OpenClaw's token usage dashboard concept
  const stats: UsageStats = {
    totalTokens: 1_247_832,
    inputTokens: 823_412,
    outputTokens: 424_420,
    totalCost: 18.74,
    requestCount: 342,
    avgLatency: 1.2,
    models: [
      { name: 'claude-opus-4-6', tokens: 645_200, cost: 12.4, requests: 156 },
      { name: 'gpt-4o', tokens: 312_400, cost: 3.8, requests: 98 },
      { name: 'claude-sonnet-4', tokens: 189_000, cost: 1.9, requests: 67 },
      { name: 'gemini-2.5-pro', tokens: 101_232, cost: 0.64, requests: 21 },
    ],
    dailyUsage: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
      tokens: Math.floor(100000 + Math.random() * 200000),
      cost: Number((1 + Math.random() * 5).toFixed(2)),
    })),
  }

  const maxTokens = Math.max(...stats.dailyUsage.map((d) => d.tokens))

  function formatTokens(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-semibold">Usage</h1>
              <p className="text-sm text-muted-foreground">
                Token usage, cost tracking, and model analytics.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Period selector — OpenClaw: Today / 7d / 30d */}
              <div className="flex rounded-lg border overflow-hidden">
                {(['today', '7d', '30d'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      period === p
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {p === 'today' ? 'Today' : p}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Tokens</p>
                    <p className="text-2xl font-bold">{formatTokens(stats.totalTokens)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTokens(stats.inputTokens)} in / {formatTokens(stats.outputTokens)} out
                    </p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="size-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</p>
                    <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                      <ArrowDownRight className="size-3" />
                      12% vs last period
                    </div>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
                    <DollarSign className="size-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Requests</p>
                    <p className="text-2xl font-bold">{stats.requestCount}</p>
                    <div className="flex items-center gap-1 text-xs text-blue-500 mt-1">
                      <ArrowUpRight className="size-3" />
                      8% vs last period
                    </div>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <TrendingUp className="size-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Latency</p>
                    <p className="text-2xl font-bold">{stats.avgLatency}s</p>
                    <p className="text-xs text-muted-foreground mt-1">per request</p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10">
                    <Calendar className="size-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts — bar chart visualization */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Daily Token Usage</CardTitle>
              <CardDescription>Tokens consumed per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-48">
                {stats.dailyUsage.map((day) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatTokens(day.tokens)}
                    </span>
                    <div
                      className="w-full bg-primary/80 rounded-t-sm hover:bg-primary transition-colors min-h-[4px]"
                      style={{
                        height: `${(day.tokens / maxTokens) * 160}px`,
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {day.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Model Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Model Breakdown</CardTitle>
              <CardDescription>Token usage and cost per model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-[1fr_120px_100px_100px_1fr] gap-3 text-xs font-medium text-muted-foreground border-b pb-2 px-3">
                  <span>Model</span>
                  <span className="text-right">Tokens</span>
                  <span className="text-right">Cost</span>
                  <span className="text-right">Requests</span>
                  <span>Share</span>
                </div>
                {stats.models.map((model) => {
                  const share = (model.tokens / stats.totalTokens) * 100
                  return (
                    <div
                      key={model.name}
                      className="grid grid-cols-[1fr_120px_100px_100px_1fr] gap-3 items-center text-sm px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <span className="font-mono text-xs">{model.name}</span>
                      <span className="text-right font-mono text-xs">
                        {formatTokens(model.tokens)}
                      </span>
                      <span className="text-right font-mono text-xs">
                        ${model.cost.toFixed(2)}
                      </span>
                      <span className="text-right font-mono text-xs">{model.requests}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {share.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
