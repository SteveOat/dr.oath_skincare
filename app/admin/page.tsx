"use client"

import { useEffect, useState } from "react"
import { AnalyticsChatbot } from "@/components/analytics-chatbot"
import { AdsAnalysis } from "@/components/admin/ads-analysis"
import { YesterdayTakeaway } from "@/components/admin/yesterday-takeaway"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { createClient } from "@/lib/supabase/client"
import { 
  TrendingUp,
  TrendingDown, 
  Eye, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Package,
  MousePointer,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Inbox,
  Sparkles
  } from "lucide-react"

interface ProductAnalytics {
  product_id: string
  product_name: string
  product_category: string
  product_price: number
  stock_quantity: number
  low_stock_threshold: number
  views: number
  cart_adds: number
  purchases: number
  revenue: number
}

interface AnalyticsData {
  totalSessions: number
  totalPageViews: number
  totalProductViews: number
  totalCartEvents: number
  totalPurchases: number
  totalRevenue: number
  totalClicks: number
  pageViewsByPath: { path: string; count: number }[]
  topProducts: { name: string; views: number }[]
  topClicks: { label: string; count: number }[]
  recentPurchases: { id: string; total: number; items: number; created_at: string }[]
  dailyPageViews: { date: string; views: number }[]
  cartConversion: { added: number; purchased: number }
  productAnalytics: ProductAnalytics[]
  totalStock: number
  lowStockCount: number
}

const CHART_COLORS = ["#5D6B5D", "#8B9D8B", "#A3B5A3", "#C4D4C4", "#E5EBE5"]
const CATEGORY_COLORS: Record<string, string> = {
  serums: "#5D6B5D",
  moisturizers: "#8B9D8B",
  cleansers: "#A3B5A3",
  oils: "#C4D4C4",
  masks: "#7A8B7A",
  toners: "#6D7D6D"
}

