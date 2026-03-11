import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

/**
 * Returns headers to forward during SSR (mainly cookies).
 * On the client, returns empty — the browser handles cookies.
 */
const getSsrHeaders = createIsomorphicFn()
  .server(() => {
    const cookie = getRequestHeaders().get('cookie') ?? ''
    return cookie ? { cookie } : {}
  })
  .client((): Record<string, string> => ({}))

/**
 * During SSR, Node.js fetch requires absolute URLs.
 * Resolve the base URL from the incoming request's Host header.
 */
const getBaseUrl = createIsomorphicFn()
  .server(() => {
    const host = getRequestHeaders().get('host') ?? 'localhost:3000'
    const proto = getRequestHeaders().get('x-forwarded-proto') ?? 'http'
    return `${proto}://${host}`
  })
  .client(() => '')

/**
 * Drop-in replacement for fetch() that handles SSR vs client automatically.
 * All API routes are same-origin now (TanStack Start serves everything).
 * - Forwards cookies during SSR
 * - Resolves relative URLs to absolute during SSR
 * - Always includes credentials
 */
export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const ssrHeaders = getSsrHeaders()
  const base = getBaseUrl()
  const url = path.startsWith('http') ? path : `${base}${path}`

  return fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      ...ssrHeaders,
      ...init?.headers,
    } as HeadersInit,
  })
}
