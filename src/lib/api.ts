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
 * Drop-in replacement for fetch() that handles SSR vs client automatically.
 * All API routes are same-origin now (TanStack Start serves everything).
 * - Forwards cookies during SSR
 * - Always includes credentials
 */
export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const ssrHeaders = getSsrHeaders()

  return fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...ssrHeaders,
      ...init?.headers,
    },
  })
}
