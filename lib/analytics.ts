"use client"

import { createClient } from "@/lib/supabase/client"

// Generate or retrieve session ID
function getSessionId(): string {
  if (typeof window === "undefined") return ""
  
  let sessionId = sessionStorage.getItem("analytics_session_id")
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem("analytics_session_id", sessionId)
  }
  return sessionId
}

// Get device info
function getDeviceInfo() {
  if (typeof window === "undefined") return {}
  
  const ua = navigator.userAgent
  const isMobile = /Mobile|Android|iPhone|iPad/.test(ua)
  const isTablet = /iPad|Android(?!.*Mobile)/.test(ua)
  
  let browser = "Unknown"
  if (ua.includes("Chrome")) browser = "Chrome"
  else if (ua.includes("Firefox")) browser = "Firefox"
  else if (ua.includes("Safari")) browser = "Safari"
  else if (ua.includes("Edge")) browser = "Edge"
  
  let os = "Unknown"
  if (ua.includes("Windows")) os = "Windows"
  else if (ua.includes("Mac")) os = "macOS"
  else if (ua.includes("Linux")) os = "Linux"
  else if (ua.includes("Android")) os = "Android"
  else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS"
  
  return {
    deviceType: isTablet ? "tablet" : isMobile ? "mobile" : "desktop",
    browser,
    os,
    userAgent: ua,
  }
}

// Initialize or update session
export async function initSession() {
  const supabase = createClient()
  if (!supabase) return
  const sessionId = getSessionId()
  const deviceInfo = getDeviceInfo()
  
  if (!sessionId) return
  
  try {
    // Check if session exists
    const { data: existingSession } = await supabase
      .from("analytics_sessions")
      .select("id")
      .eq("session_id", sessionId)
      .single()
    
    if (existingSession) {
      // Update last seen
      await supabase
        .from("analytics_sessions")
        .update({ 
          last_seen_at: new Date().toISOString(),
          page_views: existingSession.id ? undefined : 1 // increment handled separately
        })
        .eq("session_id", sessionId)
    } else {
      // Create new session
      await supabase.from("analytics_sessions").insert({
        session_id: sessionId,
        user_agent: deviceInfo.userAgent,
        referrer: document.referrer || null,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
      })
    }
  } catch (error) {
    console.error("[Analytics] Failed to init session:", error)
  }
}

// Track page view
export async function trackPageView(pagePath?: string, pageTitle?: string) {
  const supabase = createClient()
  if (!supabase) return
  const sessionId = getSessionId()
  
  if (!sessionId) return
  
  try {
    await supabase.from("analytics_page_views").insert({
      session_id: sessionId,
      page_path: pagePath || window.location.pathname,
      page_title: pageTitle || document.title,
      referrer: document.referrer || null,
    })
    
    // Increment session page views; this RPC is optional in some deployments.
    await supabase.rpc("increment_page_views", { sid: sessionId })
  } catch (error) {
    console.error("[Analytics] Failed to track page view:", error)
  }
}

// Track product view
export async function trackProductView(product: {
  id: string
  name: string
  price: number
  category?: string
}) {
  const supabase = createClient()
  if (!supabase) return
  const sessionId = getSessionId()
  
  if (!sessionId) return
  
  try {
    await supabase.from("analytics_product_views").insert({
      session_id: sessionId,
      product_id: product.id,
      product_name: product.name,
      product_price: product.price,
      product_category: product.category || null,
      source_page: window.location.pathname,
    })
  } catch (error) {
    console.error("[Analytics] Failed to track product view:", error)
  }
}

// Track cart events
export async function trackCartEvent(
  eventType: "add" | "remove" | "update_quantity",
  product: {
    id: string
    name: string
    price: number
  },
  quantity: number,
  cartTotal: number
) {
  const supabase = createClient()
  if (!supabase) return
  const sessionId = getSessionId()
  
  if (!sessionId) return
  
  try {
    await supabase.from("analytics_cart_events").insert({
      session_id: sessionId,
      event_type: eventType,
      product_id: product.id,
      product_name: product.name,
      product_price: product.price,
      quantity,
      cart_total: cartTotal,
    })
  } catch (error) {
    console.error("[Analytics] Failed to track cart event:", error)
  }
}

