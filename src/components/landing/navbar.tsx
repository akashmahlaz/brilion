import { useState, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '#/lib/auth-client'

/* ── Dropdown Data ── */
const navDropdowns: Record<
  string,
  { sections: { title: string; items: { name: string; desc: string }[] }[] }
> = {
  PLATFORM: {
    sections: [
      {
        title: 'Automation',
        items: [
          { name: 'Chat AI', desc: 'Talk to Brilion via WhatsApp or web' },
          { name: 'Agents', desc: 'Autonomous AI agents that act for you' },
          { name: 'Workflows', desc: 'Multi-step automation pipelines' },
          { name: 'Integrations', desc: '30+ app connectors built-in' },
        ],
      },
      {
        title: 'Infrastructure',
        items: [
          { name: 'AI Models', desc: 'GPT-4o, Claude, Gemini and more' },
          { name: 'Channels', desc: 'WhatsApp, Telegram, Web chat' },
        ],
      },
    ],
  },
  'USE CASES': {
    sections: [
      {
        title: 'Industries',
        items: [
          { name: 'Digital Marketing', desc: 'Create and publish ads from chat' },
          { name: 'Trading', desc: 'Auto-trade on Binance via commands' },
          { name: 'Development', desc: 'Deploy code, manage repos' },
          { name: 'Content Creation', desc: 'Generate videos and publish' },
        ],
      },
      {
        title: 'Roles',
        items: [
          { name: 'Founders', desc: 'Run your business from WhatsApp' },
          { name: 'Professionals', desc: 'Automate admin and scheduling' },
        ],
      },
    ],
  },
  RESOURCES: {
    sections: [
      {
        title: 'Learn',
        items: [
          { name: 'Blog', desc: 'Updates and product announcements' },
          { name: 'Documentation', desc: 'Guides and API reference' },
          { name: 'Changelog', desc: 'What\'s new in Brilion' },
        ],
      },
    ],
  },
  COMPANY: {
    sections: [
      {
        title: 'About',
        items: [
          { name: 'About Us', desc: 'Our mission and team' },
          { name: 'Careers', desc: 'Join Brilion' },
          { name: 'Contact', desc: 'Get in touch' },
        ],
      },
    ],
  },
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { data: session } = useSession()
  const isLoggedIn = !!session?.user

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setActiveDropdown(label)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveDropdown(null), 150)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-2xl border-b border-gray-100/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="/" className="flex items-center shrink-0 -ml-1">
          <img src="/BRILION.svg" alt="Brilion" className="h-8 w-aut
          o" />
        </a>

        {/* Desktop Nav — mega dropdown */}
        <div className="hidden md:flex items-center gap-1">
          {Object.keys(navDropdowns).map((label) => (
            <div
              key={label}
              className="relative"
              onMouseEnter={() => handleMouseEnter(label)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className={`flex items-center gap-1 px-4 py-2 text-xs font-semibold tracking-widest transition-colors rounded-lg hover:bg-gray-50 ${
                  activeDropdown === label ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {label}
                <ChevronDown
                  className={`size-3 transition-transform duration-200 ${activeDropdown === label ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {activeDropdown === label && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-2xl shadow-2xl shadow-gray-200/60 border border-gray-100 p-5 min-w-85"
                    onMouseEnter={() => handleMouseEnter(label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div
                      className={`grid gap-6 ${
                        navDropdowns[label].sections.length > 1
                          ? 'grid-cols-2'
                          : 'grid-cols-1'
                      }`}
                    >
                      {navDropdowns[label].sections.map((section) => (
                        <div key={section.title}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                            {section.title}
                          </p>
                          <div className="space-y-1">
                            {section.items.map((item) => (
                              <a
                                key={item.name}
                                href="#"
                                className="group flex flex-col px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                              >
                                <span className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 flex items-center gap-1">
                                  {item.name}
                                  <ArrowRight className="size-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                                </span>
                                <span className="text-xs text-gray-400 mt-0.5">
                                  {item.desc}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              to="/chat"
              search={{ id: undefined as any }}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-all shadow-[inset_0_0_12px_rgba(255,255,255,0.3)]"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-50 transition-all"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-all shadow-[inset_0_0_12px_rgba(255,255,255,0.3)]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 -mr-2 text-gray-600 hover:text-gray-900"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-6 py-4 space-y-1">
              {Object.keys(navDropdowns).map((label) => (
                <button
                  key={label}
                  className="block w-full text-left text-xs font-bold tracking-widest text-gray-600 py-3 border-b border-gray-50"
                >
                  {label}
                </button>
              ))}
              <div className="pt-4 space-y-3">
                {isLoggedIn ? (
                  <Link
                    to="/chat"
                    search={{ id: undefined as any }}
                    className="block w-full text-center px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-full"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      className="block w-full text-center px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-full"
                    >
                      Get Started
                    </Link>
                    <Link
                      to="/login"
                      className="block w-full text-center px-5 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-50"
                    >
                      Log in
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
