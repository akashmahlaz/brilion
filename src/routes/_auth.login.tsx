import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { signInWithEmail } from '#/lib/auth-client'

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [csrfToken, setCsrfToken] = useState('')

  useEffect(() => {
    fetch('/api/auth/csrf', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.csrfToken) setCsrfToken(data.csrfToken)
      })
      .catch(() => {})
  }, [])

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signInWithEmail(email, password, '/overview')
      if (result.error) {
        setError(result.error)
      } else {
        window.location.href = '/overview'
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-100"
    >
      {/* Glass card */}
      <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_60px_rgba(0,0,0,0.04)] p-8 sm:p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-heading text-[28px] sm:text-[32px] font-extrabold text-gray-900 tracking-tight"
          >
            Welcome back
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[14px] text-gray-500 mt-2"
          >
            Sign in to your AI operating system
          </motion.p>
        </div>

        {/* OAuth grid — 3 providers side by side */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="grid grid-cols-3 gap-2.5 mb-7"
        >
          <form action="/api/auth/signin/google" method="POST">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <input type="hidden" name="callbackUrl" value="/overview" />
            <button
              type="submit"
              disabled={!csrfToken}
              className="flex w-full items-center justify-center gap-2 h-11 rounded-xl border border-gray-200/80 bg-white text-[13px] font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
          </form>

          <form action="/api/auth/signin/github" method="POST">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <input type="hidden" name="callbackUrl" value="/overview" />
            <button
              type="submit"
              disabled={!csrfToken}
              className="flex w-full items-center justify-center gap-2 h-11 rounded-xl border border-gray-200/80 bg-white text-[13px] font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              GitHub
            </button>
          </form>

          <form action="/api/auth/signin/microsoft" method="POST">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <input type="hidden" name="callbackUrl" value="/overview" />
            <button
              type="submit"
              disabled={!csrfToken}
              className="flex w-full items-center justify-center gap-2 h-11 rounded-xl border border-gray-200/80 bg-white text-[13px] font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
            >
              <svg className="size-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              Microsoft
            </button>
          </form>
        </motion.div>

        {/* Divider */}
        <div className="relative flex items-center mb-7">
          <div className="flex-1 h-px bg-gray-200/80" />
          <span className="px-4 text-[11px] text-gray-400 uppercase tracking-widest font-medium">
            or
          </span>
          <div className="flex-1 h-px bg-gray-200/80" />
        </div>

        {/* Email/Password form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium text-gray-600">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-11 rounded-xl border-gray-200/80 bg-white/80 text-[14px] placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:border-gray-300"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[13px] font-medium text-gray-600">
                Password
              </Label>
              <button type="button" className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors">
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 rounded-xl border-gray-200/80 bg-white/80 text-[14px] pr-10 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:border-gray-300"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50/80 border border-red-200/60 px-3.5 py-2.5 text-[13px] text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full h-11 bg-gray-900 text-white text-[14px] font-semibold rounded-xl overflow-hidden transition-all duration-500 shadow-[inset_0_0_12px_rgba(255,255,255,0.15)] hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.3)] active:scale-[0.98] disabled:opacity-60"
          >
            <span className="absolute inset-0 bg-linear-to-r from-gray-900 via-blue-900 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </span>
          </button>
        </form>
      </div>

      {/* Sign up link — outside the card */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-center text-[13px] text-gray-500 mt-6"
      >
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-gray-900 hover:underline">
          Get started free
        </Link>
      </motion.p>
    </motion.div>
  )
}
