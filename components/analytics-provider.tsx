"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { initSession, trackPageView } from "@/lib/analytics"

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Initialize session on mount
  useEffect(() => {
    initSession()
  }, [])

  // Track page views on route change
  useEffect(() => {
    trackPageView(pathname)
  }, [pathname])

  return <>{children}</>
}
