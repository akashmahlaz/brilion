import { useState } from 'react'
import {
  Megaphone,
  TrendingUp,
  Code2,
  Calendar,
  ArrowRight,
  Check,
  X,
  Clock,
  Zap,
  ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BlurFade } from '#/components/ui/blur-fade'
import { Iphone } from '#/components/ui/iphone'
import type { LucideIcon } from 'lucide-react'

/* ── Scenario data ── */

interface BeforeStep {
  label: string
  time: string
}

interface Scenario {
  id: string
  tab: string
  icon: LucideIcon
  color: string
  activeColor: string
  headline: string
  before: {
    title: string
    totalTime: string
    steps: BeforeStep[]
  }
  after: {
    message: string
    replies: string[]
    totalTime: string
  }
}

const SCENARIOS: Scenario[] = [
  {
    id: 'marketing',
    tab: 'Marketing',
    icon: Megaphone,
    color: 'text-gray-500',
    activeColor: 'text-blue-600',
    headline: 'Launch a Facebook ad campaign',
    before: {
      title: 'The old way',
      totalTime: '25 min',
      steps: [
        { label: 'Open Facebook Ads Manager', time: '1 min' },
        { label: 'Choose campaign objective', time: '2 min' },
        { label: 'Design creative in Canva', time: '10 min' },
        { label: 'Set targeting & audience', time: '5 min' },
        { label: 'Configure budget & schedule', time: '3 min' },
        { label: 'Review and publish', time: '4 min' },
      ],
    },
    after: {
      message: 'Run a retargeting ad for cart abandoners, ₹500/day budget, 7 days',
      replies: [
        'Analyzing your Shopify audience...',
        'Created 3 ad variations with your brand assets',
        'Campaign live → Estimated reach: 45,000',
      ],
      totalTime: '10 sec',
    },
  },
  {
    id: 'trading',
    tab: 'Trading',
    icon: TrendingUp,
    color: 'text-gray-500',
    activeColor: 'text-emerald-600',
    headline: 'Execute a limit order on Binance',
    before: {
      title: 'The old way',
      totalTime: '8 min',
      steps: [
        { label: 'Open Binance app', time: '30 sec' },
        { label: 'Navigate to spot trading', time: '30 sec' },
        { label: 'Search for ETH/USDT pair', time: '30 sec' },
        { label: 'Switch to limit order tab', time: '15 sec' },
        { label: 'Enter price, quantity, check balance', time: '3 min' },
        { label: 'Confirm, 2FA, and wait', time: '3 min' },
      ],
    },
    after: {
      message: 'Buy 0.5 ETH at $3,200 limit on Binance',
      replies: [
        'Checking ETH/USDT... current price $3,245',
        'Limit order placed: 0.5 ETH @ $3,200',
        'Order ID #8291 → monitoring. I\'ll notify you when filled.',
      ],
      totalTime: '8 sec',
    },
  },
  {
    id: 'coding',
    tab: 'Coding',
    icon: Code2,
    color: 'text-gray-500',
    activeColor: 'text-violet-600',
    headline: 'Deploy a feature to production',
    before: {
      title: 'The old way',
      totalTime: '15 min',
      steps: [
        { label: 'git add, commit, push to branch', time: '2 min' },
        { label: 'Open GitHub, create pull request', time: '3 min' },
        { label: 'Wait for CI checks to pass', time: '5 min' },
        { label: 'Merge to main', time: '1 min' },
        { label: 'Open Vercel dashboard, verify build', time: '3 min' },
        { label: 'Check production URL', time: '1 min' },
      ],
    },
    after: {
      message: 'Deploy the payment-fix branch to production on Vercel',
      replies: [
        'Pushing payment-fix → GitHub...',
        'CI passed ✓ Merging to main...',
        'Deployed → https://app.brilion.ai ✓ All health checks green.',
      ],
      totalTime: '12 sec',
    },
  },
  {
    id: 'scheduling',
    tab: 'Scheduling',
    icon: Calendar,
    color: 'text-gray-500',
    activeColor: 'text-amber-600',
    headline: 'Schedule a meeting with 5 people',
    before: {
      title: 'The old way',
      totalTime: '20 min',
      steps: [
        { label: 'Open Google Calendar', time: '1 min' },
        { label: 'Check availability of 5 people', time: '8 min' },
        { label: 'Find overlapping free slot', time: '4 min' },
        { label: 'Create event, add details', time: '3 min' },
        { label: 'Send calendar invites', time: '2 min' },
        { label: 'Send WhatsApp reminder', time: '2 min' },
      ],
    },
    after: {
      message: 'Schedule a 30-min call with Priya, Arjun, Kenji, Marie, and Hans this week',
      replies: [
        'Checking calendars... Thursday 3pm IST works for everyone',
        'Created "Team Sync" event with Google Meet link',
        'Invites sent. WhatsApp reminder set for 1 hour before.',
      ],
      totalTime: '15 sec',
    },
  },
]

/* ── Component ── */

