import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from 'ai'
import { createClient } from '@/lib/supabase/server'

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
    conversionRate: 23.5
  },
  topProducts: [
    { name: "Radiance Serum", views: 1245, purchases: 62, revenue: 5518 },
    { name: "Hydra Glow Moisturizer", views: 987, purchases: 52, revenue: 3484 },
    { name: "Gentle Foam Cleanser", views: 814, purchases: 41, revenue: 1845 },
    { name: "Renewal Night Oil", views: 756, purchases: 36, revenue: 3420 },
    { name: "Purifying Clay Mask", views: 632, purchases: 28, revenue: 1456 }
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
    lowStockItems: ["Hydra Glow Moisturizer (8 units)", "Purifying Clay Mask (5 units)", "Detox Charcoal Mask (3 units)"]
  },
  competitors: [
    { name: "GlowNaturals", avgPrice: 72.50, priceChange: -5.2, marketShare: 18, threat: "medium", activity: "Launched new vitamin C serum at $65" },
    { name: "PureSkin Co.", avgPrice: 85.00, priceChange: 2.1, marketShare: 22, threat: "high", activity: "Running 20% off promotion on moisturizers" },
    { name: "Botanica Beauty", avgPrice: 68.25, priceChange: 0, marketShare: 12, threat: "low", activity: "No significant changes" },
    { name: "Derma Essentials", avgPrice: 92.00, priceChange: 8.5, marketShare: 28, threat: "high", activity: "Added 5 new anti-aging products" },
    { name: "NatureGlow Labs", avgPrice: 55.75, priceChange: -12.3, marketShare: 8, threat: "medium", activity: "Aggressive price cuts across all serums" }
  ],
  recentTrends: {
    pageViewsChange: "+8% this week",
    revenueChange: "+18% this month",
    topGrowingCategory: "serums",
    customerRetention: "42%",
  }
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()
  
  // Fetch real data from Supabase
  const supabase = await createClient()
  
  // Fetch all analytics data in parallel
  const [
    sessionsResult,
    pageViewsResult,
    productViewsResult,
    cartEventsResult,
    purchasesResult,
    inventoryResult,
    competitorsResult
  ] = await Promise.all([
    supabase.from('analytics_sessions').select('*'),
    supabase.from('analytics_page_views').select('*'),
    supabase.from('analytics_product_views').select('*'),
    supabase.from('analytics_cart_events').select('*'),
    supabase.from('analytics_purchases').select('*'),
    supabase.from('products_inventory').select('*'),
    supabase.from('competitors').select('*')
  ])

  // Extract data
  const sessions = sessionsResult.data || []
  const pageViews = pageViewsResult.data || []
  const productViews = productViewsResult.data || []
  const cartEvents = cartEventsResult.data || []
  const purchases = purchasesResult.data || []
  const inventory = inventoryResult.data || []
  const competitors = competitorsResult.data || []

  // Calculate metrics
  const totalSessions = sessions.length
  const totalPageViews = pageViews.length
  const totalProductViews = productViews.length
  const totalCartAdds = cartEvents.filter(e => e.event_type === 'add_to_cart').length
  const totalPurchases = purchases.length
  const totalRevenue = purchases.reduce((sum, p) => sum + (parseFloat(p.order_total) || 0), 0)

  // Top products by views
  const productViewCounts: Record<string, { name: string; views: number }> = {}
  productViews.forEach(pv => {
    if (!productViewCounts[pv.product_id]) {
      productViewCounts[pv.product_id] = { name: pv.product_name, views: 0 }
    }
    productViewCounts[pv.product_id].views++
  })
  const topProducts = Object.values(productViewCounts)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)

  // Inventory summary
  const totalStock = inventory.reduce((sum, p) => sum + (p.stock_quantity || 0), 0)
  const lowStockItems = inventory.filter(p => p.stock_quantity <= (p.low_stock_threshold || 10))

  // Category performance from inventory
  const categoryMap: Record<string, { revenue: number; products: number; totalPrice: number }> = {}
  inventory.forEach(p => {
    const cat = p.product_category || 'uncategorized'
    if (!categoryMap[cat]) {
      categoryMap[cat] = { revenue: 0, products: 0, totalPrice: 0 }
    }
    categoryMap[cat].products++
    categoryMap[cat].totalPrice += parseFloat(p.product_price) || 0
  })
  const categoryPerformance = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    revenue: data.revenue,
    products: data.products,
    avgPrice: Math.round(data.totalPrice / data.products)
  }))

  // Check if we have real data or should use mock
  const hasRealData = totalSessions > 0 || totalPageViews > 0 || inventory.length > 0

  // Build dashboard data - merge real with mock fallbacks
  const dashboardData = {
    overview: {
      totalSessions: totalSessions || MOCK_DATA.overview.totalSessions,
      totalPageViews: totalPageViews || MOCK_DATA.overview.totalPageViews,
      totalProductViews: totalProductViews || MOCK_DATA.overview.totalProductViews,
      totalCartAdds: totalCartAdds || MOCK_DATA.overview.totalCartAdds,
      totalPurchases: totalPurchases || MOCK_DATA.overview.totalPurchases,
      totalRevenue: totalRevenue || MOCK_DATA.overview.totalRevenue,
      conversionRate: totalCartAdds > 0 
        ? ((totalPurchases / totalCartAdds) * 100).toFixed(1) 
        : MOCK_DATA.overview.conversionRate
    },
    topProducts: topProducts.length > 0 ? topProducts : MOCK_DATA.topProducts,
    categoryPerformance: categoryPerformance.length > 0 ? categoryPerformance : MOCK_DATA.categoryPerformance,
    inventory: {
      totalProducts: inventory.length || MOCK_DATA.inventory.totalProducts,
      totalStock: totalStock || MOCK_DATA.inventory.totalStock,
      lowStockCount: lowStockItems.length || MOCK_DATA.inventory.lowStockCount,
      lowStockItems: lowStockItems.length > 0 
        ? lowStockItems.map(p => `${p.product_name} (${p.stock_quantity} units)`)
        : MOCK_DATA.inventory.lowStockItems
    },
    competitors: competitors.length > 0 
      ? competitors.map(c => ({
          name: c.name,
          avgPrice: c.avg_price,
          priceChange: c.price_change_7d,
          marketShare: c.market_share,
          threat: c.threat_level,
          activity: c.recent_activity
        }))
      : MOCK_DATA.competitors,
    recentTrends: MOCK_DATA.recentTrends
  }

  const dataSource = hasRealData ? "Live from Supabase Database" : "Demo Data (No live data yet)"

  const SYSTEM_PROMPT = `You are an AI analytics assistant for Dr.Oat SkinCare's e-commerce dashboard. You have access to real-time business data from Supabase and can help analyze performance, identify trends, and provide actionable insights.

## Data Source: ${dataSource}

### Overview Metrics
- Total Sessions: ${dashboardData.overview.totalSessions.toLocaleString()}
- Total Page Views: ${dashboardData.overview.totalPageViews.toLocaleString()}
- Total Product Views: ${dashboardData.overview.totalProductViews.toLocaleString()}
- Total Cart Adds: ${dashboardData.overview.totalCartAdds.toLocaleString()}
- Total Purchases: ${dashboardData.overview.totalPurchases}
- Total Revenue: $${Number(dashboardData.overview.totalRevenue).toLocaleString()}
- Cart-to-Purchase Conversion Rate: ${dashboardData.overview.conversionRate}%

### Top Products
${dashboardData.topProducts.map((p, i) => `${i + 1}. ${p.name} - ${p.views} views`).join('\n')}

### Category Performance
${dashboardData.categoryPerformance.map(c => `- ${c.category}: ${c.products} products, avg price $${c.avgPrice}`).join('\n')}

### Inventory Status
- Total Products: ${dashboardData.inventory.totalProducts}
- Total Stock: ${dashboardData.inventory.totalStock} units
- Low Stock Alerts: ${dashboardData.inventory.lowStockCount} items
- Products needing restock: ${dashboardData.inventory.lowStockItems.join(', ')}

### Competitor Intelligence
${dashboardData.competitors.map(c => `- ${c.name}: $${c.avgPrice} avg price, ${c.priceChange > 0 ? '+' : ''}${c.priceChange}% price change (7d), ${c.marketShare}% market share, ${c.threat} threat level
  Latest: ${c.activity}`).join('\n')}

### Recent Trends
- Page Views: ${dashboardData.recentTrends.pageViewsChange}
- Revenue: ${dashboardData.recentTrends.revenueChange}
- Top Growing Category: ${dashboardData.recentTrends.topGrowingCategory}
- Customer Retention: ${dashboardData.recentTrends.customerRetention}

## Your Capabilities:
1. Answer questions about sales, revenue, products, and inventory
2. Provide insights on competitor positioning and market trends
3. Suggest actionable recommendations for improving performance
4. Identify opportunities and potential risks
5. Calculate metrics and comparisons when asked
6. Explain data patterns and anomalies

Be concise, data-driven, and actionable in your responses. Use specific numbers from the data. Format responses with clear structure using bullet points or numbered lists when appropriate.`

  const result = streamText({
    model: 'openai/gpt-4o-mini',
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
