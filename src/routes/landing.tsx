import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/landing')({
  beforeLoad: async () => {
    try {
      const res = await apiFetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        if (data?.user) throw redirect({ to: '/' })
      }
    } catch (e) {
      if (e instanceof Response || (e && typeof e === 'object' && 'to' in e)) throw e
    }
  },
  component: LandingPage,
})

const useCases = [
  {
    icon: '📣',
    title: 'Digital Marketing',
    desc: 'Create ad campaigns, generate creatives, write copy, and publish across all platforms in minutes.',
    example: '"Create ads for my client\'s coffee brand and post to Instagram today"',
  },
  {
    icon: '📈',
    title: 'Trading & Finance',
    desc: 'Connect Binance, set auto-trading strategies, get market briefings, and manage your portfolio hands-free.',
    example: '"Buy BTC if it drops below 60k, then send me a summary"',
  },
  {
    icon: '🎬',
    title: 'Content Creators',
    desc: 'Script, create, and upload videos to YouTube. Generate thumbnails, write descriptions, schedule posts.',
    example: '"Create a short about productivity tips and upload it to my channel"',
  },
  {
    icon: '💻',
    title: 'Developers',
    desc: 'Deploy to Vercel, manage GitHub repos, monitor Cloudflare, and get build notifications — all from WhatsApp.',
    example: '"Deploy main branch to production and send me the live URL"',
  },
  {
    icon: '🏢',
    title: 'Founders & Startups',
    desc: 'Manage emails, schedule meetings, track tasks, brief your team, and stay on top of everything effortlessly.',
    example: '"Summarize my inbox and follow up on the urgent ones"',
  },
  {
    icon: '⚖️',
    title: 'Lawyers & Professionals',
    desc: 'Draft documents, research cases, manage client communications, and automate routine paperwork.',
    example: '"Draft an NDA for my new client and send it via email"',
  },
]

const integrations = [
  { icon: '💬', name: 'WhatsApp' },
  { icon: '📧', name: 'Gmail' },
  { icon: '▶️', name: 'YouTube' },
  { icon: '📅', name: 'Calendar' },
  { icon: '📘', name: 'Facebook' },
  { icon: '📸', name: 'Instagram' },
  { icon: '🎵', name: 'TikTok' },
  { icon: '💹', name: 'Binance' },
  { icon: '🐙', name: 'GitHub' },
  { icon: '▲', name: 'Vercel' },
  { icon: '☁️', name: 'Cloudflare' },
  { icon: '+', name: 'More' },
]

const steps = [
  { n: '1', title: 'Connect your apps', desc: 'Link WhatsApp, Google, social media, trading platforms, GitHub — your entire digital life in one place.' },
  { n: '2', title: 'Send a message', desc: 'Tell Brilion what you want in plain language. No commands, no learning curve, no friction.' },
  { n: '3', title: 'Brilion executes', desc: 'AI calls the right APIs, runs the task end-to-end, and reports back. You just approve and guide.' },
  { n: '4', title: 'It remembers everything', desc: 'Clients, preferences, habits, history — Brilion builds a complete picture of your world.' },
]

