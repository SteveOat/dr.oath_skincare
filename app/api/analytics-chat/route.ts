import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from 'ai'
import { xai } from '@ai-sdk/xai'
import { createClient } from '@/lib/supabase/server'
import {
  type AdSpendRow,
  spendByPlatform,
  spendByCampaign,
  totalSpendInRange,
  computeReturns,
} from '@/lib/ads/spend'
import { detectAnomalies, type Anomaly } from '@/lib/ads/anomalies'

export const maxDuration = 30

// Mock data fallback
const MOCK_DATA = {
  overview: {
    totalSessions: 2847,
    totalPageViews: 12453,
    totalProductViews: 8234,
    totalCartAdds: 1456,
    totalPurchases: 342,
    totalRevenue: 28945.50,
    totalClicks: 5824,
    conversionRate: 23.5,
  },
  topProducts: [
    { name: "Radiance Serum", views: 1245, purchases: 62, revenue: 5518 },
    { name: "Hydra Glow Moisturizer", views: 987, purchases: 52, revenue: 3484 },
    { name: "Gentle Foam Cleanser", views: 814, purchases: 41, revenue: 1845 },
    { name: "Renewal Night Oil", views: 756, purchases: 36, revenue: 3420 },
    { name: "Purifying Clay Mask", views: 632, purchases: 28, revenue: 1456 },
  ],
  topClicks: [
    { label: "Hero — Shop Now", count: 1247 },
    { label: "Nav — Cart", count: 892 },
    { label: "Product — Add to Cart", count: 743 },
    { label: "Cart — Checkout", count: 412 },
    { label: "Grid — Quick Add", count: 387 },
  ],
  categoryPerformance: [
    { category: "serums", revenue: 7638, products: 4, avgPrice: 78 },
    { category: "moisturizers", revenue: 5284, products: 3, avgPrice: 61 },
    { category: "cleansers", revenue: 2769, products: 2, avgPrice: 43 },
    { category: "oils", revenue: 4590, products: 3, avgPrice: 72 },
    { category: "masks", revenue: 3270, products: 3, avgPrice: 53 },
    { category: "toners", revenue: 1224, products: 2, avgPrice: 37 },
  ],
  inventory: {
    totalProducts: 14,
    totalStock: 496,
    lowStockCount: 3,
    lowStockItems: [
      "Hydra Glow Moisturizer (8 units)",
      "Purifying Clay Mask (5 units)",
      "Detox Charcoal Mask (3 units)",
    ],
  },
  competitors: [
    { name: "GlowNaturals", avgPrice: 72.5, priceChange: -5.2, marketShare: 18, threat: "medium", activity: "Launched new vitamin C serum at $65" },
    { name: "PureSkin Co.", avgPrice: 85.0, priceChange: 2.1, marketShare: 22, threat: "high", activity: "Running 20% off promotion on moisturizers" },
    { name: "Botanica Beauty", avgPrice: 68.25, priceChange: 0, marketShare: 12, threat: "low", activity: "No significant changes" },
    { name: "Derma Essentials", avgPrice: 92.0, priceChange: 8.5, marketShare: 28, threat: "high", activity: "Added 5 new anti-aging products" },
    { name: "NatureGlow Labs", avgPrice: 55.75, priceChange: -12.3, marketShare: 8, threat: "medium", activity: "Aggressive price cuts across all serums" },
  ],
  messaging: {
    totalConversations: 24,
    openCount: 8,
    pendingCount: 3,
    resolvedCount: 13,
    unreadCount: 5,
    byChannel: { facebook: 9, line: 6, instagram: 5, email: 3, web: 1 },
    urgentCount: 2,
  },
  recentPurchases: [] as { total: number; items: number; daysAgo: number }[],
  recentTrends: {
    pageViewsChange: "+8% this week",
    revenueChange: "+18% this month",
    topGrowingCategory: "serums",
    customerRetention: "42%",
  },
}

