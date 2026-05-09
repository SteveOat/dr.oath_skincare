import { createBrowserClient } from "@supabase/ssr"

let warned = false

/**
 * Returns a Supabase browser client, or `null` when the public env vars are
 * not available in the browser bundle. Callers MUST handle the null case —
 * analytics and other non-critical features should silently skip rather than
 * crash the React tree.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    if (typeof window !== "undefined" && !warned) {
      warned = true
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in the browser bundle. Client features (analytics, realtime) will be disabled. Re-save the variables in the project's Vars panel and reload.",
      )
    }
    return null
  }

  return createBrowserClient(url, anon)
}