// Track purchase
export async function trackPurchase(
  orderTotal: number,
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
) {
  const supabase = createClient()
  if (!supabase) return
  const sessionId = getSessionId()
  
  if (!sessionId) return
  
  try {
    await supabase.from("analytics_purchases").insert({
      session_id: sessionId,
      order_total: orderTotal,
      item_count: items.reduce((sum, item) => sum + item.quantity, 0),
      items: items,
    })
  } catch (error) {
    console.error("[Analytics] Failed to track purchase:", error)
  }
}

// Classify ad platform from UTM source / referrer / click ID
function classifyAdPlatform(opts: {
  utmSource?: string | null
  referrer?: string | null
  clickIdType?: string | null
}): string {
  const src = (opts.utmSource || "").toLowerCase()
  const ref = (opts.referrer || "").toLowerCase()
  const cid = (opts.clickIdType || "").toLowerCase()

  // Click ID is the most reliable signal
  if (cid === "fbclid") return "facebook"
  if (cid === "gclid" || cid === "gbraid" || cid === "wbraid") return "google"
  if (cid === "ttclid") return "tiktok"
  if (cid === "msclkid") return "bing"
  if (cid === "li_fat_id") return "linkedin"
  if (cid === "twclid") return "twitter"

  const haystack = `${src} ${ref}`
  if (/(facebook|fb\.com|fb-ads|meta)/.test(haystack)) return "facebook"
  if (/(instagram|ig-ads|ig\.com)/.test(haystack)) return "instagram"
  if (/(google|adwords|googleads|doubleclick)/.test(haystack)) return "google"
  if (/(youtube|yt-ads)/.test(haystack)) return "youtube"
  if (/(tiktok|tt-ads|bytedance)/.test(haystack)) return "tiktok"
  if (/(line|line\.me)/.test(haystack)) return "line"
  if (/(twitter|x\.com|x-ads)/.test(haystack)) return "twitter"
  if (/(linkedin)/.test(haystack)) return "linkedin"
  if (/(bing|microsoft)/.test(haystack)) return "bing"
  if (/(reddit)/.test(haystack)) return "reddit"
  if (/(pinterest)/.test(haystack)) return "pinterest"
  if (/(snapchat)/.test(haystack)) return "snapchat"

  if (src) return "other"
  if (!ref) return "direct"
  return "organic"
}

// Capture ad attribution from URL params on first landing per session
export async function captureAdAttribution() {
  if (typeof window === "undefined") return

  const sessionId = getSessionId()
  if (!sessionId) return

  // Only capture once per session
  const captured = sessionStorage.getItem("analytics_ad_captured")
  if (captured) return

  const params = new URLSearchParams(window.location.search)
  const utm_source = params.get("utm_source")
  const utm_medium = params.get("utm_medium")
  const utm_campaign = params.get("utm_campaign")
  const utm_content = params.get("utm_content")
  const utm_term = params.get("utm_term")

  // Detect ad click IDs
  let click_id: string | null = null
  let click_id_type: string | null = null
  for (const t of ["fbclid", "gclid", "gbraid", "wbraid", "ttclid", "msclkid", "li_fat_id", "twclid"]) {
    const v = params.get(t)
    if (v) {
      click_id = v
      click_id_type = t
      break
    }
  }

  const referrer = document.referrer || null
  const platform = classifyAdPlatform({ utmSource: utm_source, referrer, clickIdType: click_id_type })

  // Skip if there's nothing meaningful to track and it's not a clear paid platform
  // (we still log direct/organic to give the dashboard a complete picture)
  sessionStorage.setItem("analytics_ad_captured", "1")

  const supabase = createClient()
  if (!supabase) return
  try {
    await supabase.from("analytics_ad_clicks").insert({
      session_id: sessionId,
      platform,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      click_id,
      click_id_type,
      landing_path: window.location.pathname,
      referrer,
      query_string: window.location.search || null,
    })
  } catch (error) {
    console.error("[Analytics] Failed to capture ad attribution:", error)
  }
}

// Track click events
export async function trackClick(
  elementType: "button" | "link" | "cta",
  elementText?: string,
  elementId?: string
) {
  const supabase = createClient()
  if (!supabase) return
  const sessionId = getSessionId()
  
  if (!sessionId) return
  
  try {
    await supabase.from("analytics_clicks").insert({
      session_id: sessionId,
      element_type: elementType,
      element_text: elementText || null,
      element_id: elementId || null,
      page_path: window.location.pathname,
    })
  } catch (error) {
    console.error("[Analytics] Failed to track click:", error)
  }
}
