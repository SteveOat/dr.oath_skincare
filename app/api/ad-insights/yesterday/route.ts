import { NextResponse } from "next/server"
import { generateText, Output } from "ai"
import { xai } from "@ai-sdk/xai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { buildYesterdaySnapshot } from "@/lib/ads/yesterday-snapshot"

export const dynamic = "force-dynamic"

const insightSchema = z.object({
  headline: z
    .string()
    .describe("A short, punchy headline summarizing yesterday's ad performance. Max 8 words."),
  takeaway: z
    .string()
    .describe(
      "A 1-2 sentence plain-English takeaway. State what happened with concrete numbers. Avoid hedging.",
    ),
  recommendation: z
    .string()
    .describe(
      "One concrete action to take today. Be specific (which platform, which campaign, what to change).",
    ),
  keyMetricLabel: z.string().describe("Short label for the most important metric, e.g. 'ROAS' or 'CPA'."),
  keyMetricValue: z.string().describe("The metric value, formatted, e.g. '3.2×' or '$12.40'."),
  sentiment: z
    .enum(["positive", "neutral", "negative"])
    .describe("Overall sentiment based on whether yesterday outperformed the baseline."),
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const refresh = url.searchParams.get("refresh") === "1"

    const supabase = await createClient()
    const snapshot = await buildYesterdaySnapshot(supabase)
    const insightDate = snapshot.date

    // 1) Try cache unless refresh requested
    if (!refresh) {
      const { data: cached } = await supabase
        .from("daily_ad_insights")
        .select("*")
        .eq("insight_date", insightDate)
        .maybeSingle()

      if (cached) {
        return NextResponse.json({ insight: cached, snapshot, cached: true })
      }
    }

    // 2) Generate via AI SDK
    const hasAnyData =
      snapshot.totals.clicks > 0 ||
      snapshot.totals.spend > 0 ||
      snapshot.platforms.length > 0

    if (!hasAnyData) {
      const empty = {
        insight_date: insightDate,
        headline: "No ad activity yesterday",
        takeaway:
          "No tagged ad clicks or recorded ad spend were detected for yesterday. Tagged campaigns will be picked up automatically once visitors land via UTM-tagged URLs.",
        recommendation:
          "Tag your active ad URLs with utm_source, utm_campaign, and a click ID (fbclid, gclid, ttclid) so attribution starts flowing.",
        key_metric_label: "Tagged Clicks",
        key_metric_value: "0",
        sentiment: "neutral" as const,
        snapshot,
        model: null,
      }

      const { data: saved } = await supabase
        .from("daily_ad_insights")
        .upsert(empty, { onConflict: "insight_date" })
        .select()
        .maybeSingle()

      return NextResponse.json({ insight: saved || empty, snapshot, cached: false })
    }

    const platformLines = snapshot.platforms
      .map(
        (p) =>
          `- ${p.platform}: spend $${p.spend.toFixed(2)} | ${p.clicks} clicks | ${p.conversions} conv | revenue $${p.revenue.toFixed(2)} | ROAS ${p.roas == null ? "n/a" : `${p.roas.toFixed(2)}×`} | CPA ${p.cpa == null ? "n/a" : `$${p.cpa.toFixed(2)}`}`,
      )
      .join("\n")

    const campaignLines = snapshot.topCampaigns
      .map(
        (c, i) =>
          `${i + 1}. [${c.platform}] ${c.campaign}: ${c.clicks} clicks, ${c.conversions} conversions`,
      )
      .join("\n")

    const fmtPct = (n: number | null) =>
      n == null ? "n/a" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`

    const prompt = `You are an ad performance analyst. Analyze yesterday's ad data and produce a single takeaway.

DATE: ${insightDate}

YESTERDAY TOTALS:
- Tagged ad clicks: ${snapshot.totals.clicks}
- Conversions: ${snapshot.totals.conversions}
- Revenue: $${snapshot.totals.revenue.toFixed(2)}
- Ad spend: $${snapshot.totals.spend.toFixed(2)}
- ROAS: ${snapshot.totals.roas == null ? "n/a" : `${snapshot.totals.roas.toFixed(2)}×`}
- CPA: ${snapshot.totals.cpa == null ? "n/a" : `$${snapshot.totals.cpa.toFixed(2)}`}
- CVR: ${snapshot.totals.cvr.toFixed(2)}%

VS PRIOR 7-DAY DAILY AVERAGE:
- Clicks: ${fmtPct(snapshot.changesVsBaseline.clicksPct)}
- Conversions: ${fmtPct(snapshot.changesVsBaseline.conversionsPct)}
- Revenue: ${fmtPct(snapshot.changesVsBaseline.revenuePct)}
- Spend: ${fmtPct(snapshot.changesVsBaseline.spendPct)}
- ROAS: ${fmtPct(snapshot.changesVsBaseline.roasPct)}

PER-PLATFORM YESTERDAY:
${platformLines || "(none)"}

TOP CAMPAIGNS YESTERDAY:
${campaignLines || "(none)"}

ROAS interpretation:
- ≥3.0× = strong, scale
- 1.5–3.0× = healthy, optimize
- 1.0–1.5× = marginal, review landing pages
- <1.0× = unprofitable, pause or rework

Pick the most important story (best or worst platform/campaign, big swing vs baseline, or overall ROAS health) and produce the JSON output.`

    const result = await generateText({
      model: xai("grok-4.3-latest"),
      output: Output.object({ schema: insightSchema }),
      prompt,
      maxRetries: 1,
    })

    const insight = result.output

    const row = {
      insight_date: insightDate,
      headline: insight.headline,
      takeaway: insight.takeaway,
      recommendation: insight.recommendation,
      key_metric_label: insight.keyMetricLabel,
      key_metric_value: insight.keyMetricValue,
      sentiment: insight.sentiment,
      snapshot,
      model: "xai/grok-4.3-latest",
    }

    const { data: saved, error: saveError } = await supabase
      .from("daily_ad_insights")
      .upsert(row, { onConflict: "insight_date" })
      .select()
      .maybeSingle()

    if (saveError) {
      // Still return the insight even if persistence failed
      return NextResponse.json({ insight: row, snapshot, cached: false, persistError: saveError.message })
    }

    return NextResponse.json({ insight: saved || row, snapshot, cached: false })
  } catch (error: any) {
    console.error("[ad-insights] failed:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to generate insight" },
      { status: 500 },
    )
  }
}
