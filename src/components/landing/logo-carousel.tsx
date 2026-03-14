/* ── Logo Carousel ──
   Infinite-scroll strip of integration logos.
   Pure CSS animation — no JS, no dependencies.
*/

const LOGOS: { name: string; icon: string }[] = [
  { name: 'WhatsApp', icon: '/logos/whatsapp.svg' },
  { name: 'Meta', icon: '/logos/meta.svg' },
  { name: 'Google', icon: '/logos/google.svg' },
  { name: 'Slack', icon: '/logos/slack.svg' },
  { name: 'GitHub', icon: '/logos/github.svg' },
  { name: 'Telegram', icon: '/logos/telegram.svg' },
  { name: 'Stripe', icon: '/logos/stripe.svg' },
  { name: 'Notion', icon: '/logos/notion.svg' },
  { name: 'Shopify', icon: '/logos/shopify.svg' },
  { name: 'Discord', icon: '/logos/discord.svg' },
  { name: 'Linear', icon: '/logos/linear.svg' },
  { name: 'Vercel', icon: '/logos/vercel.svg' },
]

function LogoItem({ name, icon }: { name: string; icon: string }) {
  return (
    <div className="flex items-center gap-2.5 px-6 shrink-0 opacity-40 hover:opacity-80 transition-opacity duration-300 grayscale hover:grayscale-0">
      <img
        src={icon}
        alt={name}
        className="h-6 w-auto object-contain"
        loading="lazy"
      />
      <span className="text-[13px] font-medium text-gray-500 whitespace-nowrap hidden sm:inline">
        {name}
      </span>
    </div>
  )
}

export function LogoCarousel() {
  return (
    <section className="relative py-14 border-y border-gray-100 bg-gray-50/40 overflow-hidden">
      {/* Heading */}
      <p className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-[3px] mb-8">
        Integrates with your daily tools
      </p>

      {/* Scroll track */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-24 bg-linear-to-r from-gray-50/90 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-linear-to-l from-gray-50/90 to-transparent z-10 pointer-events-none" />

        {/* Scrolling row */}
        <div className="flex animate-[logo-scroll_30s_linear_infinite]">
          {/* Duplicate the set twice for seamless loop */}
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <LogoItem key={`${logo.name}-${i}`} name={logo.name} icon={logo.icon} />
          ))}
        </div>
      </div>
    </section>
  )
}
