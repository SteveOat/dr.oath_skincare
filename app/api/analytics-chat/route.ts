import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from 'ai'

export const maxDuration = 30

// Dashboard data context for the AI
const DASHBOARD_DATA = {
  overview: {
    totalSessions: 2847,
    totalPageViews: 12459,
    totalProductViews: 8234,
    totalCartAdds: 1456,
    totalPurchases: 342,
    totalRevenue: 28945.50,
    conversionRate: 23.5,
  },
  topProducts: [
    { name: "Radiance Serum", views: 1245, purchases: 62, revenue: 5518, category: "serums" },
    { name: "Hydra Glow Moisturizer", views: 987, purchases: 52, revenue: 3484, category: "moisturizers" },
    { name: "Gentle Foam Cleanser", views: 814, purchases: 41, revenue: 1845, category: "cleansers" },
    { name: "Renewal Night Oil", views: 756, purchases: 36, revenue: 3420, category: "oils" },
    { name: "Purifying Clay Mask", views: 632, purchases: 28, revenue: 1456, category: "masks" },
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
    totalStock: 496,
    lowStockItems: 3,
    lowStockProducts: ["Hydra Glow Moisturizer (8 units)", "Purifying Clay Mask (5 units)", "Detox Charcoal Mask (3 units)"],
  },
  competitors: [
    { name: "GlowNaturals", avgPrice: 72.50, marketShare: 18, threat: "medium", recentActivity: "Launched new vitamin C serum at $65" },
    { name: "PureSkin Co.", avgPrice: 85.00, marketShare: 22, threat: "high", recentActivity: "Running 20% off promotion on moisturizers" },
    { name: "Botanica Beauty", avgPrice: 68.25, marketShare: 12, threat: "low", recentActivity: "No significant changes" },
    { name: "Derma Essentials", avgPrice: 92.00, marketShare: 28, threat: "high", recentActivity: "Added 5 new anti-aging products" },
    { name: "NatureGlow Labs", avgPrice: 55.75, marketShare: 8, threat: "medium", recentActivity: "Aggressive price cuts across serums" },
  ],
  priceCompetitiveness: 68,
  recentTrends: {
    pageViewsChange: "+8% this week",
    revenueChange: "+18% this month",
    topGrowingCategory: "serums",
    customerRetention: "42%",
  }
}

const SYSTEM_PROMPT = `You are an AI analytics assistant for Dr.Oat SkinCare's e-commerce dashboard. You have access to real-time business data and can help analyze performance, identify trends, and provide actionable insights.

## Current Dashboard Data:

### Overview Metrics
- Total Sessions: ${DASHBOARD_DATA.overview.totalSessions.toLocaleString()}
- Total Page Views: ${DASHBOARD_DATA.overview.totalPageViews.toLocaleString()}
- Total Product Views: ${DASHBOARD_DATA.overview.totalProductViews.toLocaleString()}
- Total Cart Adds: ${DASHBOARD_DATA.overview.totalCartAdds.toLocaleString()}
- Total Purchases: ${DASHBOARD_DATA.overview.totalPurchases}
- Total Revenue: $${DASHBOARD_DATA.overview.totalRevenue.toLocaleString()}
- Cart-to-Purchase Conversion Rate: ${DASHBOARD_DATA.overview.conversionRate}%

### Top Products
${DASHBOARD_DATA.topProducts.map((p, i) => `${i + 1}. ${p.name} - ${p.views} views, ${p.purchases} purchases, $${p.revenue} revenue`).join('\n')}

### Category Performance
${DASHBOARD_DATA.categoryPerformance.map(c => `- ${c.category}: $${c.revenue} revenue, ${c.products} products, avg price $${c.avgPrice}`).join('\n')}

### Inventory Status
- Total Stock: ${DASHBOARD_DATA.inventory.totalStock} units
- Low Stock Alerts: ${DASHBOARD_DATA.inventory.lowStockItems} items
- Products needing restock: ${DASHBOARD_DATA.inventory.lowStockProducts.join(', ')}

### Competitor Intelligence
${DASHBOARD_DATA.competitors.map(c => `- ${c.name}: $${c.avgPrice} avg price, ${c.marketShare}% market share, ${c.threat} threat level. Recent: ${c.recentActivity}`).join('\n')}

### Price Competitiveness Score: ${DASHBOARD_DATA.priceCompetitiveness}%

### Recent Trends
- Page Views: ${DASHBOARD_DATA.recentTrends.pageViewsChange}
- Revenue: ${DASHBOARD_DATA.recentTrends.revenueChange}
- Top Growing Category: ${DASHBOARD_DATA.recentTrends.topGrowingCategory}
- Customer Retention: ${DASHBOARD_DATA.recentTrends.customerRetention}

## Your Role:
1. Answer questions about sales, revenue, products, and inventory
2. Provide insights on competitor positioning and market trends
3. Suggest actionable recommendations for improving performance
4. Identify opportunities and potential risks
5. Calculate metrics and comparisons when asked

Be concise, data-driven, and actionable in your responses. Use specific numbers from the data. Format responses with clear structure using bullet points or numbered lists when appropriate.`

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

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
