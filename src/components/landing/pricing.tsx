import { motion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'

interface Plan {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  popular?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'Perfect for trying Brilion. Connect up to 3 apps and automate basic tasks.',
    features: [
      '3 app integrations',
      '50 AI commands / month',
      'WhatsApp & web chat',
      'Basic workflow templates',
      'Community support',
    ],
    cta: 'Get Started Free',
  },
  {
    name: 'Pro',
    price: '₹1,999',
    period: '/mo',
    description: 'For professionals who want to automate their entire workflow, no limits.',
    features: [
      'Unlimited integrations',
      'Unlimited AI commands',
      'Autonomous agents',
      'Custom workflows & cron',
      'Priority support',
      'Multi-model AI (GPT-4o, Claude, Gemini)',
      'Advanced analytics',
    ],
    cta: 'Start 14-day trial',
    popular: true,
  },
  {
    name: 'Team',
    price: '₹4,999',
    period: '/mo',
    description: 'For teams and agencies. Shared workspace, roles, and collaborative automation.',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Shared agent workspace',
      'Role-based access control',
      'Dedicated account manager',
      'Custom integrations',
      'SSO & audit logs',
    ],
    cta: 'Contact Sales',
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
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
            Pricing
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-[1.15]">
            Simple pricing,
            <br />
            <span className="text-gray-400">no hidden fees.</span>
          </h2>
          <p className="mt-5 text-[15px] text-gray-500 max-w-md mx-auto leading-relaxed">
            Start free. Upgrade when you need more power. Cancel anytime.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-start">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl border p-8 lg:p-9 transition-all duration-300 ${
                plan.popular
                  ? 'border-gray-900 bg-gray-900 text-white shadow-2xl shadow-gray-900/20 scale-[1.02]'
                  : 'border-gray-200/60 bg-white hover:border-gray-200 hover:shadow-lg hover:shadow-gray-200/40'
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-white text-gray-900 text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan name */}
              <p
                className={`text-sm font-semibold uppercase tracking-widest mb-6 ${
                  plan.popular ? 'text-gray-400' : 'text-gray-400'
                }`}
              >
                {plan.name}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-3">
                <span className="font-heading text-[42px] font-extrabold tracking-tight leading-none">
                  {plan.price}
                </span>
                {plan.period && (
                  <span
                    className={`text-sm font-medium ${plan.popular ? 'text-gray-400' : 'text-gray-400'}`}
                  >
                    {plan.period}
                  </span>
                )}
              </div>

              <p
                className={`text-sm leading-relaxed mb-8 ${
                  plan.popular ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {plan.description}
              </p>

              {/* CTA */}
              <Link
                to="/signup"
                className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-sm font-semibold transition-all duration-200 mb-8 ${
                  plan.popular
                    ? 'bg-white text-gray-900 hover:bg-gray-100 shadow-[inset_0_0_12px_rgba(0,0,0,0.06)]'
                    : 'bg-gray-900 text-white hover:bg-gray-800 shadow-[inset_0_0_12px_rgba(255,255,255,0.2)]'
                }`}
              >
                {plan.cta}
                <ArrowRight className="size-3.5" />
              </Link>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full mt-0.5 ${
                        plan.popular ? 'bg-white/10' : 'bg-gray-100'
                      }`}
                    >
                      <Check
                        className={`size-3 ${plan.popular ? 'text-white' : 'text-gray-900'}`}
                        strokeWidth={2.5}
                      />
                    </div>
                    <span
                      className={`text-[13px] leading-snug ${
                        plan.popular ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
