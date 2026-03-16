import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

const TESTIMONIALS = [
  {
    quote:
      'I replaced 4 different tools with Brilion. One WhatsApp message and my entire ad campaign goes live — targeting, creative, publishing, done.',
    name: 'Priya Mehta',
    role: 'Digital Marketing Lead',
    company: 'ScaleUp Agency',
    avatar: 'PM',
  },
  {
    quote:
      'My trading workflow used to take 8 minutes per order. Now I text Brilion and it executes on Binance in seconds. The P&L tracking is a bonus.',
    name: 'Arjun Desai',
    role: 'Crypto Trader',
    company: 'Independent',
    avatar: 'AD',
  },
  {
    quote:
      'Deploy to Vercel, create a PR on GitHub, schedule a standup — all from one conversation. This is what AI should have been from the start.',
    name: 'Kenji Nakamura',
    role: 'Full-Stack Developer',
    company: 'Machi Labs',
    avatar: 'KN',
  },
  {
    quote:
      'I run a real estate firm. Brilion schedules showings, sends follow-ups on WhatsApp, and even drafts listing descriptions. Saved me 3 hours a day.',
    name: 'Marie Laurent',
    role: 'Founder',
    company: 'Laurent Properties',
    avatar: 'ML',
  },
  {
    quote:
      "As a content creator, I used to spend hours on scripting and publishing. Now I describe the video idea and Brilion handles the rest — YouTube, socials, everything.",
    name: 'Rohan Kapoor',
    role: 'YouTuber & Creator',
    company: '1.2M Subscribers',
    avatar: 'RK',
  },
  {
    quote:
      'Brilion replaced my VA for scheduling. "Book a call with the London team Thursday 2pm" — and it just works. Calendar, Meet link, reminders, all automatic.',
    name: 'Sarah Chen',
    role: 'Operations Director',
    company: 'Nexus Consulting',
    avatar: 'SC',
  },
]

function TestimonialCard({
  quote,
  name,
  role,
  company,
  avatar,
  index,
}: (typeof TESTIMONIALS)[number] & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group rounded-2xl border border-gray-200/60 bg-white p-7 shadow-sm hover:shadow-lg hover:shadow-gray-200/40 hover:border-gray-200 transition-all duration-300"
    >
      {/* Stars */}
      <div className="flex gap-0.5 mb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className="size-4 fill-amber-400 text-amber-400"
          />
        ))}
      </div>

      {/* Quote */}
      <p className="text-[15px] leading-relaxed text-gray-600 mb-6">
        &ldquo;{quote}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
        <div className="flex size-10 items-center justify-center rounded-full bg-gray-900 text-white text-xs font-bold tracking-wide">
          {avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-400">
            {role} · {company}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export function Testimonials() {
  return (
    <section className="relative py-24 sm:py-32">
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
            Testimonials
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-[1.15]">
            Loved by people who
            <br />
            <span className="text-gray-400">get things done.</span>
          </h2>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.name} {...t} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
