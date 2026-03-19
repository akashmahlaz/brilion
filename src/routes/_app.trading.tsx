import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  Plus,
  DollarSign,
  BarChart2,
  Activity,
  AlertTriangle,
  Bell,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
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

export const Route = createFileRoute('/_app/trading')({
  component: TradingPage,
})

interface TradingPlatform {
  id: string
  name: string
  description: string
  bgColor: string
  textColor: string
  connected: boolean
  type: 'crypto' | 'stock' | 'forex'
}

const PLATFORMS: TradingPlatform[] = [
  {
    id: 'binance',
    name: 'Binance',
    description: 'Crypto trading — spot, futures, portfolio tracking and alerts',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-500',
    connected: false,
    type: 'crypto',
  },
  {
    id: 'zerodha',
    name: 'Zerodha',
    description: 'Indian stock market — live prices, order management, P&L tracking',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    connected: false,
    type: 'stock',
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    description: 'Buy, sell and track crypto assets with AI-powered price alerts',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-500',
    connected: false,
    type: 'crypto',
  },
  {
    id: 'groww',
    name: 'Groww',
    description: 'Mutual funds, stocks and SIP management with AI insights',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    connected: false,
    type: 'stock',
  },
]

const PLATFORM_ACTIONS: Record<string, string[]> = {
  binance: [
    'Real-time price alerts on WhatsApp',
    'Portfolio P&L summary every morning',
    'Set price targets — "Alert me when BTC hits $100K"',
    'Track spot balance and open orders',
    'Fear & Greed Index briefings',
  ],
  zerodha: [
    'Live portfolio value on WhatsApp',
    'Order placement via AI commands',
    'Daily P&L and holdings summary',
    '"What\'s my portfolio value today?"',
    'Earnings calendar alerts',
  ],
  coinbase: [
    'Crypto price alerts and notifications',
    'Daily portfolio summary via WhatsApp',
    'Buy/sell execution on command',
    '"How much ETH do I have?"',
    'Market volatility warnings',
  ],
  groww: [
    'SIP tracking and performance reports',
    'Mutual fund NAV updates',
    '"How is my portfolio doing this month?"',
    'Rebalancing suggestions',
    'Tax-saving investment reminders',
  ],
}

// Mock crypto watchlist for connected state
const WATCHLIST = [
  { symbol: 'BTC', name: 'Bitcoin', price: '$67,240', change: '+2.4%', up: true },
  { symbol: 'ETH', name: 'Ethereum', price: '$3,512', change: '+1.8%', up: true },
  { symbol: 'SOL', name: 'Solana', price: '$178', change: '-0.9%', up: false },
  { symbol: 'BNB', name: 'BNB', price: '$604', change: '+0.6%', up: true },
]

function PlatformIcon({ id, className }: { id: string; className?: string }) {
  switch (id) {
    case 'binance':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 1.5L6.34 7.16l2.12 2.12L12 5.73l3.54 3.55 2.12-2.12L12 1.5zM7.16 12L5.04 9.88l-2.12 2.12L5.04 14.12 7.16 12zm9.68 0l2.12 2.12 2.12-2.12-2.12-2.12L16.84 12zm-7.16 4.27L7.16 14.15 5.04 16.27l2.12 2.12L12 22.5l4.84-4.11 2.12-2.12-2.12-2.12L12 16.27z" />
        </svg>
      )
    case 'zerodha':
      return <BarChart2 className={className} />
    case 'coinbase':
      return <DollarSign className={className} />
    case 'groww':
      return <TrendingUp className={className} />
    default:
      return <Activity className={className} />
  }
}

function PlatformCard({ platform }: { platform: TradingPlatform }) {
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
                  {platform.type}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">{platform.description}</CardDescription>
            </div>
          </div>
          {connected && (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50 text-[10px] gap-1 shrink-0">
              <CheckCircle2 className="size-3" />
              Live
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {connected ? (
          <>
            {/* For Binance — show watchlist */}
            {platform.id === 'binance' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Watchlist</p>
                  <button className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <RefreshCw className="size-2.5" /> Live
                  </button>
                </div>
                {WATCHLIST.map((coin) => (
                  <div key={coin.symbol} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-foreground w-8">{coin.symbol}</span>
                      <span className="text-[11px] text-muted-foreground">{coin.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-foreground">{coin.price}</span>
                      <span className={cn('flex items-center text-[11px] font-medium', coin.up ? 'text-emerald-500' : 'text-red-500')}>
                        {coin.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                        {coin.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Portfolio summary for others */}
            {platform.id !== 'binance' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 rounded-xl bg-muted/60 px-3 py-2.5">
                  <span className="text-[10px] text-muted-foreground">Invested</span>
                  <span className="text-base font-bold text-foreground">₹1,24,500</span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl bg-emerald-50 px-3 py-2.5">
                  <span className="text-[10px] text-muted-foreground">Current Value</span>
                  <span className="text-base font-bold text-emerald-600">₹1,38,200</span>
                </div>
              </div>
            )}

            {/* Active alerts */}
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200/40 px-3 py-2">
              <Bell className="size-3.5 text-amber-500 shrink-0" />
              <p className="text-[12px] text-amber-700">
                <span className="font-semibold">2 price alerts</span> active — alerts go to WhatsApp
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">AI Actions</p>
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
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">What Brilion can do</p>
              {actions.map((action) => (
                <div key={action} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary/40 shrink-0" />
                  {action}
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200/40 px-3 py-2.5 text-[12px] text-amber-700">
              ⚠️ Read-only mode available — Brilion only executes trades with your explicit WhatsApp confirmation.
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

function TradingPage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-500 shadow-sm">
                <TrendingUp className="size-4 text-white" />
              </div>
              <h1 className="font-heading text-[28px] font-extrabold text-foreground tracking-tight">Trading</h1>
            </div>
            <p className="text-[15px] text-muted-foreground">
              Connect your trading accounts — Brilion tracks your portfolio and alerts you via WhatsApp.
            </p>
          </div>
        </div>

        {/* Safety notice */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/80 px-4 py-3.5">
          <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800">Safe by Design</p>
            <p className="text-[12px] text-amber-700 mt-0.5">
              Brilion uses <strong>read-only API keys</strong> by default. To enable trade execution, you must explicitly opt-in. Every trade requires your WhatsApp confirmation — Brilion never acts without permission.
            </p>
          </div>
        </div>

        {/* AI trading commands preview */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="size-4 text-primary" />
            <p className="text-[13px] font-semibold text-foreground">AI Trading Commands (via WhatsApp)</p>
          </div>
          {[
            '"What\'s my Binance portfolio worth right now?"',
            '"Alert me when ETH drops below $3,000"',
            '"Show me my top performing stocks this week"',
            '"Set a stop-loss alert if BTC falls 5% from current price"',
          ].map((cmd) => (
            <div key={cmd} className="flex items-start gap-2 text-[12px]">
              <span className="text-muted-foreground mt-0.5">→</span>
              <span className="text-foreground font-medium">{cmd}</span>
            </div>
          ))}
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
            {['Upstox', 'Angel One', 'Dhan', 'Interactive Brokers', 'WazirX', 'Delta Exchange'].map((name) => (
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
