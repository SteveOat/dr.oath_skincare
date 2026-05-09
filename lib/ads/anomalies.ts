// Anomaly detection for ad platforms — compares the last N days vs the prior N days
// and flags meaningful drops in CVR, CTR (clicks), and ROAS.

import { type AdSpendRow, spendByPlatform } from "@/lib/ads/spend"

export interface AdClickRow {
  session_id: string
  platform: string | null
  utm_campaign?: string | null
  created_at: string
}

export interface PurchaseRow {
  session_id?: string | null
  order_total: number | string
  created_at: string
}

export type AnomalySeverity = "critical" | "warning" | "info"
export type AnomalyMetric = "cvr" | "clicks" | "roas"

export interface Anomaly {
  platform: string
  metric: AnomalyMetric
  severity: AnomalySeverity
  /** Relative change, e.g. -0.42 means 42% drop */
  changePct: number
  /** Last-N-days value */
  current: number
  /** Prior-N-days value */
  previous: number
  /** Human-readable summary used by the chatbot system prompt */
  message: string
  /** Suggested next action */
  recommendation: string
  /** Sample size in current window so the chatbot can judge confidence */
  sampleSize: number
}

export interface AnomalyDetectorOptions {
  /** Window size in days for both the current and prior periods. Default 7. */
  windowDays?: number
  /** Relative drop threshold (0.30 = 30%). Default 0.30. */
  cvrDropThreshold?: number
  /** Click-volume drop threshold. Default 0.40 (40%). */
  clicksDropThreshold?: number
  /** ROAS drop threshold (only checked when spend data is present). Default 0.30. */
  roasDropThreshold?: number
  /** Minimum prior-period clicks required to be considered statistically meaningful. Default 10. */
  minSampleSize?: number
  /** Reference "now" — defaults to current time. Pass for deterministic tests. */
  now?: Date
}

const DEFAULTS: Required<Omit<AnomalyDetectorOptions, "now">> = {
  windowDays: 7,
  cvrDropThreshold: 0.30,
  clicksDropThreshold: 0.40,
  roasDropThreshold: 0.30,
  minSampleSize: 10,
}

interface PlatformWindow {
  clicks: number
  conversions: number
  revenue: number
  spend: number
  cvr: number
  roas: number | null
}

function inRange(d: Date, start: Date, endExclusive: Date) {
  return d >= start && d < endExclusive
}

function aggregate(
  platform: string,
  clicks: AdClickRow[],
  purchaseSessionTotals: Map<string, number>,
  spendRows: AdSpendRow[],
  start: Date,
  end: Date,
): PlatformWindow {
  let clickCount = 0
  let conversions = 0
  let revenue = 0
  for (const c of clicks) {
    if (c.platform !== platform) continue
    const t = new Date(c.created_at)
    if (!inRange(t, start, end)) continue
    clickCount++
    const r = purchaseSessionTotals.get(c.session_id)
    if (r !== undefined && r > 0) {
      conversions++
      revenue += r
    }
  }
  const platformSpendMap = spendByPlatform(spendRows, start, end)
  const spend = platformSpendMap.get(platform) || 0
  const cvr = clickCount > 0 ? conversions / clickCount : 0
  const roas = spend > 0 ? revenue / spend : null
  return { clicks: clickCount, conversions, revenue, spend, cvr, roas }
}

function severityForDrop(pct: number, threshold: number): AnomalySeverity {
  // pct is negative for drops; magnitude relative to threshold determines severity
  const magnitude = Math.abs(pct)
  if (magnitude >= threshold * 2) return "critical"
  if (magnitude >= threshold * 1.4) return "warning"
  return "info"
}

