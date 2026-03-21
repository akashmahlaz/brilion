import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Activity,
  DollarSign,
  Zap,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  Bot,
  Wifi,
  WifiOff,
  Clock,
  AlertCircle,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_app/overview')({
  component: OverviewPage,
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

interface DailyPoint {
  _id: string
  requests: number
  tokens: number
  cost: number
}

interface HealthData {
  status: string
  database: string
  timestamp: string
}

function OverviewPage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [daily, setDaily] = useState<DailyPoint[]>([])
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentLogs, setRecentLogs] = useState<any[]>([])

  async function loadData() {
    setLoading(true)
    try {
      const [usageRes, healthRes, logsRes] = await Promise.all([
        apiFetch('/api/usage?days=7'),
        apiFetch('/api/health'),
        apiFetch('/api/logs?limit=5'),
      ])

      if (usageRes.ok) {
        const data = await usageRes.json()
        setSummary(data.summary)
        setDaily(data.daily)
      }
      if (healthRes.ok) {
        setHealth(await healthRes.json())
      }
      if (logsRes.ok) {
        const data = await logsRes.json()
        setRecentLogs(data.logs?.slice(0, 5) ?? [])
      }
    } catch {
      // API may not be reachable yet
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function formatTokens(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  const maxTokens = Math.max(...daily.map((d) => d.tokens), 1)

  const LEVEL_COLORS: Record<string, string> = {
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    debug: 'text-muted-foreground',
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-semibold">Overview</h1>
              <p className="text-sm text-muted-foreground">
                Your AI gateway at a glance.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Status Banner */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {health?.database === 'connected' ? (
                    <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
                      <Wifi className="size-5 text-green-500" />
                    </div>
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
                      <WifiOff className="size-5 text-red-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      Gateway{' '}
                      <Badge
                        variant="outline"
                        className={
                          health?.status === 'ok'
                            ? 'border-green-500/30 text-green-500'
                            : 'border-red-500/30 text-red-500'
                        }
                      >
                        {health?.status === 'ok' ? 'Operational' : 'Offline'}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Database: {health?.database ?? 'checking...'} · Last checked:{' '}
                      {health?.timestamp
                        ? new Date(health.timestamp).toLocaleTimeString()
                        : '—'}
                    </p>
                  </div>
                </div>
                <Link to="/chat" search={{ id: undefined } as { id: string | undefined }}>
                  <Button size="sm">
                    <MessageSquare className="size-4 mr-2" />
                    Open Chat
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Requests (7d)</p>
                    <p className="text-2xl font-bold">
                      {summary?.totalRequests ?? 0}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Bot className="size-3" />
                      {summary?.errorCount ?? 0} errors
                    </div>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Activity className="size-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Tokens (7d)</p>
                    <p className="text-2xl font-bold">
                      {formatTokens(summary?.totalTokens ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTokens(summary?.totalPromptTokens ?? 0)} in /{' '}
                      {formatTokens(summary?.totalCompletionTokens ?? 0)} out
                    </p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Zap className="size-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Cost (7d)</p>
                    <p className="text-2xl font-bold">
                      ${(summary?.totalCost ?? 0).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                      <TrendingUp className="size-3" />
                      {summary?.totalToolCalls ?? 0} tool calls
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
                    <p className="text-xs text-muted-foreground">Avg Latency</p>
                    <p className="text-2xl font-bold">
                      {summary?.avgDuration
                        ? `${(summary.avgDuration / 1000).toFixed(1)}s`
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">per request</p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10">
                    <Clock className="size-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Activity Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Daily Activity (7d)</CardTitle>
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
                  <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <Activity className="size-6 mr-2" />
                    No activity yet. Start a chat to see data here.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Logs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Logs</CardTitle>
                  <Link to="/logs">
                    <Button variant="ghost" size="sm" className="text-xs">
                      View all
                      <ArrowUpRight className="size-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentLogs.length > 0 ? (
                  <div className="space-y-2">
                    {recentLogs.map((log: any) => (
                      <div
                        key={log._id}
                        className="flex items-start gap-2 text-xs"
                      >
                        <span
                          className={`shrink-0 font-bold uppercase ${LEVEL_COLORS[log.level] ?? 'text-muted-foreground'}`}
                        >
                          {log.level}
                        </span>
                        <span className="text-muted-foreground truncate flex-1">
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    <AlertCircle className="size-4 mr-2" />
                    No logs yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
