import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { Marquee } from '#/components/ui/marquee'
import { Highlighter } from '#/components/ui/highlighter'

/* ── Testimonial data ── */

interface Testimonial {
  quote: string
  /** Fragment to highlight with rough-notation */
  highlight: string
  name: string
  handle: string
  role: string
  company: string
  image: string
  tag: string
}

const FEATURED: Testimonial = {
  quote:
    'Brilion completely changed how I run my business. I replaced 4 different tools, 2 dashboards, and a virtual assistant — all with one WhatsApp conversation.',
  highlight: 'replaced 4 different tools',
  name: 'Priya Mehta',
  handle: '@priyamehta',
  role: 'Digital Marketing Lead',
  company: 'ScaleUp Agency',
  image: 'https://i.pravatar.cc/150?u=priya',
  tag: 'Marketing',
}

const ROW_1: Testimonial[] = [
  {
    quote:
      'My trading workflow used to take 8 minutes per order. Now I text Brilion and it executes on Binance in seconds. The P&L tracking is a bonus.',
    highlight: 'executes on Binance in seconds',
    name: 'Arjun Desai',
    handle: '@arjundesai',
    role: 'Crypto Trader',
    company: 'Independent',
    image: 'https://i.pravatar.cc/150?u=arjun',
    tag: 'Trading',
  },
  {
    quote:
      'Deploy to Vercel, create a PR on GitHub, schedule a standup — all from one conversation. This is what AI should have been from the start.',
    highlight: 'all from one conversation',
    name: 'Kenji Nakamura',
    handle: '@kenji_dev',
    role: 'Full-Stack Developer',
    company: 'Machi Labs',
    image: 'https://i.pravatar.cc/150?u=kenji',
    tag: 'Development',
  },
  {
    quote:
      "I used to spend 20 minutes scheduling one meeting with 5 people. Now I just text Brilion and it checks everyone's calendar, books the room, sends the invite.",
    highlight: "checks everyone's calendar",
    name: 'Sarah Chen',
    handle: '@sarahchen',
    role: 'Operations Director',
    company: 'Nexus Consulting',
    image: 'https://i.pravatar.cc/150?u=sarah',
    tag: 'Scheduling',
  },
  {
    quote:
      'We went from manually posting on 4 social platforms to having Brilion generate and publish content across all of them in under 30 seconds.',
    highlight: 'in under 30 seconds',
    name: 'Vikram Patel',
    handle: '@vikrampatel',
    role: 'Social Media Manager',
    company: 'Brandworks',
    image: 'https://i.pravatar.cc/150?u=vikram',
    tag: 'Content',
  },
  {
    quote:
      "The fact that it remembers context from previous conversations is what sets it apart. I don't repeat myself — Brilion already knows.",
    highlight: 'Brilion already knows',
    name: 'Lisa Wang',
    handle: '@lisawang',
    role: 'Startup Founder',
    company: 'Lumiar',
    image: 'https://i.pravatar.cc/150?u=lisa',
    tag: 'AI Memory',
  },
]

const ROW_2: Testimonial[] = [
  {
    quote:
      'I run a real estate firm. Brilion schedules showings, sends follow-ups on WhatsApp, and even drafts listing descriptions. Saved me 3 hours a day.',
    highlight: 'Saved me 3 hours a day',
    name: 'Marie Laurent',
    handle: '@marielaurent',
    role: 'Founder',
    company: 'Laurent Properties',
    image: 'https://i.pravatar.cc/150?u=marie',
    tag: 'Real Estate',
  },
  {
    quote:
      'As a content creator, I used to spend hours on scripting and publishing. Now I describe the video idea and Brilion handles YouTube, socials, everything.',
    highlight: 'Brilion handles YouTube, socials, everything',
    name: 'Rohan Kapoor',
    handle: '@rohankapoor',
    role: 'YouTuber & Creator',
    company: '1.2M Subscribers',
    image: 'https://i.pravatar.cc/150?u=rohan',
    tag: 'YouTube',
  },
  {
    quote:
      'Our customer support team uses Brilion to auto-draft replies, escalate issues, and update our CRM — all from a single Telegram thread.',
    highlight: 'all from a single Telegram thread',
    name: 'Elena Petrov',
    handle: '@elenap',
    role: 'Head of Support',
    company: 'DataForge',
    image: 'https://i.pravatar.cc/150?u=elena',
    tag: 'Support',
  },
  {
    quote:
      "I was skeptical at first. Then Brilion created an entire Facebook ad campaign — creative, targeting, budget — from one message. I'm never going back.",
    highlight: "I'm never going back",
    name: 'David Okafor',
    handle: '@davidokafor',
    role: 'Performance Marketer',
    company: 'GrowthLab',
    image: 'https://i.pravatar.cc/150?u=david',
    tag: 'Ads',
  },
  {
    quote:
      'Brilion replaced my VA for scheduling. "Book a call with the London team Thursday 2pm" — and it just works. Calendar, Meet link, reminders, done.',
    highlight: 'it just works',
    name: 'Thomas Berg',
    handle: '@thomasberg',
    role: 'Managing Partner',
    company: 'Berg & Associates',
    image: 'https://i.pravatar.cc/150?u=thomas',
    tag: 'Scheduling',
  },
]

