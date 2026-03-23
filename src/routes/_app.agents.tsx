import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import {
  Bot,
  RefreshCw,
  Trash2,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_app/agents')({
  component: AgentsPage,
})

interface AgentProfile {
  _id: string
  slug: string
  name: string
  description: string
  systemPrompt: string
  model: string
  provider: string
  maxSteps: number
  allowedTools: string[]
  isBuiltin: boolean
  createdAt: string
}

interface SubagentRun {
  _id: string
  agentSlug: string
  agentName: string
  task: string
  status: 'running' | 'completed' | 'failed'
  result: string
  error: string
  model: string
  durationMs: number
  stepsUsed: number
  toolCallCount: number
  createdAt: string
}

function AgentsPage() {
  const [agents, setAgents] = useState<AgentProfile[]>([])
  const [runs, setRuns] = useState<SubagentRun[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [agentsRes, runsRes] = await Promise.all([
        apiFetch('/api/agents'),
        apiFetch('/api/agents?action=runs'),
      ])
      if (agentsRes.ok) setAgents(await agentsRes.json())
      if (runsRes.ok) setRuns(await runsRes.json())
    } catch {
      toast.error('Failed to load agent data')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function deleteAgent(id: string) {
    const res = await apiFetch(`/api/agents?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Agent deleted')
      await loadData()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Delete failed')
    }
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-semibold">Agents</h1>
              <p className="text-sm text-muted-foreground">
                Specialized sub-agents for delegated tasks. Configure profiles and view run history.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <Tabs defaultValue="profiles" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profiles" className="gap-1.5">
                <Bot className="size-3.5" />
                Agent Profiles
              </TabsTrigger>
              <TabsTrigger value="runs" className="gap-1.5">
                <Play className="size-3.5" />
                Run History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profiles" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : agents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Bot className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No agent profiles yet. They'll be created automatically when you first use sub-agents.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {agents.map((agent) => {
                    const agentRuns = runs.filter((r) => r.agentSlug === agent.slug)
                    const completed = agentRuns.filter((r) => r.status === 'completed').length
                    const failed = agentRuns.filter((r) => r.status === 'failed').length

                    return (
                      <Card key={agent._id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                                <Bot className="size-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                  {agent.name}
                                  {agent.isBuiltin && (
                                    <Badge variant="secondary" className="text-[10px]">built-in</Badge>
                                  )}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  {agent.slug} · max {agent.maxSteps} steps
                                </CardDescription>
                              </div>
                            </div>
                            {!agent.isBuiltin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem className="text-destructive" onClick={() => deleteAgent(agent._id)}>
                                    <Trash2 className="mr-2 size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {agent.description && (
                            <p className="text-sm text-muted-foreground mb-3">{agent.description}</p>
                          )}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Model:</span>{' '}
                              <span className="font-mono text-xs">{agent.model || 'default'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Runs:</span>{' '}
                              <span className="font-mono text-xs">
                                {completed > 0 && <span className="text-green-600">{completed} ✓</span>}
                                {failed > 0 && <span className="text-red-500 ml-1">{failed} ✗</span>}
                                {completed === 0 && failed === 0 && '0'}
                              </span>
                            </div>
                          </div>
                          {agent.systemPrompt && (
                            <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground line-clamp-3 font-mono">
                                {agent.systemPrompt}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="runs" className="space-y-3">
              {runs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No sub-agent runs yet. Your AI will use sub-agents when delegating tasks.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                runs.map((run) => (
                  <Card key={run._id}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5">
                            {run.status === 'completed' && <CheckCircle className="size-4 text-green-600" />}
                            {run.status === 'failed' && <XCircle className="size-4 text-red-500" />}
                            {run.status === 'running' && <Loader2 className="size-4 animate-spin text-blue-500" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{run.agentName || run.agentSlug}</Badge>
                              <span className="truncate text-muted-foreground">{run.task.slice(0, 100)}</span>
                            </p>
                            {run.result && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-mono">
                                {run.result.slice(0, 200)}
                              </p>
                            )}
                            {run.error && (
                              <p className="text-xs text-red-500 line-clamp-1 mt-1">{run.error}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 text-xs text-muted-foreground">
                          <span className="font-mono">{run.model || 'default'}</span>
                          {run.durationMs > 0 && <span>{(run.durationMs / 1000).toFixed(1)}s</span>}
                          <span>{new Date(run.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