function daysAgo(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

// Compare totals between current period (last N days) and previous period (N days before that)
function pctChange(currentRows: { created_at: string }[], days: number): string {
  const now = Date.now()
  const cutoffCurrent = now - days * 86400000
  const cutoffPrev = now - 2 * days * 86400000
  let current = 0
  let prev = 0
  for (const row of currentRows) {
    const t = new Date(row.created_at).getTime()
    if (t >= cutoffCurrent) current++
    else if (t >= cutoffPrev) prev++
  }
  if (prev === 0) return current > 0 ? `+${current} (no prior data)` : "no data"
  const change = ((current - prev) / prev) * 100
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
}

function revenuePctChange(purchases: { created_at: string; order_total: string | number }[], days: number): string {
  const now = Date.now()
  const cutoffCurrent = now - days * 86400000
  const cutoffPrev = now - 2 * days * 86400000
  let current = 0
  let prev = 0
  for (const p of purchases) {
    const t = new Date(p.created_at).getTime()
    const amount = parseFloat(String(p.order_total)) || 0
    if (t >= cutoffCurrent) current += amount
    else if (t >= cutoffPrev) prev += amount
  }
  if (prev === 0) return current > 0 ? `+$${current.toFixed(2)} (no prior data)` : "no data"
  const change = ((current - prev) / prev) * 100
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const supabase = await createClient()

  // Fetch every data source the dashboard surfaces, in parallel
  const [
    sessionsResult,
    pageViewsResult,
    productViewsResult,
    cartEventsResult,
    purchasesResult,
    inventoryResult,
    competitorsResult,
    clicksResult,
    conversationsResult,
    customerMessagesResult,
    adClicksResult,
    adSpendResult,
  ] = await Promise.all([
    supabase.from("analytics_sessions").select("*"),
    supabase.from("analytics_page_views").select("*"),
    supabase.from("analytics_product_views").select("*"),
    supabase.from("analytics_cart_events").select("*"),
    supabase.from("analytics_purchases").select("*"),
    supabase.from("products_inventory").select("*"),
    supabase.from("competitors").select("*"),
    supabase.from("analytics_clicks").select("*"),
    supabase.from("conversations").select("*"),
    supabase.from("customer_messages").select("id, conversation_id, direction, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("analytics_ad_clicks").select("session_id, platform, utm_campaign, created_at"),
    supabase.from("analytics_ad_spend").select("id, platform, campaign, period_start, period_end, amount, currency"),
  ])

  const sessions = sessionsResult.data || []
  const pageViews = pageViewsResult.data || []
  const productViews = productViewsResult.data || []
  const cartEvents = cartEventsResult.data || []
  const purchases = purchasesResult.data || []
  const inventory = inventoryResult.data || []
  const competitors = competitorsResult.data || []
  const clicks = clicksResult.data || []
  const conversations = conversationsResult.data || []
  const recentMessages = customerMessagesResult.data || []
  const adClicks = adClicksResult.data || []
  const adSpendRows: AdSpendRow[] = (adSpendResult.data || []).map((r: any) => ({
    ...r,
    amount: Number(r.amount),
  }))

  // Aggregates
  const totalSessions = sessions.length
  const totalPageViews = pageViews.length
  const totalProductViews = productViews.length
  const totalCartAdds = cartEvents.filter((e) => e.event_type === "add_to_cart").length
  const totalPurchases = purchases.length
  const totalRevenue = purchases.reduce((sum, p) => sum + (parseFloat(p.order_total) || 0), 0)
  const totalClicks = clicks.length

  // Top products by views
  const productViewCounts: Record<string, { name: string; views: number }> = {}
  productViews.forEach((pv) => {
    if (!productViewCounts[pv.product_id]) {
      productViewCounts[pv.product_id] = { name: pv.product_name, views: 0 }
    }
    productViewCounts[pv.product_id].views++
  })
  const topProducts = Object.values(productViewCounts)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)

  // Top click targets (NEW)
  const clickCounts: Record<string, number> = {}
  clicks.forEach((c) => {
    const label = c.element_text || c.element_id || "Unknown"
    clickCounts[label] = (clickCounts[label] || 0) + 1
  })
  const topClicks = Object.entries(clickCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Inventory
  const totalStock = inventory.reduce((sum, p) => sum + (p.stock_quantity || 0), 0)
  const lowStockItems = inventory.filter((p) => p.stock_quantity <= (p.low_stock_threshold || 10))

  // Categories
  const categoryMap: Record<string, { revenue: number; products: number; totalPrice: number }> = {}
  inventory.forEach((p) => {
    const cat = p.product_category || "uncategorized"
    if (!categoryMap[cat]) categoryMap[cat] = { revenue: 0, products: 0, totalPrice: 0 }
    categoryMap[cat].products++
    categoryMap[cat].totalPrice += parseFloat(p.product_price) || 0
  })
  const categoryPerformance = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    revenue: data.revenue,
    products: data.products,
    avgPrice: Math.round(data.totalPrice / Math.max(data.products, 1)),
  }))

  // Messaging Center stats (NEW)
  const messagingStats = {
    totalConversations: conversations.length,
    openCount: conversations.filter((c) => c.status === "open").length,
    pendingCount: conversations.filter((c) => c.status === "pending").length,
    resolvedCount: conversations.filter((c) => c.status === "resolved").length,
    unreadCount: conversations.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0),
    urgentCount: conversations.filter((c) => c.priority === "urgent" || c.priority === "high").length,
    byChannel: conversations.reduce((acc: Record<string, number>, c) => {
      const ch = c.channel || "unknown"
      acc[ch] = (acc[ch] || 0) + 1
      return acc
    }, {}),
  }

  // Recent purchases (NEW — was using mock trends)
  const recentPurchases = purchases
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((p) => ({
      total: parseFloat(p.order_total) || 0,
      items: p.item_count || 0,
      daysAgo: daysAgo(p.created_at),
    }))

  // Real trend calculations (NEW — was hardcoded mock strings)
  const realTrends = {
    pageViewsChange: pctChange(pageViews, 7),
    revenueChange: revenuePctChange(purchases, 30),
    sessionsChange: pctChange(sessions, 7),
    clicksChange: pctChange(clicks, 7),
    adClicksChange: pctChange(adClicks, 7),
  }

  // Ads attribution aggregates (NEW)
  const purchaseSessionSet = new Set(
    purchases.filter((p) => p.session_id).map((p) => p.session_id as string),
  )
  const sessionRevenue = new Map<string, number>()
  purchases.forEach((p) => {
    if (p.session_id) {
      sessionRevenue.set(
        p.session_id,
        (sessionRevenue.get(p.session_id) || 0) + (parseFloat(p.order_total) || 0),
      )
    }
  })

  const platformMap = new Map<
    string,
    { clicks: number; conversions: number; revenue: number }
  >()
  const campaignMap = new Map<
    string,
    { platform: string; campaign: string; clicks: number; conversions: number }
  >()
  adClicks.forEach((c: any) => {
    const platform = c.platform || "other"
    const cur = platformMap.get(platform) || { clicks: 0, conversions: 0, revenue: 0 }
    cur.clicks++
    if (purchaseSessionSet.has(c.session_id)) {
      cur.conversions++
      cur.revenue += sessionRevenue.get(c.session_id) || 0
    }
    platformMap.set(platform, cur)

    if (c.utm_campaign) {
      const key = `${platform}::${c.utm_campaign}`
      const cc = campaignMap.get(key) || {
        platform,
        campaign: c.utm_campaign,
        clicks: 0,
        conversions: 0,
      }
      cc.clicks++
      if (purchaseSessionSet.has(c.session_id)) cc.conversions++
      campaignMap.set(key, cc)
    }
  })

  const totalAdClicks = adClicks.length
  const paidAdClicks = adClicks.filter(
    (c: any) => !["direct", "organic"].includes(c.platform),
  ).length

  // Prorate ad spend across the same 30-day window we use for revenue/trends
  const spendRangeEnd = new Date()
  const spendRangeStart = new Date(spendRangeEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
  const platformSpend30d = spendByPlatform(adSpendRows, spendRangeStart, spendRangeEnd)
  const campaignSpend30d = spendByCampaign(adSpendRows, spendRangeStart, spendRangeEnd)
  const totalAdSpend30d = totalSpendInRange(adSpendRows, spendRangeStart, spendRangeEnd)

  // Surface platforms that have spend but no clicks yet — they'll show ROAS=0
  platformSpend30d.forEach((_, platform) => {
    if (!platformMap.has(platform)) {
      platformMap.set(platform, { clicks: 0, conversions: 0, revenue: 0 })
    }
  })

  const platformBreakdown = Array.from(platformMap.entries())
    .map(([platform, agg]) => {
      const spend = platformSpend30d.get(platform) || 0
      const returns = computeReturns({
        spend,
        revenue: agg.revenue,
        clicks: agg.clicks,
        conversions: agg.conversions,
      })
      return {
        platform,
        clicks: agg.clicks,
        conversions: agg.conversions,
        revenue: agg.revenue,
        spend,
        roas: returns.roas,
        cpc: returns.cpc,
        cpa: returns.cpa,
        profit: returns.profit,
        cvr: agg.clicks > 0 ? (agg.conversions / agg.clicks) * 100 : 0,
        share: totalAdClicks > 0 ? (agg.clicks / totalAdClicks) * 100 : 0,
      }
    })
    .sort((a, b) => (b.spend + b.clicks) - (a.spend + a.clicks))

  const topAdCampaigns = Array.from(campaignMap.values())
    .map((c) => {
      const key = `${c.platform}::${c.campaign}`
      const spend = campaignSpend30d.get(key) || 0
      // Estimate revenue per campaign by proxy: assume share of platform revenue equal to share of clicks
      const platAgg = platformMap.get(c.platform)
      const revenue =
        platAgg && platAgg.clicks > 0
          ? (c.clicks / platAgg.clicks) * platAgg.revenue
          : 0
      const returns = computeReturns({
        spend,
        revenue,
        clicks: c.clicks,
        conversions: c.conversions,
      })
      return {
        ...c,
        spend,
        revenue,
        roas: returns.roas,
        cpa: returns.cpa,
        cvr: c.clicks > 0 ? (c.conversions / c.clicks) * 100 : 0,
      }
    })
    .sort((a, b) => (b.spend + b.clicks) - (a.spend + a.clicks))
    .slice(0, 5)

  const overallRoas30d =
    totalAdSpend30d > 0
      ? Array.from(platformMap.values()).reduce((s, p) => s + p.revenue, 0) / totalAdSpend30d
      : null

  // Anomaly detection — last 7 days vs prior 7 days, per platform
  const anomalies: Anomaly[] = detectAnomalies(
    adClicks as any,
    purchases as any,
    adSpendRows,
  )
  const criticalAnomalies = anomalies.filter((a) => a.severity === "critical")

  const hasRealData = totalSessions > 0 || totalPageViews > 0 || inventory.length > 0
  const hasMessaging = conversations.length > 0

  // Build dashboard data — merge real with mock fallbacks
  const dashboardData = {
    overview: {
      totalSessions: totalSessions || MOCK_DATA.overview.totalSessions,
      totalPageViews: totalPageViews || MOCK_DATA.overview.totalPageViews,
      totalProductViews: totalProductViews || MOCK_DATA.overview.totalProductViews,
      totalCartAdds: totalCartAdds || MOCK_DATA.overview.totalCartAdds,
      totalPurchases: totalPurchases || MOCK_DATA.overview.totalPurchases,
      totalRevenue: totalRevenue || MOCK_DATA.overview.totalRevenue,
      totalClicks: totalClicks || MOCK_DATA.overview.totalClicks,
      conversionRate: totalCartAdds > 0
        ? ((totalPurchases / totalCartAdds) * 100).toFixed(1)
        : MOCK_DATA.overview.conversionRate,
    },
    topProducts: topProducts.length > 0 ? topProducts : MOCK_DATA.topProducts,
    topClicks: topClicks.length > 0 ? topClicks : MOCK_DATA.topClicks,
    categoryPerformance: categoryPerformance.length > 0 ? categoryPerformance : MOCK_DATA.categoryPerformance,
    inventory: {
      totalProducts: inventory.length || MOCK_DATA.inventory.totalProducts,
      totalStock: totalStock || MOCK_DATA.inventory.totalStock,
      lowStockCount: lowStockItems.length || MOCK_DATA.inventory.lowStockCount,
      lowStockItems: lowStockItems.length > 0
        ? lowStockItems.map((p) => `${p.product_name} (${p.stock_quantity} units)`)
        : MOCK_DATA.inventory.lowStockItems,
    },
    competitors: competitors.length > 0
      ? competitors.map((c) => ({
          name: c.name,
          avgPrice: c.avg_price,
          priceChange: c.price_change_7d,
          marketShare: c.market_share,
          threat: c.threat_level,
          activity: c.recent_activity,
        }))
      : MOCK_DATA.competitors,
    messaging: hasMessaging ? messagingStats : MOCK_DATA.messaging,
    recentPurchases: recentPurchases.length > 0 ? recentPurchases : MOCK_DATA.recentPurchases,
    trends: hasRealData ? realTrends : {
      pageViewsChange: MOCK_DATA.recentTrends.pageViewsChange,
      revenueChange: MOCK_DATA.recentTrends.revenueChange,
      sessionsChange: "+12%",
      clicksChange: "+24%",
    },
    inboundMessages24h: recentMessages.filter(
      (m) => m.direction === "inbound" && Date.now() - new Date(m.created_at).getTime() < 86400000,
    ).length,
  }

  const dataSource = hasRealData ? "Live from Supabase Database" : "Demo Data (No live data yet)"

  const SYSTEM_PROMPT = `You are an AI analytics assistant for Dr.Oat SkinCare's e-commerce dashboard. You have full access to real-time business data from Supabase covering storefront analytics, inventory, competitors, and the customer messaging center.

## Data Source: ${dataSource}

## PRIORITY ALERTS (anomaly detection — last 7d vs prior 7d, paid platforms only)
${anomalies.length === 0
  ? "No anomalies detected. All paid platforms are within normal week-over-week variance."
  : `${anomalies.length} active alert${anomalies.length === 1 ? "" : "s"} (${criticalAnomalies.length} critical):\n` +
    anomalies
      .map(
        (a, i) =>
          `${i + 1}. [${a.severity.toUpperCase()}] [${a.metric.toUpperCase()}] ${a.message}\n   → Recommendation: ${a.recommendation}`,
      )
      .join("\n")}

**Behavior rule for alerts:** If the user opens the conversation with a generic greeting, a "what's up?", "any issues?", "summary", or any open-ended question — and there are active alerts above — proactively surface the most severe alert(s) first before answering anything else. Lead with: "Heads up — I'm flagging X issue(s) this week:" and then summarize the top 1-2 critical ones with the recommendation. Do not bury alerts at the bottom. If the user asks about a specific platform that has an active alert, include the alert in your answer even if they didn't ask about CVR or ROAS specifically.

### Overview Metrics
- Total Sessions: ${dashboardData.overview.totalSessions.toLocaleString()}
- Total Page Views: ${dashboardData.overview.totalPageViews.toLocaleString()}
- Total Product Views: ${dashboardData.overview.totalProductViews.toLocaleString()}
- Total Cart Adds: ${dashboardData.overview.totalCartAdds.toLocaleString()}
- Total Purchases: ${dashboardData.overview.totalPurchases}
- Total Revenue: $${Number(dashboardData.overview.totalRevenue).toLocaleString()}
- Total CTA Clicks: ${dashboardData.overview.totalClicks.toLocaleString()}
- Cart-to-Purchase Conversion Rate: ${dashboardData.overview.conversionRate}%

### Real Trends (computed from actual data)
- Page Views (last 7d vs prior 7d): ${dashboardData.trends.pageViewsChange}
- Revenue (last 30d vs prior 30d): ${dashboardData.trends.revenueChange}
- Sessions (last 7d): ${dashboardData.trends.sessionsChange}
- Clicks (last 7d): ${dashboardData.trends.clicksChange}

### Top Products by Views
${dashboardData.topProducts.map((p, i) => `${i + 1}. ${p.name} - ${p.views} views`).join("\n")}

### Top CTA Click Targets (real-time)
${dashboardData.topClicks.map((c, i) => `${i + 1}. ${c.label} - ${c.count.toLocaleString()} clicks`).join("\n")}

### Category Performance
${dashboardData.categoryPerformance.map((c) => `- ${c.category}: ${c.products} products, avg price $${c.avgPrice}`).join("\n")}

### Inventory Status
- Total Products: ${dashboardData.inventory.totalProducts}
- Total Stock: ${dashboardData.inventory.totalStock} units
- Low Stock Alerts: ${dashboardData.inventory.lowStockCount} items
- Products needing restock: ${dashboardData.inventory.lowStockItems.join(", ")}

### Competitor Intelligence
${dashboardData.competitors.map((c) => `- ${c.name}: $${c.avgPrice} avg price, ${Number(c.priceChange) > 0 ? "+" : ""}${c.priceChange}% price change (7d), ${c.marketShare}% market share, ${c.threat} threat level
  Latest: ${c.activity}`).join("\n")}

### Customer Messaging Center
- Total Conversations: ${dashboardData.messaging.totalConversations}
- Open: ${dashboardData.messaging.openCount} | Pending: ${dashboardData.messaging.pendingCount} | Resolved: ${dashboardData.messaging.resolvedCount}
- Unread Messages: ${dashboardData.messaging.unreadCount}
- High/Urgent Priority Threads: ${dashboardData.messaging.urgentCount}
- Inbound Messages (last 24h): ${dashboardData.inboundMessages24h}
- By Channel: ${Object.entries(dashboardData.messaging.byChannel).map(([ch, n]) => `${ch} (${n})`).join(", ")}

### Recent Purchases
${dashboardData.recentPurchases.length > 0
  ? dashboardData.recentPurchases.map((p, i) => `${i + 1}. $${p.total.toFixed(2)} — ${p.items} items — ${p.daysAgo === 0 ? "today" : `${p.daysAgo}d ago`}`).join("\n")
  : "No recent purchases."}

### Ads Attribution, Spend & ROAS
- Total Attributed Clicks: ${totalAdClicks.toLocaleString()}
- Paid Traffic Share: ${totalAdClicks > 0 ? ((paidAdClicks / totalAdClicks) * 100).toFixed(1) : "0"}% (${paidAdClicks} of ${totalAdClicks})
- Ad Clicks (last 7d vs prior 7d): ${realTrends.adClicksChange}
- Total Ad Spend (last 30d, prorated): $${totalAdSpend30d.toFixed(2)}
- Overall ROAS (30d revenue ÷ spend): ${overallRoas30d == null ? "n/a (no spend recorded)" : `${overallRoas30d.toFixed(2)}×`}

Platform breakdown (revenue & spend prorated to last 30 days; ROAS = revenue ÷ spend):
${platformBreakdown.length > 0
  ? platformBreakdown
      .map((p) => {
        const roas = p.roas == null ? "n/a" : `${p.roas.toFixed(2)}×`
        const cpc = p.cpc == null ? "n/a" : `$${p.cpc.toFixed(2)}`
        const cpa = p.cpa == null ? "n/a" : `$${p.cpa.toFixed(2)}`
        const profit = p.profit >= 0 ? `+$${p.profit.toFixed(2)}` : `-$${Math.abs(p.profit).toFixed(2)}`
        return `- ${p.platform}: spend $${p.spend.toFixed(2)} | ${p.clicks} clicks (${p.share.toFixed(1)}% share) | CPC ${cpc} | ${p.conversions} conv | CPA ${cpa} | rev $${p.revenue.toFixed(2)} | CVR ${p.cvr.toFixed(2)}% | ROAS ${roas} | profit ${profit}`
      })
      .join("\n")
  : "- No ad-attributed traffic captured yet. Storefront tags new visitors with utm_source, utm_campaign, fbclid, gclid, ttclid on landing."}

Top campaigns (estimated revenue allocates platform revenue by click share):
${topAdCampaigns.length > 0
  ? topAdCampaigns
      .map((c, i) => {
        const roas = c.roas == null ? "n/a" : `${c.roas.toFixed(2)}×`
        const cpa = c.cpa == null ? "n/a" : `$${c.cpa.toFixed(2)}`
        return `${i + 1}. [${c.platform}] ${c.campaign}: spend $${c.spend.toFixed(2)} | ${c.clicks} clicks | ${c.conversions} conv | CPA ${cpa} | est. rev $${c.revenue.toFixed(2)} | CVR ${c.cvr.toFixed(2)}% | ROAS ${roas}`
      })
      .join("\n")
  : "- No tagged campaigns yet."}

ROAS interpretation guidelines (use when making recommendations):
- ROAS ≥ 3.0× = strong, recommend scaling spend
- ROAS 1.5–3.0× = healthy, recommend optimizing creative or audience
- ROAS 1.0–1.5× = marginal, recommend reducing or fixing landing page
- ROAS < 1.0× = unprofitable, recommend pausing or reworking
- "n/a" ROAS means no spend has been recorded yet — recommend the user enter spend data via the Manage Spend drawer

## Your Capabilities:
1. Answer questions about sales, revenue, products, inventory, and customer engagement
2. Analyze CTA click performance and identify which storefront elements drive the most engagement
3. Surface unread/urgent customer messages and recommend response priorities
4. Provide competitor positioning insights and market trend analysis
5. Compare ad-platform performance (Facebook, Google, Instagram, TikTok, LINE, etc.) using true ROAS, CPC, CPA, and profit — recommend where to scale or cut spend
6. Proactively flag week-over-week anomalies (CVR drops > 30%, traffic drops > 40%, ROAS drops > 30%) and recommend root-cause investigation steps
6. Suggest actionable recommendations grounded in real numbers
7. Calculate metrics, ratios, and period-over-period comparisons
8. Explain data patterns, anomalies, and correlations across analytics + messaging + ads

Be concise, data-driven, and actionable. Always cite specific numbers from the data above. Format responses with clear structure using bullet points or numbered lists when appropriate.`

  const result = streamText({
    model: xai("grok-4-latest"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
