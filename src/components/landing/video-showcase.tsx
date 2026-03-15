import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause } from 'lucide-react'
import { useRef, useState } from 'react'

/* ── Video Showcase ──
   Single cinematic video with professional play/pause overlay.
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
      // Hide controls after a short delay when playing
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

        {/* Video embed */}
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
                transition={{ duration: 0.25 }}
                className="absolute inset-0 z-10"
              >
                {/* Gradient scrim */}
                {!isPlaying && (
                  <div className="absolute inset-0 bg-black/30" />
                )}

                {/* Center play/pause button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex size-20 items-center justify-center rounded-full bg-white/95 backdrop-blur-md shadow-2xl shadow-black/25"
                  >
                    {isPlaying ? (
                      <Pause className="size-7 text-gray-900" fill="currentColor" />
                    ) : (
                      <Play className="size-7 text-gray-900 ml-1" fill="currentColor" />
                    )}
                  </motion.div>
                </div>

                {/* Bottom gradient + label (only when paused) */}
                {!isPlaying && (
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/50 to-transparent p-6 sm:p-8">
                    <span className="text-[10px] font-semibold text-white/60 uppercase tracking-[2px]">
                      Product Tour
                    </span>
                    <p className="text-[14px] text-white/80 mt-1 font-medium">
                      See how Brilion automates your entire workflow from a single conversation.
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
\
