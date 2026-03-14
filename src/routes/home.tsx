import { createFileRoute, Link } from '@tanstack/react-router'
import {
  MessageSquareText,
  Share2,
  TrendingUp,
  Code2,
  Video,
  CalendarDays,
  ArrowRight,
  Sparkles,
  Zap,
  BrainCircuit,
  Megaphone,
  Rocket,
  GraduationCap,
  LineChart,
} from 'lucide-react'

export const Route = createFileRoute('/home')({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'Brilion — Automate Everything from One Conversation' },
      {
        name: 'description',
        content:
          'Connect WhatsApp to every app you use. Send a message to create ads, deploy code, execute trades, or schedule meetings. AI-powered life automation.',
      },
    ],
  }),
})

/* ═══════════════════════════════════════════════════════════
   Landing Page
   ═══════════════════════════════════════════════════════════ */
function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
    </div>
  )
}

/* ── Navbar ── */
// const NAV_LINKS = [
//   { label: 'Features', href: '#features' },
//   { label: 'How it works', href: '#how-it-works' },
//   { label: 'Use Cases', href: '#use-cases' },
// ]

// function Navbar() {
//   return (
//     <nav className="fixed top-0 z-50 w-full bg-white/95 backdrop-blur-xl shadow-[0_1px_0_0_#E8E6E0]">
//       <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">

//         {/* ── Logo ── */}
//         <a href="/home" className="flex shrink-0 items-center gap-3">
//           <img src="/logo.png" alt="Brilion" className="h-16 w-auto" />
//           <span className="font-heading text-[17px] font-bold tracking-[-0.02em] text-[#0D0D12]">
//             Brilion
//           </span>
//         </a>

//         {/* ── Nav links — desktop ── */}
//         <div className="hidden items-center gap-1 md:flex">
//           {NAV_LINKS.map((link) => (
//             <a
//               key={link.href}
//               href={link.href}
//               className="rounded-md px-3.5 py-2 text-[13.5px] font-medium text-[#525252] transition-colors hover:bg-[#F5F4F0] hover:text-[#0D0D12]"
//             >
//               {link.label}
//             </a>
//           ))}
//           <a
//             href="#pricing"
//             className="rounded-md px-3.5 py-2 text-[13.5px] font-medium text-[#525252] transition-colors hover:bg-[#F5F4F0] hover:text-[#0D0D12]"
//           >
//             Pricing
//           </a>
//         </div>

//         {/* ── Right actions ── */}
//         <div className="flex items-center gap-2">
//           <Link
//             to="/login"
//             className="hidden rounded-md px-4 py-2 text-[13.5px] font-medium text-[#525252] transition-colors hover:bg-[#F5F4F0] hover:text-[#0D0D12] sm:inline-flex"
//           >
//             Log in
//           </Link>

//           {/* Divider */}
//           <div className="hidden h-4 w-px bg-[#E0DDD7] sm:block" />

//           <Link
//             to="/signup"
//             className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D0D12] px-4 py-2 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-[#252530] hover:shadow-md"
//           >
//             Get Started
//             <ArrowRight className="size-3.5" />
//           </Link>
//         </div>
//       </div>
//     </nav>
//   )
// }


