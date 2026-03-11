import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Network,
  RefreshCw,
  Monitor,
  Smartphone,
  Cpu,
  CheckCircle2,
  XCircle,
  Shield,
  Clock,
  MoreHorizontal,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_app/nodes')({
  component: NodesPage,
})

interface Node {
  id: string
  name: string
  type: 'server' | 'desktop' | 'mobile' | 'edge'
  status: 'online' | 'offline' | 'pending'
  capabilities: string[]
  lastSeen: string
  version: string
  os: string
  execApproval: 'auto' | 'manual' | 'denied'
}

function NodesPage() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)

  async function loadNodes() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/health')
      if (res.ok) {
        // Build current node from health data
        setNodes([
          {
            id: 'local-1',
            name: 'brilion-gateway',
            type: 'server',
            status: 'online',
            capabilities: ['chat', 'tools', 'channels', 'skills'],
            lastSeen: new Date().toISOString(),
            version: '1.0.0',
            os: 'Linux/Windows',
            execApproval: 'auto',
          },
        ])
      }
    } catch {
      setNodes([])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadNodes()
  }, [])

  const nodeIcon = (type: Node['type']) => {
    switch (type) {
      case 'server':
        return <Cpu className="size-5 text-primary" />
      case 'desktop':
        return <Monitor className="size-5 text-primary" />
      case 'mobile':
        return <Smartphone className="size-5 text-primary" />
      default:
        return <Network className="size-5 text-primary" />
    }
  }

  const statusColor = (status: Node['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'offline':
        return 'bg-red-500'
      case 'pending':
        return 'bg-yellow-500'
    }
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-semibold">Nodes</h1>
              <p className="text-sm text-muted-foreground">
                Connected device nodes, capabilities, and execution approvals.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadNodes} disabled={loading}>
              <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
                    <CheckCircle2 className="size-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {nodes.filter((n) => n.status === 'online').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
                    <XCircle className="size-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {nodes.filter((n) => n.status === 'offline').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Offline</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Network className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{nodes.length}</p>
                    <p className="text-xs text-muted-foreground">Total Nodes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Node List */}
          <div className="space-y-3">
            {nodes.map((node) => (
              <Card key={node.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        {nodeIcon(node.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-mono">{node.name}</CardTitle>
                          <span
                            className={`size-2 rounded-full ${statusColor(node.status)}`}
                          />
                        </div>
                        <CardDescription>
                          {node.os} · v{node.version}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          node.execApproval === 'auto'
                            ? 'border-green-500/30 text-green-500'
                            : node.execApproval === 'manual'
                              ? 'border-yellow-500/30 text-yellow-500'
                              : 'border-red-500/30 text-red-500'
                        }
                      >
                        <Shield className="size-3 mr-1" />
                        {node.execApproval}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Set approval: auto</DropdownMenuItem>
                          <DropdownMenuItem>Set approval: manual</DropdownMenuItem>
                          <DropdownMenuItem>Set approval: denied</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground mr-1">Capabilities:</span>
                    {node.capabilities.map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    Last seen: {new Date(node.lastSeen).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}

            {nodes.length === 0 && !loading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Network className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No nodes connected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nodes will appear here once they connect to the gateway.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
