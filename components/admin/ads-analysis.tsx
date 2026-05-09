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
  TrendingDown,
  Target,
  MousePointer,
  ShoppingCart,
  Activity,
} from "lucide-react"

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

type PlatformAggregate = {
  platform: string
  meta: typeof PLATFORM_META[keyof typeof PLATFORM_META]
  clicks: number
  purchases: number
  revenue: number
  cvr: number
  share: number
}

export function AdsAnalysis() {
  const [adClicks, setAdClicks] = useState<AdClick[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "all">("7d")
  const [isLive, setIsLive] = useState(false)
  const [pulse, setPulse] = useState(0)

  async function load() {
    const supabase = createClient()
    try {
      const [clicksRes, purchasesRes] = await Promise.all([
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
      ])

      const clicks = (clicksRes.data || []) as AdClick[]
      const purchasesData = (purchasesRes.data || []) as Purchase[]

      if (clicks.length === 0) {
        setAdClicks(MOCK_AD_CLICKS)
        setPurchases(MOCK_PURCHASES)
        setUsingMock(true)
      } else {
        setAdClicks(clicks)
        setPurchases(purchasesData)
        setUsingMock(false)
      }
    } catch (err) {
      console.error("[v0] ads-analysis load failed:", err)
      setAdClicks(MOCK_AD_CLICKS)
      setPurchases(MOCK_PURCHASES)
      setUsingMock(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const supabase = createClient()
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
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"))

    const interval = setInterval(load, 30000)
    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  // Filter by range
  const filteredClicks = useMemo(() => {
    if (range === "all") return adClicks
    const cutoff = Date.now() - ({ "24h": 1, "7d": 7, "30d": 30 }[range]) * 24 * 60 * 60 * 1000
    return adClicks.filter((c) => new Date(c.created_at).getTime() >= cutoff)
  }, [adClicks, range])

  // Build platform aggregates
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

    const totalClicks = filteredClicks.length || 1
    return Array.from(map.entries())
      .map(([platform, agg]) => ({
        platform,
        meta: PLATFORM_META[platform] || PLATFORM_META.other,
        clicks: agg.clicks,
        purchases: agg.purchases,
        revenue: agg.revenue,
        cvr: agg.clicks > 0 ? (agg.purchases / agg.clicks) * 100 : 0,
        share: (agg.clicks / totalClicks) * 100,
      }))
      .sort((a, b) => b.clicks - a.clicks)
  }, [filteredClicks, purchases])

  // Top campaigns
  const topCampaigns = useMemo(() => {
    const purchaseSessions = new Set(
      purchases.filter((p) => p.session_id).map((p) => p.session_id as string),
    )
    const map = new Map<
      string,
      { platform: string; campaign: string; clicks: number; purchases: number }
    >()
    filteredClicks.forEach((c) => {
      if (!c.utm_campaign) return
      const key = `${c.platform}::${c.utm_campaign}`
      const cur = map.get(key) || {
        platform: c.platform,
        campaign: c.utm_campaign,
        clicks: 0,
        purchases: 0,
      }
      cur.clicks += 1
      if (purchaseSessions.has(c.session_id)) cur.purchases += 1
      map.set(key, cur)
    })
    return Array.from(map.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8)
  }, [filteredClicks, purchases])

  // Totals
  const totalClicks = filteredClicks.length
  const totalAttributedPurchases = aggregates.reduce((s, a) => s + a.purchases, 0)
  const totalAttributedRevenue = aggregates.reduce((s, a) => s + a.revenue, 0)
  const overallCvr = totalClicks > 0 ? (totalAttributedPurchases / totalClicks) * 100 : 0
  const paidShare = useMemo(() => {
    const paid = aggregates
      .filter((a) => !["direct", "organic"].includes(a.platform))
      .reduce((s, a) => s + a.clicks, 0)
    return totalClicks > 0 ? (paid / totalClicks) * 100 : 0
  }, [aggregates, totalClicks])

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
            Where your traffic comes from, ranked by platform — clicks, conversions, and revenue
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
          {/* Range selector */}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          icon={MousePointer}
          label="Total Clicks"
          value={totalClicks.toLocaleString()}
          accent="text-foreground"
        />
        <SummaryCard
          icon={Target}
          label="Paid Share"
          value={`${paidShare.toFixed(1)}%`}
          accent="text-primary"
        />
        <SummaryCard
          icon={ShoppingCart}
          label="Attributed Purchases"
          value={totalAttributedPurchases.toLocaleString()}
          accent="text-green-700"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Conversion Rate"
          value={`${overallCvr.toFixed(2)}%`}
          accent={overallCvr >= 2 ? "text-green-700" : "text-amber-700"}
        />
      </div>

      {/* Platform breakdown */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg text-foreground">Traffic by Platform</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Clicks attributed via UTM parameters and click IDs (fbclid, gclid, ttclid)
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            ${totalAttributedRevenue.toFixed(2)} attributed revenue
          </span>
        </div>

        {aggregates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No ad-attributed traffic yet in this range. Tag your ads with UTM parameters to see them here.
          </p>
        ) : (
          <div className="space-y-3">
            {aggregates.map((agg) => {
              const Icon = agg.meta.icon
              return (
                <div
                  key={agg.platform}
                  className="grid grid-cols-12 items-center gap-4 py-3 border-b border-border/30 last:border-0"
                >
                  <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${agg.meta.bg}`}>
                      <Icon className={`w-5 h-5 ${agg.meta.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{agg.meta.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {agg.share.toFixed(1)}% of traffic
                      </p>
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${agg.meta.bg.replace("bg-", "bg-").replace("/10", "/60")}`}
                        style={{ width: `${agg.share}%` }}
                      />
                    </div>
                  </div>

                  <div className="col-span-4 md:col-span-1 text-right">
                    <p className="text-sm font-medium text-foreground">{agg.clicks.toLocaleString()}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Clicks</p>
                  </div>
                  <div className="col-span-4 md:col-span-1 text-right">
                    <p className="text-sm font-medium text-foreground">{agg.purchases}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conv.</p>
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right">
                    <p
                      className={`text-sm font-medium ${
                        agg.cvr >= 3
                          ? "text-green-700"
                          : agg.cvr >= 1
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {agg.cvr.toFixed(2)}%
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">CVR</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Top campaigns */}
      <div className="bg-card rounded-2xl p-6 border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg text-foreground">Top Campaigns</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ranked by clicks, with attributed conversions
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
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">Clicks</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">Conv.</th>
                  <th className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium pb-3 text-right">CVR</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((c) => {
                  const meta = PLATFORM_META[c.platform] || PLATFORM_META.other
                  const Icon = meta.icon
                  const cvr = c.clicks > 0 ? (c.purchases / c.clicks) * 100 : 0
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
                      <td className="py-3 text-sm text-foreground text-right">{c.clicks.toLocaleString()}</td>
                      <td className="py-3 text-sm text-foreground text-right">{c.purchases}</td>
                      <td
                        className={`py-3 text-sm text-right font-medium ${
                          cvr >= 3 ? "text-green-700" : cvr >= 1 ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {cvr.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
