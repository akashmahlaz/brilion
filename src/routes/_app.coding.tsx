import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Code2,
  Globe,
  Cloud,
  ExternalLink,
  CheckCircle2,
  Plus,
  GitCommit,
  GitPullRequest,
  AlertCircle,
  Zap,
  Activity,
  Rocket,
  Terminal,
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

export const Route = createFileRoute('/_app/coding')({
  component: CodingPage,
})

interface DevPlatform {
  id: string
  name: string
  description: string
  bgColor: string
  textColor: string
  connected: boolean
  category: 'source' | 'deployment' | 'cdn' | 'registry'
}

const PLATFORMS: DevPlatform[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repo management, PR reviews, issue tracking and CI status via AI',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    connected: false,
    category: 'source',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Monitor deployments, preview URLs, check build logs and errors',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    connected: false,
    category: 'deployment',
  },
  {
    id: 'netlify',
    name: 'Netlify',
    description: 'Site deployments, form submissions, serverless functions',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-600',
    connected: false,
    category: 'deployment',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    description: 'DNS, Workers, Pages deployments and security analytics',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-500',
    connected: false,
    category: 'cdn',
  },
]

const PLATFORM_ACTIONS: Record<string, string[]> = {
  github: [
    '"Show me open PRs for brilion repo"',
    'Daily summary of new issues and PRs',
    'Alert on CI/CD failures via WhatsApp',
    '"Review this code, suggest improvements"',
    'Auto-create issues from WhatsApp voice notes',
  ],
  vercel: [
    '"What\'s the status of my last deployment?"',
    'Alert on failed deployments instantly',
    'Share latest preview URL in chat',
    '"Show deploy logs for production"',
    'Monitor Core Web Vitals weekly',
  ],
  netlify: [
    'Build status notifications on WhatsApp',
    '"List all my Netlify sites"',
    'Trigger manual deploys via command',
    'Form submission alerts',
    'Monitor site performance weekly',
  ],
  cloudflare: [
    '"What\'s my DNS status for example.com?"',
    'DDoS and threat alerts via WhatsApp',
    '"Deploy my latest worker"',
    'Bandwidth and request analytics weekly',
    'SSL certificate expiry reminders',
  ],
}

// Mock GitHub activity for connected state
const RECENT_ACTIVITY = [
  { type: 'commit', repo: 'brilion', message: 'feat: add Google section page', time: '12m ago', status: 'success' },
  { type: 'pr', repo: 'brilion', message: 'PR #42: Trading dashboard', time: '1h ago', status: 'open' },
  { type: 'deploy', repo: 'brilion', message: 'Production deploy', time: '2h ago', status: 'success' },
  { type: 'issue', repo: 'brilion', message: 'Chat bubble dark mode bug', time: '3h ago', status: 'closed' },
]

function PlatformIcon({ id, className }: { id: string; className?: string }) {
  switch (id) {
    case 'github':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      )
    case 'vercel':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M24 22.525H0l12-21.05 12 21.05z" />
        </svg>
      )
    case 'netlify':
      return <Globe className={className} />
    case 'cloudflare':
      return <Cloud className={className} />
    default:
      return <Code2 className={className} />
  }
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'commit':
      return <GitCommit className="size-3 text-muted-foreground" />
    case 'pr':
      return <GitPullRequest className="size-3 text-blue-500" />
    case 'deploy':
      return <Rocket className="size-3 text-emerald-500" />
    case 'issue':
      return <AlertCircle className="size-3 text-orange-500" />
    default:
      return <Activity className="size-3" />
  }
}

function PlatformCard({ platform }: { platform: DevPlatform }) {
  const [connected, setConnected] = useState(platform.connected)
  const [connecting, setConnecting] = useState(false)
  const actions = PLATFORM_ACTIONS[platform.id] || []

  async function handleConnect() {
    setConnecting(true)
    await new Promise((r) => setTimeout(r, 1200))
    setConnected(true)
    setConnecting(false)
  }

  return (
    <Card className={cn('transition-all duration-300', connected && 'ring-1 ring-primary/20')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('flex size-11 items-center justify-center rounded-xl', platform.bgColor)}>
              <PlatformIcon id={platform.id} className={cn('size-5', platform.textColor)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-[15px]">{platform.name}</CardTitle>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 uppercase">
                  {platform.category}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">{platform.description}</CardDescription>
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
            {/* GitHub activity feed */}
            {platform.id === 'github' && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Recent Activity</p>
                {RECENT_ACTIVITY.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2">
                    <ActivityIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">{item.message}</p>
                      <p className="text-[10px] text-muted-foreground">{item.repo} · {item.time}</p>
                    </div>
                    <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full',
                      item.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                      item.status === 'open' ? 'bg-blue-100 text-blue-600' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Vercel / Netlify deployment status */}
            {(platform.id === 'vercel' || platform.id === 'netlify') && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Deployments</p>
                {[
                  { name: 'brilion (production)', status: 'Ready', time: '2h ago', url: true },
                  { name: 'brilion (preview)', status: 'Ready', time: '5h ago', url: true },
                ].map((d) => (
                  <div key={d.name} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                    <div>
                      <p className="text-[12px] font-medium text-foreground">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">{d.time}</p>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 text-[10px]">
                      {d.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Cloudflare */}
            {platform.id === 'cloudflare' && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Requests', value: '1.2M' },
                  { label: 'Bandwidth', value: '4.8GB' },
                  { label: 'Threats', value: '0' },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl bg-muted/60 px-2 py-2.5 text-center">
                    <span className="text-base font-bold text-foreground">{s.value}</span>
                    <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">AI Commands</p>
              {actions.slice(0, 2).map((action) => (
                <div key={action} className="flex items-center gap-2 text-[12px] text-foreground">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                  {action}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">AI Commands you can use</p>
              {actions.map((action) => (
                <div key={action} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Terminal className="size-3 shrink-0" />
                  {action}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        {connected ? (
          <>
            <Button variant="outline" size="sm" className="flex-1 text-xs">
              <ExternalLink className="size-3 mr-1.5" />
              Open {platform.name}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => setConnected(false)}>
              Disconnect
            </Button>
          </>
        ) : (
          <Button className="w-full text-sm" onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <span className="flex items-center gap-2">
                <span className="size-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Connecting…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="size-4" />
                Connect {platform.name}
              </span>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function CodingPage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-slate-700 to-slate-900 shadow-sm">
                <Code2 className="size-4 text-white" />
              </div>
              <h1 className="font-heading text-[28px] font-extrabold text-foreground tracking-tight">Coding</h1>
            </div>
            <p className="text-[15px] text-muted-foreground">
              Connect your dev stack — monitor deployments, review PRs, and manage infrastructure via WhatsApp.
            </p>
          </div>
        </div>

        {/* Dev workflow tip */}
        <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5">
          <Zap className="size-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-primary">Developer Superpower</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Get a WhatsApp message when your Vercel deploy fails. Ask AI to review a PR. Get daily GitHub digests. All from your phone without opening any dashboard.
            </p>
          </div>
        </div>

        {/* Platform cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PLATFORMS.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} />
          ))}
        </div>

        {/* Coming soon */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Coming Soon</p>
          <div className="flex flex-wrap gap-2">
            {['GitLab', 'Bitbucket', 'Railway', 'Render', 'AWS', 'Google Cloud', 'Supabase', 'PlanetScale', 'Linear'].map((name) => (
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
