import { forwardRef, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '#/lib/utils'
import { AnimatedBeam } from '#/components/ui/animated-beam'
import { Ripple } from '#/components/ui/ripple'
import { DotPattern } from '#/components/ui/dot-pattern'

/* ── Integrations Hub ──
   Fan-in / fan-out beam layout:
   Left (3 messaging inputs) → Center (Brilion) → Right (5 execution outputs)
*/

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => (
  <div
    ref={ref}
    className={cn(
      'z-10 flex size-14 items-center justify-center rounded-full border-2 border-gray-200/60 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]',
      className,
    )}
  >
    {children}
  </div>
))
Circle.displayName = 'Circle'

export function IntegrationsBeam() {
  const containerRef = useRef<HTMLDivElement>(null)

  // Left inputs (messaging channels)
  const whatsappRef = useRef<HTMLDivElement>(null)
  const telegramRef = useRef<HTMLDivElement>(null)
  const webRef = useRef<HTMLDivElement>(null)

  // Center
  const brilionRef = useRef<HTMLDivElement>(null)

  // Right outputs (execution platforms)
  const facebookRef = useRef<HTMLDivElement>(null)
  const binanceRef = useRef<HTMLDivElement>(null)
  const stripeRef = useRef<HTMLDivElement>(null)
  const googleRef = useRef<HTMLDivElement>(null)
  const githubRef = useRef<HTMLDivElement>(null)

  return (
    <section id="integrations" className="relative py-24 sm:py-32">
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
            Integrations
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-[1.15]">
            One conversation.
            <br />
            <span className="text-gray-400">Every platform.</span>
          </h2>
          <p className="mt-5 text-[15px] text-gray-500 max-w-lg mx-auto leading-relaxed">
            Send a message on WhatsApp, Telegram, or web — Brilion orchestrates
            actions across 30+ platforms in real time.
          </p>
        </motion.div>

        {/* Beam container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative mx-auto max-w-3xl"
        >
          <div
            ref={containerRef}
            className="relative flex h-125 w-full items-center justify-center overflow-hidden p-10"
          >
            {/* Background dot pattern */}
            <DotPattern
              width={24}
              height={24}
              cr={1}
              className="opacity-[0.15] mask-[radial-gradient(500px_circle_at_center,white,transparent)]"
            />
            {/* Left column — 3 input channels */}
            <div className="flex flex-col items-center justify-between gap-12">
              <Circle ref={whatsappRef}>
                <img
                  src="/logos/whatsapp.svg"
                  alt="WhatsApp"
                  className="size-8"
                />
              </Circle>
              <Circle ref={telegramRef}>
                <img
                  src="/logos/telegram.svg"
                  alt="Telegram"
                  className="size-8"
                />
              </Circle>
              <Circle ref={webRef}>
                <img src="/logos/slack.svg" alt="Web Chat" className="size-8" />
              </Circle>
            </div>

            {/* Center — Brilion hub */}
            <div className="relative mx-auto flex items-center justify-center">
              <Ripple
                mainCircleSize={80}
                mainCircleOpacity={0.08}
                numCircles={5}
                className="[--foreground:147_197_253]"
              />
              <Circle
                ref={brilionRef}
                className="size-20 border-blue-200/60 shadow-[0_0_30px_-8px_rgba(59,130,246,0.35)]"
              >
                <img
                  src="/logo.png"
                  alt="Brilion"
                  className="size-26 object-cover"
                />
              </Circle>
            </div>

            {/* Right column — 5 output platforms */}
            <div className="flex flex-col items-center justify-between gap-6">
              <Circle ref={facebookRef}>
                <img src="/logos/meta.svg" alt="Facebook" className="size-8" />
              </Circle>
              <Circle ref={binanceRef}>
                <img
                  src="/logos/binance.svg"
                  alt="Binance"
                  className="size-8"
                />
              </Circle>
              <Circle ref={stripeRef}>
                <img src="/logos/stripe.svg" alt="Stripe" className="size-8" />
              </Circle>
              <Circle ref={googleRef}>
                <img
                  src="/logos/google.svg"
                  alt="Google"
                  className="size-8"
                />
              </Circle>
              <Circle ref={githubRef}>
                <img src="/logos/github.svg" alt="GitHub" className="size-8" />
              </Circle>
            </div>

            {/* ── Beams: Left → Center (inputs) ── */}
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={whatsappRef}
              toRef={brilionRef}
              curvature={-75}
              endYOffset={-10}
              gradientStartColor="#25D366"
              gradientStopColor="#3B82F6"
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={telegramRef}
              toRef={brilionRef}
              gradientStartColor="#26A5E4"
              gradientStopColor="#3B82F6"
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={webRef}
              toRef={brilionRef}
              curvature={75}
              endYOffset={10}
              gradientStartColor="#E01E5A"
              gradientStopColor="#3B82F6"
            />

            {/* ── Beams: Center → Right (outputs, reversed) ── */}
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={facebookRef}
              toRef={brilionRef}
              curvature={-75}
              endYOffset={-10}
              reverse
              gradientStartColor="#3B82F6"
              gradientStopColor="#1877F2"
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={binanceRef}
              toRef={brilionRef}
              curvature={-35}
              endYOffset={-5}
              reverse
              gradientStartColor="#3B82F6"
              gradientStopColor="#F0B90B"
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={stripeRef}
              toRef={brilionRef}
              reverse
              gradientStartColor="#3B82F6"
              gradientStopColor="#635BFF"
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={googleRef}
              toRef={brilionRef}
              curvature={35}
              endYOffset={5}
              reverse
              gradientStartColor="#3B82F6"
              gradientStopColor="#4285F4"
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={githubRef}
              toRef={brilionRef}
              curvature={75}
              endYOffset={10}
              reverse
              gradientStartColor="#3B82F6"
              gradientStopColor="#333333"
            />
          </div>


        </motion.div>

        {/* Bottom caption */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8 text-[13px] text-gray-400 tracking-wide"
        >
          WhatsApp · Telegram · Slack · Meta · Binance · Stripe · Google ·
          GitHub · and more
        </motion.p>
      </div>
    </section>
  )
}
