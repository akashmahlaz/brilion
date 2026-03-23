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
  Plus,
  GitBranch,
  Zap,
  ChevronDown,
  ChevronRight,
  Save,
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
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'
import { cn } from '#/lib/utils'

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
  promptTokens: number
  completionTokens: number
  parentConversationId?: string
  createdAt: string
}

function AgentsPage() {
  const [agents, setAgents] = useState<AgentProfile[]>([])
  const [runs, setRuns] = useState<SubagentRun[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    systemPrompt: '',
    model: '',
    maxSteps: 10,
  })

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

  async function createAgent() {
    if (!form.name.trim() || !form.systemPrompt.trim()) {
      toast.error('Name and system prompt are required')
      return
    }
    setSaving(true)
    try {
      const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const res = await apiFetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug }),
      })
      if (res.ok) {
        toast.success('Agent created')
        setCreateOpen(false)
        setForm({ name: '', slug: '', description: '', systemPrompt: '', model: '', maxSteps: 10 })
        await loadData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Create failed')
      }
    } catch {
      toast.error('Failed to create agent')
    }
    setSaving(false)
  }

  // Group runs by parent conversation for tree view
  const runTree = runs.reduce<Record<string, SubagentRun[]>>((acc, run) => {
    const key = run.parentConversationId || 'standalone'
    if (!acc[key]) acc[key] = []
    acc[key].push(run)
    return acc
  }, {})

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
            <div className="flex items-center gap-2">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="size-4 mr-2" />
                    Create Agent
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Agent</DialogTitle>
                    <DialogDescription>
                      Define a new specialized agent profile for task delegation.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g. Data Analyst"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="slug">Slug (optional)</Label>
                      <Input
                        id="slug"
                        placeholder="auto-generated from name"
                        value={form.slug}
                        onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        placeholder="Short description of the agent's expertise"
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="systemPrompt">System Prompt</Label>
                      <Textarea
                        id="systemPrompt"
                        placeholder="You are a specialist in..."
                        rows={5}
                        value={form.systemPrompt}
                        onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="model">Model (optional)</Label>
                        <Input
                          id="model"
                          placeholder="e.g. openai/gpt-4.1"
                          value={form.model}
                          onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="maxSteps">Max Steps</Label>
                        <Input
                          id="maxSteps"
                          type="number"
                          min={1}
                          max={50}
                          value={form.maxSteps}
                          onChange={(e) => setForm((f) => ({ ...f, maxSteps: parseInt(e.target.value) || 10 }))}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button onClick={createAgent} disabled={saving}>
                      {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                <RefreshCw className={cn('size-4 mr-2', loading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          <Tabs defaultValue="profiles" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profiles" className="gap-1.5">
                <Bot className="size-3.5" />
                Profiles
              </TabsTrigger>
              <TabsTrigger value="runs" className="gap-1.5">
                <Play className="size-3.5" />
                Runs
              </TabsTrigger>
              <TabsTrigger value="tree" className="gap-1.5">
                <GitBranch className="size-3.5" />
                Run Tree
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
                    const totalTokens = agentRuns.reduce((s, r) => s + (r.promptTokens || 0) + (r.completionTokens || 0), 0)

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
                          <div className="grid grid-cols-3 gap-3 text-sm">
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
                            {totalTokens > 0 && (
                              <div>
                                <span className="text-muted-foreground">Tokens:</span>{' '}
                                <span className="font-mono text-xs">{totalTokens.toLocaleString()}</span>
                              </div>
                            )}
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
                runs.map((run) => <RunCard key={run._id} run={run} />)
              )}
            </TabsContent>

            {/* Run Tree — groups runs by parent conversation */}
            <TabsContent value="tree" className="space-y-4">
              {Object.keys(runTree).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <GitBranch className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No run trees yet. Sub-agent runs will be grouped by parent conversation.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                Object.entries(runTree).map(([convId, convRuns]) => (
                  <RunTreeNode key={convId} conversationId={convId} runs={convRuns} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

/** Single run card with usage stats */
function RunCard({ run }: { run: SubagentRun }) {
  const [expanded, setExpanded] = useState(false)
  const totalTokens = (run.promptTokens || 0) + (run.completionTokens || 0)

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <button onClick={() => setExpanded(!expanded)} className="mt-0.5 shrink-0">
              {run.status === 'completed' && <CheckCircle className="size-4 text-green-600" />}
              {run.status === 'failed' && <XCircle className="size-4 text-red-500" />}
              {run.status === 'running' && <Loader2 className="size-4 animate-spin text-blue-500" />}
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{run.agentName || run.agentSlug}</Badge>
                <span className="truncate text-muted-foreground">{run.task.slice(0, 100)}</span>
              </p>
              {expanded && run.result && (
                <pre className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded-lg whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">
                  {run.result}
                </pre>
              )}
              {run.error && (
                <p className="text-xs text-red-500 line-clamp-1 mt-1">{run.error}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 text-xs text-muted-foreground">
            <span className="font-mono">{run.model || 'default'}</span>
            {run.durationMs > 0 && <span>{(run.durationMs / 1000).toFixed(1)}s</span>}
            {totalTokens > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="size-3" />
                {totalTokens.toLocaleString()} tok
              </span>
            )}
            {run.toolCallCount > 0 && <span>{run.toolCallCount} tools</span>}
            <span>{new Date(run.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Tree node — shows a conversation group with expandable child runs */
function RunTreeNode({ conversationId, runs: convRuns }: { conversationId: string; runs: SubagentRun[] }) {
  const [open, setOpen] = useState(true)
  const completed = convRuns.filter((r) => r.status === 'completed').length
  const failed = convRuns.filter((r) => r.status === 'failed').length
  const totalMs = convRuns.reduce((s, r) => s + (r.durationMs || 0), 0)
  const totalTokens = convRuns.reduce((s, r) => s + (r.promptTokens || 0) + (r.completionTokens || 0), 0)

  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
          <GitBranch className="size-4 text-primary" />
          <CardTitle className="text-sm font-medium">
            {conversationId === 'standalone' ? 'Standalone Runs' : `Conversation ${conversationId.slice(-8)}`}
          </CardTitle>
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="secondary" className="text-[10px]">{convRuns.length} runs</Badge>
            {completed > 0 && <Badge variant="outline" className="text-[10px] text-green-600">{completed} ✓</Badge>}
            {failed > 0 && <Badge variant="outline" className="text-[10px] text-red-500">{failed} ✗</Badge>}
            {totalTokens > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Zap className="size-2.5" />{totalTokens.toLocaleString()}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">{(totalMs / 1000).toFixed(1)}s</span>
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-2">
          {convRuns.map((run, i) => (
            <div key={run._id} className="flex items-center gap-2 text-xs">
              {/* Tree lines */}
              <div className="flex items-center gap-1 pl-2 text-muted-foreground/50">
                <span>{i === convRuns.length - 1 ? '└' : '├'}</span>
                <span className="w-4 border-t border-muted-foreground/30" />
              </div>
              {/* Status icon */}
              {run.status === 'completed' && <CheckCircle className="size-3 text-green-600 shrink-0" />}
              {run.status === 'failed' && <XCircle className="size-3 text-red-500 shrink-0" />}
              {run.status === 'running' && <Loader2 className="size-3 animate-spin text-blue-500 shrink-0" />}
              {/* Agent + task */}
              <Badge variant="outline" className="text-[9px] shrink-0">{run.agentName || run.agentSlug}</Badge>
              <span className="truncate text-muted-foreground">{run.task.slice(0, 80)}</span>
              {/* Stats */}
              <span className="ml-auto shrink-0 font-mono text-muted-foreground">
                {run.durationMs > 0 ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'}
              </span>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}
