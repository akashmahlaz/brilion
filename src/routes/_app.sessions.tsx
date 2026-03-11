import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Users,
  RefreshCw,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  RotateCcw,
  Eye,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_app/sessions')({
  component: SessionsPage,
})

interface Session {
  key: string
  channel: string
  model: string
  thinkingLevel: string
  verboseLevel: string
  messageCount: number
  lastActivity: string
  isMain: boolean
}

function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  async function loadSessions() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        // Build session list from available data
        const sessionList: Session[] = [
          {
            key: 'main',
            channel: 'web',
            model: data.model || 'anthropic/claude-opus-4-6',
            thinkingLevel: 'medium',
            verboseLevel: 'off',
            messageCount: 0,
            lastActivity: new Date().toISOString(),
            isMain: true,
          },
        ]
        setSessions(sessionList)
      }
    } catch {
      toast.error('Failed to load sessions')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSessions()
  }, [])

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-semibold">Sessions</h1>
              <p className="text-sm text-muted-foreground">
                Active agent sessions with per-session thinking, verbose, and model overrides.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSessions}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Sessions Table — OpenClaw style */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Sessions</CardTitle>
              <CardDescription>
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} active
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_120px_200px_100px_100px_80px_40px] gap-3 text-xs font-medium text-muted-foreground border-b pb-2 px-3">
                  <span>Session</span>
                  <span>Channel</span>
                  <span>Model</span>
                  <span>Thinking</span>
                  <span>Verbose</span>
                  <span>Activity</span>
                  <span></span>
                </div>

                {sessions.map((session) => (
                  <div
                    key={session.key}
                    className="grid grid-cols-[1fr_120px_200px_100px_100px_80px_40px] gap-3 items-center text-sm rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="size-4 text-muted-foreground" />
                      <span className="font-mono text-xs">{session.key}</span>
                      {session.isMain && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          main
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">
                      {session.channel}
                    </Badge>
                    <span className="font-mono text-xs truncate text-muted-foreground">
                      {session.model}
                    </span>
                    <Select defaultValue={session.thinkingLevel}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['off', 'minimal', 'low', 'medium', 'high', 'xhigh'].map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select defaultValue={session.verboseLevel}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">off</SelectItem>
                        <SelectItem value="on">on</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(session.lastActivity)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 size-4" />
                          View transcript
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <RotateCcw className="mr-2 size-4" />
                          Reset session
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {sessions.length === 0 && !loading && (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    <Users className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p>No active sessions</p>
                    <p className="text-xs mt-1">Sessions are created when messages arrive on any channel.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
