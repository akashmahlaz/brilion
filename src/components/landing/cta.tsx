import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Highlighter } from '#/components/ui/highlighter'
import { Link } from '@tanstack/react-router'

export function CTA() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gray-900" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 60%)',
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[3px] mb-6">
            Get started today
          </p>

          <h2 className="font-heading text-[36px] sm:text-[48px] lg:text-[56px] font-extrabold text-white leading-[1.1] tracking-tight">
            Stop switching apps.
            <br />
            <Highlighter action="underline" color="#3b82f6" strokeWidth={2.5} animationDuration={800} isView>
              <span className="text-gray-500">Start automating.</span>
            </Highlighter>
          </h2>

          <p className="mt-6 text-[17px] text-gray-500 leading-relaxed max-w-lg mx-auto">
            Connect your WhatsApp. Link your tools.
            <br />
            Send one message. Watch it all happen.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="group relative px-8 py-4 bg-white text-gray-900 text-[15px] font-semibold rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] active:scale-[0.97]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start for Free
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 border border-gray-700 text-gray-400 text-[15px] font-semibold rounded-full hover:border-gray-500 hover:text-gray-300 transition-all duration-200"
            >
              See how it works
            </a>
          </div>

          <p className="mt-8 text-xs text-gray-600">
            Free forever on Starter · No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  )
}
