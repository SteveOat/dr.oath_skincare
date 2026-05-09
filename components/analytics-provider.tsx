"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { initSession, trackPageView, captureAdAttribution } from "@/lib/analytics"

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Initialize session + capture ad attribution on mount (once per session)
  useEffect(() => {
    initSession()
    captureAdAttribution()
  }, [])

  // Track page views on route change
  useEffect(() => {
    trackPageView(pathname)
  }, [pathname])

  return <>{children}</>
}
