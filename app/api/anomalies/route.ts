import { createClient } from "@/lib/supabase/server"
import { detectAnomalies } from "@/lib/ads/anomalies"
import type { AdSpendRow } from "@/lib/ads/spend"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createClient()

    const [clicksRes, purchasesRes, spendRes] = await Promise.all([
      supabase
        .from("analytics_ad_clicks")
        .select("session_id, platform, utm_campaign, created_at"),
      supabase
        .from("analytics_purchases")
        .select("session_id, order_total, created_at"),
      supabase
        .from("analytics_ad_spend")
        .select("id, platform, campaign, period_start, period_end, amount, currency"),
    ])

    const adSpendRows: AdSpendRow[] = (spendRes.data || []).map((r: any) => ({
      ...r,
      amount: Number(r.amount),
    }))

    const anomalies = detectAnomalies(
      clicksRes.data || [],
      purchasesRes.data || [],
      adSpendRows,
    )

    return Response.json({
      anomalies,
      count: anomalies.length,
      criticalCount: anomalies.filter((a) => a.severity === "critical").length,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[anomalies] failed:", error)
    return Response.json(
      { anomalies: [], count: 0, criticalCount: 0, error: "failed" },
      { status: 200 },
    )
  }
}
