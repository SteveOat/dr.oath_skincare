// Builds a snapshot of yesterday's ad performance + a 7-day-prior baseline,
// used both by the AI insight generator and as a possible chatbot context.

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  type AdSpendRow,
  computeReturns,
  spendByPlatform,
  totalSpendInRange,
} from "./spend"

export type PlatformDayStats = {
  platform: string
  clicks: number
  conversions: number
  revenue: number
  spend: number
  roas: number | null
  cpc: number | null
  cpa: number | null
  cvr: number
}

export type YesterdaySnapshot = {
  date: string // YYYY-MM-DD
  baselineLabel: string
  totals: {
    clicks: number
    conversions: number
    revenue: number
    spend: number
    roas: number | null
    cpa: number | null
    cvr: number
  }
  baseline: {
    avgDailyClicks: number
    avgDailyConversions: number
    avgDailyRevenue: number
    avgDailySpend: number
    avgDailyRoas: number | null
  }
  changesVsBaseline: {
    clicksPct: number | null
    conversionsPct: number | null
    revenuePct: number | null
    spendPct: number | null
    roasPct: number | null
  }
  platforms: PlatformDayStats[]
  topCampaigns: {
    platform: string
    campaign: string
    clicks: number
    conversions: number
  }[]
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function pctChange(current: number, baseline: number): number | null {
  if (baseline === 0) return current === 0 ? 0 : null
  return ((current - baseline) / baseline) * 100
}

export async function buildYesterdaySnapshot(
  supabase: SupabaseClient,
): Promise<YesterdaySnapshot> {
  const now = new Date()
  // Yesterday in UTC
  const yEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  const yStart = new Date(yEnd.getTime() - 24 * 60 * 60 * 1000)
  // Prior 7 days (the 7 days before yesterday)
  const baselineStart = new Date(yStart.getTime() - 7 * 24 * 60 * 60 * 1000)
  const baselineEnd = yStart

  const [adClicksRes, purchasesRes, spendRes] = await Promise.all([
    supabase
      .from("analytics_ad_clicks")
      .select("session_id, platform, utm_campaign, created_at")
      .gte("created_at", baselineStart.toISOString())
      .lt("created_at", yEnd.toISOString()),
    supabase
      .from("analytics_purchases")
      .select("session_id, order_total, created_at")
      .gte("created_at", baselineStart.toISOString())
      .lt("created_at", yEnd.toISOString()),
    supabase
      .from("analytics_ad_spend")
      .select("id, platform, campaign, period_start, period_end, amount, currency, notes, created_at"),
  ])

  const adClicks = (adClicksRes.data || []) as Array<{
    session_id: string | null
    platform: string | null
    utm_campaign: string | null
    created_at: string
  }>
  const purchases = (purchasesRes.data || []) as Array<{
    session_id: string | null
    order_total: number | string | null
    created_at: string
  }>
  const spendRows: AdSpendRow[] = (spendRes.data || []).map((r: any) => ({
    ...r,
    amount: Number(r.amount),
  }))

  const purchaseSessions = new Map<string, number>()
  purchases.forEach((p) => {
    if (!p.session_id) return
    purchaseSessions.set(
      p.session_id,
      (purchaseSessions.get(p.session_id) || 0) + Number(p.order_total || 0),
    )
  })

  // Bucket clicks into yesterday vs baseline window
  const yClicks = adClicks.filter((c) => {
    const t = new Date(c.created_at).getTime()
    return t >= yStart.getTime() && t < yEnd.getTime()
  })
  const baseClicks = adClicks.filter((c) => {
    const t = new Date(c.created_at).getTime()
    return t >= baselineStart.getTime() && t < baselineEnd.getTime()
  })

  // Per-platform yesterday aggregates
  const platformAgg = new Map<
    string,
    { clicks: number; conversions: number; revenue: number }
  >()
  yClicks.forEach((c) => {
    const p = c.platform || "other"
    const cur = platformAgg.get(p) || { clicks: 0, conversions: 0, revenue: 0 }
    cur.clicks++
    if (c.session_id && purchaseSessions.has(c.session_id)) {
      cur.conversions++
      cur.revenue += purchaseSessions.get(c.session_id) || 0
    }
    platformAgg.set(p, cur)
  })

  // Top campaigns yesterday
  const campaignAgg = new Map<
    string,
    { platform: string; campaign: string; clicks: number; conversions: number }
  >()
  yClicks.forEach((c) => {
    if (!c.utm_campaign) return
    const platform = c.platform || "other"
    const key = `${platform}::${c.utm_campaign}`
    const cur = campaignAgg.get(key) || {
      platform,
      campaign: c.utm_campaign,
      clicks: 0,
      conversions: 0,
    }
    cur.clicks++
    if (c.session_id && purchaseSessions.has(c.session_id)) cur.conversions++
    campaignAgg.set(key, cur)
  })

  // Spend prorated to yesterday vs the 7-day baseline
  const ySpendByPlatform = spendByPlatform(spendRows, yStart, yEnd)
  const totalYSpend = totalSpendInRange(spendRows, yStart, yEnd)
  const totalBaselineSpend = totalSpendInRange(spendRows, baselineStart, baselineEnd)

  const platforms: PlatformDayStats[] = Array.from(platformAgg.entries())
    .map(([platform, agg]) => {
      const spend = ySpendByPlatform.get(platform) || 0
      const r = computeReturns({
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
        roas: r.roas,
        cpc: r.cpc,
        cpa: r.cpa,
        cvr: agg.clicks > 0 ? (agg.conversions / agg.clicks) * 100 : 0,
      }
    })
    .sort((a, b) => (b.spend + b.revenue) - (a.spend + a.revenue))

  // Totals yesterday
  const totalClicks = yClicks.length
  const totalConversions = platforms.reduce((s, p) => s + p.conversions, 0)
  const totalRevenue = platforms.reduce((s, p) => s + p.revenue, 0)
  const totalReturns = computeReturns({
    spend: totalYSpend,
    revenue: totalRevenue,
    clicks: totalClicks,
    conversions: totalConversions,
  })

  // 7-day baseline daily averages
  const baselineConversions = baseClicks.filter(
    (c) => c.session_id && purchaseSessions.has(c.session_id),
  ).length
  const baselineRevenue = baseClicks.reduce((sum, c) => {
    if (c.session_id && purchaseSessions.has(c.session_id)) {
      return sum + (purchaseSessions.get(c.session_id) || 0)
    }
    return sum
  }, 0)
  const avgDailyClicks = baseClicks.length / 7
  const avgDailyConversions = baselineConversions / 7
  const avgDailyRevenue = baselineRevenue / 7
  const avgDailySpend = totalBaselineSpend / 7
  const avgDailyRoas = avgDailySpend > 0 ? avgDailyRevenue / avgDailySpend : null

  const topCampaigns = Array.from(campaignAgg.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5)

  return {
    date: ymd(yStart),
    baselineLabel: "prior 7-day daily average",
    totals: {
      clicks: totalClicks,
      conversions: totalConversions,
      revenue: totalRevenue,
      spend: totalYSpend,
      roas: totalReturns.roas,
      cpa: totalReturns.cpa,
      cvr: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
    },
    baseline: {
      avgDailyClicks,
      avgDailyConversions,
      avgDailyRevenue,
      avgDailySpend,
      avgDailyRoas,
    },
    changesVsBaseline: {
      clicksPct: pctChange(totalClicks, avgDailyClicks),
      conversionsPct: pctChange(totalConversions, avgDailyConversions),
      revenuePct: pctChange(totalRevenue, avgDailyRevenue),
      spendPct: pctChange(totalYSpend, avgDailySpend),
      roasPct:
        totalReturns.roas != null && avgDailyRoas != null
          ? pctChange(totalReturns.roas, avgDailyRoas)
          : null,
    },
    platforms,
    topCampaigns,
  }
}
