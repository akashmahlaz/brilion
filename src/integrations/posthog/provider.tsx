import posthog from 'posthog-js'
import { PostHogProvider as BasePostHogProvider } from '@posthog/react'
import type { ReactNode } from 'react'

const POSTHOG_KEY = typeof window !== 'undefined' ? import.meta.env.VITE_POSTHOG_KEY : undefined

if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    defaults: '2025-11-30',
  })
}

interface PostHogProviderProps {
  children: ReactNode
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
  if (!POSTHOG_KEY) return <>{children}</>
  return <BasePostHogProvider client={posthog}>{children}</BasePostHogProvider>
}
