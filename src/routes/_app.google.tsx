import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Mail,
  Calendar,
  Video,
  Youtube,
  ExternalLink,
  CheckCircle2,
  Plus,
  Users,
  Clock,
  Inbox,
  Star,
  TrendingUp,
  Eye,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/google')({
  component: GooglePage,
})

// ─── Service connection state ────────────────────────────────────────────────
interface GoogleService {
  id: string
  name: string
  description: string
  icon: typeof Mail
  color: string
  bgColor: string
  connected: boolean
  stats?: Record<string, string | number>
}

const INITIAL_SERVICES: GoogleService[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Read, send, and organize emails through your AI agent',
    icon: Mail,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    connected: false,
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'Schedule meetings, set reminders, and manage events via AI',
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    connected: false,
  },
  {
    id: 'meet',
    name: 'Google Meet',
    description: 'Create and join meetings, get summaries, manage attendees',
    icon: Video,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    connected: false,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Manage your channel, schedule videos, track analytics',
    icon: Youtube,
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
    connected: false,
  },
]

// ─── What the AI can do for each service ─────────────────────────────────────
const SERVICE_ACTIONS: Record<string, string[]> = {
  gmail: [
    'Read and summarize unread emails',
    'Draft and send emails on your behalf',
    'Label, archive, or delete emails',
    'Daily inbox briefing at 9am',
    'Smart reply suggestions',
  ],
  calendar: [
    'Schedule meetings with contacts',
    'Find free slots based on your calendar',
    'Send meeting invites and reminders',
    'Daily schedule briefing every morning',
    'Block focus time automatically',
  ],
  meet: [
    'Create instant or scheduled meetings',
    'Transcribe and summarize calls',
    'Send meeting recordings to attendees',
    'Notify you 5 mins before any meeting',
    'Auto-generate meeting notes',
  ],
  youtube: [
    'Track channel analytics and views',
    'Schedule video uploads',
    'Monitor comments and reply',
    'Weekly performance report on WhatsApp',
    'Suggest trending keywords',
  ],
}

// ─── Mock connected stats ─────────────────────────────────────────────────────
const CONNECTED_STATS: Record<string, { label: string; value: string; icon: typeof Inbox }[]> = {
  gmail: [
    { label: 'Unread', value: '24', icon: Inbox },
    { label: 'Starred', value: '7', icon: Star },
    { label: 'Sent Today', value: '3', icon: Mail },
  ],
  calendar: [
    { label: 'Events Today', value: '4', icon: Calendar },
    { label: 'This Week', value: '12', icon: Clock },
    { label: 'Pending Invites', value: '2', icon: Users },
  ],
  meet: [
    { label: 'Meetings Today', value: '2', icon: Video },
    { label: 'This Week', value: '8', icon: Users },
    { label: 'Next In', value: '2h 14m', icon: Clock },
  ],
  youtube: [
    { label: 'Views', value: '12.4K', icon: Eye },
    { label: 'Subscribers', value: '1.2K', icon: TrendingUp },
    { label: 'Likes', value: '340', icon: ThumbsUp },
  ],
}

// ─── Upcoming Calendar Events (mock) ─────────────────────────────────────────
const UPCOMING_EVENTS = [
  { title: 'Team Standup', time: '10:00 AM', duration: '30m', attendees: 4 },
  { title: 'Product Review', time: '2:00 PM', duration: '1h', attendees: 8 },
  { title: 'Client Call', time: '4:30 PM', duration: '45m', attendees: 2 },
]

function ServiceCard({ service }: { service: GoogleService }) {
  const [connected, setConnected] = useState(service.connected)
  const [connecting, setConnecting] = useState(false)
  const Icon = service.icon
  const actions = SERVICE_ACTIONS[service.id] || []
  const stats = CONNECTED_STATS[service.id] || []

  async function handleConnect() {
    setConnecting(true)
    // Simulate OAuth flow
    await new Promise((r) => setTimeout(r, 1200))
    setConnected(true)
    setConnecting(false)
  }

  return (
    <Card className={cn('transition-all duration-300', connected && 'ring-1 ring-primary/20')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('flex size-11 items-center justify-center rounded-xl', service.bgColor)}>
              <Icon className={cn('size-5', service.color)} />
            </div>
            <div>
              <CardTitle className="text-[15px]">{service.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{service.description}</CardDescription>
            </div>
          </div>
          {connected && (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50 text-[10px] gap-1 shrink-0">
              <CheckCircle2 className="size-3" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {connected ? (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {stats.map((stat) => {
                const StatIcon = stat.icon
                return (
                  <div key={stat.label} className="flex flex-col items-center gap-1 rounded-xl bg-muted/60 px-2 py-2.5 text-center">
                    <StatIcon className="size-3.5 text-muted-foreground" />
                    <span className="text-base font-bold text-foreground">{stat.value}</span>
                    <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Calendar events special case */}
            {service.id === 'calendar' && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Today's Schedule</p>
                {UPCOMING_EVENTS.map((ev) => (
                  <div key={ev.title} className="flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-[11px] font-medium text-muted-foreground tabular-nums w-16 shrink-0">{ev.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground truncate">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground">{ev.duration} · {ev.attendees} attendees</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* What AI can do */}
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">AI Actions Enabled</p>
              <div className="space-y-1">
                {actions.slice(0, 3).map((action) => (
                  <div key={action} className="flex items-center gap-2 text-[12px] text-foreground">
                    <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                    {action}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* What AI will do when connected */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">What Brilion can do</p>
              {actions.map((action) => (
                <div key={action} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary/40 shrink-0" />
                  {action}
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-[12px] text-muted-foreground">
              💬 Or just send a WhatsApp message like{' '}
              <span className="font-medium text-foreground">
                "Schedule a meeting tomorrow at 3pm with Raj"
              </span>{' '}
              — Brilion handles the rest.
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        {connected ? (
          <>
            <Button variant="outline" size="sm" className="flex-1 text-xs">
              <ExternalLink className="size-3 mr-1.5" />
              Open {service.name}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
              onClick={() => setConnected(false)}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Button
            className="w-full text-sm"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <span className="flex items-center gap-2">
                <span className="size-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Connecting…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="size-4" />
                Connect {service.name}
              </span>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function GooglePage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 via-red-500 to-yellow-400 shadow-sm">
                <svg className="size-4" viewBox="0 0 24 24" fill="white">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <h1 className="font-heading text-[28px] font-extrabold text-foreground tracking-tight">Google</h1>
            </div>
            <p className="text-[15px] text-muted-foreground">
              Connect Google Workspace — Brilion AI automates your Gmail, Calendar, Meet and YouTube.
            </p>
          </div>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            0 / 4 connected
          </Badge>
        </div>

        {/* Tip banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5">
          <MessageSquare className="size-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-primary">Talk to Brilion on WhatsApp</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Once connected, just message: <strong>"What's on my calendar today?"</strong> or <strong>"Send an email to Priya about the meeting"</strong> — no app switching needed.
            </p>
          </div>
        </div>

        {/* Service cards grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {INITIAL_SERVICES.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>

        {/* Coming soon: Google Drive, Docs, Sheets */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Coming Soon</p>
          <div className="flex flex-wrap gap-2">
            {['Google Drive', 'Google Docs', 'Google Sheets', 'Google Forms', 'Google Analytics'].map((name) => (
              <Badge key={name} variant="outline" className="text-xs text-muted-foreground gap-1.5">
                <Plus className="size-3" />
                {name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
