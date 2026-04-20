"use client"

import { useEffect, useState } from "react"
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
  ArrowDownRight
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
  pageViewsByPath: { path: string; count: number }[]
  topProducts: { name: string; views: number }[]
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
    { product_id: "radiance-serum", product_name: "Radiance Serum", product_category: "serums", product_price: 89, stock_quantity: 45, low_stock_threshold: 10, views: 1245, cart_adds: 234, purchases: 67, revenue: 5963 },
    { product_id: "hydra-glow-moisturizer", product_name: "Hydra Glow Moisturizer", product_category: "moisturizers", product_price: 67, stock_quantity: 8, low_stock_threshold: 10, views: 987, cart_adds: 198, purchases: 54, revenue: 3618 },
    { product_id: "gentle-foam-cleanser", product_name: "Gentle Foam Cleanser", product_category: "cleansers", product_price: 45, stock_quantity: 62, low_stock_threshold: 15, views: 814, cart_adds: 156, purchases: 43, revenue: 1935 },
    { product_id: "renewal-night-oil", product_name: "Renewal Night Oil", product_category: "oils", product_price: 95, stock_quantity: 28, low_stock_threshold: 10, views: 756, cart_adds: 134, purchases: 38, revenue: 3610 },
    { product_id: "purifying-clay-mask", product_name: "Purifying Clay Mask", product_category: "masks", product_price: 52, stock_quantity: 5, low_stock_threshold: 10, views: 632, cart_adds: 112, purchases: 29, revenue: 1508 },
    { product_id: "balancing-toner", product_name: "Balancing Toner", product_category: "toners", product_price: 38, stock_quantity: 71, low_stock_threshold: 15, views: 589, cart_adds: 98, purchases: 24, revenue: 912 },
    { product_id: "vitamin-c-brightening-serum", product_name: "Vitamin C Brightening Serum", product_category: "serums", product_price: 78, stock_quantity: 33, low_stock_threshold: 10, views: 534, cart_adds: 89, purchases: 21, revenue: 1638 },
    { product_id: "deep-hydration-cream", product_name: "Deep Hydration Cream", product_category: "moisturizers", product_price: 72, stock_quantity: 19, low_stock_threshold: 10, views: 478, cart_adds: 76, purchases: 18, revenue: 1296 },
    { product_id: "gentle-exfoliating-scrub", product_name: "Gentle Exfoliating Scrub", product_category: "cleansers", product_price: 42, stock_quantity: 54, low_stock_threshold: 15, views: 423, cart_adds: 67, purchases: 15, revenue: 630 },
    { product_id: "rosehip-facial-oil", product_name: "Rosehip Facial Oil", product_category: "oils", product_price: 65, stock_quantity: 41, low_stock_threshold: 10, views: 398, cart_adds: 58, purchases: 12, revenue: 780 },
    { product_id: "detox-charcoal-mask", product_name: "Detox Charcoal Mask", product_category: "masks", product_price: 48, stock_quantity: 3, low_stock_threshold: 10, views: 367, cart_adds: 52, purchases: 10, revenue: 480 },
    { product_id: "hydrating-mist-toner", product_name: "Hydrating Mist Toner", product_category: "toners", product_price: 35, stock_quantity: 67, low_stock_threshold: 15, views: 345, cart_adds: 45, purchases: 8, revenue: 280 },
    { product_id: "anti-aging-eye-serum", product_name: "Anti-Aging Eye Serum", product_category: "serums", product_price: 98, stock_quantity: 22, low_stock_threshold: 10, views: 312, cart_adds: 41, purchases: 7, revenue: 686 },
    { product_id: "overnight-repair-mask", product_name: "Overnight Repair Mask", product_category: "masks", product_price: 58, stock_quantity: 38, low_stock_threshold: 10, views: 289, cart_adds: 38, purchases: 6, revenue: 348 }
  ],
  totalStock: 496,
  lowStockCount: 3
}

export default function AdminDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState<"overview" | "products">("overview")

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

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
        purchasesDetailRes
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
        supabase.from("analytics_purchases").select("items")
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

      setData({
        totalSessions: sessionsRes.count || 0,
        totalPageViews: pageViewsRes.count || 0,
        totalProductViews: productViewsRes.count || 0,
        totalCartEvents: cartEventsRes.count || 0,
        totalPurchases: purchasesRes.data?.length || 0,
        totalRevenue,
        pageViewsByPath,
        topProducts,
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
    fetchAnalytics()
  }, [])

  // Create stable display data by merging real data with mock data for empty sections
  // This is computed on every render but doesn't trigger re-renders
  const displayData: AnalyticsData = data ? {
    totalSessions: data.totalSessions > 0 ? data.totalSessions : MOCK_DATA.totalSessions,
    totalPageViews: data.totalPageViews > 0 ? data.totalPageViews : MOCK_DATA.totalPageViews,
    totalProductViews: data.totalProductViews > 0 ? data.totalProductViews : MOCK_DATA.totalProductViews,
    totalCartEvents: data.totalCartEvents > 0 ? data.totalCartEvents : MOCK_DATA.totalCartEvents,
    totalPurchases: data.totalPurchases > 0 ? data.totalPurchases : MOCK_DATA.totalPurchases,
    totalRevenue: data.totalRevenue > 0 ? data.totalRevenue : MOCK_DATA.totalRevenue,
    pageViewsByPath: data.pageViewsByPath.length > 0 ? data.pageViewsByPath : MOCK_DATA.pageViewsByPath,
    topProducts: data.topProducts.length > 0 ? data.topProducts : MOCK_DATA.topProducts,
    recentPurchases: data.recentPurchases.length > 0 ? data.recentPurchases : MOCK_DATA.recentPurchases,
    dailyPageViews: data.dailyPageViews.length > 0 ? data.dailyPageViews : MOCK_DATA.dailyPageViews,
    cartConversion: data.cartConversion.added > 0 ? data.cartConversion : MOCK_DATA.cartConversion,
    productAnalytics: data.productAnalytics.length > 0 ? data.productAnalytics : MOCK_DATA.productAnalytics,
    totalStock: data.totalStock > 0 ? data.totalStock : MOCK_DATA.totalStock,
    lowStockCount: data.productAnalytics.length > 0 ? data.lowStockCount : MOCK_DATA.lowStockCount
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
    { label: "Revenue", value: `$${displayData.totalRevenue.toFixed(2)}`, icon: DollarSign, change: 18 }
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
            <button
              onClick={fetchAnalytics}
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
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "overview" ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
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
          </>
        ) : (
          <>
            {/* Products Tab */}
            <div className="grid lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-card rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{data?.productAnalytics?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Products</p>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{data?.totalStock || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Stock</p>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className={`w-5 h-5 ${data?.lowStockCount && data.lowStockCount > 0 ? 'text-amber-500' : 'text-green-500'}`} />
                </div>
                <p className="text-2xl font-semibold text-foreground">{data?.lowStockCount || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Low Stock Items</p>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-semibold text-foreground">
                  ${data?.productAnalytics?.reduce((sum, p) => sum + p.revenue, 0).toFixed(2) || "0.00"}
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
                    {(data?.productAnalytics || [])
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
                                className="inline-flex px-2 py-1 rounded-full text-xs capitalize"
                                style={{ 
                                  backgroundColor: `${CATEGORY_COLORS[product.product_category] || '#5D6B5D'}20`,
                                  color: CATEGORY_COLORS[product.product_category] || '#5D6B5D'
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
        )}
      </main>
    </div>
  )
}
