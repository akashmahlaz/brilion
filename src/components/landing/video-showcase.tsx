import { motion } from 'framer-motion'

/* ── Video Showcase ──
   Single cinematic YouTube embed. Clean, minimal, premium.
*/

export function VideoShowcase() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[3px] mb-4">
            Watch
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-[1.15]">
            Built for the way
            <br />
            <span className="text-gray-400">you actually work.</span>
          </h2>
        </motion.div>

        {/* Video embed */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="relative aspect-video w-full overflow-hidden rounded-3xl border border-gray-200/60 bg-gray-100 shadow-2xl shadow-gray-200/40"
        >
          <iframe
            className="absolute inset-0 size-full"
            src="https://www.youtube.com/embed/jX4dLxiso6A"
            title="Brilion — AI-Powered Automation"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </motion.div>
      </div>
    </section>
  )
}
