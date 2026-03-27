import { Link } from '@tanstack/react-router'
import { Navbar } from '#/components/landing/navbar'
import { Footer } from '#/components/landing/footer'

interface StaticPageProps {
  title: string
  description: string
  children?: React.ReactNode
}

export function StaticPage({ title, description, children }: StaticPageProps) {
  return (
    <div className="min-h-screen bg-[#F8F7F3]">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pb-20 pt-32 sm:pt-36">
        <div className="rounded-2xl border border-gray-200/80 bg-white/75 p-8 shadow-sm backdrop-blur-sm sm:p-10">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
            {description}
          </p>

          <div className="mt-8 space-y-6 text-[15px] leading-7 text-gray-700">
            {children}
          </div>

          <div className="mt-10 border-t border-gray-200/80 pt-6">
            <Link
              to="/signup"
              className="inline-flex items-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Start with Brilion
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
