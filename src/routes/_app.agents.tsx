import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Bot,
  RefreshCw,
  Plus,
  Wrench,
  Trash2,
  Edit,
  MoreHorizontal,
  Copy,
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

interface Agent {
  id: string
  name: string
  model: string
  provider: string
  description: string
  tools: string[]
  systemPrompt: string
  status: 'active' | 'inactive'
}

interface BuiltinTool {
  name: string
  description: string
  provenance: 'builtin' | 'skill' | 'mcp'
  enabled: boolean
}

function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tools, setTools] = useState<BuiltinTool[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTool, setSearchTool] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const [configRes, skillsRes] = await Promise.all([
        apiFetch('/api/config'),
        apiFetch('/api/skills'),
      ])
      if (configRes.ok) {
        const config = await configRes.json()
        // Build a default agent from config
        setAgents([
          {
            id: 'default',
            name: 'Default Agent',
            model: config.model || 'claude-opus-4-6',
            provider: config.provider || 'anthropic',
            description: 'Primary conversational AI agent',
            tools: [],
            systemPrompt: config.systemPrompt || '',
            status: 'active',
          },
        ])
      }
      if (skillsRes.ok) {
        const skills = await skillsRes.json()
        const toolList: BuiltinTool[] = (skills.installed || []).map((s: { name: string; description?: string }) => ({
          name: s.name,
          description: s.description || '',
          provenance: 'skill' as const,
          enabled: true,
        }))
        // Add some builtin tools
        toolList.unshift(
          {
            name: 'web_search',
            description: 'Search the web for real-time information',
            provenance: 'builtin',
            enabled: true,
          },
          {
            name: 'code_interpreter',
            description: 'Execute code in a sandboxed environment',
            provenance: 'builtin',
            enabled: true,
          },
          {
            name: 'file_reader',
            description: 'Read and parse uploaded files',
            provenance: 'builtin',
            enabled: true,
          },
        )
        setTools(toolList)
      }
    } catch {
      toast.error('Failed to load agent data')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredTools = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTool.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTool.toLowerCase()),
  )

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-semibold">Agents</h1>
              <p className="text-sm text-muted-foreground">
                Manage agent configurations, runtime tools, and skills.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm">
                <Plus className="size-4 mr-2" />
                New Agent
              </Button>
            </div>
          </div>

          <Tabs defaultValue="agents" className="space-y-4">
            <TabsList>
              <TabsTrigger value="agents">
                <Bot className="size-4 mr-2" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="tools">
                <Wrench className="size-4 mr-2" />
                Tool Catalog
              </TabsTrigger>
            </TabsList>

            {/* Agents Tab */}
            <TabsContent value="agents" className="space-y-4">
              {agents.map((agent) => (
                <Card key={agent.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                          <Bot className="size-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          <CardDescription>{agent.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                          {agent.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 size-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Model:</span>{' '}
                        <span className="font-mono text-xs">{agent.model}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Provider:</span>{' '}
                        <span className="font-mono text-xs">{agent.provider}</span>
                      </div>
                    </div>
                    {agent.systemPrompt && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">System Prompt</p>
                        <p className="text-sm line-clamp-3 font-mono text-xs">{agent.systemPrompt}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {agents.length === 0 && !loading && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Bot className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No agents configured</p>
                    <Button size="sm" className="mt-4">
                      <Plus className="size-4 mr-2" />
                      Create your first agent
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tool Catalog Tab — OpenClaw style with provenance labels */}
            <TabsContent value="tools" className="space-y-4">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Search tools..."
                  value={searchTool}
                  onChange={(e) => setSearchTool(e.target.value)}
                  className="max-w-sm"
                />
                <p className="text-sm text-muted-foreground">
                  {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''} available
                </p>
              </div>

              <div className="grid gap-2">
                {filteredTools.map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Wrench className="size-4 text-muted-foreground" />
                      <div>
                        <span className="font-mono text-xs font-medium">{tool.name}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{tool.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          tool.provenance === 'builtin'
                            ? 'border-blue-500/30 text-blue-500'
                            : tool.provenance === 'skill'
                              ? 'border-green-500/30 text-green-500'
                              : 'border-purple-500/30 text-purple-500'
                        }
                      >
                        {tool.provenance}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
