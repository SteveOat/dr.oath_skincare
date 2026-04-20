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
  const sessionId = getSessionId()
  
  if (!sessionId) return
  
  try {
    await supabase.from("analytics_page_views").insert({
      session_id: sessionId,
      page_path: pagePath || window.location.pathname,
      page_title: pageTitle || document.title,
      referrer: document.referrer || null,
    })
    
    // Increment session page views
    await supabase.rpc("increment_page_views", { sid: sessionId }).catch(() => {
      // RPC might not exist, ignore error
    })
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

// Track click events
export async function trackClick(
  elementType: "button" | "link" | "cta",
  elementText?: string,
  elementId?: string
) {
  const supabase = createClient()
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