import { useState, useRef } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navDropdowns = {
  PLATFORM: {
    sections: [
      {
        title: "Products",
        items: [
          { name: "Samvaad", desc: "Conversational AI agents for India" },
          { name: "Studio", desc: "Build and deploy AI workflows" },
          { name: "Bulbul", desc: "Text-to-speech for Indian languages" },
          { name: "Saaras", desc: "Speech-to-text transcription" },
        ],
      },
      {
        title: "Infrastructure",
        items: [
          { name: "Model API", desc: "Access frontier models via API" },
          { name: "Token Factory", desc: "Efficient model serving at scale" },
        ],
      },
    ],
  },
  DEVELOPERS: {
    sections: [
      {
        title: "Build",
        items: [
          { name: "Documentation", desc: "Guides, references and tutorials" },
          { name: "API Reference", desc: "Full REST API documentation" },
          { name: "Playground", desc: "Try models interactively" },
        ],
      },
      {
        title: "Community",
        items: [
          { name: "Open Source", desc: "Explore our open-source models" },
          { name: "GitHub", desc: "View code and contribute" },
        ],
      },
    ],
  },
  RESOURCES: {
    sections: [
      {
        title: "Learn",
        items: [
          { name: "Blog", desc: "Updates, research and announcements" },
          { name: "Research", desc: "Technical papers and findings" },
          { name: "Case Studies", desc: "How enterprises use Sarvam" },
          { name: "Stories", desc: "Impact stories from across India" },
        ],
      },
    ],
  },
  COMPANY: {
    sections: [
      {
        title: "About",
        items: [
          { name: "About Us", desc: "Our mission and vision" },
          { name: "Team", desc: "The people behind Sarvam" },
          { name: "Careers", desc: "Join us in building India's AI" },
          { name: "News & Press", desc: "Media coverage and press releases" },
        ],
      },
    ],
  },
};

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = (label:any) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  return (
    <nav className="fixed top-10 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100/60">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0">
          <img
            src="lognsnsn"
            alt="Sarvam"
            className="h-7 w-auto"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <span className="hidden text-2xl font-bold tracking-tight text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
            BRILION
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {Object.keys(navDropdowns).map((label) => (
            <div
              key={label}
              className="relative"
              onMouseEnter={() => handleMouseEnter(label)}
              onMouseLeave={handleMouseLeave}
            >
              <button className="flex items-center gap-1 px-4 py-2 text-xs font-semibold tracking-widest text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50">
                {label}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${activeDropdown === label ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {activeDropdown === label && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-2xl shadow-2xl shadow-gray-200/60 border border-gray-100 p-5 min-w-[340px]"
                    onMouseEnter={() => handleMouseEnter(label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className={`grid gap-6 ${navDropdowns[label].sections.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {navDropdowns[label].sections.map((section) => (
                        <div key={section.title}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{section.title}</p>
                          <div className="space-y-1">
                            {section.items.map((item) => (
                              <a
                                key={item.name}
                                href="#"
                                className="group flex flex-col px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                              >
                                <span className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 flex items-center gap-1">
                                  {item.name}
                                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 transition-transform duration-200" />
                                </span>
                                <span className="text-xs text-gray-400 mt-0.5">{item.desc}</span>
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

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-all shadow-[inset_0_0_12px_rgba(255,255,255,0.3)]">
            Experience Brilion
          </button>
          <button className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-50 transition-all">
            Talk to Sales
          </button>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-2 overflow-hidden"
          >
            {Object.keys(navDropdowns).map((label) => (
              <button key={label} className="block w-full text-left text-xs font-bold tracking-widest text-gray-600 py-3 border-b border-gray-50">
                {label}
              </button>
            ))}
            <div className="pt-4 space-y-3">
              <button className="w-full px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-full">
                Experience Sarvam
              </button>
              <button className="w-full px-5 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-full">
                Talk to Sales
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* ── Hero ── */
function Hero() {
  return (
    <section className="relative flex min-h-screen  items-center justify-center overflow-hidden bg-[#FAFAF7] pt-[60px]">
      {/* Subtle radial glow — top center */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-blue-100/60 via-indigo-50/30 to-transparent blur-[80px]" />
      {/* Dotted texture */}
      <div className="landing-dots pointer-events-none absolute inset-0" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#E2E0D9] bg-white px-4 py-1.5 text-sm font-medium text-[#555] shadow-sm">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>AI Automation Platform · Now Available</span>
        </div>

        {/* Headline */}
        <h1 className="font-heading text-[52px]  font-extrabold leading-[1.07] tracking-[-0.03em] sm:text-[68px] lg:text-[82px] xl:text-[96px]">
          <span className="text-[#0D0D12]">Everything automated</span>
          <br />
          <span className="landing-ink-gradient">from one message.</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-12 mt-7 max-w-[560px] text-[17px] leading-[1.75] text-[#6B6B6B] sm:text-[19px]">
          Connect WhatsApp to every app you use. Create ads, deploy code,
          run trades, book meetings — one conversation handles it all.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-[#0D0D12] px-7 py-3.5 text-[14px] font-semibold text-white shadow-md shadow-black/10 transition-all hover:bg-[#1a1a24] hover:shadow-lg hover:shadow-black/15"
          >
            Start for Free
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-[#D8D6D0] bg-white px-7 py-3.5 text-[14px] font-semibold text-[#0D0D12] shadow-sm transition-all hover:border-[#C0BDB6] hover:shadow-md"
          >
            See how it works
          </a>
        </div>

        {/* Chat mockup */}
        <div className="mx-auto mt-16 max-w-[480px]">
          <div className="overflow-hidden rounded-2xl border border-[#E2E0D9] bg-white shadow-xl shadow-black/[0.06]">
            {/* Mockup top bar */}
            <div className="flex items-center gap-2 border-b border-[#F0EDE7] bg-[#F8F7F3] px-4 py-3">
              <div className="size-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-[#6B6B6B]">WhatsApp · Brilion AI</span>
            </div>
            {/* Messages */}
            <div className="space-y-3 p-4 text-left">
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-md bg-[#E8F5E9] px-4 py-2.5 text-[13px] text-[#1B5E20]">
                  Create a Facebook ad for my client's new product launch
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0D0D12]">
                  <Sparkles className="size-3 text-white" />
                </div>
                <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-[#F3F2EE] px-4 py-2.5 text-[13px] text-[#333]">
                  Done! I've created 3 ad variations with targeting strategy.
                  Should I publish to Facebook and Instagram?
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-md bg-[#E8F5E9] px-4 py-2.5 text-[13px] text-[#1B5E20]">
                  Yes, publish all three ✓
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0D0D12]">
                  <Sparkles className="size-3 text-white" />
                </div>
                <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-[#F3F2EE] px-4 py-2.5 text-[13px] text-[#333]">
                  All 3 ads are live. Reach: ~45,000. I'll send you a report in 24h. 📊
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof line */}
        <p className="mt-8 text-[13px] text-[#9B9990]">
          Used by marketers, founders, traders & developers worldwide
        </p>
      </div>
    </section>
  )
}