const chatDemo = [
  { role: 'user', text: 'I have a new client selling premium coffee. Create Instagram ads and post the best one today.' },
  { role: 'ai', text: "Got it. Analyzing the brand now... I'll create 3 ad sets — lifestyle, product close-up, and story format. Should I also write A/B copy variants for each?" },
  { role: 'user', text: 'Yes, and pick the best one automatically.' },
  { role: 'ai', text: "✅ Done. 3 creatives generated, copy written. Lifestyle format scored highest. Posted to Instagram & Facebook, scheduled for 6pm IST.\n\nI'll send you analytics tomorrow morning. 📊" },
]

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#111] overflow-x-hidden">

      {/* Announcement bar */}
      <div
        className="text-white text-[13px] font-medium px-6 py-[10px] flex items-center justify-center gap-3"
        style={{ background: 'linear-gradient(90deg, #c8471a, #e8622a, #f5a623, #e8622a, #c8471a)', backgroundSize: '200% 100%' }}
      >
        <span className="bg-white text-[#e8622a] text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">NEW</span>
        Brilion is now in early access —
        <Link to="/signup" className="underline underline-offset-2">Join the waitlist →</Link>
        <span>✦</span>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#e8e8e4]" style={{ background: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-[1140px] mx-auto px-8 h-16 flex items-center justify-between">
          <span className="text-[22px] font-bold tracking-tight">brilion</span>
          <div className="hidden md:flex items-center gap-1">
            {['Platform', 'Use Cases', 'Integrations', 'Company'].map((item) => (
              <a key={item} href="#" className="px-4 py-2 text-[13px] font-medium text-[#666] uppercase tracking-[0.3px] rounded-lg hover:text-[#111] transition-colors" style={{ letterSpacing: '0.3px' }}>
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-5 py-2.5 text-[14px] font-semibold text-[#111] rounded-full border border-[#e8e8e4] hover:border-[#111] transition-colors">
              Sign in
            </Link>
            <Link to="/signup" className="px-5 py-2.5 text-[14px] font-semibold text-white bg-[#111] rounded-full hover:opacity-85 transition-opacity">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative text-center px-6 pt-20 pb-0 overflow-hidden flex flex-col items-center"
        style={{ background: 'linear-gradient(180deg, #fdf6ef 0%, #fbe8d2 20%, #f5d5b8 40%, #e8c4a0 55%, #d4b8c8 70%, #c4c8e0 82%, #d8e4f0 90%, #eef4f8 100%)', minHeight: '620px' }}
      >
        {/* Decorative ornament */}
        <div className="relative z-10 mb-8 opacity-50">
          <svg width="200" height="40" viewBox="0 0 200 40" fill="none">
            <path d="M10 20 Q30 5 50 20 Q70 35 90 20 Q110 5 130 20 Q150 35 170 20 Q190 5 200 20" stroke="#b8906a" strokeWidth="1.5" fill="none" opacity="0.6"/>
            <circle cx="100" cy="20" r="4" fill="#b8906a" opacity="0.5"/>
            <circle cx="70" cy="20" r="2.5" fill="#b8906a" opacity="0.4"/>
            <circle cx="130" cy="20" r="2.5" fill="#b8906a" opacity="0.4"/>
            <path d="M80 20 Q90 8 100 20 Q110 32 120 20" stroke="#b8906a" strokeWidth="1" fill="none" opacity="0.5"/>
          </svg>
        </div>

        {/* Badge */}
        <div className="relative z-10 inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-medium text-[#3b6bdc] mb-7" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          Your Personal AI Orchestration Platform
        </div>

        {/* Headline */}
        <h1
          className="relative z-10 font-medium tracking-tight leading-[1.05] text-[#111] max-w-[820px] mx-auto mb-6"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(52px, 8vw, 96px)' }}
        >
          AI for everything,<br />from one message.
        </h1>

        <p className="relative z-10 text-[17px] text-[#444] max-w-[500px] mx-auto mb-9 leading-[1.7]">
          Connect your WhatsApp to every app you use. Brilion automates your work, memorizes your world, and gets things done — instantly.
        </p>

        <div className="relative z-10">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-9 py-4 bg-[#111] text-white text-[15px] font-semibold rounded-full transition-all"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
          >
            Experience Brilion →
          </Link>
        </div>

        <p className="relative z-10 mt-14 pb-8 text-[11px] font-semibold tracking-[2.5px] uppercase text-[#999]">
          YOUR LIFE, AUTOMATED
        </p>
      </section>

      {/* Trust bar */}
      <div className="bg-white border-y border-[#e8e8e4] py-5 px-6">
        <div className="max-w-[1140px] mx-auto flex items-center justify-center gap-12 flex-wrap">
          <span className="text-[11px] font-semibold tracking-[2px] uppercase text-[#999]">Powering professionals across</span>
          <div className="flex items-center gap-10 flex-wrap justify-center">
            {['📣 Marketing', '💹 Trading', '🎬 Content', '💻 Dev & Tech', '⚖️ Legal', '🏢 Founders'].map((item) => (
              <span key={item} className="text-[14px] font-semibold text-[#666]">{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Pillars */}
      <section className="bg-white px-6 py-20">
        <div className="max-w-[1140px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-semibold tracking-[3px] uppercase text-[#999] mb-3">What makes Brilion different</p>
            <h2
              className="font-medium tracking-tight leading-[1.15] text-[#111]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(30px, 4vw, 48px)' }}
            >
              Built for real execution,<br />not just conversation.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 border border-[#e8e8e4] rounded-2xl overflow-hidden divide-x divide-[#e8e8e4]">
            {[
              { n: '01', title: 'Orchestrated by AI', desc: "Brilion doesn't just reply — it plans, delegates, and executes. One message triggers a chain of real actions across your apps." },
              { n: '02', title: 'Memory at the core', desc: 'It remembers your clients, preferences, habits, and history. Brilion knows you deeply, and gets more useful every day.' },
              { n: '03', title: 'WhatsApp first', desc: 'No new app to install. Your most-used app becomes your command center — send a message, things happen.' },
            ].map((p) => (
              <div key={p.n} className="bg-white hover:bg-[#fafaf8] transition-colors px-9 py-10">
                <p className="text-[11px] font-semibold tracking-[2px] text-[#999] mb-5">{p.n}</p>
                <h3 className="font-medium mb-3 leading-[1.2]" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px' }}>{p.title}</h3>
                <p className="text-[14px] text-[#666] leading-[1.7]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For who label */}
      <div className="bg-[#fafaf8] text-center pt-4 px-6">
        <p className="text-[11px] font-semibold tracking-[3px] uppercase text-[#999]">
          FOR MARKETERS | TRADERS | CREATORS | DEVELOPERS | FOUNDERS | LAWYERS
        </p>
      </div>

      {/* Use Cases */}
      <section className="bg-[#fafaf8] px-6 py-20">
        <div className="max-w-[1140px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-semibold tracking-[3px] uppercase text-[#999] mb-3">Use Cases</p>
            <h2
              className="font-medium tracking-tight leading-[1.15] text-[#111]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(30px, 4vw, 48px)' }}
            >
              One platform.<br />Every profession.
            </h2>
            <p className="text-[16px] text-[#666] max-w-[500px] mx-auto mt-4 leading-[1.7]">
              Tell Brilion what you need in plain language. It handles the rest.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {useCases.map((uc) => (
              <div key={uc.title} className="bg-white border border-[#e8e8e4] rounded-2xl p-8 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all">
                <span className="text-[28px] mb-4 block">{uc.icon}</span>
                <h3 className="font-medium mb-2.5" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px' }}>{uc.title}</h3>
                <p className="text-[14px] text-[#666] leading-[1.65] mb-4">{uc.desc}</p>
                <div className="px-3.5 py-2.5 bg-[#f5f5f0] rounded-lg text-[13px] text-[#555] italic border-l-[3px] border-[#e8622a]">
                  {uc.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white px-6 py-20 border-t border-[#e8e8e4]">
        <div className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-start">
          <div>
            <p className="text-[11px] font-semibold tracking-[3px] uppercase text-[#999] mb-3">How it works</p>
            <h2
              className="font-medium tracking-tight leading-[1.15] text-[#111] mb-4"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(30px, 4vw, 44px)' }}
            >
              Connect once.<br />Automate everything.
            </h2>
            <p className="text-[16px] text-[#666] max-w-[400px] leading-[1.7] mb-10">
              Brilion learns your workflow and gets smarter with every conversation.
            </p>
            <div className="divide-y divide-[#e8e8e4]">
              {steps.map((s) => (
                <div key={s.n} className="flex gap-5 py-6">
                  <span className="text-[32px] font-normal text-[#e8e8e4] leading-none min-w-[40px]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{s.n}</span>
                  <div>
                    <h4 className="text-[16px] font-semibold mb-1.5">{s.title}</h4>
                    <p className="text-[14px] text-[#666] leading-[1.6]">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#fafaf8] border border-[#e8e8e4] rounded-2xl p-8">
            <p className="text-[11px] font-semibold tracking-[2px] uppercase text-[#999] mb-5">Integrations</p>
            <div className="grid grid-cols-4 gap-2">
              {integrations.map((int) => (
                <div key={int.name} className="bg-white border border-[#e8e8e4] rounded-xl p-3 flex flex-col items-center gap-1.5 text-[11px] font-medium text-[#666] hover:border-[#111] hover:text-[#111] transition-colors cursor-default">
                  <span className="text-[20px]">{int.icon}</span>
                  {int.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Chat Demo */}
      <section className="bg-[#fafaf8] px-6 py-20 border-t border-[#e8e8e4]">
        <div className="max-w-[800px] mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold tracking-[3px] uppercase text-[#999] mb-3">See it in action</p>
            <h2
              className="font-medium tracking-tight text-[#111]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(30px, 4vw, 44px)' }}
            >
              Watch Brilion work.
            </h2>
          </div>
          <div className="bg-white border border-[#e8e8e4] rounded-2xl overflow-hidden" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>
            <div className="bg-[#f5f5f0] border-b border-[#e8e8e4] px-5 py-3.5 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840] block" />
              </div>
              <span className="text-[13px] font-semibold text-[#666] mx-auto">Brilion — WhatsApp Chat</span>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {chatDemo.map((msg, i) => (
                <div key={i} className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0 ${msg.role === 'user' ? 'bg-[#111] text-white' : 'bg-[#f0ede8] text-[#111]'}`}>
                    {msg.role === 'user' ? 'A' : 'B'}
                  </div>
                  <div className={`px-4 py-3 text-[14px] leading-[1.55] whitespace-pre-line rounded-[14px] ${msg.role === 'user' ? 'bg-[#111] text-white rounded-br-[4px]' : 'bg-[#f5f5f0] text-[#111] rounded-bl-[4px]'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#111] px-6 py-20 text-center">
        <div className="max-w-[700px] mx-auto">
          <h2
            className="font-medium tracking-tight text-white leading-[1.1] mb-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(32px, 5vw, 56px)' }}
          >
            Build the future<br />of your work with Brilion.
          </h2>
          <p className="text-[16px] text-white/60 mb-9">Join the waitlist. Be first when we open access.</p>
          <div className="flex gap-2.5 max-w-[420px] mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-4 py-3.5 rounded-full text-white text-[14px] outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
            />
            <button className="px-7 py-3.5 bg-white text-[#111] text-[14px] font-bold rounded-full hover:opacity-90 transition-opacity whitespace-nowrap">
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111] px-6 pt-12 pb-8" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-[1140px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 pb-10 mb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="col-span-2 md:col-span-1">
              <span className="text-[20px] font-bold text-white block mb-3">brilion</span>
              <p className="text-[13px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.4)' }}>AI orchestration platform. One message to automate everything.</p>
            </div>
            {[
              { title: 'PRODUCT', links: ['Platform', 'Integrations', 'Pricing', 'Changelog'] },
              { title: 'COMPANY', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'SOCIALS', links: ['Twitter / X', 'LinkedIn', 'GitHub', 'Discord'] },
            ].map((col) => (
              <div key={col.title}>
                <h5 className="text-[11px] font-semibold tracking-[2px] uppercase mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>{col.title}</h5>
                {col.links.map((link) => (
                  <a key={link} href="#" className="block text-[13px] mb-2.5 transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}>{link}</a>
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Copyright Brilion 2026. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="text-[12px] transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>Privacy Policy</a>
              <a href="#" className="text-[12px] transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
