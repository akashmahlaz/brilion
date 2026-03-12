import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Users,
  RefreshCw,
  MessageSquare,
  MessageCircle,
  Send,
  Globe,
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

interface ConversationSession {
  _id: string
  title: string
  channel: 'web' | 'whatsapp' | 'telegram'
  foreignId?: string
  model?: string
  messageCount: number
  updatedAt: string
  createdAt: string
}

const CHANNEL_ICON: Record<string, typeof Globe> = {
  web: Globe,
  whatsapp: MessageCircle,
  telegram: Send,
}

const CHANNEL_COLOR: Record<string, string> = {
  web: 'text-blue-500',
  whatsapp: 'text-emerald-500',
  telegram: 'text-sky-500',
}

function SessionsPage() {
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const [loading, setLoading] = useState(true)

  async function loadSessions() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/chat')
      if (res.ok) {
        const data = await res.json()
        const mapped: ConversationSession[] = (data || []).map((c: any) => ({
          _id: c._id,
          title: c.title || 'Untitled',
          channel: c.channel || 'web',
          foreignId: c.foreignId,
          model: c.model,
          messageCount: c.messageCount ?? c.messages?.length ?? 0,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
        }))
        setSessions(mapped)
      }
    } catch {
      toast.error('Failed to load sessions')
    }
    setLoading(false)
  }

  async function deleteSession(id: string) {
    try {
      await apiFetch(`/api/chat?id=${id}`, { method: 'DELETE' })
      setSessions((prev) => prev.filter((s) => s._id !== id))
      toast.success('Session deleted')
    } catch {
      toast.error('Failed to delete session')
    }
  }

  async function resetSession(id: string) {
    try {
      // Delete and let it re-create on next message
      await apiFetch(`/api/chat?id=${id}`, { method: 'DELETE' })
      setSessions((prev) => prev.filter((s) => s._id !== id))
      toast.success('Session reset')
    } catch {
      toast.error('Failed to reset session')
    }
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

  const channelCounts = sessions.reduce(
    (acc, s) => {
      acc[s.channel] = (acc[s.channel] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-semibold">Sessions</h1>
              <p className="text-sm text-muted-foreground">
                Active conversations across all channels — web, WhatsApp, and Telegram.
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

          {/* Channel summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {(['web', 'whatsapp', 'telegram'] as const).map((ch) => {
              const Icon = CHANNEL_ICON[ch]
              return (
                <Card key={ch} className="py-3">
                  <CardContent className="flex items-center gap-3 px-4">
                    <Icon className={`size-5 ${CHANNEL_COLOR[ch]}`} />
                    <div>
                      <p className="text-lg font-semibold">{channelCounts[ch] || 0}</p>
                      <p className="text-xs text-muted-foreground capitalize">{ch} sessions</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Sessions Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Conversations</CardTitle>
              <CardDescription>
                {sessions.length} conversation{sessions.length !== 1 ? 's' : ''} total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_100px_180px_80px_100px_40px] gap-3 text-xs font-medium text-muted-foreground border-b pb-2 px-3">
                  <span>Conversation</span>
                  <span>Channel</span>
                  <span>Contact</span>
                  <span>Messages</span>
                  <span>Last Active</span>
                  <span></span>
                </div>

                {sessions.map((session) => {
                  const Icon = CHANNEL_ICON[session.channel] || MessageSquare
                  return (
                    <Link
                      key={session._id}
                      to="/chat"
                      search={{ id: session._id }}
                      className="grid grid-cols-[1fr_100px_180px_80px_100px_40px] gap-3 items-center text-sm rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`size-4 shrink-0 ${CHANNEL_COLOR[session.channel]}`} />
                        <span className="truncate">{session.title}</span>
                      </div>
                      <Badge variant="outline" className="w-fit text-xs capitalize">
                        {session.channel}
                      </Badge>
                      <span className="font-mono text-xs truncate text-muted-foreground">
                        {session.foreignId || '—'}
                      </span>
                      <span className="text-xs text-muted-foreground text-center">
                        {session.messageCount}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(session.updatedAt)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.preventDefault(); resetSession(session._id) }}>
                            <RotateCcw className="mr-2 size-4" />
                            Reset session
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.preventDefault(); deleteSession(session._id) }}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Link>
                  )
                })}

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
