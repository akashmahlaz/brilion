import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
  MessageSquare,
  Bot,
  Workflow,
  Cable,
  Check,
  ArrowRight,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'

/* ── Platform Features ──
   Interactive tabbed showcase. Each tab reveals a split panel:
   left = copy + bullets + CTA, right = stylized mockup area.
*/

interface Feature {
  id: string
  label: string
  icon: LucideIcon
  headline: string
  description: string
  bullets: string[]
  mockupLabel: string
  mockupLines: string[]
}

const FEATURES: Feature[] = [
  {
    id: 'chat',
    label: 'Chat AI',
    icon: MessageSquare,
    headline: 'Talk. It executes.',
    description:
      'Give instructions in plain English on WhatsApp or web. Brilion understands context, follows up when needed, and gets things done.',
    bullets: [
      'Natural language commands — no learning curve',
      'Multi-turn conversations with memory',
      'Works on WhatsApp, Telegram, and web',
      'Understands images, documents, and voice',
    ],
    mockupLabel: 'WhatsApp · Brilion AI',
    mockupLines: [
      'Create a Facebook ad for the summer collection',
      'Done! 3 variations ready. Publish now?',
      'Yes, all three',
      'Published. Estimated reach: 45,000',
    ],
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: Bot,
    headline: 'Agents that never sleep.',
    description:
      'Deploy autonomous AI agents that monitor, decide, and act on your behalf — continuously, without prompting.',
    bullets: [
      'Monitor markets, leads, and mentions 24/7',
      'Auto-respond to customer inquiries',
      'Execute trades on predefined strategies',
      'Deploy code and manage infrastructure',
    ],
    mockupLabel: 'Agent · Market Watch',
    mockupLines: [
      '▸ Monitoring BTC/USDT on Binance',
      '▸ Price hit $68,450 — above threshold',
      '▸ Executing: Buy 0.5 BTC @ market',
      '✓ Order filled. P&L notification sent.',
    ],
  },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: Workflow,
    headline: 'Chain anything together.',
    description:
      'Build multi-step automations that trigger on events, branch on conditions, and loop until the job is done.',
    bullets: [
      'Visual drag-and-drop workflow builder',
      'Event triggers from any connected platform',
      'Conditional branching and parallel execution',
      'Schedule recurring workflows with cron',
    ],
    mockupLabel: 'Workflow · Lead Nurture',
    mockupLines: [
      '① New lead from Facebook → Enrich data',
      '② Score lead → If hot: assign to sales',
      '③ Send WhatsApp intro message',
      '④ Schedule follow-up in 48h',
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Cable,
    headline: '30+ platforms. One inbox.',
    description:
      'Connect the tools you already use. Marketing, trading, payments, dev tools — Brilion bridges them all through a single conversation.',
    bullets: [
      'WhatsApp, Facebook, Instagram, Telegram',
      'Binance, TradingView, Stripe, Shopify',
      'GitHub, Slack, Google Ads, YouTube',
      'Custom webhooks and REST API access',
    ],
    mockupLabel: 'Connected Platforms',
    mockupLines: [
      '● WhatsApp        ● Facebook Ads',
      '● Binance          ● Stripe',
      '● GitHub            ● Google Ads',
      '● Telegram         ● Shopify',
    ],
  },
]

export function Features() {
  const [activeId, setActiveId] = useState('chat')
  const active = FEATURES.find((f) => f.id === activeId)!

  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[3px] mb-4">
            Platform
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-[1.15]">
            Everything you need,
            <br />
            <span className="text-gray-400">nothing you don&apos;t.</span>
          </h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 rounded-full border border-gray-200/60 bg-white p-1.5 shadow-sm">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              const isActive = feature.id === activeId
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveId(feature.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="size-4" strokeWidth={1.8} />
                  <span className="hidden sm:inline">{feature.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center"
          >
            {/* Left — Copy */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {active.headline}
                </h3>
                <p className="text-[15px] text-gray-500 leading-relaxed max-w-md">
                  {active.description}
                </p>
              </div>

              {/* Bullets */}
              <ul className="space-y-3">
                {active.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-900 mt-0.5">
                      <Check className="size-3 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-[14px] text-gray-600 leading-snug">
                      {bullet}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                to="/signup"
                className="group inline-flex items-center gap-2 text-[14px] font-semibold text-gray-900 hover:text-gray-600 transition-colors pt-2"
              >
                Get started with {active.label}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Right — Mockup */}
            <div className="relative">
              <div className="rounded-2xl border border-gray-200/60 bg-white shadow-xl shadow-gray-200/30 overflow-hidden">
                {/* Top bar */}
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
                  <div className="flex gap-1.5">
                    <div className="size-2.5 rounded-full bg-gray-300" />
                    <div className="size-2.5 rounded-full bg-gray-300" />
                    <div className="size-2.5 rounded-full bg-gray-300" />
                  </div>
                  <span className="text-[11px] font-medium text-gray-400 tracking-wide ml-2">
                    {active.mockupLabel}
                  </span>
                </div>

                {/* Content lines */}
                <div className="p-5 space-y-3 font-mono">
                  {active.mockupLines.map((line, i) => (
                    <motion.div
                      key={line}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.1 }}
                      className={`text-[13px] leading-relaxed px-4 py-2.5 rounded-xl ${
                        i % 2 === 0
                          ? 'bg-gray-50 text-gray-600 self-start max-w-[90%]'
                          : 'bg-gray-900 text-gray-200 self-end max-w-[90%] ml-auto'
                      }`}
                    >
                      {line}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Decorative glow */}
              <div
                className="absolute -inset-4 -z-10 rounded-3xl opacity-40 blur-3xl pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at center, #bfdbfe 0%, transparent 70%)',
                }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
