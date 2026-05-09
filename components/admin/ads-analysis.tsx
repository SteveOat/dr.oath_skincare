"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  Globe,
  Search,
  Megaphone,
  TrendingUp,
  Target,
  MousePointer,
  ShoppingCart,
  Activity,
  DollarSign,
  Plus,
  Trash2,
  X,
  Wallet,
} from "lucide-react"
import {
  type AdSpendRow,
  spendByPlatform,
  spendByCampaign,
  totalSpendInRange,
  computeReturns,
} from "@/lib/ads/spend"

type AdClick = {
  id: string
  session_id: string
  platform: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  click_id_type: string | null
  landing_path: string
  referrer: string | null
  created_at: string
}

type Purchase = {
  session_id: string | null
  order_total: number
  created_at: string
}

const PLATFORM_META: Record<
  string,
  { label: string; icon: any; color: string; bg: string; ring: string }
> = {
  facebook: { label: "Facebook Ads", icon: Facebook, color: "text-[#1877F2]", bg: "bg-[#1877F2]/10", ring: "ring-[#1877F2]/30" },
  instagram: { label: "Instagram Ads", icon: Instagram, color: "text-[#E4405F]", bg: "bg-[#E4405F]/10", ring: "ring-[#E4405F]/30" },
  google: { label: "Google Ads", icon: Search, color: "text-[#4285F4]", bg: "bg-[#4285F4]/10", ring: "ring-[#4285F4]/30" },
  youtube: { label: "YouTube Ads", icon: Youtube, color: "text-[#FF0000]", bg: "bg-[#FF0000]/10", ring: "ring-[#FF0000]/30" },
  tiktok: { label: "TikTok Ads", icon: Activity, color: "text-foreground", bg: "bg-foreground/5", ring: "ring-foreground/20" },
  line: { label: "LINE Ads", icon: Megaphone, color: "text-[#06C755]", bg: "bg-[#06C755]/10", ring: "ring-[#06C755]/30" },
  twitter: { label: "X / Twitter Ads", icon: Twitter, color: "text-foreground", bg: "bg-foreground/5", ring: "ring-foreground/20" },
  linkedin: { label: "LinkedIn Ads", icon: Linkedin, color: "text-[#0A66C2]", bg: "bg-[#0A66C2]/10", ring: "ring-[#0A66C2]/30" },
  bing: { label: "Bing Ads", icon: Search, color: "text-[#008373]", bg: "bg-[#008373]/10", ring: "ring-[#008373]/30" },
  reddit: { label: "Reddit Ads", icon: Megaphone, color: "text-[#FF4500]", bg: "bg-[#FF4500]/10", ring: "ring-[#FF4500]/30" },
  pinterest: { label: "Pinterest Ads", icon: Megaphone, color: "text-[#E60023]", bg: "bg-[#E60023]/10", ring: "ring-[#E60023]/30" },
  snapchat: { label: "Snapchat Ads", icon: Megaphone, color: "text-amber-500", bg: "bg-amber-50", ring: "ring-amber-200" },
  other: { label: "Other Paid", icon: Megaphone, color: "text-muted-foreground", bg: "bg-muted", ring: "ring-border" },
  organic: { label: "Organic Search", icon: Search, color: "text-green-700", bg: "bg-green-50", ring: "ring-green-200" },
  direct: { label: "Direct", icon: Globe, color: "text-slate-600", bg: "bg-slate-100", ring: "ring-slate-200" },
}

const PLATFORM_OPTIONS = [
  "facebook", "instagram", "google", "youtube", "tiktok", "line",
  "twitter", "linkedin", "bing", "reddit", "pinterest", "snapchat", "other",
]

