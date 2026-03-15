import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'

/* ── Video Showcase ──
   Cinematic video with Apple TV-tier play button.
   Radial gradient button, animated pulse ring, glass morphism.
*/

export function VideoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)

  function togglePlay() {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setIsPlaying(true)
      setTimeout(() => setShowControls(false), 1500)
    } else {
      video.pause()
      setIsPlaying(false)
      setShowControls(true)
    }
  }

  function handleMouseEnter() {
    if (isPlaying) setShowControls(true)
  }

  function handleMouseLeave() {
    if (isPlaying) setShowControls(false)
  }

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

        {/* Video card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="group relative aspect-video w-full overflow-hidden rounded-3xl border border-gray-200/60 bg-gray-950 shadow-2xl shadow-gray-200/40 cursor-pointer"
          onClick={togglePlay}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            src="/test.mp4"
            loop
            playsInline
          />

          {/* Overlay */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 z-10"
              >
                {/* Gradient scrim when paused */}
                {!isPlaying && (
                  <div className="absolute inset-0 bg-linear-to-b from-black/15 via-black/5 to-black/50" />
                )}

                {/* Premium play/pause button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    className="relative"
                  >
                    {/* Animated pulse ring — only when paused */}
                    {!isPlaying && (
                      <div className="absolute -inset-4 rounded-full border border-white/20 animate-[video-ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    )}

                    {/* Outer ring */}
                    <div className="absolute -inset-2.5 rounded-full border-2 border-white/20 backdrop-blur-[2px]" />

                    {/* Main button — radial gradient with glass reflection */}
                    <div
                      className="relative flex size-20 sm:size-24 items-center justify-center rounded-full"
                      style={{
                        background:
                          'radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.88) 100%)',
                        boxShadow:
                          '0 12px 48px -4px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.15), inset 0 2px 0 rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.06)',
                      }}
                    >
                      {/* Glass highlight */}
                      <div
                        className="absolute top-1 left-1/2 -translate-x-1/2 h-[45%] w-[70%] rounded-full pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)',
                        }}
                      />

                      {isPlaying ? (
                        <div className="relative flex gap-1.5">
                          <div className="w-1.5 h-7 rounded-full bg-gray-900" />
                          <div className="w-1.5 h-7 rounded-full bg-gray-900" />
                        </div>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          className="relative size-8 sm:size-9 text-gray-900 ml-1"
                          fill="currentColor"
                        >
                          <path d="M6.906 4.537A.6.6 0 006 5.053v13.894a.6.6 0 00.906.516l11.723-6.947a.6.6 0 000-1.032L6.906 4.537z" />
                        </svg>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Bottom info when paused */}
                {!isPlaying && (
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/55 via-black/15 to-transparent p-6 sm:p-8">
                    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-[2px]">
                      Product Tour
                    </span>
                    <p className="text-[14px] text-white/80 mt-1 font-medium">
                      See how Brilion automates your entire workflow from a
                      single conversation.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
