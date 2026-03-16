import { motion } from 'framer-motion'

/* ── Testimonial data ── */

interface Testimonial {
  quote: string
  name: string
  role: string
  company: string
  avatar: string
  tag: string
}

const FEATURED: Testimonial = {
  quote:
    'Brilion completely changed how I run my business. I replaced 4 different tools, 2 dashboards, and a virtual assistant — all with one WhatsApp conversation.',
  name: 'Priya Mehta',
  role: 'Digital Marketing Lead',
  company: 'ScaleUp Agency',
  avatar: 'PM',
  tag: 'Marketing',
}

const ROW_1: Testimonial[] = [
  {
    quote:
      'My trading workflow used to take 8 minutes per order. Now I text Brilion and it executes on Binance in seconds. The P&L tracking is a bonus.',
    name: 'Arjun Desai',
    role: 'Crypto Trader',
    company: 'Independent',
    avatar: 'AD',
    tag: 'Trading',
  },
  {
    quote:
      'Deploy to Vercel, create a PR on GitHub, schedule a standup — all from one conversation. This is what AI should have been from the start.',
    name: 'Kenji Nakamura',
    role: 'Full-Stack Developer',
    company: 'Machi Labs',
    avatar: 'KN',
    tag: 'Development',
  },
  {
    quote:
      'I used to spend 20 minutes scheduling one meeting with 5 people. Now I just text Brilion and it checks everyone\'s calendar, books the room, sends the invite.',
    name: 'Sarah Chen',
    role: 'Operations Director',
    company: 'Nexus Consulting',
    avatar: 'SC',
    tag: 'Scheduling',
  },
  {
    quote:
      'We went from manually posting on 4 social platforms to having Brilion generate and publish content across all of them in under 30 seconds.',
    name: 'Vikram Patel',
    role: 'Social Media Manager',
    company: 'Brandworks',
    avatar: 'VP',
    tag: 'Content',
  },
  {
    quote:
      'The fact that it remembers context from previous conversations is what sets it apart. I don\'t repeat myself — Brilion already knows.',
    name: 'Lisa Wang',
    role: 'Startup Founder',
    company: 'Lumiar',
    avatar: 'LW',
    tag: 'AI Memory',
  },
]

const ROW_2: Testimonial[] = [
  {
    quote:
      'I run a real estate firm. Brilion schedules showings, sends follow-ups on WhatsApp, and even drafts listing descriptions. Saved me 3 hours a day.',
    name: 'Marie Laurent',
    role: 'Founder',
    company: 'Laurent Properties',
    avatar: 'ML',
    tag: 'Real Estate',
  },
  {
    quote:
      'As a content creator, I used to spend hours on scripting and publishing. Now I describe the video idea and Brilion handles YouTube, socials, everything.',
    name: 'Rohan Kapoor',
    role: 'YouTuber & Creator',
    company: '1.2M Subscribers',
    avatar: 'RK',
    tag: 'YouTube',
  },
  {
    quote:
      'Our customer support team uses Brilion to auto-draft replies, escalate issues, and update our CRM — all from a single Telegram thread.',
    name: 'Elena Petrov',
    role: 'Head of Support',
    company: 'DataForge',
    avatar: 'EP',
    tag: 'Support',
  },
  {
    quote:
      'I was skeptical at first. Then Brilion created an entire Facebook ad campaign — creative, targeting, budget — from one message. I\'m never going back.',
    name: 'David Okafor',
    role: 'Performance Marketer',
    company: 'GrowthLab',
    avatar: 'DO',
    tag: 'Ads',
  },
  {
    quote:
      'Brilion replaced my VA for scheduling. "Book a call with the London team Thursday 2pm" — and it just works. Calendar, Meet link, reminders, done.',
    name: 'Thomas Berg',
    role: 'Managing Partner',
    company: 'Berg & Associates',
    avatar: 'TB',
    tag: 'Scheduling',
  },
]

/* ── Marquee Card ── */

function MarqueeCard({ quote, name, role, company, avatar, tag }: Testimonial) {
  return (
    <div className="shrink-0 w-95 rounded-2xl border border-gray-200/60 bg-white p-7 shadow-sm hover:shadow-lg hover:shadow-gray-200/30 hover:border-gray-200 transition-all duration-500 group">
      {/* Tag */}
      <span className="inline-block text-[10px] font-bold uppercase tracking-[2px] text-gray-400 mb-5">
        {tag}
      </span>

      {/* Quote */}
      <p className="text-[15px] leading-[1.7] text-gray-600 mb-7">
        &ldquo;{quote}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3.5">
        <div className="relative">
          <div className="flex size-11 items-center justify-center rounded-full bg-gray-900 text-white text-[11px] font-bold tracking-wider ring-2 ring-gray-100">
            {avatar}
          </div>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-gray-900">{name}</p>
          <p className="text-[12px] text-gray-400">
            {role} · {company}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Infinite Marquee Row ── */

function MarqueeRow({
  items,
  direction = 'left',
  speed = 30,
}: {
  items: Testimonial[]
  direction?: 'left' | 'right'
  speed?: number
}) {
  const doubled = [...items, ...items]
  const duration = items.length * speed

  return (
    <div className="relative overflow-hidden">
      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-24 bg-linear-to-r from-[#F8F7F3] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-linear-to-l from-[#F8F7F3] to-transparent z-10 pointer-events-none" />

      <div
        className="flex gap-5 w-max hover:paused"
        style={{
          animation: `testimonial-scroll-${direction} ${duration}s linear infinite`,
        }}
      >
        {doubled.map((t, i) => (
          <MarqueeCard key={`${t.name}-${i}`} {...t} />
        ))}
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

        {/* Featured testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative mx-auto max-w-3xl mb-20"
        >
          <div className="relative rounded-3xl border border-gray-200/60 bg-white p-10 sm:p-14 shadow-md">
            {/* Large decorative quote */}
            <svg
              className="absolute top-8 left-10 size-12 text-gray-200/80"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
            </svg>

            {/* Quote text */}
            <p className="relative z-10 font-heading text-[22px] sm:text-[26px] lg:text-[30px] font-semibold text-gray-900 leading-[1.4] tracking-tight">
              {FEATURED.quote}
            </p>

            {/* Author */}
            <div className="mt-8 flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-gray-900 text-white text-xs font-bold tracking-wider ring-4 ring-gray-100">
                {FEATURED.avatar}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-gray-900">
                  {FEATURED.name}
                </p>
                <p className="text-[13px] text-gray-400">
                  {FEATURED.role} · {FEATURED.company}
                </p>
              </div>
              <span className="ml-auto hidden sm:inline-block text-[10px] font-bold uppercase tracking-[2px] text-gray-300 border border-gray-200/60 rounded-full px-4 py-1.5">
                {FEATURED.tag}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Marquee rows — full width */}
      <div className="space-y-5">
        <MarqueeRow items={ROW_1} direction="left" speed={28} />
        <MarqueeRow items={ROW_2} direction="right" speed={32} />
      </div>
    </section>
  )
}