export function HowItWorks() {
  const [activeId, setActiveId] = useState(SCENARIOS[0].id)
  const active = SCENARIOS.find((s) => s.id === activeId)!

  return (
    <section
      id="how-it-works"
      className="relative py-28 sm:py-36 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <BlurFade delay={0.1} inView>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold tracking-widest text-blue-600 uppercase mb-4">
              How it works
            </p>
            <h2 className="font-heading text-[36px] sm:text-[44px] lg:text-[52px] font-extrabold text-gray-900 leading-[1.1] tracking-tight">
              Three steps to{' '}
              <span className="bg-linear-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                automate everything
              </span>
            </h2>
            <p className="mt-5 text-lg text-gray-500 leading-relaxed">
              Pick a scenario. See how Brilion replaces entire workflows with one message.
            </p>
          </div>
        </BlurFade>

        {/* Scenario tabs */}
        <BlurFade delay={0.2} inView>
          <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
            {SCENARIOS.map((s) => {
              const isActive = s.id === activeId
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <s.icon className="size-4" />
                  {s.tab}
                </button>
              )
            })}
          </div>
        </BlurFade>

        {/* Before / After comparison */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            {/* Scenario headline */}
            <p className="text-center text-lg font-semibold text-gray-700 mb-8">
              <span className="text-gray-400">Scenario:</span>{' '}
              {active.headline}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* ── BEFORE card ── */}
              <div className="relative rounded-2xl border border-red-100 bg-red-50/30 p-8 lg:p-10 overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-red-100">
                    <X className="size-4 text-red-500" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-gray-900">
                    {active.before.title}
                  </h3>
                  <div className="ml-auto flex items-center gap-1.5 text-sm text-red-500 font-semibold">
                    <Clock className="size-3.5" />
                    {active.before.totalTime}
                  </div>
                </div>

                <div className="space-y-3">
                  {active.before.steps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-3 rounded-xl bg-white/70 border border-red-100/60 px-4 py-3"
                    >
                      <span className="flex items-center justify-center size-6 rounded-full bg-red-100 text-red-400 text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-600 flex-1">
                        {step.label}
                      </span>
                      <span className="text-xs text-gray-400 font-mono shrink-0">
                        {step.time}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Decorative strikethrough */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[110%] h-px bg-red-300/40 -rotate-6" />
                </div>
              </div>

              {/* ── AFTER — iPhone mockup ── */}
              <div className="flex flex-col items-center justify-center">
                {/* Label above phone */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100">
                    <Zap className="size-4 text-emerald-600" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-gray-900">
                    With Brilion
                  </h3>
                  <span className="ml-2 text-sm text-emerald-600 font-semibold">
                    {active.after.totalTime}
                  </span>
                </div>

                {/* iPhone with chat inside */}
                <div className="w-56 sm:w-64">
                  <Iphone>
                    {/* Chat screen rendered inside the phone */}
                    <div className="flex flex-col size-full">
                      {/* Chat header */}
                      <div className="bg-emerald-700 px-3 pt-8 pb-2 flex items-center gap-2">
                        <div className="size-6 rounded-full bg-white/20 flex items-center justify-center">
                          <Zap className="size-3 text-white" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-white leading-none">Brilion AI</p>
                          <p className="text-[7px] text-emerald-200 leading-none mt-0.5">online</p>
                        </div>
                      </div>

                      {/* Chat body */}
                      <div className="flex-1 bg-[#efeae2] px-2 py-2 flex flex-col gap-1.5 overflow-y-auto min-h-0">
                        {/* User bubble */}
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="self-end max-w-[85%]"
                        >
                          <div className="bg-[#d9fdd3] text-[8px] leading-[1.4] text-gray-800 px-2 py-1.5 rounded-lg rounded-tr-sm shadow-sm">
                            {active.after.message}
                          </div>
                        </motion.div>

                        {/* Brilion replies */}
                        {active.after.replies.map((reply, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.18 }}
                            className="self-start max-w-[85%]"
                          >
                            <div className="bg-white text-[8px] leading-[1.4] text-gray-700 px-2 py-1.5 rounded-lg rounded-tl-sm shadow-sm flex items-start gap-1">
                              {i === active.after.replies.length - 1 ? (
                                <Check className="size-2.5 text-emerald-500 shrink-0 mt-px" />
                              ) : (
                                <ChevronRight className="size-2.5 text-blue-400 shrink-0 mt-px" />
                              )}
                              <span>{reply}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Input bar */}
                      <div className="bg-[#f0f0f0] px-2 py-1.5 flex items-center gap-1.5">
                        <div className="flex-1 bg-white rounded-full px-2 py-1 text-[7px] text-gray-400">
                          Type a message...
                        </div>
                        <div className="size-5 rounded-full bg-emerald-600 flex items-center justify-center">
                          <ArrowRight className="size-2.5 text-white" />
                        </div>
                      </div>
                    </div>
                  </Iphone>
                </div>
              </div>
            </div>

            {/* Time saved bar */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400"
            >
              <div className="h-px flex-1 max-w-32 bg-linear-to-r from-transparent to-gray-200" />
              <span className="flex items-center gap-2 font-semibold">
                <span className="text-red-400 line-through">{active.before.totalTime}</span>
                <ArrowRight className="size-4 text-gray-300" />
                <span className="text-emerald-600">{active.after.totalTime}</span>
              </span>
              <div className="h-px flex-1 max-w-32 bg-linear-to-l from-transparent to-gray-200" />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
