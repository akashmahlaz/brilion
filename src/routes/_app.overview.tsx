import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Radio,
  Settings2,
  Bot,
  Activity,
  Zap,
  ArrowRight,
  Sparkles,
  Globe,
  TrendingUp,
  Brain,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_app/overview')({
  component: DashboardPage,
})

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

interface DashboardData {
  whatsapp: { connected: boolean; dmPolicy: string } | null
  telegram: { connected: boolean; username: string | null } | null
  config: { model?: string } | null
}

function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    whatsapp: null,
    telegram: null,
    config: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [waRes, tgRes, cfgRes] = await Promise.all([
          apiFetch('/api/whatsapp?action=status').then((r) => r.ok ? r.json() : null).catch(() => null),
          apiFetch('/api/telegram?action=status').then((r) => r.ok ? r.json() : null).catch(() => null),
          apiFetch('/api/config').then((r) => r.ok ? r.json() : null).catch(() => null),
        ])
        setData({ whatsapp: waRes, telegram: tgRes, config: cfgRes })
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  return { ...data, loading }
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

function DashboardPage() {
  const { user } = Route.useRouteContext() as { user?: { name?: string } }
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const { whatsapp, telegram, config, loading } = useDashboardData()

  const waConnected = whatsapp?.connected ?? false
  const tgConnected = telegram?.connected ?? false
  const channelsOnline = [waConnected, tgConnected].filter(Boolean).length
  const activeModel = config?.model || 'Not configured'

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6 py-6 md:py-8"
      >
        {/* Welcome Section */}
        <motion.div variants={fadeUp} className="px-4 lg:px-6 space-y-1.5">
          <h1 className="font-heading text-[28px] sm:text-[36px] font-extrabold text-gray-900 tracking-tight leading-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-[15px] text-gray-500">
            Here's what's happening with your AI agent today.
          </p>
        </motion.div>

        {/* Stats Row — Glass cards */}
        <motion.div
          variants={stagger}
          className="grid grid-cols-1 gap-4 px-4 lg:px-6 sm:grid-cols-2 xl:grid-cols-4"
        >
          <motion.div variants={fadeUp}>
            <GlassStatCard
              label="Active Model"
              value={loading ? '…' : activeModel}
              icon={<TrendingUp className="size-4" />}
              footnote="Powered by AI SDK"
              sub="Multi-provider support"
              accentColor="blue"
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <GlassStatCard
              label="Channels"
              value={loading ? '…' : channelsOnline > 0 ? `${channelsOnline} Online` : 'Offline'}
              icon={<Activity className="size-4" />}
              footnote={
                waConnected && tgConnected ? 'WhatsApp & Telegram' :
                waConnected ? 'WhatsApp' :
                tgConnected ? 'Telegram' :
                'No channels connected'
              }
              sub={<Link to="/channels" className="hover:underline">Manage channels →</Link>}
              dot={channelsOnline > 0}
              accentColor="emerald"
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <GlassStatCard
              label="AI Providers"
              value="10+"
              icon={<Bot className="size-4" />}
              footnote="OpenAI, Anthropic, Google…"
              sub="Connect any provider"
              accentColor="violet"
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <GlassStatCard
              label="WhatsApp"
              value={loading ? '…' : waConnected ? 'Connected' : 'Disconnected'}
              icon={<Globe className="size-4" />}
              footnote={waConnected ? 'Receiving messages' : 'Connect to start'}
              sub={
                waConnected
                  ? `DM policy: ${whatsapp?.dmPolicy || 'open'}`
                  : <Link to="/channels" className="hover:underline">Connect WhatsApp →</Link>
              }
              dot={waConnected}
              accentColor="amber"
            />
          </motion.div>
        </motion.div>

        {/* Quick Actions — Bento Grid */}
        <motion.div variants={fadeUp} className="px-4 lg:px-6">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {/* Large Chat Card */}
            <Link to="/chat" className="md:col-span-2 group block">
              <div className="h-full rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_60px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_60px_rgba(0,0,0,0.07)] hover:border-blue-200/60 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.15)]">
                    <MessageSquare className="size-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-lg font-bold text-gray-900 tracking-tight">Start Chatting</h3>
                    <p className="text-[13px] text-gray-500">
                      Talk to your AI agent in natural language
                    </p>
                  </div>
                  <ArrowRight className="size-5 text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Your AI can answer questions, manage your workspace,
                  interact with connected channels, and use built-in tools.
                </p>
              </div>
            </Link>

            {/* Channels Card */}
            <Link to="/channels" className="group block">
              <div className="h-full rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_60px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_60px_rgba(0,0,0,0.07)] hover:border-emerald-200/60 transition-all duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Radio className="size-5" />
                  </div>
                  <ArrowRight className="ml-auto size-5 text-gray-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="font-heading text-lg font-bold text-gray-900 tracking-tight mb-1">Channels</h3>
                <p className="text-[13px] text-gray-500">WhatsApp &amp; Telegram connections</p>
              </div>
            </Link>

            {/* Skills Card */}
            <Link to="/skills" className="group block">
              <div className="h-full rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_60px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_60px_rgba(0,0,0,0.07)] hover:border-violet-200/60 transition-all duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <Brain className="size-5" />
                  </div>
                  <ArrowRight className="ml-auto size-5 text-gray-300 group-hover:text-violet-600 group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="font-heading text-lg font-bold text-gray-900 tracking-tight mb-1">Skills</h3>
                <p className="text-[13px] text-gray-500">Customize how your AI behaves</p>
              </div>
            </Link>

            {/* Settings Card */}
            <Link to="/settings" className="group block">
              <div className="h-full rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_60px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_60px_rgba(0,0,0,0.07)] hover:border-amber-200/60 transition-all duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <Settings2 className="size-5" />
                  </div>
                  <ArrowRight className="ml-auto size-5 text-gray-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="font-heading text-lg font-bold text-gray-900 tracking-tight mb-1">Settings</h3>
                <p className="text-[13px] text-gray-500">API keys, providers &amp; config</p>
              </div>
            </Link>

            {/* Agent Capabilities — wide card */}
            <div className="md:col-span-2 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_60px_rgba(0,0,0,0.04)]">
              <h3 className="font-heading text-lg font-bold text-gray-900 tracking-tight">What your agent can do</h3>
              <p className="text-[13px] text-gray-500 mb-4">
                Built-in capabilities — no extra setup needed
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  'Answer Questions',
                  'Web Search',
                  'Manage Files',
                  'Read Config',
                  'Edit Settings',
                  'Switch Models',
                  'Multi-Language',
                  'Channel Reply',
                  'Self Update',
                  'Custom Skills',
                ].map((tool) => (
                  <div
                    key={tool}
                    className="flex items-center gap-2 rounded-xl border border-gray-200/60 bg-white/60 px-3 py-2 text-[13px] text-gray-600"
                  >
                    <Zap className="size-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{tool}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ─── Glass Stat Card ────────────────────────────────── */

const ACCENT_COLORS = {
  blue: { dot: 'bg-blue-500', bg: 'hover:border-blue-200/60' },
  emerald: { dot: 'bg-emerald-500', bg: 'hover:border-emerald-200/60' },
  violet: { dot: 'bg-violet-500', bg: 'hover:border-violet-200/60' },
  amber: { dot: 'bg-amber-500', bg: 'hover:border-amber-200/60' },
}

function GlassStatCard({
  label,
  value,
  icon,
  footnote,
  sub,
  dot,
  accentColor = 'blue',
}: {
  label: string
  value: string
  icon: React.ReactNode
  footnote: React.ReactNode
  sub: React.ReactNode
  dot?: boolean
  accentColor?: keyof typeof ACCENT_COLORS
}) {
  const colors = ACCENT_COLORS[accentColor]
  return (
    <div className={`rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-[0_8px_60px_rgba(0,0,0,0.04)] transition-all duration-300 ${colors.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        {dot !== undefined && (
          <span className={`size-2 rounded-full ${dot ? `${colors.dot} animate-pulse` : 'bg-gray-300'}`} />
        )}
        <span className="font-heading text-[22px] font-bold text-gray-900 tracking-tight">{value}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-medium text-gray-600 flex items-center gap-1.5">
          {footnote} <Sparkles className="size-3 text-gray-400" />
        </span>
        <span className="text-[12px] text-gray-400">{sub}</span>
      </div>
    </div>
  )
}
