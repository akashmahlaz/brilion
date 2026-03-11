import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Terminal,
  RefreshCw,
  Play,
  Copy,
  Activity,
  Heart,
  Cpu,
  Clock,
  CheckCircle2,
  XCircle,
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
import { Input } from '#/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_app/debug')({
  component: DebugPage,
})

interface HealthSnapshot {
  status: string
  uptime: number
  timestamp: string
  memory: { used: number; total: number }
  version: string
}

interface EventEntry {
  id: string
  timestamp: string
  type: string
  data: string
}

const RPC_METHODS = [
  'health.check',
  'health.ping',
  'config.get',
  'config.set',
  'sessions.list',
  'sessions.get',
  'agents.list',
  'agents.get',
  'channels.status',
  'skills.list',
  'models.list',
  'logs.tail',
  'usage.summary',
  'nodes.list',
  'cron.list',
].sort()

function DebugPage() {
  const [health, setHealth] = useState<HealthSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [rpcMethod, setRpcMethod] = useState(RPC_METHODS[0])
  const [rpcParams, setRpcParams] = useState('{}')
  const [rpcResult, setRpcResult] = useState<string | null>(null)
  const [rpcLoading, setRpcLoading] = useState(false)
  const [events, setEvents] = useState<EventEntry[]>([])
  const [searchMethod, setSearchMethod] = useState('')

  async function loadHealth() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/health')
      if (res.ok) {
        const data = await res.json()
        setHealth({
          status: data.status || 'ok',
          uptime: data.uptime || 0,
          timestamp: new Date().toISOString(),
          memory: data.memory || { used: 0, total: 0 },
          version: data.version || '1.0.0',
        })
      }
    } catch {
      setHealth(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadHealth()
  }, [])

  async function executeRpc() {
    setRpcLoading(true)
    setRpcResult(null)
    const start = performance.now()
    try {
      // Map RPC methods to actual API endpoints
      const methodMap: Record<string, string> = {
        'health.check': '/api/health',
        'health.ping': '/api/health',
        'config.get': '/api/config',
        'sessions.list': '/api/config',
        'channels.status': '/api/whatsapp',
        'skills.list': '/api/skills',
        'models.list': '/api/models',
      }
      const endpoint = methodMap[rpcMethod] || '/api/health'
      const res = await apiFetch(endpoint)
      const elapsed = (performance.now() - start).toFixed(0)
      const data = await res.json()
      const result = {
        method: rpcMethod,
        status: res.status,
        elapsed: `${elapsed}ms`,
        data,
      }
      setRpcResult(JSON.stringify(result, null, 2))

      // Add to event log
      setEvents((prev) => [
        {
          id: String(Date.now()),
          timestamp: new Date().toISOString(),
          type: `RPC:${rpcMethod}`,
          data: `${res.status} in ${elapsed}ms`,
        },
        ...prev.slice(0, 99),
      ])
    } catch (err) {
      const elapsed = (performance.now() - start).toFixed(0)
      setRpcResult(
        JSON.stringify(
          {
            method: rpcMethod,
            error: 'Request failed',
            elapsed: `${elapsed}ms`,
          },
          null,
          2,
        ),
      )
    }
    setRpcLoading(false)
  }

  function copyResult() {
    if (rpcResult) {
      navigator.clipboard.writeText(rpcResult)
      toast.success('Copied to clipboard')
    }
  }

  function formatUptime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${h}h ${m}m ${s}s`
  }

  const filteredMethods = RPC_METHODS.filter((m) =>
    m.toLowerCase().includes(searchMethod.toLowerCase()),
  )

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-semibold">Debug</h1>
              <p className="text-sm text-muted-foreground">
                Manual RPC calls, health snapshots, and event log.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadHealth} disabled={loading}>
              <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Health
            </Button>
          </div>

          <Tabs defaultValue="rpc" className="space-y-4">
            <TabsList>
              <TabsTrigger value="rpc">
                <Terminal className="size-4 mr-2" />
                RPC Console
              </TabsTrigger>
              <TabsTrigger value="health">
                <Heart className="size-4 mr-2" />
                Health
              </TabsTrigger>
              <TabsTrigger value="events">
                <Activity className="size-4 mr-2" />
                Event Log
              </TabsTrigger>
            </TabsList>

            {/* RPC Console — OpenClaw style sorted method dropdown */}
            <TabsContent value="rpc" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">RPC Console</CardTitle>
                  <CardDescription>
                    Execute manual API calls and inspect responses.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Select value={rpcMethod} onValueChange={setRpcMethod}>
                      <SelectTrigger className="w-[260px] font-mono text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 pb-2">
                          <Input
                            placeholder="Search methods..."
                            value={searchMethod}
                            onChange={(e) => setSearchMethod(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        {filteredMethods.map((method) => (
                          <SelectItem key={method} value={method} className="font-mono text-xs">
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex-1">
                      <Input
                        value={rpcParams}
                        onChange={(e) => setRpcParams(e.target.value)}
                        placeholder='{"key": "value"}'
                        className="font-mono text-xs"
                      />
                    </div>
                    <Button onClick={executeRpc} disabled={rpcLoading}>
                      <Play className="size-4 mr-2" />
                      {rpcLoading ? 'Running...' : 'Execute'}
                    </Button>
                  </div>

                  {/* Result */}
                  {rpcResult && (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 size-7"
                        onClick={copyResult}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      <pre className="bg-[#0d1117] text-gray-300 rounded-lg p-4 text-xs font-mono overflow-auto max-h-96">
                        {rpcResult}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Health Snapshot */}
            <TabsContent value="health" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-10 items-center justify-center rounded-lg ${
                          health?.status === 'ok'
                            ? 'bg-green-500/10'
                            : 'bg-red-500/10'
                        }`}
                      >
                        {health?.status === 'ok' ? (
                          <CheckCircle2 className="size-5 text-green-500" />
                        ) : (
                          <XCircle className="size-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-lg font-bold capitalize">
                          {health?.status || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Clock className="size-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Uptime</p>
                        <p className="text-lg font-bold font-mono">
                          {health ? formatUptime(health.uptime) : '—'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10">
                        <Cpu className="size-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Memory</p>
                        <p className="text-lg font-bold font-mono">
                          {health
                            ? `${(health.memory.used / 1024 / 1024).toFixed(0)}MB`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10">
                        <Activity className="size-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Version</p>
                        <p className="text-lg font-bold font-mono">
                          {health?.version || '—'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Raw health JSON */}
              {health && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Raw Health Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-[#0d1117] text-gray-300 rounded-lg p-4 text-xs font-mono overflow-auto">
                      {JSON.stringify(health, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Event Log */}
            <TabsContent value="events" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Event Log</CardTitle>
                  <CardDescription>
                    {events.length} events recorded this session
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {events.length > 0 ? (
                    <div className="space-y-1 font-mono text-xs">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className="flex gap-3 px-2 py-1 hover:bg-accent/50 rounded"
                        >
                          <span className="text-muted-foreground shrink-0 w-[160px]">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {event.type}
                          </Badge>
                          <span className="text-muted-foreground">{event.data}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Activity className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p>No events yet. Execute an RPC call to see events.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