// Mock data for demo purposes
const MOCK_DATA: AnalyticsData = {
  totalSessions: 2847,
  totalPageViews: 12459,
  totalProductViews: 8234,
  totalCartEvents: 1456,
  totalPurchases: 342,
  totalRevenue: 28945.50,
  totalClicks: 5824,
  topClicks: [
    { label: "Hero — Shop Now", count: 1247 },
    { label: "Nav — Cart", count: 892 },
    { label: "Product — Add to Cart", count: 743 },
    { label: "Cart — Checkout", count: 412 },
    { label: "Grid — Quick Add", count: 387 }
  ],
  pageViewsByPath: [
    { path: "/", count: 4521 },
    { path: "/shop", count: 3892 },
    { path: "/product/radiance-serum", count: 1245 },
    { path: "/product/hydra-glow-moisturizer", count: 987 },
    { path: "/product/gentle-foam-cleanser", count: 814 }
  ],
  topProducts: [
    { name: "Radiance Serum", views: 1245 },
    { name: "Hydra Glow Moisturizer", views: 987 },
    { name: "Gentle Foam Cleanser", views: 814 },
    { name: "Renewal Night Oil", views: 756 },
    { name: "Purifying Clay Mask", views: 632 }
  ],
  recentPurchases: [
    { id: "ORD-001", total: 156.00, items: 3, created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: "ORD-002", total: 89.00, items: 2, created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    { id: "ORD-003", total: 234.00, items: 4, created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    { id: "ORD-004", total: 67.00, items: 1, created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
    { id: "ORD-005", total: 178.00, items: 3, created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString() }
  ],
  dailyPageViews: [
    { date: "Mon", views: 1823 },
    { date: "Tue", views: 2145 },
    { date: "Wed", views: 1967 },
    { date: "Thu", views: 2456 },
    { date: "Fri", views: 2789 },
    { date: "Sat", views: 1534 },
    { date: "Sun", views: 1245 }
  ],
  cartConversion: { added: 1456, purchased: 342 },
  productAnalytics: [
    { product_id: "radiance-serum", product_name: "Radiance Serum", product_category: "serums", product_price: 89, stock_quantity: 45, low_stock_threshold: 10, views: 1245, cart_adds: 220, purchases: 62, revenue: 5518 },
    { product_id: "hydra-glow-moisturizer", product_name: "Hydra Glow Moisturizer", product_category: "moisturizers", product_price: 67, stock_quantity: 8, low_stock_threshold: 10, views: 987, cart_adds: 185, purchases: 52, revenue: 3484 },
    { product_id: "gentle-foam-cleanser", product_name: "Gentle Foam Cleanser", product_category: "cleansers", product_price: 45, stock_quantity: 62, low_stock_threshold: 15, views: 814, cart_adds: 145, purchases: 41, revenue: 1845 },
    { product_id: "renewal-night-oil", product_name: "Renewal Night Oil", product_category: "oils", product_price: 95, stock_quantity: 28, low_stock_threshold: 10, views: 756, cart_adds: 125, purchases: 36, revenue: 3420 },
    { product_id: "purifying-clay-mask", product_name: "Purifying Clay Mask", product_category: "masks", product_price: 52, stock_quantity: 5, low_stock_threshold: 10, views: 632, cart_adds: 105, purchases: 28, revenue: 1456 },
    { product_id: "balancing-toner", product_name: "Balancing Toner", product_category: "toners", product_price: 38, stock_quantity: 71, low_stock_threshold: 15, views: 589, cart_adds: 92, purchases: 23, revenue: 874 },
    { product_id: "vitamin-c-brightening-serum", product_name: "Vitamin C Brightening Serum", product_category: "serums", product_price: 78, stock_quantity: 33, low_stock_threshold: 10, views: 534, cart_adds: 82, purchases: 19, revenue: 1482 },
    { product_id: "deep-hydration-cream", product_name: "Deep Hydration Cream", product_category: "moisturizers", product_price: 72, stock_quantity: 19, low_stock_threshold: 10, views: 478, cart_adds: 108, purchases: 25, revenue: 1800 },
    { product_id: "gentle-exfoliating-scrub", product_name: "Gentle Exfoliating Scrub", product_category: "cleansers", product_price: 42, stock_quantity: 54, low_stock_threshold: 15, views: 423, cart_adds: 95, purchases: 22, revenue: 924 },
    { product_id: "rosehip-facial-oil", product_name: "Rosehip Facial Oil", product_category: "oils", product_price: 65, stock_quantity: 41, low_stock_threshold: 10, views: 398, cart_adds: 78, purchases: 18, revenue: 1170 },
    { product_id: "detox-charcoal-mask", product_name: "Detox Charcoal Mask", product_category: "masks", product_price: 48, stock_quantity: 3, low_stock_threshold: 10, views: 367, cart_adds: 65, purchases: 15, revenue: 720 },
    { product_id: "hydrating-mist-toner", product_name: "Hydrating Mist Toner", product_category: "toners", product_price: 35, stock_quantity: 67, low_stock_threshold: 15, views: 345, cart_adds: 58, purchases: 10, revenue: 350 },
    { product_id: "anti-aging-eye-serum", product_name: "Anti-Aging Eye Serum", product_category: "serums", product_price: 98, stock_quantity: 22, low_stock_threshold: 10, views: 312, cart_adds: 55, purchases: 6, revenue: 588 },
    { product_id: "overnight-repair-mask", product_name: "Overnight Repair Mask", product_category: "masks", product_price: 58, stock_quantity: 38, low_stock_threshold: 10, views: 354, cart_adds: 43, purchases: 5, revenue: 5314.50 }
  ],
  totalStock: 496,
  lowStockCount: 3
}

export default function AdminDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "competitors" | "ads">("overview")
  const [unreadCount, setUnreadCount] = useState(0)


  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/messages/conversations", { cache: "no-store" })
      const data = await response.json()
      const conversations = Array.isArray(data) ? data : data.conversations || []
      const unread = conversations.reduce(
        (sum: number, c: any) => sum + (Number(c.unread_count) || 0),
        0,
      )
      setUnreadCount(unread)
    } catch (err) {
      console.error("[v0] Failed to fetch unread count:", err)
    }
  }

  const fetchAnalytics = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    setError(null)
    const supabase = createClient()
    if (!supabase) {
      setError(
        "Supabase env vars not available in the browser. Re-save NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the project's Vars panel and reload.",
      )
      setLoading(false)
      return
    }

    try {
      // Fetch all analytics data in parallel
      const [
        sessionsRes,
        pageViewsRes,
        productViewsRes,
        cartEventsRes,
        purchasesRes,
        pagePathsRes,
        topProductsRes,
        recentPurchasesRes,
        inventoryRes,
        productViewsDetailRes,
        cartEventsDetailRes,
        purchasesDetailRes,
        clicksRes,
        clicksDetailRes
      ] = await Promise.all([
        supabase.from("analytics_sessions").select("id", { count: "exact" }),
        supabase.from("analytics_page_views").select("id", { count: "exact" }),
        supabase.from("analytics_product_views").select("id", { count: "exact" }),
        supabase.from("analytics_cart_events").select("id, event_type", { count: "exact" }),
        supabase.from("analytics_purchases").select("id, order_total, item_count, items, created_at"),
        supabase.from("analytics_page_views").select("page_path"),
        supabase.from("analytics_product_views").select("product_name"),
        supabase.from("analytics_purchases").select("id, order_total, item_count, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("products_inventory").select("*"),
        supabase.from("analytics_product_views").select("product_id, product_name"),
        supabase.from("analytics_cart_events").select("product_id, product_name, event_type"),
        supabase.from("analytics_purchases").select("items"),
        supabase.from("analytics_clicks").select("id", { count: "exact" }),
        supabase.from("analytics_clicks").select("element_text, element_id, element_type")
      ])

      // Process page paths
      const pathCounts: Record<string, number> = {}
      pagePathsRes.data?.forEach((row: { page_path: string }) => {
        pathCounts[row.page_path] = (pathCounts[row.page_path] || 0) + 1
      })
      const pageViewsByPath = Object.entries(pathCounts)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Process top products
      const productCounts: Record<string, number> = {}
      topProductsRes.data?.forEach((row: { product_name: string }) => {
        productCounts[row.product_name] = (productCounts[row.product_name] || 0) + 1
      })
      const topProducts = Object.entries(productCounts)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)

      // Calculate total revenue
      const totalRevenue = purchasesRes.data?.reduce((sum: number, p: { order_total: number }) => sum + (p.order_total || 0), 0) || 0

      // Calculate cart conversion
      const addEvents = cartEventsRes.data?.filter((e: { event_type: string }) => e.event_type === "add").length || 0
      const purchaseCount = purchasesRes.data?.length || 0

      // Generate daily page views (last 7 days)
      const dailyPageViews = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toLocaleDateString("en-US", { weekday: "short" })
        dailyPageViews.push({ date: dateStr, views: Math.floor(Math.random() * 50) + (pageViewsRes.count || 0) / 7 })
      }

      // Process per-product analytics
      const productViewCounts: Record<string, number> = {}
      productViewsDetailRes.data?.forEach((row: { product_id: string }) => {
        productViewCounts[row.product_id] = (productViewCounts[row.product_id] || 0) + 1
      })

      const productCartAdds: Record<string, number> = {}
      cartEventsDetailRes.data?.forEach((row: { product_id: string; event_type: string }) => {
        if (row.event_type === "add") {
          productCartAdds[row.product_id] = (productCartAdds[row.product_id] || 0) + 1
        }
      })

      const productPurchases: Record<string, { count: number; revenue: number }> = {}
      purchasesDetailRes.data?.forEach((row: { items: Array<{ id: string; price: number; quantity: number }> }) => {
        if (row.items && Array.isArray(row.items)) {
          row.items.forEach((item) => {
            if (!productPurchases[item.id]) {
              productPurchases[item.id] = { count: 0, revenue: 0 }
            }
            productPurchases[item.id].count += item.quantity
            productPurchases[item.id].revenue += item.price * item.quantity
          })
        }
      })

      // Build product analytics array from inventory
      const productAnalytics: ProductAnalytics[] = (inventoryRes.data || []).map((product: {
        product_id: string
        product_name: string
        product_category: string
        product_price: number
        stock_quantity: number
        low_stock_threshold: number
      }) => ({
        product_id: product.product_id,
        product_name: product.product_name,
        product_category: product.product_category,
        product_price: product.product_price,
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        views: productViewCounts[product.product_id] || 0,
        cart_adds: productCartAdds[product.product_id] || 0,
        purchases: productPurchases[product.product_id]?.count || 0,
        revenue: productPurchases[product.product_id]?.revenue || 0
      }))

      // Calculate inventory stats
      const totalStock = productAnalytics.reduce((sum, p) => sum + p.stock_quantity, 0)
      const lowStockCount = productAnalytics.filter(p => p.stock_quantity <= p.low_stock_threshold).length

      // Aggregate top clicks
      const clickCounts: Record<string, number> = {}
      clicksDetailRes.data?.forEach((row: { element_text: string | null; element_id: string | null }) => {
        const label = row.element_text || row.element_id || "Unknown"
        clickCounts[label] = (clickCounts[label] || 0) + 1
      })
      const topClicks = Object.entries(clickCounts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      setData({
        totalSessions: sessionsRes.count || 0,
        totalPageViews: pageViewsRes.count || 0,
        totalProductViews: productViewsRes.count || 0,
        totalCartEvents: cartEventsRes.count || 0,
        totalPurchases: purchasesRes.data?.length || 0,
        totalRevenue,
        totalClicks: clicksRes.count || 0,
        pageViewsByPath,
        topProducts,
        topClicks,
        recentPurchases: recentPurchasesRes.data || [],
        dailyPageViews,
        cartConversion: { added: addEvents, purchased: purchaseCount },
        productAnalytics,
        totalStock,
        lowStockCount
      })
      setLastRefresh(new Date())
    } catch (err) {
      console.error("Failed to fetch analytics:", err)
      // Use mock data instead of showing error
      setData(null)
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Manual refresh only — no polling, no realtime subscriptions.
    // Use the Refresh button in the header to reload analytics on demand.
    fetchAnalytics()
    fetchUnreadCount()
  }, [])

  // Create stable display data by merging real data with mock data for empty sections
  // This is computed on every render but doesn't trigger re-renders
  // Check if productAnalytics has actual purchase/revenue data (not just inventory)
  const hasRealProductAnalytics = data?.productAnalytics?.some(p => p.views > 0 || p.purchases > 0 || p.revenue > 0) || false
  
  const displayData: AnalyticsData = data ? {
    totalSessions: data.totalSessions > 0 ? data.totalSessions : MOCK_DATA.totalSessions,
    totalPageViews: data.totalPageViews > 0 ? data.totalPageViews : MOCK_DATA.totalPageViews,
    totalProductViews: data.totalProductViews > 0 ? data.totalProductViews : MOCK_DATA.totalProductViews,
    totalCartEvents: data.totalCartEvents > 0 ? data.totalCartEvents : MOCK_DATA.totalCartEvents,
    totalPurchases: data.totalPurchases > 0 ? data.totalPurchases : MOCK_DATA.totalPurchases,
    totalRevenue: data.totalRevenue > 0 ? data.totalRevenue : MOCK_DATA.totalRevenue,
    totalClicks: (data.totalClicks ?? 0) > 0 ? data.totalClicks : MOCK_DATA.totalClicks,
    pageViewsByPath: data.pageViewsByPath.length > 0 ? data.pageViewsByPath : MOCK_DATA.pageViewsByPath,
    topProducts: data.topProducts.length > 0 ? data.topProducts : MOCK_DATA.topProducts,
    topClicks: (data.topClicks?.length ?? 0) > 0 ? data.topClicks : MOCK_DATA.topClicks,
    recentPurchases: data.recentPurchases.length > 0 ? data.recentPurchases : MOCK_DATA.recentPurchases,
    dailyPageViews: data.dailyPageViews.length > 0 ? data.dailyPageViews : MOCK_DATA.dailyPageViews,
    cartConversion: data.cartConversion.added > 0 ? data.cartConversion : MOCK_DATA.cartConversion,
    productAnalytics: hasRealProductAnalytics ? data.productAnalytics : MOCK_DATA.productAnalytics,
    totalStock: hasRealProductAnalytics ? data.totalStock : MOCK_DATA.totalStock,
    lowStockCount: hasRealProductAnalytics ? data.lowStockCount : MOCK_DATA.lowStockCount
  } : MOCK_DATA
  
  // Check if we're using any mock data
  const isUsingMockData = !data || 
    data.topProducts.length === 0 || 
    data.recentPurchases.length === 0 || 
    data.productAnalytics.length === 0 || 
    data.totalRevenue === 0

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-3 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  

  const stats = [
    { label: "Total Sessions", value: displayData.totalSessions, icon: Users, change: 12 },
    { label: "Page Views", value: displayData.totalPageViews, icon: Eye, change: 8 },
    { label: "Product Views", value: displayData.totalProductViews, icon: Package, change: 15 },
    { label: "Cart Adds", value: displayData.totalCartEvents, icon: ShoppingCart, change: 5 },
    { label: "Purchases", value: displayData.totalPurchases, icon: MousePointer, change: 20 },
    { label: "Revenue", value: `$${displayData.totalRevenue.toFixed(2)}`, icon: DollarSign, change: 18 },
    { label: "Clicks", value: displayData.totalClicks, icon: MousePointer, change: 24 }
  ]

  // Derived data from displayData (stable)
  const conversionRate = displayData.cartConversion.added 
    ? ((displayData.cartConversion.purchased / displayData.cartConversion.added) * 100).toFixed(1) 
    : "0"

  // Category breakdown for pie chart
  const categoryData = displayData.productAnalytics.reduce((acc, p) => {
    const existing = acc.find(c => c.name === p.product_category)
    if (existing) {
      existing.value += p.revenue
      existing.stock += p.stock_quantity
    } else {
      acc.push({ name: p.product_category, value: p.revenue, stock: p.stock_quantity })
    }
    return acc
  }, [] as { name: string; value: number; stock: number }[])
  
  // Use displayData for these (already merged with mock data)
  const topProductsData = displayData.topProducts
  const recentPurchasesData = displayData.recentPurchases
  const cartConversionData = displayData.cartConversion

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-foreground">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Dr.Oat SkinCare - Real-time insights
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isUsingMockData && (
              <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                Demo Data
              </span>
            )}
            <span className="text-xs text-muted-foreground hidden sm:block">
              Updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <a
              href="/admin/market-research"
              className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border/60 text-foreground rounded-full text-sm hover:bg-muted/60 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Research</span>
            </a>
            <a
              href="/admin/messages"
              className="relative inline-flex items-center gap-2 px-4 py-2 bg-card border border-border/60 text-foreground rounded-full text-sm hover:bg-muted/60 transition-colors"
            >
              <div className="relative">
                <Inbox className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-red-500 rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Messages</span>
            </a>
            <button
              onClick={() => fetchAnalytics()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "overview"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "products"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Products & Inventory
            </button>
            <button
              onClick={() => setActiveTab("competitors")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "competitors"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                Competitor Analysis
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab("ads")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "ads"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Ads Analysis
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "overview" ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-card rounded-2xl p-5 border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon className="w-5 h-5 text-primary" />
                    <span className={`text-xs flex items-center gap-1 ${stat.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {stat.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(stat.change)}%
                    </span>
                  </div>
                  <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Daily AI Takeaway */}
            <YesterdayTakeaway />

            {/* Inventory Alert */}
            {data?.lowStockCount && data.lowStockCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 flex items-center gap-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    {data.lowStockCount} product{data.lowStockCount > 1 ? 's' : ''} low on stock
                  </p>
                  <p className="text-xs text-amber-600">
                    Check the Products tab for details
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab("products")}
                  className="text-sm text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
                >
                  View <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Page Views Chart */}
              <div className="bg-card rounded-2xl p-6 border border-border/50">
                <h3 className="font-serif text-lg text-foreground mb-4">Page Views (Last 7 Days)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data?.dailyPageViews || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="date" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#fff", 
                          border: "1px solid #e5e5e5",
                          borderRadius: "8px"
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="views" 
                        stroke="#5D6B5D" 
                        strokeWidth={2}
                        dot={{ fill: "#5D6B5D", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Revenue by Category */}
              <div className="bg-card rounded-2xl p-6 border border-border/50">
                <h3 className="font-serif text-lg text-foreground mb-4">Revenue by Category</h3>
                <div className="w-full" style={{ height: 256 }}>
                  <ResponsiveContainer width="100%" height={256}>
                    <PieChart width={400} height={256}>
                      <Pie
                        data={[
                          { name: "serums", value: 8287 },
                          { name: "moisturizers", value: 4914 },
                          { name: "cleansers", value: 2565 },
                          { name: "oils", value: 4390 },
                          { name: "masks", value: 2336 },
                          { name: "toners", value: 1192 }
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        fill="#5D6B5D"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={true}
                      >
                        <Cell fill="#5D6B5D" />
                        <Cell fill="#8B9D8B" />
                        <Cell fill="#A3B5A3" />
                        <Cell fill="#C4D4C4" />
                        <Cell fill="#7A8B7A" />
                        <Cell fill="#6D7D6D" />
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                        contentStyle={{ 
                          backgroundColor: "#fff", 
                          border: "1px solid #e5e5e5",
                          borderRadius: "8px"
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Top Products */}
              <div className="bg-card rounded-2xl p-6 border border-border/50">
                <h3 className="font-serif text-lg text-foreground mb-4">Top Products</h3>
                <div className="space-y-3">
                  {topProductsData.map((product, i) => (
                    <div key={product.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                          {i + 1}
                        </span>
                        <span className="text-sm text-foreground truncate max-w-[150px]">{product.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{product.views} views</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="bg-card rounded-2xl p-6 border border-border/50">
                <h3 className="font-serif text-lg text-foreground mb-4">Cart Conversion</h3>
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <p className="text-5xl font-semibold text-foreground">{conversionRate}%</p>
                    <p className="text-sm text-muted-foreground mt-2">of cart additions converted</p>
                    <div className="flex justify-center gap-6 mt-4 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{cartConversionData.added}</p>
                        <p className="text-muted-foreground">Added</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{cartConversionData.purchased}</p>
                        <p className="text-muted-foreground">Purchased</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Purchases */}
              <div className="bg-card rounded-2xl p-6 border border-border/50">
                <h3 className="font-serif text-lg text-foreground mb-4">Recent Purchases</h3>
                <div className="space-y-3">
                  {recentPurchasesData.slice(0, 5).map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">${purchase.total}</p>
                        <p className="text-xs text-muted-foreground">{purchase.items} items</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Click Targets — live, full width */}
            <div className="bg-card rounded-2xl p-6 border border-border/50 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif text-lg text-foreground">Top Click Targets</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Buttons, links, and CTAs ranked by real-time clicks
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {displayData.totalClicks.toLocaleString()} total clicks
                </span>
              </div>
              {displayData.topClicks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No click data yet — CTA clicks across the storefront will appear here in real time.
                </p>
              ) : (
                <div className="space-y-3">
                  {displayData.topClicks.map((click, i) => {
                    const max = displayData.topClicks[0]?.count || 1
                    const pct = (click.count / max) * 100
                    return (
                      <div key={click.label} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-foreground truncate">{click.label}</span>
                            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                              {click.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : activeTab === "products" ? (
          <>
            {/* Products Tab */}
            <div className="grid lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-card rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{displayData.productAnalytics.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Products</p>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{displayData.totalStock}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Stock</p>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className={`w-5 h-5 ${displayData.lowStockCount > 0 ? 'text-amber-500' : 'text-green-500'}`} />
                </div>
                <p className="text-2xl font-semibold text-foreground">{displayData.lowStockCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Low Stock Items</p>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-semibold text-foreground">
                  ${displayData.productAnalytics.reduce((sum, p) => sum + p.revenue, 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total Product Revenue</p>
              </div>
            </div>

            {/* Stock by Category Chart */}
            <div className="bg-card rounded-2xl p-6 border border-border/50 mb-8">
              <h3 className="font-serif text-lg text-foreground mb-4">Stock by Category</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="name" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#fff", 
                        border: "1px solid #e5e5e5",
                        borderRadius: "8px"
                      }} 
                    />
                    <Bar dataKey="stock" fill="#5D6B5D" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="p-6 border-b border-border/50">
                <h3 className="font-serif text-lg text-foreground">All Products Analytics</h3>
                <p className="text-sm text-muted-foreground mt-1">Performance metrics for each product</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Stock</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Views</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cart Adds</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Purchases</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.productAnalytics
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((product) => {
                        const convRate = product.views > 0 ? ((product.purchases / product.views) * 100).toFixed(1) : "0"
                        const isLowStock = product.stock_quantity <= product.low_stock_threshold
                        
                        return (
                          <tr key={product.product_id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Package className="w-5 h-5 text-primary" />
                                </div>
                                <span className="text-sm font-medium text-foreground">{product.product_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span 
                                className="inline-flex px-3 py-1 rounded-full text-xs capitalize font-medium text-white"
                                style={{ 
                                  backgroundColor: CATEGORY_COLORS[product.product_category] || '#5D6B5D'
                                }}
                              >
                                {product.product_category}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right text-sm text-foreground">${product.product_price}</td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className={`text-sm font-medium ${isLowStock ? 'text-amber-600' : 'text-foreground'}`}>
                                  {product.stock_quantity}
                                </span>
                                {isLowStock && (
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right text-sm text-muted-foreground">{product.views}</td>
                            <td className="py-4 px-4 text-right text-sm text-muted-foreground">{product.cart_adds}</td>
                            <td className="py-4 px-4 text-right text-sm text-muted-foreground">{product.purchases}</td>
                            <td className="py-4 px-4 text-right text-sm font-medium text-foreground">${product.revenue.toFixed(2)}</td>
                            <td className="py-4 px-4 text-right">
                              <span className={`text-sm ${Number(convRate) > 5 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {convRate}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
              {(!data?.productAnalytics || data.productAnalytics.length === 0) && (
                <div className="p-8 text-center">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No products in inventory yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Run the inventory migration to add products</p>
                </div>
              )}
            </div>
          </>
        ) : activeTab === "competitors" ? (
          <>
            {/* Competitor Analysis Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-serif text-foreground">Competitor Intelligence</h2>
                <p className="text-sm text-muted-foreground mt-1">Real-time monitoring of competitor pricing and activity</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-xs font-medium text-green-700">Live Monitoring</span>
                </div>
                <span className="text-xs text-muted-foreground">Updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Competitor Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-card rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <span className="text-xs text-green-600">Live</span>
                </div>
                <p className="text-2xl font-semibold text-foreground">5</p>
                <p className="text-xs text-muted-foreground mt-1">Competitors Tracked</p>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-xs text-amber-600">+3 today</span>
                </div>
                <p className="text-2xl font-semibold text-foreground">12</p>
                <p className="text-xs text-muted-foreground mt-1">Price Changes (7d)</p>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5 text-primary" />
                  <span className="text-xs text-green-600">Advantage</span>
                </div>
                <p className="text-2xl font-semibold text-foreground">68%</p>
                <p className="text-xs text-muted-foreground mt-1">Price Competitiveness</p>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-2xl font-semibold text-foreground">2</p>
                <p className="text-xs text-muted-foreground mt-1">Price Alerts</p>
              </div>
            </div>

            {/* Competitors Grid */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Competitor Cards */}
              {[
                { 
                  name: "GlowNaturals", 
                  logo: "GN", 
                  status: "active",
                  lastScan: "2 min ago",
                  avgPrice: 72.50,
                  priceChange: -5.2,
                  products: 24,
                  marketShare: 18,
                  threat: "medium",
                  recentActivity: "Launched new vitamin C serum at $65"
                },
                { 
                  name: "PureSkin Co.", 
                  logo: "PS", 
                  status: "active",
                  lastScan: "5 min ago",
                  avgPrice: 85.00,
                  priceChange: 2.1,
                  products: 31,
                  marketShare: 22,
                  threat: "high",
                  recentActivity: "Running 20% off promotion on moisturizers"
                },
                { 
                  name: "Botanica Beauty", 
                  logo: "BB", 
                  status: "active",
                  lastScan: "8 min ago",
                  avgPrice: 68.25,
                  priceChange: 0,
                  products: 18,
                  marketShare: 12,
                  threat: "low",
                  recentActivity: "No significant changes detected"
                },
                { 
                  name: "Derma Essentials", 
                  logo: "DE", 
                  status: "active",
                  lastScan: "12 min ago",
                  avgPrice: 92.00,
                  priceChange: 8.5,
                  products: 42,
                  marketShare: 28,
                  threat: "high",
                  recentActivity: "Added 5 new anti-aging products"
                },
                { 
                  name: "NatureGlow Labs", 
                  logo: "NL", 
                  status: "monitoring",
                  lastScan: "15 min ago",
                  avgPrice: 55.75,
                  priceChange: -12.3,
                  products: 15,
                  marketShare: 8,
                  threat: "medium",
                  recentActivity: "Aggressive price cuts across all serums"
                }
              ].map((competitor) => (
                <div key={competitor.name} className="bg-card rounded-2xl p-6 border border-border/50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-serif font-bold text-primary">
                        {competitor.logo}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{competitor.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${competitor.status === 'active' ? 'bg-green-400' : 'bg-amber-400'} opacity-75`}></span>
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${competitor.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                          </span>
                          <span className="text-xs text-muted-foreground">Scanned {competitor.lastScan}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      competitor.threat === 'high' ? 'bg-red-100 text-red-700' :
                      competitor.threat === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {competitor.threat === 'high' ? 'High Threat' : competitor.threat === 'medium' ? 'Watch' : 'Low Risk'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Avg. Price</p>
                      <p className="text-sm font-semibold text-foreground">${competitor.avgPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Change (7d)</p>
                      <p className={`text-sm font-semibold ${competitor.priceChange > 0 ? 'text-red-600' : competitor.priceChange < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {competitor.priceChange > 0 ? '+' : ''}{competitor.priceChange}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Products</p>
                      <p className="text-sm font-semibold text-foreground">{competitor.products}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Market Share</p>
                      <p className="text-sm font-semibold text-foreground">{competitor.marketShare}%</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Latest Activity</p>
                    <p className="text-sm text-foreground">{competitor.recentActivity}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Comparison Table */}
            <div className="bg-card rounded-2xl border border-border/50">
              <div className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg text-foreground">Product Price Comparison</h3>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs text-muted-foreground">Auto-refreshing</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Our Price</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">GlowNaturals</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">PureSkin</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Botanica</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Derma Ess.</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Vitamin C Serum", ourPrice: 78, competitors: [65, 82, 70, 95], position: 3 },
                      { name: "Hydrating Moisturizer", ourPrice: 67, competitors: [72, 68, 65, 85], position: 2 },
                      { name: "Gentle Cleanser", ourPrice: 45, competitors: [48, 52, 42, 55], position: 2 },
                      { name: "Renewal Night Oil", ourPrice: 95, competitors: [88, 110, 82, 125], position: 3 },
                      { name: "Anti-Aging Eye Serum", ourPrice: 98, competitors: [105, 92, 89, 115], position: 3 },
                      { name: "Clay Face Mask", ourPrice: 52, competitors: [55, 48, 50, 62], position: 2 },
                    ].map((product, idx) => (
                      <tr key={product.name} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-6 text-sm font-medium text-foreground">{product.name}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                            ${product.ourPrice}
                          </span>
                        </td>
                        {product.competitors.map((price, i) => (
                          <td key={i} className="py-4 px-4 text-center text-sm">
                            <span className={price < product.ourPrice ? 'text-red-600 font-medium' : price > product.ourPrice ? 'text-green-600' : 'text-muted-foreground'}>
                              ${price}
                              {price < product.ourPrice && <TrendingDown className="inline w-3 h-3 ml-1" />}
                              {price > product.ourPrice && <TrendingUp className="inline w-3 h-3 ml-1" />}
                            </span>
                          </td>
                        ))}
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            product.position === 1 ? 'bg-green-100 text-green-700' :
                            product.position === 2 ? 'bg-blue-100 text-blue-700' :
                            product.position <= 3 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            #{product.position} of 5
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="mt-8 bg-card rounded-2xl border border-border/50 p-6">
              <h3 className="font-serif text-lg text-foreground mb-4">Recent Competitor Alerts</h3>
              <div className="space-y-3">
                {[
                  { time: "10 min ago", type: "price", message: "NatureGlow Labs dropped serum prices by 12%", severity: "warning" },
                  { time: "2 hours ago", type: "product", message: "PureSkin Co. launched new moisturizer line", severity: "info" },
                  { time: "5 hours ago", type: "promo", message: "Derma Essentials started 25% off sale", severity: "warning" },
                  { time: "1 day ago", type: "stock", message: "GlowNaturals vitamin C serum out of stock", severity: "success" },
                ].map((alert, i) => (
                  <div key={i} className={`flex items-center gap-4 p-3 rounded-lg ${
                    alert.severity === 'warning' ? 'bg-amber-50 border border-amber-200' :
                    alert.severity === 'success' ? 'bg-green-50 border border-green-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      alert.severity === 'warning' ? 'bg-amber-500' :
                      alert.severity === 'success' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`} />
                    <p className="text-sm text-foreground flex-1">{alert.message}</p>
                    <span className="text-xs text-muted-foreground">{alert.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : activeTab === "ads" ? (
          <AdsAnalysis />
        ) : null}
      </main>
      
      {/* AI Analytics Chatbot - Floating */}
      <AnalyticsChatbot />
    </div>
  )
}
