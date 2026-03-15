import { MessageSquare, Zap, Rocket } from 'lucide-react'
import { BlurFade } from '#/components/ui/blur-fade'
import { BorderBeam } from '#/components/ui/border-beam'
import { NumberTicker } from '#/components/ui/number-ticker'
import type { LucideIcon } from 'lucide-react'

interface Step {
  number: number
  icon: LucideIcon
  title: string
  description: string
  detail: string
}

const STEPS: Step[] = [
  {
    number: 1,
    icon: MessageSquare,
    title: 'Connect your apps',
    description:
      'Link WhatsApp, Telegram, Google, Binance, GitHub and 30+ services in one tap. No code, no config files.',
    detail: '30+ integrations',
  },
  {
    number: 2,
    icon: Zap,
    title: 'Send a message',
    description:
      'Tell Brilion what you need in plain language — "run my Facebook ad", "deploy to Vercel", "buy 0.5 ETH".',
    detail: 'Natural language',
  },
  {
    number: 3,
    icon: Rocket,
    title: 'Watch it happen',
    description:
      'Brilion understands context, orchestrates APIs, and executes across every connected service in seconds.',
    detail: 'Fully automated',
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-28 sm:py-36 overflow-hidden"
    >
      {/* Section header */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <BlurFade delay={0.1} inView>
          <div className="text-center max-w-2xl mx-auto mb-20">
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
              No dashboards to learn. No workflows to build. Just message.
            </p>
          </div>
        </BlurFade>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {STEPS.map((step, i) => (
            <BlurFade key={step.number} delay={0.15 + i * 0.12} inView>
              <div className="group relative rounded-2xl border border-gray-200/70 bg-white p-8 lg:p-10 transition-all duration-500 hover:border-gray-300/80 hover:shadow-xl hover:shadow-gray-200/40 overflow-hidden h-full flex flex-col">
                {/* Border beam on hover */}
                <BorderBeam
                  size={120}
                  duration={8}
                  delay={i * 2}
                  colorFrom="#3b82f6"
                  colorTo="#8b5cf6"
                  borderWidth={1.5}
                />

                {/* Step number */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center justify-center size-12 rounded-xl bg-gray-50 border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors duration-300">
                    <span className="text-lg font-bold text-gray-400 group-hover:text-blue-600 transition-colors duration-300">
                      <NumberTicker value={step.number} delay={0.3 + i * 0.2} />
                    </span>
                  </div>
                  <step.icon className="size-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                </div>

                {/* Content */}
                <h3 className="font-heading text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-[15px] text-gray-500 leading-relaxed flex-1">
                  {step.description}
                </p>

                {/* Detail tag */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    {step.detail}
                  </span>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>

        {/* Bottom connector line */}
        <BlurFade delay={0.6} inView>
          <div className="hidden md:flex items-center justify-center mt-16 gap-4">
            <div className="h-px flex-1 max-w-48 bg-linear-to-r from-transparent to-gray-200" />
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <NumberTicker value={30} delay={0.5} />
                <span>+ integrations</span>
              </span>
              <span className="text-gray-200">|</span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-blue-500" />
                <NumberTicker value={10} delay={0.6} />
                <span>s average execution</span>
              </span>
              <span className="text-gray-200">|</span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-violet-500" />
                <NumberTicker value={99} delay={0.7} />
                <span>% uptime</span>
              </span>
            </div>
            <div className="h-px flex-1 max-w-48 bg-linear-to-l from-transparent to-gray-200" />
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
