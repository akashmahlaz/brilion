import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { MorphingText } from '#/components/ui/morphing-text'

const MORPHING_WORDS = [
  'marketing',
  'trading',
  'scheduling',
  'coding',
  'content',
  'support',
]

export function CTA() {
  return (
    <section className="relative py-28 sm:py-36 overflow-hidden">
      {/* Warm background matching page */}
      <div className="absolute inset-0 bg-[#F8F7F3]" />
      {/* Subtle radial accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 800px 500px at 50% 50%, rgba(168,85,247,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="space-y-8"
        >
          <h2 className="font-heading text-[36px] sm:text-[48px] lg:text-[56px] font-extrabold text-gray-900 leading-[1.1] tracking-tight">
            Automate your
            <MorphingText
              texts={MORPHING_WORDS}
              className="inline-block font-heading text-[36px] sm:text-[48px] lg:text-[56px] font-extrabold text-gray-900 leading-[1.1] tracking-tight"
            />
            <br />
            <span className="text-gray-400">with one message.</span>
          </h2>

          <p className="text-[17px] text-gray-500 leading-relaxed max-w-lg mx-auto">
            Connect WhatsApp, link your tools, and let Brilion handle the rest.
            Start free. No credit card required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/signup"
              className="group relative px-8 py-4 bg-gray-900 text-white text-[15px] font-semibold rounded-full overflow-hidden transition-all duration-300 hover:bg-gray-800 hover:shadow-lg active:scale-[0.97]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start for Free
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 border border-gray-200 text-gray-600 text-[15px] font-semibold rounded-full hover:border-gray-300 hover:text-gray-900 transition-all duration-200"
            >
              Watch demo
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
