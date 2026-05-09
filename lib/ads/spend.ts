// Shared utilities for prorating ad spend over arbitrary date ranges
// and computing ROAS / CPC / CPA against attributed clicks + revenue.

export type AdSpendRow = {
  id: string
  platform: string
  campaign: string | null
  period_start: string // YYYY-MM-DD
  period_end: string // YYYY-MM-DD
  amount: number
  currency: string
  notes: string | null
  created_at: string
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function parseYMD(s: string): Date {
  // Treat as UTC midnight for stable diff math
  return new Date(`${s}T00:00:00.000Z`)
}

/**
 * Returns the prorated portion of `row.amount` that falls within
 * [rangeStart, rangeEnd] inclusive. If no overlap, returns 0.
 */
export function proratedSpendForRange(
  row: Pick<AdSpendRow, "amount" | "period_start" | "period_end">,
  rangeStart: Date,
  rangeEnd: Date,
): number {
  const ps = parseYMD(row.period_start)
  const pe = parseYMD(row.period_end)
  const rs = dateOnly(rangeStart)
  const re = dateOnly(rangeEnd)

  const totalDays = Math.max(1, Math.round((pe.getTime() - ps.getTime()) / MS_PER_DAY) + 1)
  const overlapStart = ps.getTime() > rs.getTime() ? ps : rs
  const overlapEnd = pe.getTime() < re.getTime() ? pe : re
  const overlapMs = overlapEnd.getTime() - overlapStart.getTime()
  if (overlapMs < 0) return 0
  const overlapDays = Math.round(overlapMs / MS_PER_DAY) + 1
  if (overlapDays <= 0) return 0
  return Number(row.amount) * (overlapDays / totalDays)
}

/**
 * Sums prorated spend across many rows for a given range, grouped by platform.
 */
export function spendByPlatform(
  rows: AdSpendRow[],
  rangeStart: Date,
  rangeEnd: Date,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const row of rows) {
    const portion = proratedSpendForRange(row, rangeStart, rangeEnd)
    if (portion <= 0) continue
    out.set(row.platform, (out.get(row.platform) || 0) + portion)
  }
  return out
}

/**
 * Sums prorated spend grouped by `${platform}::${campaign}` (skips rows without campaign).
 */
export function spendByCampaign(
  rows: AdSpendRow[],
  rangeStart: Date,
  rangeEnd: Date,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const row of rows) {
    if (!row.campaign) continue
    const portion = proratedSpendForRange(row, rangeStart, rangeEnd)
    if (portion <= 0) continue
    const key = `${row.platform}::${row.campaign}`
    out.set(key, (out.get(key) || 0) + portion)
  }
  return out
}

/**
 * Convenience: total spend across all rows for a range.
 */
export function totalSpendInRange(
  rows: AdSpendRow[],
  rangeStart: Date,
  rangeEnd: Date,
): number {
  let total = 0
  for (const row of rows) {
    total += proratedSpendForRange(row, rangeStart, rangeEnd)
  }
  return total
}

/**
 * Compute ROAS / CPC / CPA. Returns null when undefined (e.g. zero spend).
 */
export function computeReturns(opts: {
  spend: number
  revenue: number
  clicks: number
  conversions: number
}): { roas: number | null; cpc: number | null; cpa: number | null; profit: number } {
  const { spend, revenue, clicks, conversions } = opts
  return {
    roas: spend > 0 ? revenue / spend : null,
    cpc: clicks > 0 && spend > 0 ? spend / clicks : null,
    cpa: conversions > 0 && spend > 0 ? spend / conversions : null,
    profit: revenue - spend,
  }
}