const MOCK_AD_CLICKS: AdClick[] = [
  { id: "m1", session_id: "s1", platform: "facebook", utm_source: "facebook", utm_medium: "cpc", utm_campaign: "summer-glow-q3", utm_content: "carousel-1", click_id_type: "fbclid", landing_path: "/shop", referrer: "https://l.facebook.com/", created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
  { id: "m2", session_id: "s2", platform: "facebook", utm_source: "facebook", utm_medium: "cpc", utm_campaign: "summer-glow-q3", utm_content: "video-2", click_id_type: "fbclid", landing_path: "/product/1", referrer: "https://m.facebook.com/", created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: "m3", session_id: "s3", platform: "google", utm_source: "google", utm_medium: "cpc", utm_campaign: "brand-search", utm_content: "exact-match", click_id_type: "gclid", landing_path: "/", referrer: "https://www.google.com/", created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: "m4", session_id: "s4", platform: "google", utm_source: "google", utm_medium: "cpc", utm_campaign: "skincare-keywords", utm_content: "broad-match", click_id_type: "gclid", landing_path: "/shop", referrer: "https://www.google.com/", created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: "m5", session_id: "s5", platform: "instagram", utm_source: "instagram", utm_medium: "paid_social", utm_campaign: "creator-collab-jul", utm_content: "story-ad", click_id_type: null, landing_path: "/product/2", referrer: "https://l.instagram.com/", created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: "m6", session_id: "s6", platform: "instagram", utm_source: "instagram", utm_medium: "paid_social", utm_campaign: "creator-collab-jul", utm_content: "reel-1", click_id_type: null, landing_path: "/shop", referrer: "https://l.instagram.com/", created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: "m7", session_id: "s7", platform: "tiktok", utm_source: "tiktok", utm_medium: "paid_social", utm_campaign: "viral-launch", utm_content: "spark-ad-1", click_id_type: "ttclid", landing_path: "/", referrer: "https://www.tiktok.com/", created_at: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString() },
  { id: "m8", session_id: "s8", platform: "tiktok", utm_source: "tiktok", utm_medium: "paid_social", utm_campaign: "viral-launch", utm_content: "spark-ad-2", click_id_type: "ttclid", landing_path: "/product/3", referrer: "https://www.tiktok.com/", created_at: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString() },
  { id: "m9", session_id: "s9", platform: "line", utm_source: "line", utm_medium: "official", utm_campaign: "loyalty-th", utm_content: null, click_id_type: null, landing_path: "/shop", referrer: "https://line.me/", created_at: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString() },
  { id: "m10", session_id: "s10", platform: "youtube", utm_source: "youtube", utm_medium: "video", utm_campaign: "trueview-aug", utm_content: "preroll", click_id_type: null, landing_path: "/", referrer: "https://www.youtube.com/", created_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString() },
  { id: "m11", session_id: "s11", platform: "direct", utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, click_id_type: null, landing_path: "/", referrer: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString() },
  { id: "m12", session_id: "s12", platform: "organic", utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, click_id_type: null, landing_path: "/shop", referrer: "https://www.google.com/search?q=skincare", created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString() },
]

const MOCK_PURCHASES: Purchase[] = [
  { session_id: "s1", order_total: 89.5, created_at: new Date().toISOString() },
  { session_id: "s4", order_total: 124.0, created_at: new Date().toISOString() },
  { session_id: "s5", order_total: 67.25, created_at: new Date().toISOString() },
  { session_id: "s7", order_total: 215.0, created_at: new Date().toISOString() },
  { session_id: "s10", order_total: 49.99, created_at: new Date().toISOString() },
]

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

const MOCK_SPEND: AdSpendRow[] = [
  { id: "ms1", platform: "facebook", campaign: "summer-glow-q3", period_start: daysAgo(6), period_end: today(), amount: 480, currency: "USD", notes: null, created_at: new Date().toISOString() },
  { id: "ms2", platform: "google", campaign: "brand-search", period_start: daysAgo(6), period_end: today(), amount: 120, currency: "USD", notes: null, created_at: new Date().toISOString() },
  { id: "ms3", platform: "google", campaign: "skincare-keywords", period_start: daysAgo(6), period_end: today(), amount: 320, currency: "USD", notes: null, created_at: new Date().toISOString() },
  { id: "ms4", platform: "instagram", campaign: "creator-collab-jul", period_start: daysAgo(6), period_end: today(), amount: 600, currency: "USD", notes: null, created_at: new Date().toISOString() },
  { id: "ms5", platform: "tiktok", campaign: "viral-launch", period_start: daysAgo(6), period_end: today(), amount: 250, currency: "USD", notes: null, created_at: new Date().toISOString() },
  { id: "ms6", platform: "line", campaign: "loyalty-th", period_start: daysAgo(6), period_end: today(), amount: 90, currency: "USD", notes: null, created_at: new Date().toISOString() },
  { id: "ms7", platform: "youtube", campaign: "trueview-aug", period_start: daysAgo(6), period_end: today(), amount: 200, currency: "USD", notes: null, created_at: new Date().toISOString() },
]

type PlatformAggregate = {
  platform: string
  meta: typeof PLATFORM_META[keyof typeof PLATFORM_META]
  clicks: number
  purchases: number
  revenue: number
  spend: number
  cvr: number
  share: number
  roas: number | null
  cpc: number | null
  cpa: number | null
}

export function AdsAnalysis() {
  const [adClicks, setAdClicks] = useState<AdClick[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [spendRows, setSpendRows] = useState<AdSpendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "all">("7d")
  const [isLive, setIsLive] = useState(false)
  const [pulse, setPulse] = useState(0)
  const [spendOpen, setSpendOpen] = useState(false)

  async function load() {
    const supabase = createClient()
    if (!supabase) {
      // Supabase env not available — fall back to mock data so the dashboard still demos
      setAdClicks(MOCK_AD_CLICKS)
      setPurchases(MOCK_PURCHASES)
      setSpendRows(MOCK_SPEND)
      setUsingMock(true)
      setLoading(false)
      return
    }
    try {
      const [clicksRes, purchasesRes, spendRes] = await Promise.all([
        supabase
          .from("analytics_ad_clicks")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("analytics_purchases")
          .select("session_id, order_total, created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        fetch("/api/ad-spend", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ rows: [] })),
      ])

      const clicks = (clicksRes.data || []) as AdClick[]
      const purchasesData = (purchasesRes.data || []) as Purchase[]
      const spend = ((spendRes?.rows || []) as AdSpendRow[]).map((r) => ({
        ...r,
        amount: Number(r.amount),
      }))

      if (clicks.length === 0) {
        setAdClicks(MOCK_AD_CLICKS)
        setPurchases(MOCK_PURCHASES)
        setSpendRows(spend.length > 0 ? spend : MOCK_SPEND)
        setUsingMock(true)
      } else {
        setAdClicks(clicks)
        setPurchases(purchasesData)
        setSpendRows(spend)
        setUsingMock(false)
      }
    } catch (err) {
      console.error("[v0] ads-analysis load failed:", err)
      setAdClicks(MOCK_AD_CLICKS)
      setPurchases(MOCK_PURCHASES)
      setSpendRows(MOCK_SPEND)
      setUsingMock(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const supabase = createClient()
    if (!supabase) {
      const interval = setInterval(load, 30000)
      return () => clearInterval(interval)
    }
    const channel = supabase
      .channel("ads-analysis-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analytics_ad_clicks" },
        () => {
          setPulse((p) => p + 1)
          load()
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analytics_purchases" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "analytics_ad_spend" },
        () => load(),
      )
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"))

    // No polling — Supabase realtime above already pushes inserts/updates instantly.
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Range bounds (used both for filtering clicks and prorating spend)
  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date()
    if (range === "all") {
      // Cover effectively everything
      return { rangeStart: new Date("2000-01-01T00:00:00Z"), rangeEnd: now }
    }
    const days = { "24h": 1, "7d": 7, "30d": 30 }[range]
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    return { rangeStart: start, rangeEnd: now }
  }, [range])

  // Filter by range
  const filteredClicks = useMemo(() => {
    if (range === "all") return adClicks
    return adClicks.filter((c) => new Date(c.created_at).getTime() >= rangeStart.getTime())
  }, [adClicks, range, rangeStart])

  // Prorated spend in range
  const platformSpend = useMemo(
    () => spendByPlatform(spendRows, rangeStart, rangeEnd),
    [spendRows, rangeStart, rangeEnd],
  )
  const campaignSpend = useMemo(
    () => spendByCampaign(spendRows, rangeStart, rangeEnd),
    [spendRows, rangeStart, rangeEnd],
  )
  const totalSpend = useMemo(
    () => totalSpendInRange(spendRows, rangeStart, rangeEnd),
    [spendRows, rangeStart, rangeEnd],
  )

  // Build platform aggregates with ROAS/CPC/CPA
  const aggregates: PlatformAggregate[] = useMemo(() => {
    const purchaseSessions = new Set(
      purchases.filter((p) => p.session_id).map((p) => p.session_id as string),
    )
    const sessionToRevenue = new Map<string, number>()
    purchases.forEach((p) => {
      if (p.session_id) {
        sessionToRevenue.set(
          p.session_id,
          (sessionToRevenue.get(p.session_id) || 0) + Number(p.order_total),
        )
      }
    })

    const map = new Map<string, { clicks: number; purchases: number; revenue: number }>()
    filteredClicks.forEach((c) => {
      const key = c.platform
      const cur = map.get(key) || { clicks: 0, purchases: 0, revenue: 0 }
      cur.clicks += 1
      if (purchaseSessions.has(c.session_id)) {
        cur.purchases += 1
        cur.revenue += sessionToRevenue.get(c.session_id) || 0
      }
      map.set(key, cur)
    })

    // Include platforms that have spend but no clicks yet, so ROAS=0 surfaces clearly
    platformSpend.forEach((_, platform) => {
      if (!map.has(platform)) {
        map.set(platform, { clicks: 0, purchases: 0, revenue: 0 })
      }
    })

    const totalClicks = filteredClicks.length || 1
    return Array.from(map.entries())
      .map(([platform, agg]) => {
        const spend = platformSpend.get(platform) || 0
        const returns = computeReturns({
          spend,
          revenue: agg.revenue,
          clicks: agg.clicks,
          conversions: agg.purchases,
        })
        return {
          platform,
          meta: PLATFORM_META[platform] || PLATFORM_META.other,
          clicks: agg.clicks,
          purchases: agg.purchases,
          revenue: agg.revenue,
          spend,
          cvr: agg.clicks > 0 ? (agg.purchases / agg.clicks) * 100 : 0,
          share: (agg.clicks / totalClicks) * 100,
          roas: returns.roas,
          cpc: returns.cpc,
          cpa: returns.cpa,
        }
      })
      .sort((a, b) => b.clicks + b.spend / 100 - (a.clicks + a.spend / 100))
  }, [filteredClicks, purchases, platformSpend])

  // Top campaigns with ROAS
  const topCampaigns = useMemo(() => {
    const purchaseSessions = new Set(
      purchases.filter((p) => p.session_id).map((p) => p.session_id as string),
    )
    const sessionToRevenue = new Map<string, number>()
    purchases.forEach((p) => {
      if (p.session_id) {
        sessionToRevenue.set(
          p.session_id,
          (sessionToRevenue.get(p.session_id) || 0) + Number(p.order_total),
        )
      }
    })
    const map = new Map<
      string,
      {
        platform: string
        campaign: string
        clicks: number
        purchases: number
        revenue: number
      }
    >()
    filteredClicks.forEach((c) => {
      if (!c.utm_campaign) return
      const key = `${c.platform}::${c.utm_campaign}`
      const cur = map.get(key) || {
        platform: c.platform,
        campaign: c.utm_campaign,
        clicks: 0,
        purchases: 0,
        revenue: 0,
      }
      cur.clicks += 1
      if (purchaseSessions.has(c.session_id)) {
        cur.purchases += 1
        cur.revenue += sessionToRevenue.get(c.session_id) || 0
      }
      map.set(key, cur)
    })

    // Add campaigns that have spend but no clicks yet
    campaignSpend.forEach((_, key) => {
      if (!map.has(key)) {
        const [platform, campaign] = key.split("::")
        map.set(key, { platform, campaign, clicks: 0, purchases: 0, revenue: 0 })
      }
    })

    return Array.from(map.entries())
      .map(([key, agg]) => {
        const spend = campaignSpend.get(key) || 0
        const returns = computeReturns({
          spend,
          revenue: agg.revenue,
          clicks: agg.clicks,
          conversions: agg.purchases,
        })
        return {
          ...agg,
          spend,
          revenue: agg.revenue,
          cvr: agg.clicks > 0 ? (agg.purchases / agg.clicks) * 100 : 0,
          roas: returns.roas,
          cpa: returns.cpa,
        }
      })
      .sort((a, b) => b.clicks + b.spend / 100 - (a.clicks + a.spend / 100))
      .slice(0, 10)
  }, [filteredClicks, purchases, campaignSpend])

  // Totals
  const totalClicks = filteredClicks.length
  const totalAttributedPurchases = aggregates.reduce((s, a) => s + a.purchases, 0)
  const totalAttributedRevenue = aggregates.reduce((s, a) => s + a.revenue, 0)
  const overallCvr = totalClicks > 0 ? (totalAttributedPurchases / totalClicks) * 100 : 0
  const overallRoas = totalSpend > 0 ? totalAttributedRevenue / totalSpend : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-sm text-muted-foreground">Loading ad attribution data...</div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-serif text-foreground">Ads Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Where your traffic comes from — clicks, conversions, spend, and true ROAS
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {usingMock && (
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
              Demo Data
            </span>
          )}
          <span
            key={pulse}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors ${
              isLive
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-muted text-muted-foreground border-border/60"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isLive ? "bg-green-400 animate-ping" : "bg-muted-foreground"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isLive ? "bg-green-500" : "bg-muted-foreground"
                }`}
              />
            </span>
            {isLive ? "Live" : "Connecting"}
          </span>
          <button
            onClick={() => setSpendOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            <Wallet className="w-3.5 h-3.5" />
            Manage Spend
          </button>
          <div className="flex items-center gap-1 bg-card border border-border/60 rounded-full p-1">
            {(["24h", "7d", "30d", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  range === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "all" ? "All" : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary stat row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <SummaryCard
          icon={MousePointer}
          label="Total Clicks"
          value={totalClicks.toLocaleString()}
          accent="text-foreground"
        />
        <SummaryCard
          icon={DollarSign}
          label="Ad Spend"
          value={`$${totalSpend.toFixed(2)}`}
          accent="text-amber-700"
        />
        <SummaryCard
          icon={ShoppingCart}
          label="Attributed Revenue"
          value={`$${totalAttributedRevenue.toFixed(2)}`}
          accent="text-green-700"
        />
        <SummaryCard
          icon={Target}
          label="ROAS"
          value={overallRoas == null ? "—" : `${overallRoas.toFixed(2)}×`}
          accent={
            overallRoas == null
              ? "text-muted-foreground"
              : overallRoas >= 3
              ? "text-green-700"
              : overallRoas >= 1
              ? "text-foreground"
              : "text-red-700"
          }
        />
        <SummaryCard
          icon={TrendingUp}
          label="Conversion Rate"
          value={`${overallCvr.toFixed(2)}%`}
          accent={overallCvr >= 2 ? "text-green-700" : "text-amber-700"}
        />
      </div>

      {/* Platform breakdown with ROAS */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg text-foreground">Platform Performance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Spend prorated to selected range. ROAS = attributed revenue ÷ spend.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            ${totalAttributedRevenue.toFixed(2)} revenue · ${totalSpend.toFixed(2)} spend
          </span>
        </div>

        {aggregates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No ad-attributed traffic yet in this range. Tag your ads with UTM parameters to see them here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-border/50">
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3">Platform</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">Spend</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">Clicks</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">CPC</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">Conv.</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">CPA</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">Revenue</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">CVR</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map((agg) => {
                  const Icon = agg.meta.icon
                  return (
                    <tr key={agg.platform} className="border-b border-border/30 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${agg.meta.bg}`}>
                            <Icon className={`w-4 h-4 ${agg.meta.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{agg.meta.label}</p>
                            <p className="text-[11px] text-muted-foreground">{agg.share.toFixed(1)}% of traffic</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-foreground text-right tabular-nums">
                        {agg.spend > 0 ? `$${agg.spend.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3 text-sm text-foreground text-right tabular-nums">
                        {agg.clicks.toLocaleString()}
                      </td>
                      <td className="py-3 text-sm text-foreground text-right tabular-nums">
                        {agg.cpc == null ? "—" : `$${agg.cpc.toFixed(2)}`}
                      </td>
                      <td className="py-3 text-sm text-foreground text-right tabular-nums">{agg.purchases}</td>
                      <td className="py-3 text-sm text-foreground text-right tabular-nums">
                        {agg.cpa == null ? "—" : `$${agg.cpa.toFixed(2)}`}
                      </td>
                      <td className="py-3 text-sm text-foreground text-right tabular-nums">
                        ${agg.revenue.toFixed(2)}
                      </td>
                      <td
                        className={`py-3 text-sm text-right font-medium tabular-nums ${
                          agg.cvr >= 3 ? "text-green-700" : agg.cvr >= 1 ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {agg.cvr.toFixed(2)}%
                      </td>
                      <td className="py-3 text-right">
                        <RoasBadge roas={agg.roas} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top campaigns */}
      <div className="bg-card rounded-2xl p-6 border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg text-foreground">Top Campaigns</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Per-campaign performance with attributed revenue, spend, and ROAS
            </p>
          </div>
        </div>

        {topCampaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No tagged campaigns yet. Add <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">utm_campaign</code> to your ad URLs.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-border/50">
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3">Platform</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3">Campaign</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">Spend</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">Clicks</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">Conv.</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">CPA</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">Revenue</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">CVR</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((c) => {
                  const meta = PLATFORM_META[c.platform] || PLATFORM_META.other
                  const Icon = meta.icon
                  return (
                    <tr key={`${c.platform}-${c.campaign}`} className="border-b border-border/30 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${meta.bg}`}>
                            <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                          </div>
                          <span className="text-xs text-foreground">{meta.label}</span>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-foreground font-mono">{c.campaign}</td>
                      <td className="py-3 text-sm text-foreground text-right tabular-nums">
                        {c.spend > 0 ? `$${c.spend.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3 text-sm text-foreground text-right tabular-nums">{c.clicks.toLocaleString()}</td>
                      <td className="py-3 text-sm text-foreground text-right tabular-nums">{c.purchases}</td>
                      <td className="py-3 text-sm text-foreground text-right tabular-nums">
                        {c.cpa == null ? "—" : `$${c.cpa.toFixed(2)}`}
                      </td>
                      <td className="py-3 text-sm text-foreground text-right tabular-nums">${c.revenue.toFixed(2)}</td>
                      <td
                        className={`py-3 text-sm text-right font-medium tabular-nums ${
                          c.cvr >= 3 ? "text-green-700" : c.cvr >= 1 ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {c.cvr.toFixed(2)}%
                      </td>
                      <td className="py-3 text-right">
                        <RoasBadge roas={c.roas} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Spend manager drawer */}
      {spendOpen && (
        <SpendManager
          rows={spendRows}
          onClose={() => setSpendOpen(false)}
          onChange={load}
        />
      )}
    </>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <p className={`text-2xl font-serif ${accent}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

function RoasBadge({ roas }: { roas: number | null }) {
  if (roas == null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const color =
    roas >= 3
      ? "bg-green-50 text-green-700 border-green-200"
      : roas >= 1
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200"
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border tabular-nums ${color}`}>
      {roas.toFixed(2)}×
    </span>
  )
}

function SpendManager({
  rows,
  onClose,
  onChange,
}: {
  rows: AdSpendRow[]
  onClose: () => void
  onChange: () => void
}) {
  const [platform, setPlatform] = useState("facebook")
  const [campaign, setCampaign] = useState("")
  const [periodStart, setPeriodStart] = useState(daysAgo(6))
  const [periodEnd, setPeriodEnd] = useState(today())
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt < 0) {
      setError("Amount must be a non-negative number")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/ad-spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          campaign: campaign.trim() || null,
          period_start: periodStart,
          period_end: periodEnd,
          amount: amt,
          currency,
          notes: notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      setAmount("")
      setCampaign("")
      setNotes("")
      onChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this spend entry?")) return
    try {
      const res = await fetch(`/api/ad-spend/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete")
      }
      onChange()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-foreground/30 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-full bg-background border-l border-border shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border/60 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-serif text-lg text-foreground">Manage Ad Spend</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Spend is prorated by overlap days when shown across date ranges
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 border-b border-border/60 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full text-sm bg-card border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_META[p]?.label || p}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Campaign <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <input
                type="text"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="summer-glow-q3"
                className="w-full text-sm bg-card border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Period start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
                className="w-full text-sm bg-card border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Period end</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
                className="w-full text-sm bg-card border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.00"
                required
                className="w-full text-sm bg-card border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                className="w-full text-sm bg-card border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 uppercase"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Notes <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Imported from Meta Ads Manager export"
                className="w-full text-sm bg-card border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {submitting ? "Saving..." : "Add spend entry"}
          </button>
        </form>

        <div className="p-6">
          <h4 className="font-serif text-sm text-foreground mb-3">Spend entries ({rows.length})</h4>
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">
              No entries yet. Add your first one above to start tracking ROAS.
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => {
                const meta = PLATFORM_META[row.platform] || PLATFORM_META.other
                const Icon = meta.icon
                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 bg-card border border-border/50 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${meta.bg} flex-shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {meta.label}
                          {row.campaign && (
                            <span className="text-muted-foreground"> · </span>
                          )}
                          {row.campaign && (
                            <span className="font-mono text-xs text-foreground">{row.campaign}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.period_start} → {row.period_end}
                          {row.notes && <span> · {row.notes}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-medium text-foreground tabular-nums">
                        {row.currency} {Number(row.amount).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
