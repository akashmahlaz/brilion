import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
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
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_app/usage')({
  component: UsagePage,
})

interface UsageSummary {
  totalRequests: number
  totalTokens: number
  totalPromptTokens: number
  totalCompletionTokens: number
  totalCost: number
  avgDuration: number
  totalToolCalls: number
  errorCount: number
}

interface ModelBreakdown {
  _id: string
  requests: number
  tokens: number
  cost: number
  avgDuration: number
}

interface DailyPoint {
  _id: string
  requests: number
  tokens: number
  cost: number
}

const PERIOD_DAYS: Record<string, number> = { today: 1, '7d': 7, '30d': 30 }

function UsagePage() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('7d')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [models, setModels] = useState<ModelBreakdown[]>([])
  const [daily, setDaily] = useState<DailyPoint[]>([])

  async function loadUsage(days: number) {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/usage?days=${days}`)
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary)
        setModels(data.byModel)
        setDaily(data.daily)
      }
    } catch {
      // API may not be reachable
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsage(PERIOD_DAYS[period])
  }, [period])

  const totalTokens = summary?.totalTokens ?? 0
  const maxTokens = Math.max(...daily.map((d) => d.tokens), 1)

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
              <Button variant="outline" size="sm" onClick={() => loadUsage(PERIOD_DAYS[period])} disabled={loading}>
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
                    <p className="text-2xl font-bold">{formatTokens(totalTokens)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTokens(summary?.totalPromptTokens ?? 0)} in / {formatTokens(summary?.totalCompletionTokens ?? 0)} out
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
                    <p className="text-2xl font-bold">${(summary?.totalCost ?? 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary?.totalToolCalls ?? 0} tool calls
                    </p>
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
                    <p className="text-2xl font-bold">{summary?.totalRequests ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary?.errorCount ?? 0} errors
                    </p>
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
                    <p className="text-2xl font-bold">
                      {summary?.avgDuration ? `${(summary.avgDuration / 1000).toFixed(1)}s` : '—'}
                    </p>
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
              {daily.length > 0 ? (
                <div className="flex items-end gap-2 h-48">
                  {daily.map((day) => (
                    <div key={day._id} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatTokens(day.tokens)}
                      </span>
                      <div
                        className="w-full bg-primary/80 rounded-t-sm hover:bg-primary transition-colors min-h-1"
                        style={{
                          height: `${(day.tokens / maxTokens) * 160}px`,
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {day._id.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  No usage data for this period.
                </div>
              )}
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
                <div className="grid grid-cols-[1fr_120px_100px_100px_1fr] gap-3 text-xs font-medium text-muted-foreground border-b pb-2 px-3">
                  <span>Model</span>
                  <span className="text-right">Tokens</span>
                  <span className="text-right">Cost</span>
                  <span className="text-right">Requests</span>
                  <span>Share</span>
                </div>
                {models.map((model) => {
                  const share = totalTokens > 0 ? (model.tokens / totalTokens) * 100 : 0
                  return (
                    <div
                      key={model._id}
                      className="grid grid-cols-[1fr_120px_100px_100px_1fr] gap-3 items-center text-sm px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <span className="font-mono text-xs">{model._id}</span>
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
                {models.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No model usage data yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
