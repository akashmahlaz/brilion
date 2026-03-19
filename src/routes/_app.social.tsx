import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Facebook,
  Instagram,
  Video,
  Linkedin,
  ExternalLink,
  CheckCircle2,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  TrendingUp,
  Users,
  BarChart2,
  Twitter,
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

export const Route = createFileRoute('/_app/social')({
  component: SocialPage,
})

interface SocialPlatform {
  id: string
  name: string
  handle?: string
  description: string
  iconColor: string
  bgColor: string
  connected: boolean
}

const PLATFORMS: SocialPlatform[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Schedule posts, stories, reels — grow your audience with AI captions',
    iconColor: 'text-pink-500',
    bgColor: 'bg-linear-to-br from-purple-100 to-pink-100',
    connected: false,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Manage pages, schedule posts, respond to comments and messages',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    connected: false,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Track trends, schedule uploads, analyze your content performance',
    iconColor: 'text-foreground',
    bgColor: 'bg-slate-100',
    connected: false,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Post professional updates, engage with connections, grow your network',
    iconColor: 'text-sky-600',
    bgColor: 'bg-sky-50',
    connected: false,
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    description: 'Thread posting, monitor mentions, auto-reply, engagement analytics',
    iconColor: 'text-foreground',
    bgColor: 'bg-slate-100',
    connected: false,
  },
]

const PLATFORM_ACTIONS: Record<string, string[]> = {
  instagram: [
    'Auto-generate AI captions for photos',
    'Schedule Reels and Stories at best times',
    'Reply to comments using AI',
    'Weekly insights report on WhatsApp',
    'Hashtag suggestions based on trends',
  ],
  facebook: [
    'Schedule posts for Pages and Groups',
    'Respond to comments and messages',
    'Boost performance reports to WhatsApp',
    'Create Facebook events from conversations',
    'Monitor brand mentions',
  ],
  tiktok: [
    'Track trending sounds and hashtags',
    'Schedule video uploads and captions',
    'Performance analytics via WhatsApp',
    'Suggest content ideas based on trends',
    'Monitor video comments',
  ],
  linkedin: [
    'Draft and schedule professional posts',
    'Generate connection request messages',
    'Summarize your feed and engagement',
    'Post job updates to your company page',
    'Weekly profile view analytics',
  ],
  twitter: [
    'Thread scheduling and auto-posting',
    'Monitor mentions and reply via AI',
    'Daily engagement summary on WhatsApp',
    'Track trending topics in your niche',
    'Retweet top-performing content',
  ],
}

const MOCK_STATS: Record<string, { label: string; value: string; icon: typeof Eye }[]> = {
  instagram: [
    { label: 'Followers', value: '4.2K', icon: Users },
    { label: 'Reach', value: '18K', icon: Eye },
    { label: 'Engagement', value: '3.8%', icon: Heart },
  ],
  facebook: [
    { label: 'Page Likes', value: '2.1K', icon: Heart },
    { label: 'Reach', value: '9.4K', icon: Eye },
    { label: 'Comments', value: '84', icon: MessageCircle },
  ],
  tiktok: [
    { label: 'Followers', value: '12.8K', icon: Users },
    { label: 'Views', value: '156K', icon: Eye },
    { label: 'Shares', value: '3.2K', icon: Share2 },
  ],
  linkedin: [
    { label: 'Connections', value: '1.4K', icon: Users },
    { label: 'Profile Views', value: '342', icon: Eye },
    { label: 'Post Impressions', value: '8.9K', icon: TrendingUp },
  ],
  twitter: [
    { label: 'Followers', value: '2.7K', icon: Users },
    { label: 'Impressions', value: '32K', icon: Eye },
    { label: 'Engagements', value: '1.1K', icon: BarChart2 },
  ],
}

function PlatformIcon({ id, className }: { id: string; className?: string }) {
  switch (id) {
    case 'instagram':
      return <Instagram className={className} />
    case 'facebook':
      return <Facebook className={className} />
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.56a8.27 8.27 0 004.85 1.56V6.65a4.85 4.85 0 01-1.08.04z" />
        </svg>
      )
    case 'linkedin':
      return <Linkedin className={className} />
    case 'twitter':
      return <Twitter className={className} />
    default:
      return <Share2 className={className} />
  }
}

function PlatformCard({ platform }: { platform: SocialPlatform }) {
  const [connected, setConnected] = useState(platform.connected)
  const [connecting, setConnecting] = useState(false)
  const actions = PLATFORM_ACTIONS[platform.id] || []
  const stats = MOCK_STATS[platform.id] || []

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
              <PlatformIcon id={platform.id} className={cn('size-5', platform.iconColor)} />
            </div>
            <div>
              <CardTitle className="text-[15px]">{platform.name}</CardTitle>
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
              💬 Just tell Brilion on WhatsApp:{' '}
              <span className="font-medium text-foreground">"Post this photo to Instagram with a professional caption"</span>
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

function SocialPage() {
  const connectedCount = 0

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-pink-500 via-purple-500 to-blue-500 shadow-sm">
                <Share2 className="size-4 text-white" />
              </div>
              <h1 className="font-heading text-[28px] font-extrabold text-foreground tracking-tight">Social</h1>
            </div>
            <p className="text-[15px] text-muted-foreground">
              Let Brilion manage your social media presence — content, engagement, analytics.
            </p>
          </div>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {connectedCount} / {PLATFORMS.length} connected
          </Badge>
        </div>

        {/* Content creator workflow tip */}
        <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5">
          <Video className="size-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-primary">Content Creator Shortcut</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Send a video or photo to Brilion on WhatsApp → it writes captions, suggests hashtags, and posts to all your connected platforms at the optimal time.
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
            {['Pinterest', 'Snapchat', 'Threads', 'Discord', 'Telegram Channels'].map((name) => (
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
