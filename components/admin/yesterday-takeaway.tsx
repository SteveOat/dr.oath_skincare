"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import useSWR from "swr"

type Insight = {
  insight_date: string
  headline: string
  takeaway: string
  recommendation: string
  key_metric_label: string
  key_metric_value: string
  sentiment: "positive" | "neutral" | "negative"
  generated_at?: string
  model?: string | null
}

type Snapshot = {
  date: string
  totals: {
    clicks: number
    conversions: number
    revenue: number
    spend: number
    roas: number | null
    cpa: number | null
    cvr: number
  }
  changesVsBaseline: {
    clicksPct: number | null
    conversionsPct: number | null
    revenuePct: number | null
    spendPct: number | null
    roasPct: number | null
  }
}

type ApiResponse = {
  insight: Insight
  snapshot: Snapshot
  cached: boolean
}

const fetcher = async (url: string): Promise<ApiResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

function sentimentStyles(sentiment: Insight["sentiment"]) {
  switch (sentiment) {
    case "positive":
      return {
        ring: "ring-green-200",
        bg: "bg-gradient-to-br from-green-50 via-card to-card",
        accent: "text-green-700",
        accentBg: "bg-green-100",
        Icon: TrendingUp,
      }
    case "negative":
      return {
        ring: "ring-red-200",
        bg: "bg-gradient-to-br from-red-50 via-card to-card",
        accent: "text-red-700",
        accentBg: "bg-red-100",
        Icon: TrendingDown,
      }
    default:
      return {
        ring: "ring-amber-200",
        bg: "bg-gradient-to-br from-amber-50 via-card to-card",
        accent: "text-amber-700",
        accentBg: "bg-amber-100",
        Icon: Minus,
      }
  }
}

function formatRelative(iso?: string) {
  if (!iso) return ""
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function PctChip({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value == null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  // For "spend", a decrease is good — caller can pass invert to flip color
  const positive = invert ? value < 0 : value >= 0
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        positive ? "text-green-700" : "text-red-600"
      }`}
    >
      <Icon className="w-3 h-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

export function YesterdayTakeaway() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    "/api/ad-insights/yesterday",
    fetcher,
    { revalidateOnFocus: false },
  )
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true)
      const fresh = await fetcher("/api/ad-insights/yesterday?refresh=1")
      await mutate(fresh, { revalidate: false })
    } catch (e) {
      console.error("[v0] takeaway refresh failed:", e)
    } finally {
      setRefreshing(false)
    }
  }, [mutate])

  if (isLoading) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-6 mb-8 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
        </div>
        <div className="h-6 w-3/4 rounded bg-muted mb-3" />
        <div className="h-4 w-full rounded bg-muted mb-2" />
        <div className="h-4 w-5/6 rounded bg-muted" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Daily ad takeaway unavailable. {error instanceof Error ? error.message : ""}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-sm font-medium text-foreground hover:underline"
          >
            {refreshing ? "Retrying..." : "Try again"}
          </button>
        </div>
      </div>
    )
  }

  const { insight, snapshot } = data
  const styles = sentimentStyles(insight.sentiment)

  return (
    <div
      className={`relative ${styles.bg} border border-border/60 rounded-2xl p-6 mb-8 ring-1 ${styles.ring}`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles.accentBg} ${styles.accent}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Yesterday&apos;s Ad Takeaway
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(insight.insight_date + "T00:00:00Z").toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          {insight.generated_at && (
            <span className="text-xs text-muted-foreground">
              · generated {formatRelative(insight.generated_at)}
            </span>
          )}
          {data.cached && (
            <span className="text-xs text-muted-foreground">· cached</span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-foreground transition-colors disabled:opacity-50"
          title="Regenerate insight from latest data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Regenerating" : "Regenerate"}
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_auto] gap-6">
        <div>
          <h3 className="font-serif text-xl text-foreground mb-2 text-balance">
            {insight.headline}
          </h3>
          <p className="text-sm text-foreground/80 leading-relaxed mb-4 text-pretty">
            {insight.takeaway}
          </p>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-background/60 border border-border/40">
            <div className="w-1 self-stretch rounded-full bg-primary/60 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Recommended action
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {insight.recommendation}
              </p>
            </div>
          </div>
        </div>

        {/* Right: key metric + mini snapshot */}
        <div className="lg:w-56 flex flex-col gap-4">
          <div className="flex flex-col items-start lg:items-end">
            <span className="text-xs text-muted-foreground mb-1">
              {insight.key_metric_label}
            </span>
            <span className={`text-3xl font-semibold ${styles.accent}`}>
              {insight.key_metric_value}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/40">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                Spend
              </p>
              <p className="text-sm font-medium text-foreground">
                ${snapshot.totals.spend.toFixed(2)}
              </p>
              <PctChip value={snapshot.changesVsBaseline.spendPct} invert />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                Revenue
              </p>
              <p className="text-sm font-medium text-foreground">
                ${snapshot.totals.revenue.toFixed(2)}
              </p>
              <PctChip value={snapshot.changesVsBaseline.revenuePct} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                Clicks
              </p>
              <p className="text-sm font-medium text-foreground">
                {snapshot.totals.clicks.toLocaleString()}
              </p>
              <PctChip value={snapshot.changesVsBaseline.clicksPct} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                Conv.
              </p>
              <p className="text-sm font-medium text-foreground">
                {snapshot.totals.conversions.toLocaleString()}
              </p>
              <PctChip value={snapshot.changesVsBaseline.conversionsPct} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
