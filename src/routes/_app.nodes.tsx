import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Network,
  RefreshCw,
  Cpu,
  CheckCircle2,
  XCircle,
  Shield,
  Clock,
  Smartphone,
  Check,
  X,
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
import { toast } from 'sonner'

export const Route = createFileRoute('/_app/nodes')({
  component: NodesPage,
})

interface PairingRequest {
  _id: string
  channel: string
  remoteJid: string
  code: string
  status: string
  createdAt: string
}

interface HealthData {
  status: string
  database: string
  timestamp: string
}

function NodesPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [pairings, setPairings] = useState<PairingRequest[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    try {
      const [healthRes, pairingRes] = await Promise.all([
        apiFetch('/api/health'),
        apiFetch('/api/pairing'),
      ])
      if (healthRes.ok) setHealth(await healthRes.json())
      if (pairingRes.ok) {
        const data = await pairingRes.json()
        setPairings(data.pending ?? [])
      }
    } catch {
      // API may not be reachable
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handlePairing(code: string, action: 'approve' | 'reject') {
    try {
      const res = await apiFetch('/api/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, code }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(`Pairing ${action === 'approve' ? 'approved' : 'rejected'}`)
        setPairings((prev) => prev.filter((p) => p.code !== code))
      } else {
        toast.error(data.error || `Failed to ${action} pairing`)
      }
    } catch {
      toast.error(`Failed to ${action} pairing`)
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
                Gateway status, connected channels, and device pairing.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Gateway Node */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
                    <CheckCircle2 className="size-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {health?.status === 'ok' ? '1' : '0'}
                    </p>
                    <p className="text-xs text-muted-foreground">Gateway Online</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {health?.database === 'connected' ? 'Connected' : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">Database</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-500/10">
                    <Smartphone className="size-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pairings.length}</p>
                    <p className="text-xs text-muted-foreground">Pending Pairings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gateway Server Card */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Cpu className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-mono">brilion-gateway</CardTitle>
                      <span
                        className={`size-2 rounded-full ${health?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}
                      />
                    </div>
                    <CardDescription>AI Gateway Server</CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-green-500/30 text-green-500"
                >
                  <Shield className="size-3 mr-1" />
                  auto
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">Capabilities:</span>
                {['chat', 'tools', 'channels', 'skills', 'cron'].map((cap) => (
                  <Badge key={cap} variant="secondary" className="text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Clock className="size-3" />
                Last checked: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : '—'}
              </div>
            </CardContent>
          </Card>

          {/* Pending Pairing Requests */}
          <h2 className="text-lg font-heading font-semibold mb-3">Pairing Requests</h2>
          <div className="space-y-3">
            {pairings.map((p) => (
              <Card key={p._id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm">{p.remoteJid}</p>
                      <p className="text-xs text-muted-foreground">
                        Channel: {p.channel} · Code:{' '}
                        <span className="font-mono font-bold">{p.code}</span> ·{' '}
                        {new Date(p.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-500 border-green-500/30"
                        onClick={() => handlePairing(p.code, 'approve')}
                      >
                        <Check className="size-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => handlePairing(p.code, 'reject')}
                      >
                        <X className="size-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {pairings.length === 0 && !loading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Network className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No pending pairing requests</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Devices requesting access will appear here for approval.
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