function formatPct(pct: number): string {
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${(pct * 100).toFixed(1)}%`
}

export function detectAnomalies(
  clicks: AdClickRow[],
  purchases: PurchaseRow[],
  spendRows: AdSpendRow[] = [],
  opts: AnomalyDetectorOptions = {},
): Anomaly[] {
  const { windowDays, cvrDropThreshold, clicksDropThreshold, roasDropThreshold, minSampleSize } = {
    ...DEFAULTS,
    ...opts,
  }
  const now = opts.now ?? new Date()
  const dayMs = 24 * 60 * 60 * 1000

  const currentEnd = now
  const currentStart = new Date(now.getTime() - windowDays * dayMs)
  const priorEnd = currentStart
  const priorStart = new Date(currentStart.getTime() - windowDays * dayMs)

  // Build session->revenue map once
  const purchaseSessionTotals = new Map<string, number>()
  for (const p of purchases) {
    if (!p.session_id) continue
    const total = typeof p.order_total === "string" ? parseFloat(p.order_total) : p.order_total
    if (!Number.isFinite(total)) continue
    purchaseSessionTotals.set(
      p.session_id,
      (purchaseSessionTotals.get(p.session_id) || 0) + total,
    )
  }

  // Discover platforms present in either window — exclude direct/organic since they aren't paid channels
  const platforms = new Set<string>()
  for (const c of clicks) {
    if (!c.platform) continue
    if (c.platform === "direct" || c.platform === "organic") continue
    const t = new Date(c.created_at)
    if (inRange(t, priorStart, currentEnd)) platforms.add(c.platform)
  }

  const anomalies: Anomaly[] = []

  for (const platform of platforms) {
    const cur = aggregate(platform, clicks, purchaseSessionTotals, spendRows, currentStart, currentEnd)
    const prev = aggregate(platform, clicks, purchaseSessionTotals, spendRows, priorStart, priorEnd)

    // CVR drop
    if (prev.clicks >= minSampleSize && prev.cvr > 0) {
      const change = (cur.cvr - prev.cvr) / prev.cvr
      if (change <= -cvrDropThreshold) {
        anomalies.push({
          platform,
          metric: "cvr",
          severity: severityForDrop(change, cvrDropThreshold),
          changePct: change,
          current: cur.cvr,
          previous: prev.cvr,
          sampleSize: cur.clicks,
          message: `${platform} CVR dropped ${formatPct(change)} week-over-week (${(prev.cvr * 100).toFixed(2)}% → ${(cur.cvr * 100).toFixed(2)}%, ${cur.conversions}/${cur.clicks} conv last 7d vs ${prev.conversions}/${prev.clicks} prior 7d).`,
          recommendation:
            cur.clicks < minSampleSize
              ? `Sample size is small (${cur.clicks} clicks) — keep monitoring before reacting.`
              : `Audit the ${platform} landing page experience, recent creative changes, and audience overlap. If spend is flat, the issue is downstream (page/checkout). If clicks are also down, the issue is upstream (ad fatigue or audience).`,
        })
      }
    }

    // Click-volume drop (traffic anomaly)
    if (prev.clicks >= minSampleSize) {
      const change = (cur.clicks - prev.clicks) / prev.clicks
      if (change <= -clicksDropThreshold) {
        anomalies.push({
          platform,
          metric: "clicks",
          severity: severityForDrop(change, clicksDropThreshold),
          changePct: change,
          current: cur.clicks,
          previous: prev.clicks,
          sampleSize: cur.clicks,
          message: `${platform} click volume dropped ${formatPct(change)} week-over-week (${prev.clicks} → ${cur.clicks} clicks).`,
          recommendation: `Check if a campaign was paused, daily budget hit, or if bid strategy changed. Validate your tracking is firing correctly on the landing page.`,
        })
      }
    }

    // ROAS drop (only if spend recorded both periods)
    if (prev.roas != null && cur.roas != null && prev.roas > 0) {
      const change = (cur.roas - prev.roas) / prev.roas
      if (change <= -roasDropThreshold) {
        anomalies.push({
          platform,
          metric: "roas",
          severity: severityForDrop(change, roasDropThreshold),
          changePct: change,
          current: cur.roas,
          previous: prev.roas,
          sampleSize: cur.clicks,
          message: `${platform} ROAS dropped ${formatPct(change)} week-over-week (${prev.roas.toFixed(2)}× → ${cur.roas.toFixed(2)}×, spend $${cur.spend.toFixed(2)} returning $${cur.revenue.toFixed(2)} last 7d).`,
          recommendation:
            cur.roas < 1
              ? `${platform} is now unprofitable on a 7-day basis. Recommend pausing worst-performing campaigns or shifting budget to a higher-ROAS platform.`
              : `Investigate creative fatigue or audience saturation. Consider rotating ad creative or refreshing audiences before scaling further.`,
        })
      }
    }
  }

  // Sort: critical first, then by magnitude of drop
  anomalies.sort((a, b) => {
    const sev = (s: AnomalySeverity) => (s === "critical" ? 0 : s === "warning" ? 1 : 2)
    const sd = sev(a.severity) - sev(b.severity)
    if (sd !== 0) return sd
    return Math.abs(b.changePct) - Math.abs(a.changePct)
  })

  return anomalies
}
