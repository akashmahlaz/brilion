import { Link } from '@tanstack/react-router'

const FOOTER_LINKS = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Integrations', href: '#integrations' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Changelog', href: '#' },
    { label: 'Roadmap', href: '#' },
  ],
  Solutions: [
    { label: 'Marketing Teams', href: '#' },
    { label: 'Developers', href: '#' },
    { label: 'Traders', href: '#' },
    { label: 'Agencies', href: '#' },
    { label: 'Freelancers', href: '#' },
  ],
  Resources: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Community', href: '#' },
    { label: 'Status', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
  ],
}

const SOCIAL_LINKS = [
  {
    label: 'X',
    href: '#',
    svg: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'LinkedIn',
    href: '#',
    svg: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    label: 'GitHub',
    href: '#',
    svg: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
  {
    label: 'YouTube',
    href: '#',
    svg: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
]

export function Footer() {
  return (
    <footer className="border-t border-gray-200/60 bg-[#F8F7F3]">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        {/* Main grid */}
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 space-y-5">
            <Link to="/" className="inline-block">
              <img src="/BRILION.svg" alt="Brilion" className="h-7" />
            </Link>
            <p className="text-[14px] text-gray-500 leading-relaxed max-w-xs">
              Your personal AI operating system. One conversation to automate
              everything — marketing, trading, code, and beyond.
            </p>

            {/* Social */}
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex size-8 items-center justify-center rounded-full border border-gray-200/60 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all duration-200"
                >
                  <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={social.svg} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <p className="text-[11px] font-bold text-gray-900 uppercase tracking-widest mb-4">
                {title}
              </p>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center gap-4 border-t border-gray-200/40 pt-8 sm:flex-row sm:justify-between">
          <p className="text-[12px] text-gray-400">
            &copy; {new Date().getFullYear()} Brilion Technologies Pvt. Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
