import { Link } from '@tanstack/react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-24 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-150 opacity-35"
          style={{
            background:
              'radial-gradient(ellipse at center, #bfdbfe 0%, #dbeafe 30%, #fef3c7 55%, #fed7aa 70%, transparent 85%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-87.5 opacity-25"
          style={{
            background:
              'radial-gradient(ellipse at center, #93c5fd 0%, #bfdbfe 40%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="bg-white/70 backdrop-blur-lg px-5 py-2 rounded-full border border-gray-200/60 shadow-[0_0_40px_rgba(59,130,246,0.08)]"
        >
          <p className="text-[13px] font-semibold text-gray-600 tracking-wide flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI-Powered Life Automation
          </p>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-heading text-[48px] sm:text-[64px] lg:text-[78px] xl:text-[88px] font-extrabold text-gray-900 leading-[1.05] tracking-[-0.035em]"
        >
          Everything automate
          <br />
          <span className="bg-linear-to-r from-gray-900 via-blue-700 to-blue-500 bg-clip-text text-transparent">
            from one message.
          </span>
        </motion.h1>

        {/* Sub-heading */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-[17px] sm:text-[19px] text-gray-500 leading-[1.75] max-w-135"
        >
          Connect WhatsApp to every app you use. Create ads, deploy code,
          <br className="hidden sm:block" />
          run trades, book meetings — one conversation handles it all.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <Link
            to="/signup"
            className="group relative px-8 py-4 bg-gray-900 text-white text-[15px] font-semibold rounded-full overflow-hidden transition-all duration-500 shadow-[inset_0_0_12px_rgba(255,255,255,0.25)] hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.4)] active:scale-[0.97]"
          >
            <span className="absolute inset-0 bg-linear-to-r from-gray-900 via-blue-900 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full" />
            <span className="relative z-10 flex items-center gap-2">
              Start for Free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-4 border border-gray-200 bg-white text-gray-700 text-[15px] font-semibold rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
          >
            See how it works
          </a>
        </motion.div>

     
      </div>
    </section>
  )
}
