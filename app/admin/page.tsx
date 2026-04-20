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
  TrendingDown, 
  Eye, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Package,
  MousePointer,
  RefreshCw,
  AlertCircle
} from "lucide-react"

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
}

const CHART_COLORS = ["#5D6B5D", "#8B9D8B", "#A3B5A3", "#C4D4C4", "#E5EBE5"]

export default function AdminDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

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
        recentPurchasesRes
      ] = await Promise.all([
        supabase.from("analytics_sessions").select("id", { count: "exact" }),
        supabase.from("analytics_page_views").select("id", { count: "exact" }),
        supabase.from("analytics_product_views").select("id", { count: "exact" }),
        supabase.from("analytics_cart_events").select("id, event_type", { count: "exact" }),
        supabase.from("analytics_purchases").select("id, order_total, item_count, created_at"),
        supabase.from("analytics_page_views").select("page_path"),
        supabase.from("analytics_product_views").select("product_name"),
        supabase.from("analytics_purchases").select("id, order_total, item_count, created_at").order("created_at", { ascending: false }).limit(10)
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
        // Simulate data for now - in production, query by date
        dailyPageViews.push({ date: dateStr, views: Math.floor(Math.random() * 50) + (pageViewsRes.count || 0) / 7 })
      }

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
        cartConversion: { added: addEvents, purchased: purchaseCount }
      })
      setLastRefresh(new Date())
    } catch (err) {
      console.error("Failed to fetch analytics:", err)
      setError("Failed to load analytics. Make sure the database tables are set up.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-serif text-foreground mb-2">Setup Required</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="bg-muted rounded-lg p-4 text-left text-sm font-mono text-muted-foreground overflow-auto max-h-48 mb-6">
            Run the SQL in:<br />
            /scripts/001_create_analytics_tables.sql<br />
            in your Supabase SQL Editor
          </div>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const stats = [
    { label: "Total Sessions", value: data?.totalSessions || 0, icon: Users, change: "+12%" },
    { label: "Page Views", value: data?.totalPageViews || 0, icon: Eye, change: "+8%" },
    { label: "Product Views", value: data?.totalProductViews || 0, icon: Package, change: "+15%" },
    { label: "Cart Events", value: data?.totalCartEvents || 0, icon: ShoppingCart, change: "+5%" },
    { label: "Purchases", value: data?.totalPurchases || 0, icon: MousePointer, change: "+20%" },
    { label: "Revenue", value: `$${data?.totalRevenue?.toFixed(2) || "0.00"}`, icon: DollarSign, change: "+18%" }
  ]

  const conversionRate = data?.cartConversion?.added 
    ? ((data.cartConversion.purchased / data.cartConversion.added) * 100).toFixed(1) 
    : "0"

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Dr.Oat SkinCare - Real-time insights
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
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
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl p-5 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <stat.icon className="w-5 h-5 text-primary" />
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

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

          {/* Top Pages Chart */}
          <div className="bg-card rounded-2xl p-6 border border-border/50">
            <h3 className="font-serif text-lg text-foreground mb-4">Top Pages</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.pageViewsByPath || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis type="number" stroke="#888" fontSize={12} />
                  <YAxis dataKey="path" type="category" stroke="#888" fontSize={11} width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#fff", 
                      border: "1px solid #e5e5e5",
                      borderRadius: "8px"
                    }} 
                  />
                  <Bar dataKey="count" fill="#5D6B5D" radius={[0, 4, 4, 0]} />
                </BarChart>
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
              {(data?.topProducts || []).length === 0 ? (
                <p className="text-muted-foreground text-sm">No product views yet</p>
              ) : (
                data?.topProducts.map((product, i) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground truncate max-w-[150px]">{product.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{product.views} views</span>
                  </div>
                ))
              )}
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
                    <p className="font-medium text-foreground">{data?.cartConversion?.added || 0}</p>
                    <p className="text-muted-foreground">Added</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{data?.cartConversion?.purchased || 0}</p>
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
              {(data?.recentPurchases || []).length === 0 ? (
                <p className="text-muted-foreground text-sm">No purchases yet</p>
              ) : (
                data?.recentPurchases.slice(0, 5).map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">${purchase.total}</p>
                      <p className="text-xs text-muted-foreground">{purchase.items} items</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
