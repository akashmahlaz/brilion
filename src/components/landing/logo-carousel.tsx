import { motion } from 'framer-motion'

/* ── Integrations Section ──
   Premium static grid showing the actual platforms Brilion connects to.
   Matches the hero's warm-paper aesthetic.
*/

const INTEGRATIONS = [
  { name: 'WhatsApp', icon: '/logos/whatsapp.svg' },
  { name: 'Facebook', icon: '/logos/meta.svg' },
  { name: 'Instagram', icon: '/logos/instagram.svg' },
  { name: 'Google', icon: '/logos/google.svg' },
  { name: 'Telegram', icon: '/logos/telegram.svg' },
  { name: 'Binance', icon: '/logos/binance.svg' },
  { name: 'Shopify', icon: '/logos/shopify.svg' },
  { name: 'Stripe', icon: '/logos/stripe.svg' },
  { name: 'GitHub', icon: '/logos/github.svg' },
  { name: 'YouTube', icon: '/logos/youtube.svg' },
  { name: 'Slack', icon: '/logos/slack.svg' },
  { name: 'TradingView', icon: '/logos/tradingview.svg' },
]

export function LogoCarousel() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[3px] mb-3">
            Connected Platforms
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            One message. Every platform.
          </h2>
          <p className="mt-3 text-[15px] text-gray-400 max-w-md mx-auto">
            Brilion talks to the tools you already use — marketing, trading,
            development, payments, and more.
          </p>
        </motion.div>

        {/* Logo grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {INTEGRATIONS.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="group relative flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-2xl border border-transparent bg-white/60 hover:bg-white hover:border-gray-200/80 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300 cursor-default"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-gray-50 group-hover:bg-gray-100/80 transition-colors duration-300">
                <img
                  src={item.icon}
                  alt={item.name}
                  className="size-6 object-contain"
                  loading="lazy"
                />
              </div>
              <span className="text-[12px] font-medium text-gray-400 group-hover:text-gray-700 transition-colors duration-300">
                {item.name}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center text-[12px] text-gray-400 mt-8"
        >
          + 30 more integrations coming soon
        </motion.p>
      </div>
    </section>
  )
}
