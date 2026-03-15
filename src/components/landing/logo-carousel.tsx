/* ── Logo Carousel ──
   Infinite marquee of platform icons. Pure CSS animation.
   Large icons, no labels, elegant fade edges on warm paper.
*/

const LOGOS = [
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

function LogoIcon({ name, icon }: { name: string; icon: string }) {
  return (
    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white border border-gray-200/50 mx-5 shadow-sm shadow-gray-100/50 hover:scale-105 hover:border-gray-200 hover:shadow-md hover:shadow-gray-200/40 transition-all duration-300">
      <img
        src={icon}
        alt={name}
        className="size-9 object-contain opacity-60 hover:opacity-100 transition-opacity duration-300"
        loading="lazy"
      />
    </div>
  )
}

export function LogoCarousel() {
  return (
    <section className="relative py-16">
      {/* Label */}
      <p className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-[3px] mb-10">
        Works with the platforms you already use
      </p>

      {/* Marquee track */}
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-32 bg-linear-to-r from-[#F8F7F3] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-linear-to-l from-[#F8F7F3] to-transparent z-10 pointer-events-none" />

        {/* Row */}
        <div className="flex w-max animate-[logo-scroll_35s_linear_infinite] hover:paused">
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <LogoIcon key={`${logo.name}-${i}`} name={logo.name} icon={logo.icon} />
          ))}
        </div>
      </div>
    </section>
  )
}
