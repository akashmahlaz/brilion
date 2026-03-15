import { motion } from 'framer-motion'
import {
  MessageSquare,
  Bot,
  Workflow,
  Plug,
  BarChart3,
  Shield,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const FEATURES: {
  icon: LucideIcon
  title: string
  desc: string
  span: string
}[] = [
  {
    icon: MessageSquare,
    title: 'Chat AI',
    desc: 'Talk to Brilion on WhatsApp or web. Give instructions in plain language — it understands context, follows up, and executes.',
    span: 'sm:col-span-2',
  },
  {
    icon: Bot,
    title: 'Autonomous Agents',
    desc: 'Agents that run tasks on their own — monitor prices, post content, respond to leads, deploy code — 24/7.',
    span: '',
  },
  {
    icon: Workflow,
    title: 'Workflows',
    desc: 'Chain multi-step automations visually. Trigger on events, branch on conditions, loop until done.',
    span: '',
  },
  {
    icon: Plug,
    title: 'Integrations',
    desc: 'Connect 30+ platforms — WhatsApp, Facebook, Instagram, Binance, Stripe, GitHub, Google Ads and more.',
    span: 'sm:col-span-2',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    desc: 'Track every action, conversion, and message. Live dashboards with insights across all your connected platforms.',
    span: '',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    desc: 'End-to-end encryption, role-based access, audit logs. Your data never trains our models.',
    span: '',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
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

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={fadeUp}
                className={`group relative rounded-3xl border border-gray-200/60 bg-white p-7 sm:p-8 transition-all duration-300 hover:border-gray-300/80 hover:shadow-xl hover:shadow-gray-200/30 ${feature.span}`}
              >
                {/* Subtle gradient on hover */}
                <div className="absolute inset-0 rounded-3xl bg-linear-to-br from-gray-50/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-gray-900 mb-5">
                    <Icon className="size-5 text-white" strokeWidth={1.8} />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-gray-900 mb-2 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-gray-500">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