/* ── Helper: render quote with highlighted fragment ── */

function HighlightedQuote({ quote, highlight }: { quote: string; highlight: string }) {
  const idx = quote.indexOf(highlight)
  if (idx === -1) return <>&ldquo;{quote}&rdquo;</>
  return (
    <>
      &ldquo;{quote.slice(0, idx)}
      <Highlighter action="highlight" color="#fde68a" animationDuration={800} isView>
        {highlight}
      </Highlighter>
      {quote.slice(idx + highlight.length)}&rdquo;
    </>
  )
}

/* ── Star rating ── */

function Stars({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'size-5' : 'size-3.5'
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${s} fill-amber-400 text-amber-400`} />
      ))}
    </div>
  )
}

/* ── Avatar with image fallback to initials ── */

function Avatar({ name, image, size = 'sm' }: { name: string; image: string; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'size-14' : 'size-11'
  const ring = size === 'lg' ? 'ring-4' : 'ring-2'
  const textSize = size === 'lg' ? 'text-sm' : 'text-[11px]'
  const initials = name.split(' ').map((n) => n[0]).join('')
  return (
    <div className={`relative ${dim}`}>
      <img
        src={image}
        alt={name}
        className={`${dim} rounded-full object-cover ${ring} ring-gray-100 bg-gray-200`}
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          const next = target.nextElementSibling
          if (next instanceof HTMLElement) next.style.display = 'flex'
        }}
      />
      <div
        className={`${dim} items-center justify-center rounded-full bg-gray-900 text-white ${textSize} font-bold tracking-wider ${ring} ring-gray-100 hidden`}
      >
        {initials}
      </div>
    </div>
  )
}

/* ── Tweet-card style Testimonial (used inside marquee) ── */

function TestimonialCard({ quote, highlight, name, handle, role, company, image, tag }: Testimonial) {
  return (
    <div className="w-90 rounded-2xl border border-gray-200/50 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-gray-200 transition-all duration-500">
      {/* Top row: avatar + info + tag */}
      <div className="flex items-start gap-3.5 mb-5">
        <Avatar name={name} image={image} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-[11px] text-gray-400 truncate">{handle}</p>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[2px] text-gray-300">
          {tag}
        </span>
      </div>

      {/* Quote with highlighted text */}
      <p className="text-[14px] leading-[1.75] text-gray-500 mb-5">
        <HighlightedQuote quote={quote} highlight={highlight} />
      </p>

      {/* Bottom: stars + role */}
      <div className="flex items-center justify-between pt-5 border-t border-gray-100">
        <Stars />
        <p className="text-[11px] text-gray-400 truncate">
          {role} · {company}
        </p>
      </div>
    </div>
  )
}

/* ── Main Section ── */

export function Testimonials() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[3px] mb-4">
            Wall of love
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-[1.15]">
            Trusted by people who
            <br />
            <span className="text-gray-400">refuse to waste time.</span>
          </h2>
        </motion.div>

        {/* Featured testimonial — hero quote card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative mx-auto max-w-3xl mb-20"
        >
          <div className="relative rounded-3xl border border-gray-200/50 bg-white p-10 sm:p-14 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {/* Stars */}
            <Stars size="lg" />

            {/* Decorative quote mark */}
            <svg
              className="absolute top-8 right-10 size-16 text-gray-100"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
            </svg>

            {/* Quote text with highlight */}
            <p className="relative z-10 mt-6 font-heading text-[22px] sm:text-[26px] lg:text-[30px] font-semibold text-gray-900 leading-[1.4] tracking-tight">
              <HighlightedQuote quote={FEATURED.quote} highlight={FEATURED.highlight} />
            </p>

            {/* Author row */}
            <div className="mt-8 flex items-center gap-4">
              <Avatar name={FEATURED.name} image={FEATURED.image} size="lg" />
              <div>
                <p className="text-[15px] font-semibold text-gray-900">
                  {FEATURED.name}
                </p>
                <p className="text-[13px] text-gray-400">
                  {FEATURED.handle} · {FEATURED.role}
                </p>
              </div>
              <span className="ml-auto hidden sm:inline-block text-[10px] font-bold uppercase tracking-[2px] text-blue-400 border border-gray-300 rounded-full px-4 py-1.5 bg-white">
                {FEATURED.tag}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Marquee rows (Magic UI) — full viewport width ── */}
      <div className="space-y-5">
        <Marquee pauseOnHover className="[--duration:45s] [--gap:1.25rem]">
          {ROW_1.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </Marquee>

        <Marquee pauseOnHover reverse className="[--duration:50s] [--gap:1.25rem]">
          {ROW_2.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </Marquee>
      </div>
    </section>
  )
}
